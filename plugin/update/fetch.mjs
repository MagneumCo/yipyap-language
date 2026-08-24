#!/usr/bin/env node

import {
  chmodSync,
  constants as fsConstants,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  closeSync,
  realpathSync,
  renameSync,
  rmSync,
  writeSync,
  readFileSync,
  readSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { fetchVerifiedCandidate, UpdateError } from "./update-lib.mjs";

const ROOT = realpathSync(path.dirname(fileURLToPath(import.meta.url)));
const PLUGIN_ROOT = realpathSync(path.resolve(ROOT, ".."));

function readBoundedSibling(name, maximumBytes) {
  const filePath = path.join(ROOT, name);
  const stat = lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size === 0 || stat.size > maximumBytes) {
    throw new UpdateError("local_profile", `${name} is not a bounded regular file`);
  }
  return readFileSync(filePath);
}

function outputRoot(argv) {
  if (argv.length !== 2 || argv[0] !== "--out") {
    throw new UpdateError("usage", "usage: fetch.mjs --out <new-directory>");
  }
  const requestedOutput = path.resolve(argv[1]);
  if (
    requestedOutput === path.parse(requestedOutput).root
    || requestedOutput === path.dirname(requestedOutput)
    || existsSync(requestedOutput)
  ) {
    throw new UpdateError("unsafe_output", "the candidate output must be a new, narrow directory");
  }
  const requestedParent = path.dirname(requestedOutput);
  const parent = lstatSync(requestedParent);
  if (parent.isSymbolicLink() || !parent.isDirectory()) {
    throw new UpdateError("unsafe_output", "the candidate output parent is unsafe");
  }
  const physicalParent = realpathSync(requestedParent);
  const output = path.join(physicalParent, path.basename(requestedOutput));
  if (
    existsSync(output)
    || output === PLUGIN_ROOT
    || output.startsWith(`${PLUGIN_ROOT}${path.sep}`)
  ) {
    throw new UpdateError("unsafe_output", "the candidate output must be outside the active plugin root");
  }
  return output;
}

function writeExclusive(root, name, bytes) {
  const filePath = path.join(root, name);
  const flags = fsConstants.O_CREAT
    | fsConstants.O_EXCL
    | fsConstants.O_RDWR
    | (fsConstants.O_NOFOLLOW ?? 0);
  const descriptor = openSync(filePath, flags, 0o600);
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = writeSync(descriptor, bytes, offset, bytes.length - offset);
      if (count === 0) throw new UpdateError("write_verification", `${name} stopped writing early`);
      offset += count;
    }
    fsyncSync(descriptor);
    const written = Buffer.alloc(bytes.length);
    let read = 0;
    while (read < written.length) {
      const count = readSync(descriptor, written, read, written.length - read, read);
      if (count === 0) break;
      read += count;
    }
    if (read !== bytes.length || !written.equals(bytes)) {
      throw new UpdateError("write_verification", `${name} did not read back byte-identically`);
    }
  } finally {
    closeSync(descriptor);
  }
  chmodSync(filePath, 0o644);
}

let staging;
try {
  const output = outputRoot(process.argv.slice(2));
  const result = await fetchVerifiedCandidate({
    publicKeyPem: readBoundedSibling("yipyap-release-ed25519-v1.pem", 16 * 1024),
    currentProfile: JSON.parse(readBoundedSibling("release-profile.json", 16 * 1024).toString("utf8")),
  });
  staging = mkdtempSync(path.join(path.dirname(output), ".yipyap-candidate-"));
  chmodSync(staging, 0o700);
  mkdirSync(path.join(staging, "release"), { mode: 0o755 });
  writeExclusive(staging, `yipyap-language-${result.latestVersion}.tar`, result.archiveBytes);
  writeExclusive(path.join(staging, "release"), "latest.json", result.indexBytes);
  writeExclusive(path.join(staging, "release"), "latest.sig", result.indexSignatureBytes);
  writeExclusive(path.join(staging, "release"), "manifest.json", result.manifestBytes);
  writeExclusive(path.join(staging, "release"), "manifest.sig", result.releaseSignatureBytes);
  chmodSync(staging, 0o755);
  if (existsSync(output)) {
    throw new UpdateError("unsafe_output", "the candidate output appeared during download");
  }
  renameSync(staging, output);
  staging = undefined;
  process.stdout.write(`${JSON.stringify({
    state: "candidate-downloaded",
    version: result.latestVersion,
    releaseSequence: result.releaseSequence,
    activation: result.activation,
    output,
  }, null, 2)}\n`);
} catch (error) {
  if (staging && existsSync(staging)) rmSync(staging, { recursive: true, force: false });
  const code = error instanceof UpdateError ? error.code : "unexpected";
  process.stderr.write(`Yip-Yap update fetch failed [${code}]\n`);
  process.exitCode = 1;
}
