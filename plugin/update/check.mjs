#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { checkForUpdate, UpdateError } from "./update-lib.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function readBoundedSibling(name, maximumBytes) {
  const filePath = path.join(ROOT, name);
  const stat = lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size === 0 || stat.size > maximumBytes) {
    throw new UpdateError("local_profile", `${name} is not a bounded regular file`);
  }
  return readFileSync(filePath);
}

try {
  if (process.argv.length !== 2) throw new UpdateError("usage", "usage: check.mjs");
  const result = await checkForUpdate({
    publicKeyPem: readBoundedSibling("yipyap-release-ed25519-v1.pem", 16 * 1024),
    currentProfile: JSON.parse(readBoundedSibling("release-profile.json", 16 * 1024).toString("utf8")),
  });
  process.stdout.write(`${JSON.stringify({
    state: result.state,
    installedVersion: result.installedVersion,
    latestVersion: result.latestVersion,
    releaseSequence: result.releaseSequence,
    channel: result.channel,
    activation: result.activation,
  }, null, 2)}\n`);
} catch (error) {
  const code = error instanceof UpdateError ? error.code : "unexpected";
  process.stderr.write(`YipYap update check failed [${code}]\n`);
  process.exitCode = 1;
}
