import {
  createHash,
  createPublicKey,
  verify as cryptoVerify,
} from "node:crypto";

export const UPDATER_VERSION = "1.0.0";
export const PLUGIN_ID = "yipyap-language";
export const PUBLIC_REPOSITORY = "MagneumCo/yipyap-language";
export const SIGNING_KEY_ID = "yipyap-release-ed25519-v1";
export const UPDATE_INDEX_URL =
  `https://raw.githubusercontent.com/${PUBLIC_REPOSITORY}/main/release/latest.json`;
export const UPDATE_SIGNATURE_URL =
  `https://raw.githubusercontent.com/${PUBLIC_REPOSITORY}/main/release/latest.sig`;

const UPDATE_DOMAIN = Buffer.from("yipyap.update-index.v1\n", "utf8");
const RELEASE_DOMAIN = Buffer.from("yipyap.plugin-release.v1\n", "utf8");
const UPDATE_SCHEMA_VERSION = "yipyap.update-index.v1";
const RELEASE_SCHEMA_VERSION = "yipyap.public-release.v1";
const PROFILE_SCHEMA_VERSION = "yipyap.installed-release-profile.v1";
const PUBLIC_RELEASE_BASE = `https://github.com/${PUBLIC_REPOSITORY}/releases/download`;
const PRODUCTION_BASE_URL = "https://api.magneum.co";
const API_ORIGIN_PROFILE_ID = "future-production";
const CREDENTIAL_SCHEMA = "yipyap.local-connector-credential.v1";
const ENVIRONMENT_TOKEN_FALLBACK = false;
const GATEWAY_PROFILE_ID = "api-magneum-co-local-gateway.v1";
const CONNECTOR_PROFILE = "yipyap.provider-callables.v1";
const INTERFACE_PACKET_SHA256 =
  "d729164310ac5be601888c215e67ee3aa1b9fead4fe257410c6b485f56ee9171";
const CALLABLES = Object.freeze([
  "providerReadConnectionStatus",
  "providerReadTeachingSettings",
  "providerReadTeachingContext",
  "providerReadLexiconProjection",
  "providerSubmitLearnerEvent",
]);
const UPSTREAM_PINS = Object.freeze({
  teachingBehaviorCasesSha256: "46209e7b9aaef88f6cf220db2f95f09aa1bebcaf0f763c69e6a2503d3be267b4",
  lexicalNormalizationVectorsSha256: "46614f8277e405aa77595dbadea61f31e77d55acbb4f17ec1ddb74d4d08a112b",
});
const SEMVER_IDENTIFIER = String.raw`(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)`;
const SEMVER = new RegExp(
  String.raw`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(${SEMVER_IDENTIFIER}(?:\.${SEMVER_IDENTIFIER})*))?$`,
);
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_INDEX_BYTES = 64 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_SIGNATURE_BYTES = 256;
const MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 128;
const MAX_PATH_BYTES = 100;
const FETCH_TIMEOUT_MS = 8000;
const MAX_UPDATE_INDEX_VALIDITY_MS = 31 * 24 * 60 * 60 * 1000;
const RELEASE_MANIFEST_PATH = "release/manifest.json";
const RELEASE_SIGNATURE_PATH = "release/manifest.sig";
const UPDATE_INDEX_PATH = "release/latest.json";
const UPDATE_INDEX_SIGNATURE_PATH = "release/latest.sig";
const RELEASE_PUBLIC_KEY_PATH = "release/keys/yipyap-release-ed25519-v1.pem";
const UPDATER_PUBLIC_KEY_PATH = "plugin/update/yipyap-release-ed25519-v1.pem";
const INSTALLED_PROFILE_PATH = "plugin/update/release-profile.json";
const CLAUDE_MANIFEST_PATH = "plugin/.claude-plugin/plugin.json";
const CODEX_MANIFEST_PATH = "plugin/.codex-plugin/plugin.json";

export class UpdateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "UpdateError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new UpdateError(code, message);
}

function exactKeys(value, expected, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("schema_invalid", `${field} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail("schema_invalid", `${field} has an unexpected shape`);
  }
}

function canonicalJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseCanonicalJson(bytes, field, maximumBytes) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length === 0 || bytes.length > maximumBytes) {
    fail("bounds", `${field} size is outside the allowed range`);
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("invalid_json", `${field} is not valid UTF-8 JSON`);
  }
  if (!bytes.equals(canonicalJson(value))) {
    fail("canonical_json", `${field} is not canonical JSON`);
  }
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareCanonicalPaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateRelativePath(value, field = "path") {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.normalize("NFC")
    || Buffer.byteLength(value, "utf8") > MAX_PATH_BYTES
    || !/^[A-Za-z0-9._/-]+$/.test(value)
    || value.startsWith("/")
    || value.includes("\\")
    || /^[A-Za-z]:/.test(value)
  ) {
    fail("manifest_invalid", `${field} is not a canonical relative path`);
  }
  const parts = value.split("/");
  if (
    parts.some((part) => part === "" || part === "." || part === "..")
    || parts.some((part) => part.toLowerCase() === ".git")
    || parts.some((part) => part.endsWith("."))
    || parts.some((part) => /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
  ) {
    fail("manifest_invalid", `${field} contains an unsafe path segment`);
  }
  return value;
}

function validateCanonicalPathSet(paths, code) {
  const foldedPaths = new Map();
  for (const relativePath of paths) {
    const folded = relativePath.toLowerCase();
    if (foldedPaths.has(folded)) {
      fail(code, `${relativePath} collides with ${foldedPaths.get(folded)}`);
    }
    foldedPaths.set(folded, relativePath);
  }
  for (const relativePath of paths) {
    const parts = relativePath.split("/");
    for (let length = 1; length < parts.length; length += 1) {
      const foldedPrefix = parts.slice(0, length).join("/").toLowerCase();
      if (foldedPaths.has(foldedPrefix)) {
        fail(code, `${foldedPaths.get(foldedPrefix)} conflicts with descendant ${relativePath}`);
      }
    }
  }
}

function contentRoot(records) {
  const hash = createHash("sha256");
  for (const record of records) {
    hash.update(`${record.path}\0${record.bytes}\0${record.mode}\0${record.sha256}\n`, "utf8");
  }
  return hash.digest("hex");
}

function decodeSignature(bytes, field) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length === 0 || bytes.length > MAX_SIGNATURE_BYTES) {
    fail("signature", `${field} size is outside the allowed range`);
  }
  if (bytes.some((byte) => byte > 0x7f)) {
    fail("signature", `${field} contains non-ASCII bytes`);
  }
  const text = bytes.toString("ascii");
  if (!/^[A-Za-z0-9+/]{86}==\n$/.test(text)) {
    fail("signature", `${field} is not canonical Ed25519 base64`);
  }
  const signature = Buffer.from(text.slice(0, -1), "base64");
  if (signature.length !== 64) fail("signature", `${field} has the wrong length`);
  return signature;
}

function publicKey(publicKeyPem) {
  let key;
  try {
    key = createPublicKey(publicKeyPem);
  } catch {
    fail("trust_root", "the pinned release public key is invalid");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    fail("trust_root", "the pinned release public key is not Ed25519");
  }
  return key;
}

function verifySignature(bytes, signatureBytes, publicKeyPem, domain, field) {
  const signature = decodeSignature(signatureBytes, `${field} signature`);
  if (!cryptoVerify(null, Buffer.concat([domain, bytes]), publicKey(publicKeyPem), signature)) {
    fail("signature", `${field} signature verification failed`);
  }
}

function compareSemver(left, right) {
  const leftMatch = SEMVER.exec(left);
  const rightMatch = SEMVER.exec(right);
  if (!leftMatch || !rightMatch) fail("schema_invalid", "a version is not strict SemVer");
  for (let index = 1; index <= 3; index += 1) {
    const order = compareDecimalIdentifier(leftMatch[index], rightMatch[index]);
    if (order !== 0) return order;
  }
  const leftPre = leftMatch[4];
  const rightPre = rightMatch[4];
  if (leftPre === rightPre) return 0;
  if (leftPre === undefined) return 1;
  if (rightPre === undefined) return -1;
  const leftParts = leftPre.split(".");
  const rightParts = rightPre.split(".");
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    if (leftParts[index] === undefined) return -1;
    if (rightParts[index] === undefined) return 1;
    if (leftParts[index] === rightParts[index]) continue;
    const leftNumeric = /^[0-9]+$/.test(leftParts[index]);
    const rightNumeric = /^[0-9]+$/.test(rightParts[index]);
    if (leftNumeric && rightNumeric) return compareDecimalIdentifier(leftParts[index], rightParts[index]);
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftParts[index] < rightParts[index] ? -1 : 1;
  }
  return 0;
}

function compareDecimalIdentifier(left, right) {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function validateInstalledProfile(profile) {
  exactKeys(
    profile,
    ["channel", "pluginId", "releaseSequence", "schemaVersion", "signingKeyId", "version"],
    "installed release profile",
  );
  if (
    profile.schemaVersion !== PROFILE_SCHEMA_VERSION
    || profile.pluginId !== PLUGIN_ID
    || profile.channel !== "stable"
    || profile.signingKeyId !== SIGNING_KEY_ID
    || !SEMVER.test(profile.version)
    || !Number.isSafeInteger(profile.releaseSequence)
    || profile.releaseSequence < 1
  ) {
    fail("profile_invalid", "the installed release profile is invalid");
  }
  return profile;
}

function validateUpdateIndex(index) {
  exactKeys(
    index,
    [
      "activation",
      "archiveSha256",
      "archiveUrl",
      "channel",
      "expiresAt",
      "manifestSha256",
      "manifestUrl",
      "minimumUpdaterVersion",
      "pluginId",
      "releaseSequence",
      "releaseTag",
      "schemaVersion",
      "signatureUrl",
      "signingKeyId",
      "version",
    ],
    "update index",
  );
  const tag = `v${index.version}`;
  const base = `${PUBLIC_RELEASE_BASE}/${tag}`;
  const expiry = new Date(index.expiresAt);
  if (
    index.schemaVersion !== UPDATE_SCHEMA_VERSION
    || index.pluginId !== PLUGIN_ID
    || index.channel !== "stable"
    || !SEMVER.test(index.version)
    || index.releaseTag !== tag
    || !Number.isSafeInteger(index.releaseSequence)
    || index.releaseSequence < 1
    || index.archiveUrl !== `${base}/${PLUGIN_ID}-${index.version}.tar`
    || index.manifestUrl !== `${base}/manifest.json`
    || index.signatureUrl !== `${base}/manifest.sig`
    || !SHA256.test(index.archiveSha256)
    || !SHA256.test(index.manifestSha256)
    || index.signingKeyId !== SIGNING_KEY_ID
    || !SEMVER.test(index.minimumUpdaterVersion)
    || typeof index.expiresAt !== "string"
    || Number.isNaN(expiry.getTime())
    || expiry.toISOString() !== index.expiresAt
    || index.activation !== "restart-new-root"
  ) {
    fail("index_invalid", "the signed update index is incompatible");
  }
  if (compareSemver(UPDATER_VERSION, index.minimumUpdaterVersion) < 0) {
    fail("updater_too_old", "the installed update verifier is too old for this release");
  }
  return index;
}

export function verifyUpdateIndex({
  indexBytes,
  signatureBytes,
  publicKeyPem,
  currentProfile,
  now = new Date(),
}) {
  verifySignature(indexBytes, signatureBytes, publicKeyPem, UPDATE_DOMAIN, "update index");
  const index = validateUpdateIndex(parseCanonicalJson(indexBytes, "update index", MAX_INDEX_BYTES));
  const profile = validateInstalledProfile(currentProfile);
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) fail("clock_invalid", "the local clock is invalid");
  const validity = new Date(index.expiresAt).getTime() - now.getTime();
  if (validity <= 0) fail("index_expired", "the signed update index has expired");
  if (validity > MAX_UPDATE_INDEX_VALIDITY_MS) {
    fail("index_expiry_window", "the signed update index exceeds the 31-day validity window");
  }
  if (index.releaseSequence < profile.releaseSequence) fail("downgrade", "the update index is older than this installation");
  if (index.releaseSequence === profile.releaseSequence && index.version !== profile.version) {
    fail("equivocation", "one release sequence names two versions");
  }
  if (
    index.releaseSequence > profile.releaseSequence
    && compareSemver(index.version, profile.version) <= 0
  ) {
    fail("non_monotonic_version", "a newer release sequence must carry a newer version");
  }
  return Object.freeze({
    state: index.releaseSequence === profile.releaseSequence ? "current" : "update-available",
    installedVersion: profile.version,
    latestVersion: index.version,
    releaseSequence: index.releaseSequence,
    channel: index.channel,
    activation: index.activation,
    index,
  });
}

async function boundedFetch(fetchImplementation, url, maximumBytes, redirect) {
  let response;
  try {
    response = await fetchImplementation(url, {
      method: "GET",
      redirect,
      headers: { accept: "application/octet-stream" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    fail("network_unavailable", "the signed release channel is unavailable");
  }
  if (!response || response.status !== 200 || !response.body) {
    fail("network_unavailable", "the signed release channel did not return an acceptable response");
  }
  const declaredLength = response.headers?.get?.("content-length");
  if (declaredLength !== null && declaredLength !== undefined) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      fail("bounds", "a release-channel response exceeds its byte limit");
    }
  }
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > maximumBytes) fail("bounds", "a release-channel response exceeds its byte limit");
      chunks.push(bytes);
    }
  } catch (error) {
    if (error instanceof UpdateError) throw error;
    fail("network_unavailable", "the signed release channel closed unexpectedly");
  }
  return Buffer.concat(chunks, length);
}

export async function checkForUpdate({
  fetchImplementation = globalThis.fetch,
  publicKeyPem,
  currentProfile,
  now = new Date(),
} = {}) {
  if (typeof fetchImplementation !== "function") fail("network_unavailable", "no HTTPS fetch implementation is available");
  const [indexBytes, signatureBytes] = await Promise.all([
    boundedFetch(fetchImplementation, UPDATE_INDEX_URL, MAX_INDEX_BYTES, "error"),
    boundedFetch(fetchImplementation, UPDATE_SIGNATURE_URL, MAX_SIGNATURE_BYTES, "error"),
  ]);
  const verified = verifyUpdateIndex({ indexBytes, signatureBytes, publicKeyPem, currentProfile, now });
  return Object.freeze({
    ...verified,
    indexBytes,
    indexSignatureBytes: signatureBytes,
  });
}

function validateReleaseManifest(manifest, index) {
  exactKeys(
    manifest,
    [
      "activation",
      "channel",
      "contentRootSha256",
      "files",
      "minimumHosts",
      "minimumRuntime",
      "pluginId",
      "releaseSequence",
      "releaseTag",
      "repository",
      "runtimeContract",
      "schemaVersion",
      "signingKeyId",
      "version",
    ],
    "release manifest",
  );
  if (
    manifest.schemaVersion !== RELEASE_SCHEMA_VERSION
    || manifest.pluginId !== index.pluginId
    || manifest.repository !== PUBLIC_REPOSITORY
    || manifest.version !== index.version
    || manifest.releaseTag !== index.releaseTag
    || manifest.channel !== index.channel
    || manifest.releaseSequence !== index.releaseSequence
    || manifest.signingKeyId !== index.signingKeyId
    || manifest.activation !== index.activation
    || !SHA256.test(manifest.contentRootSha256)
    || !Array.isArray(manifest.files)
    || manifest.files.length === 0
    || manifest.files.length > MAX_FILES
  ) {
    fail("manifest_invalid", "the release manifest does not match the signed update index");
  }
  exactKeys(manifest.minimumHosts, ["claude", "codex"], "release minimum hosts");
  if (!SEMVER.test(manifest.minimumHosts.claude) || !SEMVER.test(manifest.minimumHosts.codex)) {
    fail("manifest_invalid", "the release minimum host versions are invalid");
  }
  exactKeys(manifest.minimumRuntime, ["node"], "release minimum runtime");
  if (!SEMVER.test(manifest.minimumRuntime.node)) {
    fail("manifest_invalid", "the release minimum Node version is invalid");
  }
  if (compareSemver(process.versions.node, manifest.minimumRuntime.node) < 0) {
    fail("runtime_too_old", "the local Node runtime is too old for this release");
  }
  exactKeys(
    manifest.runtimeContract,
    [
      "apiOriginProfileId",
      "callables",
      "connectorProfile",
      "credentialSchema",
      "environmentTokenFallback",
      "gatewayProfileId",
      "interfacePacketSha256",
      "productionBaseUrl",
      "upstreamPins",
    ],
    "release runtime contract",
  );
  exactKeys(
    manifest.runtimeContract.upstreamPins,
    ["lexicalNormalizationVectorsSha256", "teachingBehaviorCasesSha256"],
    "release upstream pins",
  );
  if (
    manifest.runtimeContract.apiOriginProfileId !== API_ORIGIN_PROFILE_ID
    || manifest.runtimeContract.connectorProfile !== CONNECTOR_PROFILE
    || manifest.runtimeContract.credentialSchema !== CREDENTIAL_SCHEMA
    || manifest.runtimeContract.environmentTokenFallback !== ENVIRONMENT_TOKEN_FALLBACK
    || manifest.runtimeContract.gatewayProfileId !== GATEWAY_PROFILE_ID
    || manifest.runtimeContract.interfacePacketSha256 !== INTERFACE_PACKET_SHA256
    || manifest.runtimeContract.productionBaseUrl !== PRODUCTION_BASE_URL
    || JSON.stringify(manifest.runtimeContract.callables) !== JSON.stringify(CALLABLES)
    || JSON.stringify(manifest.runtimeContract.upstreamPins) !== JSON.stringify(UPSTREAM_PINS)
  ) {
    fail("manifest_invalid", "the release runtime contract is incompatible");
  }

  let previousPath = "";
  let totalBytes = 0;
  for (const [recordIndex, record] of manifest.files.entries()) {
    exactKeys(record, ["bytes", "mode", "path", "sha256"], `release files[${recordIndex}]`);
    validateRelativePath(record.path, `release files[${recordIndex}].path`);
    if (recordIndex > 0 && compareCanonicalPaths(record.path, previousPath) <= 0) {
      fail("manifest_invalid", "release file records must be uniquely sorted");
    }
    previousPath = record.path;
    if (
      !Number.isSafeInteger(record.bytes)
      || record.bytes < 0
      || record.bytes > MAX_FILE_BYTES
      || record.mode !== "0644"
      || !SHA256.test(record.sha256)
    ) {
      fail("manifest_invalid", `${record.path} has an invalid size, mode, or digest`);
    }
    totalBytes += record.bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      fail("manifest_invalid", "release payload exceeds the total byte limit");
    }
  }
  if (contentRoot(manifest.files) !== manifest.contentRootSha256) {
    fail("manifest_invalid", "the release content-root digest is inconsistent");
  }
  validateCanonicalPathSet([
    ...manifest.files.map((record) => record.path),
    RELEASE_MANIFEST_PATH,
    RELEASE_SIGNATURE_PATH,
    UPDATE_INDEX_PATH,
    UPDATE_INDEX_SIGNATURE_PATH,
  ], "manifest_invalid");
  return manifest;
}

function allZero(bytes) {
  return bytes.every((byte) => byte === 0);
}

function exactTarField(header, start, end, expected, field) {
  if (!header.subarray(start, end).equals(Buffer.from(expected, "ascii"))) {
    fail("archive_header", `tar ${field} is not deterministic`);
  }
}

function parseTarOctal(header, start, end, field) {
  const fieldBytes = header.subarray(start, end);
  if (fieldBytes.some((byte) => byte > 0x7f)) {
    fail("archive_header", `tar ${field} contains non-ASCII bytes`);
  }
  const text = fieldBytes.toString("ascii");
  const digits = end - start - 1;
  if (!new RegExp(`^[0-7]{${digits}}\\0$`).test(text)) {
    fail("archive_header", `tar ${field} is not canonical octal`);
  }
  const value = Number.parseInt(text.slice(0, -1), 8);
  if (!Number.isSafeInteger(value)) fail("archive_header", `tar ${field} is outside the safe range`);
  return value;
}

function parseTarName(header) {
  const field = header.subarray(0, 100);
  const nul = field.indexOf(0);
  const nameBytes = nul < 0 ? field : field.subarray(0, nul);
  if (nul >= 0 && !allZero(field.subarray(nul))) {
    fail("archive_header", "tar path padding is not zeroed");
  }
  let name;
  try {
    name = new TextDecoder("utf-8", { fatal: true }).decode(nameBytes);
  } catch {
    fail("archive_path", "tar path is not valid UTF-8");
  }
  return validateRelativePath(name, "tar path");
}

function parseDeterministicTar(archiveBytes) {
  if (
    !Buffer.isBuffer(archiveBytes)
    || archiveBytes.length < 1536
    || archiveBytes.length > MAX_ARCHIVE_BYTES
    || archiveBytes.length % 512 !== 0
  ) {
    fail("archive_bounds", "tar archive size is outside the deterministic bounds");
  }
  const records = [];
  const seen = new Set();
  let previousPath = "";
  let offset = 0;
  while (offset < archiveBytes.length) {
    const header = archiveBytes.subarray(offset, offset + 512);
    if (allZero(header)) {
      if (
        archiveBytes.length - offset !== 1024
        || !allZero(archiveBytes.subarray(offset + 512, offset + 1024))
      ) {
        fail("archive_termination", "tar archive must end with exactly two zero records");
      }
      if (records.length === 0) fail("archive_inventory", "tar archive contains no files");
      validateCanonicalPathSet(records.map((record) => record.path), "archive_inventory");
      return Object.freeze(records);
    }

    const relativePath = parseTarName(header);
    if (seen.has(relativePath)) fail("archive_inventory", `tar repeats ${relativePath}`);
    if (records.length > 0 && compareCanonicalPaths(relativePath, previousPath) <= 0) {
      fail("archive_inventory", "tar paths are not uniquely sorted");
    }
    seen.add(relativePath);
    previousPath = relativePath;
    if (seen.size > MAX_FILES + 2) fail("archive_inventory", "tar contains too many files");

    exactTarField(header, 100, 108, "0000644\0", "mode");
    exactTarField(header, 108, 116, "0000000\0", "uid");
    exactTarField(header, 116, 124, "0000000\0", "gid");
    const size = parseTarOctal(header, 124, 136, "size");
    if (size > MAX_FILE_BYTES) fail("archive_bounds", `${relativePath} exceeds the tar file bound`);
    exactTarField(header, 136, 148, "00000000000\0", "mtime");
    const checksumBytes = header.subarray(148, 156);
    if (checksumBytes.some((byte) => byte > 0x7f)) {
      fail("archive_header", "tar checksum field contains non-ASCII bytes");
    }
    const checksumText = checksumBytes.toString("ascii");
    if (!/^[0-7]{6}\0 $/.test(checksumText)) {
      fail("archive_header", "tar checksum field is not canonical");
    }
    const expectedChecksum = Number.parseInt(checksumText.slice(0, 6), 8);
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    let observedChecksum = 0;
    for (const byte of checksumHeader) observedChecksum += byte;
    if (observedChecksum !== expectedChecksum) {
      fail("archive_checksum", `${relativePath} has a bad tar checksum`);
    }
    exactTarField(header, 156, 157, "0", "type");
    if (!allZero(header.subarray(157, 257))) fail("archive_header", "tar link field must be empty");
    exactTarField(header, 257, 263, "ustar\0", "magic");
    exactTarField(header, 263, 265, "00", "version");
    if (!allZero(header.subarray(265))) {
      fail("archive_header", "tar owner, device, prefix, and padding fields must be empty");
    }

    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    const paddedEnd = contentStart + Math.ceil(size / 512) * 512;
    if (paddedEnd > archiveBytes.length - 1024) {
      fail("archive_bounds", `${relativePath} extends past the tar payload`);
    }
    if (!allZero(archiveBytes.subarray(contentEnd, paddedEnd))) {
      fail("archive_padding", `${relativePath} has non-zero tar padding`);
    }
    records.push(Object.freeze({
      path: relativePath,
      bytes: Buffer.from(archiveBytes.subarray(contentStart, contentEnd)),
    }));
    offset = paddedEnd;
  }
  fail("archive_termination", "tar archive has no zero-record terminator");
}

function canonicalPublicKeyPem(publicKeyPem, field) {
  const key = publicKey(publicKeyPem);
  const canonical = Buffer.from(key.export({ type: "spki", format: "pem" }));
  if (!Buffer.from(publicKeyPem).equals(canonical)) {
    fail("trust_root", `${field} is not canonical SPKI PEM`);
  }
  return canonical;
}

export function verifyCandidateArchive({
  archiveBytes,
  manifestBytes,
  releaseSignatureBytes,
  manifest,
  publicKeyPem,
}) {
  const records = parseDeterministicTar(archiveBytes);
  const actual = new Map(records.map((record) => [record.path, record.bytes]));
  const expectedPaths = [
    ...manifest.files.map((record) => record.path),
    RELEASE_MANIFEST_PATH,
    RELEASE_SIGNATURE_PATH,
  ].sort(compareCanonicalPaths);
  if (JSON.stringify(records.map((record) => record.path)) !== JSON.stringify(expectedPaths)) {
    fail("archive_inventory", "tar paths differ from the signed manifest inventory");
  }
  if (!actual.get(RELEASE_MANIFEST_PATH)?.equals(manifestBytes)) {
    fail("archive_manifest", "tar embeds different release-manifest bytes");
  }
  if (!actual.get(RELEASE_SIGNATURE_PATH)?.equals(releaseSignatureBytes)) {
    fail("archive_manifest", "tar embeds a different release signature");
  }
  for (const record of manifest.files) {
    const bytes = actual.get(record.path);
    if (!bytes || bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
      fail("archive_file", `${record.path} differs from its signed release record`);
    }
  }
  const releaseKey = actual.get(RELEASE_PUBLIC_KEY_PATH);
  const updaterKey = actual.get(UPDATER_PUBLIC_KEY_PATH);
  if (!releaseKey || !updaterKey || !releaseKey.equals(updaterKey)) {
    fail("trust_root", "the archive's release and updater public-key copies differ");
  }
  const trustedKey = canonicalPublicKeyPem(publicKeyPem, "pinned release public key");
  const shippedKey = canonicalPublicKeyPem(releaseKey, "shipped release public key");
  if (!trustedKey.equals(shippedKey)) {
    fail("trust_root", "the archive's public key differs from the pinned trust root");
  }
  const profileBytes = actual.get(INSTALLED_PROFILE_PATH);
  if (!profileBytes) fail("profile_invalid", "the archive omits its installed release profile");
  const profile = validateInstalledProfile(
    parseCanonicalJson(profileBytes, "installed release profile", 16 * 1024),
  );
  if (
    profile.version !== manifest.version
    || profile.releaseSequence !== manifest.releaseSequence
    || profile.channel !== manifest.channel
    || profile.signingKeyId !== manifest.signingKeyId
  ) {
    fail("profile_invalid", "the installed release profile differs from the signed release");
  }
  for (const manifestPath of [CLAUDE_MANIFEST_PATH, CODEX_MANIFEST_PATH]) {
    const providerBytes = actual.get(manifestPath);
    if (!providerBytes) fail("manifest_invalid", `the archive omits ${manifestPath}`);
    const providerManifest = parseCanonicalJson(providerBytes, manifestPath, 64 * 1024);
    if (providerManifest.name !== PLUGIN_ID || providerManifest.version !== manifest.version) {
      fail("manifest_invalid", `${manifestPath} differs from the signed release identity`);
    }
  }
  return Object.freeze({ files: records.length, bytes: archiveBytes.length });
}

export async function fetchVerifiedCandidate(options = {}) {
  const status = await checkForUpdate(options);
  if (status.state !== "update-available") fail("no_update", "no newer signed release is available");
  const [archiveBytes, manifestBytes, releaseSignatureBytes] = await Promise.all([
    boundedFetch(options.fetchImplementation ?? globalThis.fetch, status.index.archiveUrl, MAX_ARCHIVE_BYTES, "follow"),
    boundedFetch(options.fetchImplementation ?? globalThis.fetch, status.index.manifestUrl, MAX_MANIFEST_BYTES, "follow"),
    boundedFetch(options.fetchImplementation ?? globalThis.fetch, status.index.signatureUrl, MAX_SIGNATURE_BYTES, "follow"),
  ]);
  if (sha256(archiveBytes) !== status.index.archiveSha256) fail("archive_digest", "the release archive digest does not match the signed index");
  if (sha256(manifestBytes) !== status.index.manifestSha256) fail("manifest_digest", "the release manifest digest does not match the signed index");
  verifySignature(manifestBytes, releaseSignatureBytes, options.publicKeyPem, RELEASE_DOMAIN, "release manifest");
  const manifest = validateReleaseManifest(
    parseCanonicalJson(manifestBytes, "release manifest", MAX_MANIFEST_BYTES),
    status.index,
  );
  verifyCandidateArchive({
    archiveBytes,
    manifestBytes,
    releaseSignatureBytes,
    manifest,
    publicKeyPem: options.publicKeyPem,
  });
  return Object.freeze({
    ...status,
    manifest,
    archiveBytes,
    manifestBytes,
    releaseSignatureBytes,
  });
}
