import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * YipYap account connector v1.
 *
 * This module is deliberately dependency-free. It owns the narrow trust
 * boundary between an MCP host, the app-led pairing callable, and the five
 * authenticated Firebase provider callables. Credentials remain connector-
 * local, service binding identities never enter tool inputs, and account or
 * installation identities never leave the connector in model-visible results.
 */

export const FIREBASE_CALLABLE_BASE =
  "https://us-central1-yipyap-language.cloudfunctions.net";
export const SESSION_TOKEN_ENV = "YIPYAP_SESSION_TOKEN";
export const CONNECTOR_VERSION = "0.3.3";

export const API_ORIGIN_PROFILE_SCHEMA = "yipyap.api-origin-profile.v1";
export const LOCAL_CONNECTOR_CREDENTIAL_SCHEMA =
  "yipyap.local-connector-credential.v1";
export const LOCAL_GATEWAY_REQUEST_SCHEMA = "yipyap.local-gateway-request.v1";
export const LOCAL_GATEWAY_RESPONSE_SCHEMA = "yipyap.local-gateway-response.v1";
// This is the only production profile-selection seam. A reviewed build may
// change this source byte before packaging; runtime construction accepts no
// profile, origin, URL, environment, CLI, response, or model-selected input.
export const COMPILED_API_ORIGIN_PROFILE_ID = "future-production";

export const CONNECTOR_LOCAL_GATEWAY_ROUTES = Object.freeze({
  yipyapPair: "/v1/pairing/redeem",
  providerReadConnectionStatus: "/v1/provider/connection-status",
  providerReadTeachingSettings: "/v1/provider/teaching-settings",
  providerReadTeachingContext: "/v1/provider/teaching-context",
  providerReadLexiconProjection: "/v1/provider/lexicon-projection",
  providerSubmitLearnerEvent: "/v1/provider/learner-event",
});

/**
 * Exact compile-time API-origin rows consumed from the app-owned v1 packet.
 * The v0.3 source selects future production. Promotion of every non-deleted
 * production installation is an app/service-owned, explicitly authorized
 * operation that stages separately bound credentials for still-authorized
 * connections and commits one exact profile; this connector never retags
 * legacy bearer bytes or supplies migration fallback. Reviewed
 * development and legacy compatibility builds may select another named row,
 * but no URL, redirect, DNS result, response, environment value, or model
 * output can create or modify a profile.
 */
export const CONNECTOR_API_ORIGIN_PROFILES = Object.freeze({
  "legacy-production": Object.freeze({
    schema: API_ORIGIN_PROFILE_SCHEMA,
    profileId: "legacy-production",
    environmentId: "legacy-production",
    dataPlaneId: "production-authoritative.v1",
    origin: "https://bdilabs.dev",
    issuer: "https://bdilabs.dev",
    resource: "https://bdilabs.dev/mcp",
    audience: "https://bdilabs.dev/mcp",
    mcpMethod: "POST",
    mcpPath: "/mcp",
    mcpUrl: "https://bdilabs.dev/mcp",
    transportFamily: "local-gateway",
    gatewayProfileId: "legacy-firebase-callables.v1",
    gatewayOrigin: null,
  }),
  "isolated-development": Object.freeze({
    schema: API_ORIGIN_PROFILE_SCHEMA,
    profileId: "isolated-development",
    environmentId: "isolated-development",
    dataPlaneId: "development-synthetic-isolated.v1",
    origin: "https://api.bdilabs.dev",
    issuer: "https://api.bdilabs.dev",
    resource: "https://api.bdilabs.dev",
    audience: "https://api.bdilabs.dev",
    mcpMethod: "POST",
    mcpPath: "/",
    mcpUrl: "https://api.bdilabs.dev",
    transportFamily: "local-gateway",
    gatewayProfileId: "api-bdilabs-dev-local-gateway.v1",
    gatewayOrigin: "https://api.bdilabs.dev",
  }),
  "future-production": Object.freeze({
    schema: API_ORIGIN_PROFILE_SCHEMA,
    profileId: "future-production",
    environmentId: "future-production",
    dataPlaneId: "production-authoritative.v1",
    origin: "https://api.magneum.co",
    issuer: "https://api.magneum.co",
    resource: "https://api.magneum.co",
    audience: "https://api.magneum.co",
    mcpMethod: "POST",
    mcpPath: "/",
    mcpUrl: "https://api.magneum.co",
    transportFamily: "local-gateway",
    gatewayProfileId: "api-magneum-co-local-gateway.v1",
    gatewayOrigin: "https://api.magneum.co",
  }),
});

/**
 * Pairing: the app's Connect flow shows a short single-use code; this
 * connector redeems it
 * once at `redeemPairingCode` and stores the returned session token in its
 * own 0600 config file, read per invocation — no restart, and no human ever
 * sees token material. The code grammar and normalization are the packet's:
 * 8-char Crockford base32, case/separator/lookalike forgiving.
 */
export const REDEEM_CALLABLE = "redeemPairingCode";
const PAIRING_CODE = /^[0-9A-HJKMNP-TV-Z]{8}$/u;

function apiOriginProfile(profileId) {
  if (
    typeof profileId !== "string"
    || !Object.hasOwn(CONNECTOR_API_ORIGIN_PROFILES, profileId)
  ) {
    throw new TypeError("Unsupported YipYap API-origin profile id.");
  }
  return CONNECTOR_API_ORIGIN_PROFILES[profileId];
}

function transportBinding(profile, providerId) {
  return Object.freeze({
    providerId,
    profileId: profile.profileId,
    transportFamily: profile.transportFamily,
    gatewayProfileId: profile.gatewayProfileId,
    gatewayOrigin: profile.gatewayOrigin,
  });
}

function transportBindingKey(binding) {
  return JSON.stringify(binding);
}

function transportBindingsEqual(left, right) {
  return left.providerId === right.providerId
    && left.profileId === right.profileId
    && left.transportFamily === right.transportFamily
    && left.gatewayProfileId === right.gatewayProfileId
    && left.gatewayOrigin === right.gatewayOrigin;
}

export function connectorConfigPath(
  providerId,
  profileId = COMPILED_API_ORIGIN_PROFILE_ID,
) {
  const profile = apiOriginProfile(profileId);
  const profileSuffix = profile.profileId === "legacy-production"
    ? ""
    : `-${profile.profileId}`;
  return join(homedir(), ".yipyap", `connector-${providerId}${profileSuffix}.json`);
}

export function normalizePairingCode(raw) {
  return raw
    .toUpperCase()
    .replace(/[-\s]/gu, "")
    .replace(/O/gu, "0")
    .replace(/[IL]/gu, "1");
}

const CALLABLE_NAMES = Object.freeze([
  "providerReadConnectionStatus",
  "providerReadTeachingSettings",
  "providerReadTeachingContext",
  "providerReadLexiconProjection",
  "providerSubmitLearnerEvent",
]);
const CALLABLE_NAME_SET = new Set(CALLABLE_NAMES);
const SESSION_TOKEN = /^fst_[0-9a-f]{64}$/u;
const TOKEN_MATERIAL = /fst_[0-9a-f]{64}/u;
const PRIVATE_MATERIAL = /(?:fst_[0-9a-f]{64}|acct_[0-9a-f]{32}|inst_[0-9a-f]{32})/u;
const ACCOUNT_ID = /^acct_[0-9a-f]{32}$/u;
const INSTALLATION_ID = /^inst_[0-9a-f]{32}$/u;
const PERSONAL_ITEM_ID = /^pit_[0-9a-f]{32}$/u;
const CANONICAL_ITEM_ID = /^it_[0-9a-f]{32}$/u;
const EVENT_ID = /^evt_[0-9a-f]{32}$/u;
const IDEMPOTENCY_KEY = /^idk_[0-9a-f]{32}$/u;
const PAGE_CURSOR = /^cur_[A-Za-z0-9_-]{16,252}$/u;
const LANGUAGE_TAG =
  /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?(?:-(?:[a-z0-9]{5,8}|\d[a-z0-9]{3}))*$/u;
const SCRIPT_CODE = /^[A-Z][a-z]{3}$/u;
const UTC_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const CONTROL_CHARACTER = /\p{Cc}/u;
const PROVIDER_IDS = new Set(["chatgpt", "claude", "codex"]);
const SCOPES = new Set([
  "lexicon.read",
  "lexicon.propose",
  "lexicon.write",
  "events.render",
  "events.response",
  "connection.status",
  "teaching.read",
  "teaching.write",
]);
const AUTHORITIES = new Set([
  "provider-suggestion",
  "provider-render-report",
  "learner-confirmation",
  "yipyap-review-interaction",
]);
const AUTHORITY_RANK = Object.freeze({
  "provider-suggestion": 1,
  "provider-render-report": 2,
  "learner-confirmation": 3,
  "yipyap-review-interaction": 4,
});
const REVIEW_STATES = new Set(["active", "archived"]);
const CONTEXT_STANDINGS = new Set(["seed", "new", "learning", "known"]);
const ERROR_CODES = new Set([
  "contract_version_unsupported",
  "idempotency_conflict",
  "identity_conflict",
  "identity_unknown",
  "installation_unknown",
  "limit_exceeded",
  "revision_conflict",
  "schema_invalid",
  "scope_denied",
  "unauthenticated",
]);
// Rule 43: a provider host cannot claim a YipYap-controlled review
// interaction. Keep the two review-only contract kinds structurally absent
// from both discovery and request parsing instead of relying on a later scope
// refusal.
const PROVIDER_EVENT_KINDS = Object.freeze([
  "item_proposed",
  "item_edited",
  "item_archived",
  "item_rendered",
  "playback_completed",
]);
const AUTHORITY_BY_KIND = Object.freeze({
  item_proposed: "provider-suggestion",
  item_edited: "learner-confirmation",
  item_archived: "learner-confirmation",
  item_rendered: "provider-render-report",
  playback_completed: "provider-render-report",
});
const REQUIRED_SCOPE_BY_EVENT_KIND = Object.freeze({
  item_proposed: "lexicon.propose",
  item_edited: "lexicon.write",
  item_archived: "lexicon.write",
  item_rendered: "events.render",
  playback_completed: "events.render",
});
const PAYLOAD_KINDS = new Set(["item_proposed", "item_edited"]);
const MUTATING_KINDS = new Set(["item_edited", "item_archived"]);
const PERSONAL_ONLY_KINDS = new Set(["item_proposed", "item_edited", "item_archived"]);
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_CONFIG_BYTES = 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_LEXICON_RESULT_ROWS = 200;
const LEXICON_READ_REQUEST_SCHEMA = "yipyap.lexicon-read-request.v1";
const RECENT_WINDOW_MILLISECONDS = Object.freeze({
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
});
const CONFIG_ABSENT = Symbol("yipyap-config-absent");
const CONFIG_INVALID = Symbol("yipyap-config-invalid");
const CONFIG_BINDING_MISMATCH = Symbol("yipyap-config-binding-mismatch");

const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({}),
  additionalProperties: false,
});

const CONTEXT_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({
    redPresent: Object.freeze({ type: "boolean" }),
    mostlyFrozen: Object.freeze({ type: "boolean" }),
  }),
  additionalProperties: false,
});

// Flat object schema: Claude Code's MCP client (observed on 2.1.236) requires
// inputSchema.type === "object" and rejects a top-level oneOf — and one
// rejected tool drops the host's entire tool set. The exactly-one-form law is
// stated in the tool description and enforced by parseProjectionArguments,
// which keeps the accepted and refused wire set byte-identical.
const PROJECTION_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({
    cursor: Object.freeze({
      type: "string",
      pattern: "^cur_[A-Za-z0-9_-]{16,252}$",
      description: "Legacy page form only; never combined with schema, view, or window.",
    }),
    schema: Object.freeze({
      type: "string",
      const: LEXICON_READ_REQUEST_SCHEMA,
      description: "Required by the recent and summary forms; never combined with cursor.",
    }),
    view: Object.freeze({
      type: "string",
      enum: Object.freeze(["recent", "summary"]),
      description: "Selects the recent-capture or summary form.",
    }),
    window: Object.freeze({
      type: "string",
      enum: Object.freeze(["day", "week"]),
      description: "Required by the recent form only; forbidden by every other form.",
    }),
  }),
  additionalProperties: false,
});

const EVENT_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({
    event: Object.freeze({
      type: "object",
      description:
        "A learner-event intent. The connector derives contract, authority, binding, server, and identity fields.",
      additionalProperties: false,
      properties: Object.freeze({
        kind: Object.freeze({ enum: PROVIDER_EVENT_KINDS }),
        languageTag: Object.freeze({ type: "string", maxLength: 63 }),
        script: Object.freeze({ type: "string", pattern: "^[A-Z][a-z]{3}$" }),
        personalItemId: Object.freeze({ type: ["string", "null"] }),
        canonicalItemId: Object.freeze({ type: ["string", "null"] }),
        expectedRevision: Object.freeze({ type: ["integer", "null"], minimum: 1 }),
        clientRecordedAt: Object.freeze({ type: ["string", "null"] }),
        payload: Object.freeze({
          type: "object",
          additionalProperties: false,
          properties: Object.freeze({
            target: Object.freeze({ type: "string", minLength: 1, maxLength: 128 }),
            meaning: Object.freeze({ type: "string", minLength: 1, maxLength: 512 }),
          }),
          required: Object.freeze(["target", "meaning"]),
        }),
      }),
      required: Object.freeze([
        "kind",
        "languageTag",
        "script",
      ]),
    }),
  }),
  required: Object.freeze(["event"]),
  additionalProperties: false,
});

const PAIR_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({
    pairingCode: Object.freeze({
      type: "string",
      minLength: 1,
      maxLength: 32,
      description: "The short code shown on the YipYap app's Connect screen (like 4K7Q-9DPM).",
    }),
  }),
  required: Object.freeze(["pairingCode"]),
  additionalProperties: false,
});

export const CONNECTOR_TOOLS = Object.freeze([
  Object.freeze({
    name: "yipyapPair",
    title: "Pair YipYap",
    description:
      "Redeem a one-time YipYap pairing code from the app's Connect screen. Stores the session credential in the connector's local config; the credential is never shown.",
    inputSchema: PAIR_INPUT_SCHEMA,
    annotations: Object.freeze({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    }),
  }),
  Object.freeze({
    name: "providerReadConnectionStatus",
    title: "Read YipYap connection",
    description: "Start the current reply's binding-coherent read cycle and return model-safe scopes plus convergence status. Returns no binding IDs.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: Object.freeze({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }),
  }),
  Object.freeze({
    name: "providerReadTeachingSettings",
    title: "Read teaching settings",
    description: "Continue the current same-credential read cycle and return the bounded YipYap teaching settings projection. Connection status must run first.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: Object.freeze({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }),
  }),
  Object.freeze({
    name: "providerReadTeachingContext",
    title: "Read teaching context",
    description: "Complete the current same-credential read cycle with bounded teaching context using content-free per-reply zone signals. Status and settings must run first.",
    inputSchema: CONTEXT_INPUT_SCHEMA,
    annotations: Object.freeze({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }),
  }),
  Object.freeze({
    name: "providerReadLexiconProjection",
    title: "Read lexicon page",
    description:
      "Read one legacy bounded lexicon page or one exact recent-capture or summary view. This read never reports teaching standing or learner evidence. Input constraint: provide parameters for exactly one of (cursor), (schema, view, window) with view \"recent\", or (schema, view) with view \"summary\". Any other combination is refused.",
    inputSchema: PROJECTION_INPUT_SCHEMA,
    annotations: Object.freeze({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    }),
  }),
  Object.freeze({
    name: "providerSubmitLearnerEvent",
    title: "Submit learner event",
    description:
      "Submit one bounded provider event under its fresh scope. An item_proposed records vocabulary membership and provenance only, never learning evidence, and returns only accepted/replayed status after closed-shape, binding, track, and event-integrity validation. Duplicate lexical equivalence remains service-authoritative. Binding, event, idempotency, and proposal identities are minted or injected internally.",
    inputSchema: EVENT_INPUT_SCHEMA,
    annotations: Object.freeze({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    }),
  }),
]);

class ConnectorFailure extends Error {
  constructor(state, code) {
    super("YipYap connector request failed.");
    this.name = "ConnectorFailure";
    this.state = state;
    this.code = code;
  }
}

function fail(state, code) {
  throw new ConnectorFailure(state, code);
}

function requireRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("invalid_response", "schema_invalid");
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    fail("invalid_response", "schema_invalid");
  }
  return value;
}

function requireKeys(record, allowed, required = allowed) {
  const keys = Object.keys(record);
  if (keys.length > allowed.size) fail("invalid_response", "schema_invalid");
  for (const key of keys) {
    if (!allowed.has(key)) fail("invalid_response", "schema_invalid");
  }
  for (const key of required) {
    if (!Object.hasOwn(record, key)) fail("invalid_response", "schema_invalid");
  }
}

function requireExactKeys(record, keys) {
  requireKeys(record, keys, keys);
}

function requireString(value, pattern, maxCodePoints = 512) {
  if (typeof value !== "string" || [...value].length > maxCodePoints || !pattern.test(value)) {
    fail("invalid_response", "schema_invalid");
  }
  return value;
}

function requireText(value, maximum) {
  if (
    typeof value !== "string"
    || [...value].length < 1
    || [...value].length > maximum
    || CONTROL_CHARACTER.test(value)
  ) {
    fail("invalid_response", "schema_invalid");
  }
  return value;
}

function requireLanguageTrack(languageTag, script) {
  requireString(languageTag, LANGUAGE_TAG, 63);
  requireString(script, SCRIPT_CODE, 4);
  const embedded = languageTag.split("-").find((part) => SCRIPT_CODE.test(part));
  if (embedded !== undefined && embedded !== script) fail("invalid_response", "schema_invalid");
  return Object.freeze({ languageTag, script });
}

function requireTimestamp(value) {
  requireString(value, UTC_MILLISECONDS, 24);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || new Date(parsed).toISOString() !== value) {
    fail("invalid_response", "schema_invalid");
  }
  return value;
}

function requireSafeRevision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail("invalid_response", "schema_invalid");
  return value;
}

function requireLevel(value, nullable = false) {
  if (nullable && value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 10) {
    fail("invalid_response", "schema_invalid");
  }
  return value;
}

function requireLexiconCount(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("invalid_response", "schema_invalid");
  }
  return value;
}

function compareLexiconText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function mintIdentity(prefix) {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

function ensureCredentialFree(value) {
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_RESPONSE_BYTES || PRIVATE_MATERIAL.test(serialized)) {
    fail("invalid_response", "credential_material_refused");
  }
}

function ensureNoToken(value) {
  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_RESPONSE_BYTES || TOKEN_MATERIAL.test(serialized)) {
    fail("invalid_response", "credential_material_refused");
  }
}

function parseConnectionStatus(result, providerId) {
  const wrapper = requireRecord(result);
  requireExactKeys(wrapper, new Set(["status"]));
  const status = requireRecord(wrapper.status);
  requireExactKeys(
    status,
    new Set(["accountId", "installationId", "providerId", "grantedScopes", "converged"]),
  );
  const accountId = requireString(status.accountId, ACCOUNT_ID, 37);
  const installationId = requireString(status.installationId, INSTALLATION_ID, 37);
  if (!PROVIDER_IDS.has(status.providerId) || status.providerId !== providerId) {
    fail("needs_reconnect", "provider_binding_mismatch");
  }
  if (!Array.isArray(status.grantedScopes) || status.grantedScopes.length > SCOPES.size) {
    fail("invalid_response", "schema_invalid");
  }
  const seen = new Set();
  for (const scope of status.grantedScopes) {
    if (!SCOPES.has(scope) || seen.has(scope)) fail("invalid_response", "schema_invalid");
    seen.add(scope);
  }
  if (typeof status.converged !== "boolean") fail("invalid_response", "schema_invalid");
  return Object.freeze({
    binding: Object.freeze({ accountId, installationId, providerId }),
    visible: Object.freeze({
      grantedScopes: Object.freeze([...status.grantedScopes]),
      converged: status.converged,
    }),
  });
}

function parseSettings(result) {
  const wrapper = requireRecord(result);
  requireExactKeys(wrapper, new Set(["settings"]));
  const settings = requireRecord(wrapper.settings);
  requireExactKeys(
    settings,
    new Set([
      "contractVersion",
      "activeTrack",
      "storedLevel",
      "instructionLanguageTag",
      "instructionScript",
      "settingsRevision",
    ]),
  );
  if (settings.contractVersion !== "v1") {
    fail("invalid_response", "contract_version_unsupported");
  }
  let activeTrack = null;
  if (settings.activeTrack !== null) {
    const track = requireRecord(settings.activeTrack);
    requireExactKeys(track, new Set(["languageTag", "script"]));
    activeTrack = requireLanguageTrack(track.languageTag, track.script);
  }
  const storedLevel = requireLevel(settings.storedLevel, true);
  if ((activeTrack === null) !== (storedLevel === null)) {
    fail("invalid_response", "schema_invalid");
  }
  const instructionTag = settings.instructionLanguageTag;
  const instructionScript = settings.instructionScript;
  if ((instructionTag === null) !== (instructionScript === null)) {
    fail("invalid_response", "schema_invalid");
  }
  if (instructionTag !== null) requireLanguageTrack(instructionTag, instructionScript);
  const settingsRevision = requireSafeRevision(settings.settingsRevision);
  return Object.freeze({
    contractVersion: "v1",
    activeTrack,
    storedLevel,
    instructionLanguageTag: instructionTag,
    instructionScript,
    settingsRevision,
  });
}

function parseContext(result) {
  const wrapper = requireRecord(result);
  requireExactKeys(wrapper, new Set(["context"]));
  if (wrapper.context === null) return null;
  const context = requireRecord(wrapper.context);
  if (context.contractVersion !== "v1") {
    fail("invalid_response", "contract_version_unsupported");
  }
  requireExactKeys(
    context,
    new Set([
      "schema",
      "contractVersion",
      "languageTag",
      "script",
      "instructionLanguageTag",
      "storedLevel",
      "entries",
      "newIntroductionCap",
    ]),
  );
  if (context.schema !== "yipyap.teaching-context.v1") {
    fail("invalid_response", "schema_invalid");
  }
  const track = requireLanguageTrack(context.languageTag, context.script);
  let instructionLanguageTag = null;
  if (context.instructionLanguageTag !== null) {
    requireString(context.instructionLanguageTag, LANGUAGE_TAG, 63);
    instructionLanguageTag = context.instructionLanguageTag;
  }
  const storedLevel = requireLevel(context.storedLevel);
  if (!Array.isArray(context.entries) || context.entries.length > 12) {
    fail("invalid_response", "schema_invalid");
  }
  const entries = context.entries.map((raw) => {
    const entry = requireRecord(raw);
    requireExactKeys(entry, new Set(["target", "meaning", "standing", "isNew"]));
    const target = requireText(entry.target, 128);
    const meaning = requireText(entry.meaning, 512);
    if (!CONTEXT_STANDINGS.has(entry.standing) || typeof entry.isNew !== "boolean") {
      fail("invalid_response", "schema_invalid");
    }
    if (entry.isNew !== (entry.standing === "new" || entry.standing === "seed")) {
      fail("invalid_response", "schema_invalid");
    }
    return Object.freeze({ target, meaning, standing: entry.standing, isNew: entry.isNew });
  });
  if (
    !Number.isSafeInteger(context.newIntroductionCap)
    || context.newIntroductionCap < 0
    || context.newIntroductionCap > 12
    || entries.filter((entry) => entry.isNew).length > context.newIntroductionCap
  ) {
    fail("invalid_response", "schema_invalid");
  }
  return Object.freeze({
    schema: context.schema,
    contractVersion: context.contractVersion,
    ...track,
    instructionLanguageTag,
    storedLevel,
    entries: Object.freeze(entries),
    newIntroductionCap: context.newIntroductionCap,
  });
}

function parseProjectionEntry(raw) {
  const entry = requireRecord(raw);
  requireExactKeys(
    entry,
    new Set([
      "personalItemId",
      "languageTag",
      "script",
      "target",
      "meaning",
      "reviewState",
      "revision",
      "authority",
    ]),
  );
  const personalItemId = requireString(entry.personalItemId, PERSONAL_ITEM_ID, 36);
  const track = requireLanguageTrack(entry.languageTag, entry.script);
  const target = requireText(entry.target, 128);
  const meaning = requireText(entry.meaning, 512);
  if (!REVIEW_STATES.has(entry.reviewState) || !AUTHORITIES.has(entry.authority)) {
    fail("invalid_response", "schema_invalid");
  }
  const revision = requireSafeRevision(entry.revision);
  if (entry.reviewState === "archived" && revision === 1) {
    fail("invalid_response", "schema_invalid");
  }
  return Object.freeze({
    personalItemId,
    ...track,
    target,
    meaning,
    reviewState: entry.reviewState,
    revision,
    authority: entry.authority,
  });
}

function parseLegacyProjection(projection) {
  requireExactKeys(projection, new Set(["schema", "authority", "entries", "cursor"]));
  if (!Array.isArray(projection.entries) || projection.entries.length > MAX_LEXICON_RESULT_ROWS) {
    fail("invalid_response", "schema_invalid");
  }
  const entries = projection.entries.map(parseProjectionEntry);
  const identities = new Set(entries.map((entry) => entry.personalItemId));
  if (identities.size !== entries.length) fail("invalid_response", "schema_invalid");
  const cursor = projection.cursor === null
    ? null
    : requireString(projection.cursor, PAGE_CURSOR, 256);
  if (entries.length === 0) {
    if (projection.authority !== null) fail("invalid_response", "schema_invalid");
  } else {
    if (!AUTHORITIES.has(projection.authority)) fail("invalid_response", "schema_invalid");
    const weakest = Math.min(...entries.map((entry) => AUTHORITY_RANK[entry.authority]));
    if (AUTHORITY_RANK[projection.authority] !== weakest) {
      fail("invalid_response", "schema_invalid");
    }
  }
  return Object.freeze({
    schema: projection.schema,
    authority: projection.authority,
    entries: Object.freeze(entries),
    cursor,
  });
}

function parseRecentProjectionEntry(raw, windowStartsAtMilliseconds, generatedAtMilliseconds) {
  const entry = requireRecord(raw);
  requireExactKeys(
    entry,
    new Set([
      "languageTag",
      "script",
      "target",
      "meaning",
      "reviewState",
      "serverRecordedAt",
    ]),
  );
  const track = requireLanguageTrack(entry.languageTag, entry.script);
  const target = requireText(entry.target, 128);
  const meaning = requireText(entry.meaning, 512);
  if (!REVIEW_STATES.has(entry.reviewState)) {
    fail("invalid_response", "schema_invalid");
  }
  const serverRecordedAt = requireTimestamp(entry.serverRecordedAt);
  const recordedAtMilliseconds = Date.parse(serverRecordedAt);
  if (
    recordedAtMilliseconds < windowStartsAtMilliseconds
    || recordedAtMilliseconds > generatedAtMilliseconds
  ) {
    fail("invalid_response", "schema_invalid");
  }
  return Object.freeze({
    ...track,
    target,
    meaning,
    reviewState: entry.reviewState,
    serverRecordedAt,
  });
}

function compareRecentProjectionEntries(left, right) {
  const timeOrder = Date.parse(right.serverRecordedAt) - Date.parse(left.serverRecordedAt);
  if (timeOrder !== 0) return timeOrder;
  for (const key of ["languageTag", "script", "target", "meaning"]) {
    const order = compareLexiconText(left[key], right[key]);
    if (order !== 0) return order;
  }
  return 0;
}

function parseRecentProjection(projection) {
  requireExactKeys(
    projection,
    new Set([
      "schema",
      "generatedAt",
      "window",
      "windowStartsAt",
      "entries",
      "matchingCount",
      "truncated",
    ]),
  );
  if (!Object.hasOwn(RECENT_WINDOW_MILLISECONDS, projection.window)) {
    fail("invalid_response", "schema_invalid");
  }
  const generatedAt = requireTimestamp(projection.generatedAt);
  const windowStartsAt = requireTimestamp(projection.windowStartsAt);
  const generatedAtMilliseconds = Date.parse(generatedAt);
  const windowStartsAtMilliseconds = Date.parse(windowStartsAt);
  if (
    generatedAtMilliseconds - windowStartsAtMilliseconds
    !== RECENT_WINDOW_MILLISECONDS[projection.window]
  ) {
    fail("invalid_response", "schema_invalid");
  }
  if (!Array.isArray(projection.entries) || projection.entries.length > MAX_LEXICON_RESULT_ROWS) {
    fail("invalid_response", "schema_invalid");
  }
  const entries = projection.entries.map((entry) => parseRecentProjectionEntry(
    entry,
    windowStartsAtMilliseconds,
    generatedAtMilliseconds,
  ));
  for (let index = 1; index < entries.length; index += 1) {
    if (compareRecentProjectionEntries(entries[index - 1], entries[index]) > 0) {
      fail("invalid_response", "schema_invalid");
    }
  }
  const matchingCount = requireLexiconCount(projection.matchingCount);
  if (typeof projection.truncated !== "boolean" || matchingCount < entries.length) {
    fail("invalid_response", "schema_invalid");
  }
  if (projection.truncated !== (matchingCount > entries.length)) {
    fail("invalid_response", "schema_invalid");
  }
  return Object.freeze({
    schema: projection.schema,
    generatedAt,
    window: projection.window,
    windowStartsAt,
    entries: Object.freeze(entries),
    matchingCount,
    truncated: projection.truncated,
  });
}

function parseSummaryTrack(raw) {
  const track = requireRecord(raw);
  requireExactKeys(
    track,
    new Set(["languageTag", "script", "active", "archived", "total"]),
  );
  const languageTrack = requireLanguageTrack(track.languageTag, track.script);
  const active = requireLexiconCount(track.active);
  const archived = requireLexiconCount(track.archived);
  const total = requireLexiconCount(track.total);
  if (
    !Number.isSafeInteger(active + archived)
    || active + archived !== total
    || total === 0
  ) {
    fail("invalid_response", "schema_invalid");
  }
  return Object.freeze({ ...languageTrack, active, archived, total });
}

function parseSummaryProjection(projection) {
  requireExactKeys(
    projection,
    new Set([
      "schema",
      "generatedAt",
      "active",
      "archived",
      "addedLast24Hours",
      "addedLast7Days",
      "byTrack",
      "trackCount",
      "tracksTruncated",
    ]),
  );
  const generatedAt = requireTimestamp(projection.generatedAt);
  const active = requireLexiconCount(projection.active);
  const archived = requireLexiconCount(projection.archived);
  const total = active + archived;
  if (!Number.isSafeInteger(total)) {
    fail("invalid_response", "schema_invalid");
  }
  const addedLast24Hours = requireLexiconCount(projection.addedLast24Hours);
  const addedLast7Days = requireLexiconCount(projection.addedLast7Days);
  if (
    addedLast24Hours > addedLast7Days
    || addedLast7Days > total
  ) {
    fail("invalid_response", "schema_invalid");
  }
  if (!Array.isArray(projection.byTrack) || projection.byTrack.length > MAX_LEXICON_RESULT_ROWS) {
    fail("invalid_response", "schema_invalid");
  }
  const byTrack = projection.byTrack.map(parseSummaryTrack);
  for (let index = 1; index < byTrack.length; index += 1) {
    const previous = byTrack[index - 1];
    const current = byTrack[index];
    const languageOrder = compareLexiconText(previous.languageTag, current.languageTag);
    if (
      languageOrder > 0
      || (
        languageOrder === 0
        && compareLexiconText(previous.script, current.script) > 0
      )
    ) {
      fail("invalid_response", "schema_invalid");
    }
  }
  const trackKeys = new Set(byTrack.map((track) => `${track.languageTag}\u0000${track.script}`));
  if (trackKeys.size !== byTrack.length) fail("invalid_response", "schema_invalid");
  const trackCount = requireLexiconCount(projection.trackCount);
  if (typeof projection.tracksTruncated !== "boolean" || trackCount < byTrack.length) {
    fail("invalid_response", "schema_invalid");
  }
  if (projection.tracksTruncated !== (trackCount > byTrack.length)) {
    fail("invalid_response", "schema_invalid");
  }
  const representedActive = byTrack.reduce((sum, track) => sum + track.active, 0);
  const representedArchived = byTrack.reduce((sum, track) => sum + track.archived, 0);
  if (
    !Number.isSafeInteger(representedActive)
    || !Number.isSafeInteger(representedArchived)
    || representedActive > active
    || representedArchived > archived
  ) {
    fail("invalid_response", "schema_invalid");
  }
  if (
    !projection.tracksTruncated
    && (representedActive !== active || representedArchived !== archived)
  ) {
    fail("invalid_response", "schema_invalid");
  }
  return Object.freeze({
    schema: projection.schema,
    generatedAt,
    active,
    archived,
    addedLast24Hours,
    addedLast7Days,
    byTrack: Object.freeze(byTrack),
    trackCount,
    tracksTruncated: projection.tracksTruncated,
  });
}

function parseLexiconRead(result, request) {
  const wrapper = requireRecord(result);
  if (!Object.hasOwn(request, "schema")) {
    requireExactKeys(wrapper, new Set(["projection"]));
    const projection = requireRecord(wrapper.projection);
    if (projection.schema === "yipyap.lexicon-projection.v1") {
      return Object.freeze({ projection: parseLegacyProjection(projection) });
    }
    if (
      typeof projection.schema === "string"
      && /^yipyap\.lexicon-projection\.v\d+$/u.test(projection.schema)
    ) {
      fail("invalid_response", "contract_version_unsupported");
    }
    fail("invalid_response", "schema_invalid");
  }
  if (request.view === "recent") {
    requireExactKeys(wrapper, new Set(["recent"]));
    const recent = requireRecord(wrapper.recent);
    if (recent.schema === "yipyap.lexicon-recent.v1") {
      const parsed = parseRecentProjection(recent);
      if (parsed.window !== request.window) fail("invalid_response", "schema_invalid");
      return Object.freeze({ recent: parsed });
    }
    if (
      typeof recent.schema === "string"
      && /^yipyap\.lexicon-recent\.v\d+$/u.test(recent.schema)
    ) {
      fail("invalid_response", "contract_version_unsupported");
    }
    fail("invalid_response", "schema_invalid");
  }
  if (request.view === "summary") {
    requireExactKeys(wrapper, new Set(["summary"]));
    const summary = requireRecord(wrapper.summary);
    if (summary.schema === "yipyap.lexicon-summary.v1") {
      return Object.freeze({ summary: parseSummaryProjection(summary) });
    }
    if (
      typeof summary.schema === "string"
      && /^yipyap\.lexicon-summary\.v\d+$/u.test(summary.schema)
    ) {
      fail("invalid_response", "contract_version_unsupported");
    }
    fail("invalid_response", "schema_invalid");
  }
  fail("invalid_response", "schema_invalid");
}

function parseEventSubmission(raw) {
  const event = requireRecord(raw);
  const payloadExpected = PAYLOAD_KINDS.has(event.kind);
  const expectedKeys = new Set([
    "schema",
    "contractVersion",
    "eventId",
    "kind",
    "authority",
    "languageTag",
    "script",
    "personalItemId",
    "canonicalItemId",
    "expectedRevision",
    "idempotencyKey",
    "clientRecordedAt",
  ]);
  if (payloadExpected) expectedKeys.add("payload");
  requireExactKeys(event, expectedKeys);
  if (event.contractVersion !== "v1") {
    fail("invalid_response", "contract_version_unsupported");
  }
  if (event.schema !== "yipyap.learner-event.v1") {
    fail("invalid_response", "schema_invalid");
  }
  if (!Object.hasOwn(AUTHORITY_BY_KIND, event.kind)) fail("invalid_response", "schema_invalid");
  if (event.authority !== AUTHORITY_BY_KIND[event.kind]) fail("invalid_response", "schema_invalid");
  const eventId = requireString(event.eventId, EVENT_ID, 36);
  const track = requireLanguageTrack(event.languageTag, event.script);
  const personalItemId = event.personalItemId === null
    ? null
    : requireString(event.personalItemId, PERSONAL_ITEM_ID, 36);
  const canonicalItemId = event.canonicalItemId === null
    ? null
    : requireString(event.canonicalItemId, CANONICAL_ITEM_ID, 35);
  if ((personalItemId === null) === (canonicalItemId === null)) {
    fail("invalid_response", "schema_invalid");
  }
  if (PERSONAL_ONLY_KINDS.has(event.kind) && canonicalItemId !== null) {
    fail("invalid_response", "schema_invalid");
  }
  const mutates = MUTATING_KINDS.has(event.kind);
  if (mutates !== (event.expectedRevision !== null)) {
    fail("invalid_response", "schema_invalid");
  }
  const expectedRevision = mutates ? requireSafeRevision(event.expectedRevision) : null;
  const idempotencyKey = requireString(event.idempotencyKey, IDEMPOTENCY_KEY, 36);
  const clientRecordedAt = event.clientRecordedAt === null
    ? null
    : requireTimestamp(event.clientRecordedAt);
  let payload;
  if (payloadExpected) {
    const record = requireRecord(event.payload);
    requireExactKeys(record, new Set(["target", "meaning"]));
    payload = Object.freeze({
      target: requireText(record.target, 128),
      meaning: requireText(record.meaning, 512),
    });
  }
  const parsed = {
    schema: event.schema,
    contractVersion: event.contractVersion,
    eventId,
    kind: event.kind,
    authority: event.authority,
    ...track,
    personalItemId,
    canonicalItemId,
    expectedRevision,
    idempotencyKey,
    clientRecordedAt,
  };
  if (payloadExpected) parsed.payload = payload;
  return Object.freeze(parsed);
}

function buildEventSubmission(raw) {
  const event = requireRecord(raw);
  const kind = event.kind;
  const isProposal = kind === "item_proposed";
  const payloadExpected = PAYLOAD_KINDS.has(kind);
  const expectedKeys = new Set([
    "kind",
    "languageTag",
    "script",
  ]);
  if (Object.hasOwn(event, "clientRecordedAt")) expectedKeys.add("clientRecordedAt");
  if (!isProposal) {
    expectedKeys.add("personalItemId");
    expectedKeys.add("canonicalItemId");
  }
  if (MUTATING_KINDS.has(kind)) expectedKeys.add("expectedRevision");
  if (payloadExpected) expectedKeys.add("payload");
  requireExactKeys(event, expectedKeys);

  // The connector, not the model, owns these CSPRNG identities. They are
  // minted once before transport so the connector's one bounded retry sends
  // the byte-identical idempotent body.
  return parseEventSubmission({
    ...event,
    schema: "yipyap.learner-event.v1",
    contractVersion: "v1",
    eventId: mintIdentity("evt"),
    authority: AUTHORITY_BY_KIND[kind],
    personalItemId: isProposal ? mintIdentity("pit") : event.personalItemId,
    canonicalItemId: isProposal ? null : event.canonicalItemId,
    expectedRevision: MUTATING_KINDS.has(kind) ? event.expectedRevision : null,
    idempotencyKey: mintIdentity("idk"),
    clientRecordedAt: event.clientRecordedAt ?? null,
  });
}

function parseReturnedEvent(raw, binding) {
  const event = requireRecord(raw);
  const payloadExpected = PAYLOAD_KINDS.has(event.kind);
  const expectedKeys = new Set([
    "schema",
    "contractVersion",
    "eventId",
    "accountId",
    "installationId",
    "providerId",
    "kind",
    "authority",
    "languageTag",
    "script",
    "personalItemId",
    "canonicalItemId",
    "expectedRevision",
    "idempotencyKey",
    "serverRecordedAt",
    "clientRecordedAt",
  ]);
  if (payloadExpected) expectedKeys.add("payload");
  requireExactKeys(event, expectedKeys);
  if (
    event.accountId !== binding.accountId
    || event.installationId !== binding.installationId
    || event.providerId !== binding.providerId
  ) {
    fail("needs_reconnect", "provider_binding_mismatch");
  }
  const modelEvent = { ...event };
  delete modelEvent.accountId;
  delete modelEvent.installationId;
  delete modelEvent.providerId;
  delete modelEvent.serverRecordedAt;
  const parsed = parseEventSubmission(modelEvent);
  return Object.freeze({ ...parsed, serverRecordedAt: requireTimestamp(event.serverRecordedAt) });
}

function parseReturnedItem(raw, binding) {
  if (raw === null) return null;
  const item = requireRecord(raw);
  requireExactKeys(
    item,
    new Set([
      "schema",
      "personalItemId",
      "accountId",
      "languageTag",
      "script",
      "target",
      "meaning",
      "originProviderId",
      "originInstallationId",
      "reviewState",
      "revision",
      "serverRecordedAt",
      "learnerEditedAt",
    ]),
  );
  if (item.schema !== "yipyap.personal-item.v1" || item.accountId !== binding.accountId) {
    fail("needs_reconnect", "provider_binding_mismatch");
  }
  if (!PROVIDER_IDS.has(item.originProviderId)) fail("invalid_response", "schema_invalid");
  requireString(item.originInstallationId, INSTALLATION_ID, 37);
  if (!REVIEW_STATES.has(item.reviewState)) fail("invalid_response", "schema_invalid");
  const revision = requireSafeRevision(item.revision);
  if (item.reviewState === "archived" && revision === 1) {
    fail("invalid_response", "schema_invalid");
  }
  const learnerEditedAt = item.learnerEditedAt === null
    ? null
    : requireTimestamp(item.learnerEditedAt);
  return Object.freeze({
    schema: item.schema,
    personalItemId: requireString(item.personalItemId, PERSONAL_ITEM_ID, 36),
    ...requireLanguageTrack(item.languageTag, item.script),
    target: requireText(item.target, 128),
    meaning: requireText(item.meaning, 512),
    reviewState: item.reviewState,
    revision,
    serverRecordedAt: requireTimestamp(item.serverRecordedAt),
    learnerEditedAt,
  });
}

function parseEventReceipt(result, binding, submittedEvent) {
  const receipt = requireRecord(result);
  requireExactKeys(receipt, new Set(["event", "item", "replayed"]));
  if (typeof receipt.replayed !== "boolean") fail("invalid_response", "schema_invalid");
  const event = parseReturnedEvent(receipt.event, binding);
  const item = parseReturnedItem(receipt.item, binding);
  const eventWithoutServerTime = { ...event };
  delete eventWithoutServerTime.serverRecordedAt;
  const exactEvent = JSON.stringify(eventWithoutServerTime) === JSON.stringify(submittedEvent);
  const proposalResolvedToExistingItem =
    event.kind === "item_proposed"
    && submittedEvent.kind === "item_proposed"
    && item !== null
    && event.personalItemId === item.personalItemId
    && event.personalItemId !== submittedEvent.personalItemId
    && JSON.stringify({
      ...eventWithoutServerTime,
      personalItemId: submittedEvent.personalItemId,
    }) === JSON.stringify(submittedEvent);
  if (!exactEvent && !proposalResolvedToExistingItem) {
    fail("invalid_response", "receipt_mismatch");
  }
  if (item !== null) {
    if (item.languageTag !== event.languageTag || item.script !== event.script) {
      fail("invalid_response", "receipt_mismatch");
    }
    // A proposal ID is a candidate. The service's published duplicate rule may
    // resolve the recorded proposal subject to an already-owned same-track
    // item while preserving every other event field. No other kind may cross
    // that narrow identity seam.
    if (event.personalItemId !== item.personalItemId) {
      fail("invalid_response", "receipt_mismatch");
    }
  } else if (event.kind === "item_proposed") {
    fail("invalid_response", "receipt_mismatch");
  }
  // Automatic proposal sync needs only an authenticated success signal. The
  // closed item shape, binding, track, and ID relation are validated above, but
  // duplicate lexical equivalence remains the service's pinned-normalization
  // responsibility. Review state, prior meaning, revision, and timestamps are
  // not exposed to the teaching model.
  if (event.kind === "item_proposed") {
    return Object.freeze({ accepted: true, replayed: receipt.replayed });
  }
  const visibleEvent = { ...event };
  delete visibleEvent.eventId;
  delete visibleEvent.idempotencyKey;
  return Object.freeze({
    event: Object.freeze(visibleEvent),
    item,
    replayed: receipt.replayed,
  });
}

async function readResponseBody(response) {
  const contentType = response.headers?.get?.("content-type");
  if (contentType && !/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    fail("invalid_response", "invalid_content_type");
  }
  const length = response.headers?.get?.("content-length");
  if (length !== null && length !== undefined) {
    const declared = Number(length);
    if (!Number.isSafeInteger(declared) || declared < 0 || declared > MAX_RESPONSE_BYTES) {
      fail("invalid_response", "response_too_large");
    }
  }
  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        fail("invalid_response", "response_too_large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    fail("invalid_response", "response_too_large");
  }
  return text;
}

function parseFirebaseEnvelope(text) {
  let decoded;
  try {
    decoded = JSON.parse(text);
  } catch {
    fail("invalid_response", "invalid_json");
  }
  const envelope = requireRecord(decoded);
  const hasResult = Object.hasOwn(envelope, "result");
  const hasError = Object.hasOwn(envelope, "error");
  if (hasResult === hasError) fail("invalid_response", "schema_invalid");
  if (hasResult) {
    requireExactKeys(envelope, new Set(["result"]));
    // Binding IDs are expected inside the raw status/event contracts and are
    // validated then stripped by their parsers. Session credentials are never
    // expected in any response and are rejected before shape-specific parsing.
    ensureNoToken(envelope.result);
    return Object.freeze({ result: envelope.result });
  }
  requireExactKeys(envelope, new Set(["error"]));
  const error = requireRecord(envelope.error);
  const details = typeof error.details === "object" && error.details !== null
    ? error.details
    : null;
  const rawCode = details && typeof details.code === "string"
    ? details.code
    : typeof error.status === "string"
      ? error.status.toLowerCase()
      : "service_refused";
  const code = ERROR_CODES.has(rawCode) ? rawCode : "service_refused";
  if (code === "unauthenticated" || code === "installation_unknown") {
    fail("needs_reconnect", code);
  }
  fail("refused", code);
}

function parseLocalGatewayEnvelope(text, { allowToken = false } = {}) {
  let decoded;
  try {
    decoded = JSON.parse(text);
  } catch {
    fail("invalid_response", "invalid_json");
  }
  const envelope = requireRecord(decoded);
  if (
    typeof envelope.schema === "string"
    && envelope.schema !== LOCAL_GATEWAY_RESPONSE_SCHEMA
  ) {
    fail("invalid_response", "contract_version_unsupported");
  }
  if (envelope.schema !== LOCAL_GATEWAY_RESPONSE_SCHEMA) {
    fail("invalid_response", "schema_invalid");
  }
  if (envelope.ok === true) {
    requireExactKeys(envelope, new Set(["schema", "ok", "result"]));
    if (!allowToken) ensureNoToken(envelope.result);
    return envelope.result;
  }
  if (envelope.ok === false) {
    requireExactKeys(envelope, new Set(["schema", "ok", "error"]));
    const error = requireRecord(envelope.error);
    requireExactKeys(error, new Set(["code"]));
    const code = typeof error.code === "string" && ERROR_CODES.has(error.code)
      ? error.code
      : "service_refused";
    if (code === "unauthenticated" || code === "installation_unknown") {
      fail("needs_reconnect", code);
    }
    fail("refused", code);
  }
  fail("invalid_response", "schema_invalid");
}

function retryableHttpStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function tokenFrom(getToken) {
  const token = getToken();
  if (typeof token !== "string" || !SESSION_TOKEN.test(token)) {
    fail("not_configured", "connector_not_configured");
  }
  return token;
}

function createTransport({ profile, getToken, fetchImpl, timeoutMs }) {
  return async function callCallable(name, input, capturedToken) {
    if (!CALLABLE_NAME_SET.has(name)) fail("invalid_request", "unknown_tool");
    const sessionToken = capturedToken ?? tokenFrom(getToken);
    if (typeof sessionToken !== "string" || !SESSION_TOKEN.test(sessionToken)) {
      fail("not_configured", "connector_not_configured");
    }
    const legacy = profile.profileId === "legacy-production";
    const body = JSON.stringify(legacy
      ? { data: { sessionToken, ...input } }
      : { schema: LOCAL_GATEWAY_REQUEST_SCHEMA, payload: input });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      fail("invalid_request", "request_too_large");
    }
    const url = legacy
      ? `${FIREBASE_CALLABLE_BASE}/${name}`
      : `${profile.gatewayOrigin}${CONNECTOR_LOCAL_GATEWAY_ROUTES[name]}`;
    const headers = legacy
      ? Object.freeze({ "content-type": "application/json" })
      : Object.freeze({
        Authorization: `Bearer ${sessionToken}`,
        "content-type": "application/json",
      });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      timer.unref?.();
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers,
          body,
          redirect: "error",
          signal: controller.signal,
        });
        if (response.redirected === true) {
          fail("invalid_response", "redirect_refused");
        }
        const responseText = await readResponseBody(response);
        if (!response.ok) {
          try {
            if (legacy) parseFirebaseEnvelope(responseText);
            else parseLocalGatewayEnvelope(responseText);
          } catch (error) {
            if (error instanceof ConnectorFailure && error.state !== "invalid_response") throw error;
          }
          if (attempt === 0 && retryableHttpStatus(response.status)) continue;
          if (response.status === 401) fail("needs_reconnect", "unauthenticated");
          fail("unavailable", "service_unavailable");
        }
        return legacy
          ? parseFirebaseEnvelope(responseText).result
          : parseLocalGatewayEnvelope(responseText);
      } catch (error) {
        if (error instanceof ConnectorFailure) throw error;
        if (attempt === 0) continue;
        fail("unavailable", "network_unavailable");
      } finally {
        clearTimeout(timer);
      }
    }
    fail("unavailable", "network_unavailable");
  };
}

function sessionTokenDigest(sessionToken) {
  return createHash("sha256").update(sessionToken, "utf8").digest("hex");
}

function sameBinding(left, right) {
  return left.accountId === right.accountId
    && left.installationId === right.installationId
    && left.providerId === right.providerId;
}

function settingsMatchContext(settings, context) {
  return settings.activeTrack !== null
    && settings.instructionLanguageTag !== null
    && settings.instructionScript !== null
    && settings.activeTrack.languageTag === context.languageTag
    && settings.activeTrack.script === context.script
    && settings.instructionLanguageTag === context.instructionLanguageTag
    && settings.storedLevel === context.storedLevel;
}

function parsePairArguments(value) {
  const args = requireRecord(value ?? {});
  requireExactKeys(args, new Set(["pairingCode"]));
  const raw = args.pairingCode;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 32) {
    fail("invalid_request", "schema_invalid");
  }
  const normalized = normalizePairingCode(raw);
  if (!PAIRING_CODE.test(normalized)) fail("invalid_request", "schema_invalid");
  return normalized;
}

/**
 * The one envelope parser allowed to touch token material: redemption is
 * the single moment the session token legitimately crosses the wire. The
 * token is validated, written to the 0600 config, and never enters any
 * returned structure — the generic parsers' no-token law stays intact for
 * every other response.
 */
function parseRedeemEnvelope(text) {
  let decoded;
  try {
    decoded = JSON.parse(text);
  } catch {
    fail("invalid_response", "invalid_json");
  }
  const envelope = requireRecord(decoded);
  const hasResult = Object.hasOwn(envelope, "result");
  const hasError = Object.hasOwn(envelope, "error");
  if (hasResult === hasError) fail("invalid_response", "schema_invalid");
  if (hasResult) {
    requireExactKeys(envelope, new Set(["result"]));
    return parseRedeemResult(envelope.result);
  }
  requireExactKeys(envelope, new Set(["error"]));
  const error = requireRecord(envelope.error);
  const details = typeof error.details === "object" && error.details !== null
    ? error.details
    : null;
  const rawCode = details && typeof details.code === "string"
    ? details.code
    : "service_refused";
  fail("refused", ERROR_CODES.has(rawCode) ? rawCode : "service_refused");
}

function parseRedeemResult(raw) {
  const result = requireRecord(raw);
  requireExactKeys(result, new Set(["sessionToken"]));
  const sessionToken = result.sessionToken;
  if (typeof sessionToken !== "string" || !SESSION_TOKEN.test(sessionToken)) {
    fail("invalid_response", "schema_invalid");
  }
  return sessionToken;
}

function lstatOrAbsent(targetPath) {
  try {
    return lstatSync(targetPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function connectorCredentialDocument(sessionToken, providerId, profile) {
  return Object.freeze({
    schema: LOCAL_CONNECTOR_CREDENTIAL_SCHEMA,
    sessionToken,
    binding: transportBinding(profile, providerId),
  });
}

function writeConnectorConfig(configPath, sessionToken, providerId, profile) {
  const directory = dirname(configPath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const directoryStat = lstatSync(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new Error("YipYap connector storage is unavailable.");
  }
  chmodSync(directory, 0o700);

  const existing = lstatOrAbsent(configPath);
  if (existing && (existing.isSymbolicLink() || !existing.isFile())) {
    throw new Error("YipYap connector storage is unavailable.");
  }

  const temporaryPath = `${configPath}.${process.pid}.${randomBytes(12).toString("hex")}.tmp`;
  const flags = fsConstants.O_CREAT
    | fsConstants.O_EXCL
    | fsConstants.O_RDWR
    | (fsConstants.O_NOFOLLOW ?? 0);
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, flags, 0o600);
    fchmodSync(descriptor, 0o600);
    writeFileSync(
      descriptor,
      `${JSON.stringify(connectorCredentialDocument(sessionToken, providerId, profile))}\n`,
      "utf8",
    );
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, configPath);
  } catch {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the fixed outer storage failure.
      }
    }
    try {
      unlinkSync(temporaryPath);
    } catch {
      // The temp file may never have been created or may already be gone.
    }
    throw new Error("YipYap connector storage is unavailable.");
  }
}

function readConnectorConfigToken(configPath, providerId, profile) {
  let descriptor;
  try {
    const pathStat = lstatOrAbsent(configPath);
    if (pathStat === null) return CONFIG_ABSENT;
    if (
      pathStat.isSymbolicLink()
      || !pathStat.isFile()
      || pathStat.size < 1
      || pathStat.size > MAX_CONFIG_BYTES
      || (process.platform !== "win32" && (pathStat.mode & 0o077) !== 0)
    ) {
      return CONFIG_INVALID;
    }
    descriptor = openSync(
      configPath,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    );
    const descriptorStat = fstatSync(descriptor);
    if (
      !descriptorStat.isFile()
      || descriptorStat.dev !== pathStat.dev
      || descriptorStat.ino !== pathStat.ino
      || descriptorStat.size < 1
      || descriptorStat.size > MAX_CONFIG_BYTES
      || (process.platform !== "win32" && (descriptorStat.mode & 0o077) !== 0)
    ) {
      return CONFIG_INVALID;
    }
    const parsed = JSON.parse(readFileSync(descriptor, "utf8"));
    if (
      typeof parsed !== "object"
      || parsed === null
      || Array.isArray(parsed)
      || Object.getPrototypeOf(parsed) !== Object.prototype
    ) {
      return CONFIG_INVALID;
    }
    const keys = Object.keys(parsed).sort();
    if (JSON.stringify(keys) === JSON.stringify(["sessionToken"])) {
      if (
        profile.profileId !== "legacy-production"
        || typeof parsed.sessionToken !== "string"
        || !SESSION_TOKEN.test(parsed.sessionToken)
      ) {
        return profile.profileId === "legacy-production"
          ? CONFIG_INVALID
          : CONFIG_BINDING_MISMATCH;
      }
      return parsed.sessionToken;
    }
    if (JSON.stringify(keys) !== JSON.stringify(["binding", "schema", "sessionToken"])) {
      return CONFIG_INVALID;
    }
    if (
      parsed.schema !== LOCAL_CONNECTOR_CREDENTIAL_SCHEMA
      || typeof parsed.sessionToken !== "string"
      || !SESSION_TOKEN.test(parsed.sessionToken)
      || typeof parsed.binding !== "object"
      || parsed.binding === null
      || Array.isArray(parsed.binding)
      || Object.getPrototypeOf(parsed.binding) !== Object.prototype
    ) {
      return CONFIG_INVALID;
    }
    const bindingKeys = Object.keys(parsed.binding).sort();
    if (
      JSON.stringify(bindingKeys)
      !== JSON.stringify([
        "gatewayOrigin",
        "gatewayProfileId",
        "profileId",
        "providerId",
        "transportFamily",
      ])
    ) {
      return CONFIG_INVALID;
    }
    const expectedBinding = transportBinding(profile, providerId);
    if (!transportBindingsEqual(parsed.binding, expectedBinding)) {
      return CONFIG_BINDING_MISMATCH;
    }
    return parsed.sessionToken;
  } catch {
    return CONFIG_INVALID;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // A read failure is already represented by CONFIG_INVALID.
      }
    }
  }
}

function createRedeemTransport({ profile, fetchImpl, timeoutMs }) {
  return async function redeem(normalizedCode) {
    const legacy = profile.profileId === "legacy-production";
    const body = JSON.stringify(legacy
      ? { data: { pairingCode: normalizedCode } }
      : {
        schema: LOCAL_GATEWAY_REQUEST_SCHEMA,
        payload: { pairingCode: normalizedCode },
      });
    const url = legacy
      ? `${FIREBASE_CALLABLE_BASE}/${REDEEM_CALLABLE}`
      : `${profile.gatewayOrigin}${CONNECTOR_LOCAL_GATEWAY_ROUTES.yipyapPair}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: Object.freeze({ "content-type": "application/json" }),
        body,
        redirect: "error",
        signal: controller.signal,
      });
      if (response.redirected === true) {
        fail("invalid_response", "redirect_refused");
      }
      const responseText = await readResponseBody(response);
      if (!response.ok) {
        // A refusal envelope (wrong, expired, or consumed code) surfaces its
        // fixed contract code. Redemption is never retried: a lost response
        // after server-side consumption is ambiguous and requires a new code.
        try {
          if (legacy) parseRedeemEnvelope(responseText);
          else parseLocalGatewayEnvelope(responseText, { allowToken: true });
        } catch (error) {
          if (error instanceof ConnectorFailure && error.state !== "invalid_response") throw error;
        }
        fail("unavailable", "service_unavailable");
      }
      return legacy
        ? parseRedeemEnvelope(responseText)
        : parseRedeemResult(parseLocalGatewayEnvelope(responseText, { allowToken: true }));
    } catch (error) {
      if (error instanceof ConnectorFailure) throw error;
      fail("unavailable", "network_unavailable");
    } finally {
      clearTimeout(timer);
    }
  };
}

function parseEmptyArguments(value) {
  const args = requireRecord(value ?? {});
  requireExactKeys(args, new Set());
  return Object.freeze({});
}

function parseContextArguments(value) {
  const args = requireRecord(value ?? {});
  requireKeys(args, new Set(["redPresent", "mostlyFrozen"]), new Set());
  for (const key of ["redPresent", "mostlyFrozen"]) {
    if (Object.hasOwn(args, key) && typeof args[key] !== "boolean") {
      fail("invalid_request", "schema_invalid");
    }
  }
  return Object.freeze({
    redPresent: args.redPresent === true,
    mostlyFrozen: args.mostlyFrozen === true,
  });
}

function parseProjectionArguments(value) {
  const args = requireRecord(value ?? {});
  if (Object.hasOwn(args, "schema")) {
    if (args.schema !== LEXICON_READ_REQUEST_SCHEMA) {
      if (
        typeof args.schema === "string"
        && /^yipyap\.lexicon-read-request\.v\d+$/u.test(args.schema)
      ) {
        fail("invalid_response", "contract_version_unsupported");
      }
      fail("invalid_response", "schema_invalid");
    }
    if (args.view === "recent") {
      requireExactKeys(args, new Set(["schema", "view", "window"]));
      if (!Object.hasOwn(RECENT_WINDOW_MILLISECONDS, args.window)) {
        fail("invalid_response", "schema_invalid");
      }
      return Object.freeze({
        schema: LEXICON_READ_REQUEST_SCHEMA,
        view: "recent",
        window: args.window,
      });
    }
    if (args.view === "summary") {
      requireExactKeys(args, new Set(["schema", "view"]));
      return Object.freeze({
        schema: LEXICON_READ_REQUEST_SCHEMA,
        view: "summary",
      });
    }
    fail("invalid_response", "schema_invalid");
  }
  requireKeys(args, new Set(["cursor"]), new Set());
  if (!Object.hasOwn(args, "cursor")) return Object.freeze({});
  return Object.freeze({ cursor: requireString(args.cursor, PAGE_CURSOR, 256) });
}

function parseEventArguments(value) {
  const args = requireRecord(value ?? {});
  requireExactKeys(args, new Set(["event"]));
  return buildEventSubmission(args.event);
}

function parseToolArguments(parser, value) {
  try {
    return parser(value);
  } catch (error) {
    if (error instanceof ConnectorFailure && error.state === "invalid_response") {
      fail("invalid_request", error.code);
    }
    throw error;
  }
}

const FAILURE_MESSAGES = Object.freeze({
  not_configured: "YipYap is not set up for this host; use effective level L0.",
  needs_reconnect: "YipYap needs to be reconnected; use effective level L0.",
  unavailable: "YipYap is temporarily unavailable; use effective level L0.",
  refused: "YipYap refused the request; use effective level L0.",
  invalid_response: "YipYap returned an unusable response; use effective level L0.",
  invalid_request: "The YipYap tool request was invalid; use effective level L0.",
});

function toolSuccess(payload) {
  const body = Object.freeze({ ok: true, ...payload });
  ensureCredentialFree(body);
  return Object.freeze({
    content: Object.freeze([{ type: "text", text: JSON.stringify(body) }]),
  });
}

function toolFailure(error) {
  const failure = error instanceof ConnectorFailure
    ? error
    : new ConnectorFailure("unavailable", "connector_failure");
  const state = Object.hasOwn(FAILURE_MESSAGES, failure.state)
    ? failure.state
    : "unavailable";
  const body = Object.freeze({
    ok: false,
    connectorState: state,
    effectiveLevel: 0,
    code: failure.code,
    message: FAILURE_MESSAGES[state],
  });
  return Object.freeze({
    isError: true,
    content: Object.freeze([{ type: "text", text: JSON.stringify(body) }]),
  });
}

function proposalSyncFailure(error) {
  const failure = error instanceof ConnectorFailure
    ? error
    : new ConnectorFailure("unavailable", "connector_failure");
  const state = Object.hasOwn(FAILURE_MESSAGES, failure.state)
    ? failure.state
    : "unavailable";
  // The visible teaching draft was already settled from a coherent read cycle.
  // Even a credential loss or revocation discovered here is a missed capture,
  // not permission to retroactively suppress that reply. The next reply starts
  // another fresh read cycle and will fail closed if authority is still gone.
  const body = Object.freeze({
    ok: false,
    accepted: false,
    connectorState: state,
    syncStatus: "not_recorded",
    teachingEffect: "none",
    code: failure.code,
    message: "Vocabulary proposal was not recorded; keep the verified teaching reply unchanged.",
  });
  return Object.freeze({
    content: Object.freeze([{ type: "text", text: JSON.stringify(body) }]),
  });
}

/**
 * Create a lazy connector. Construction performs no credential read, no
 * filesystem read, and no network I/O. The default token source is the
 * connector's own 0600 config file first, then the legacy environment source
 * only when the config is genuinely absent. The config is read per invocation,
 * so a pairing performed mid-session supersedes stale environment state and
 * works without a restart. Unsafe or malformed config fails closed instead of
 * falling back to an older credential.
 */
export function createYipYapConnector({
  providerId,
  configPath,
  getToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!PROVIDER_IDS.has(providerId)) throw new TypeError("Unsupported YipYap provider id.");
  const profile = apiOriginProfile(COMPILED_API_ORIGIN_PROFILE_ID);
  const selectedTransportBinding = transportBinding(profile, providerId);
  const selectedTransportBindingKey = transportBindingKey(selectedTransportBinding);
  const resolvedConfigPath = configPath
    ?? connectorConfigPath(providerId, profile.profileId);
  if (typeof resolvedConfigPath !== "string" || resolvedConfigPath.length === 0) {
    throw new TypeError("YipYap connector config path is invalid.");
  }
  const resolvedGetToken = getToken ?? (() => {
    const configured = readConnectorConfigToken(resolvedConfigPath, providerId, profile);
    if (configured === CONFIG_BINDING_MISMATCH) {
      fail("needs_reconnect", "transport_binding_mismatch");
    }
    if (configured === CONFIG_INVALID) return undefined;
    if (configured !== CONFIG_ABSENT) return configured;
    if (profile.profileId !== "legacy-production") return undefined;
    const legacyEnvironmentToken = process.env[SESSION_TOKEN_ENV];
    return legacyEnvironmentToken === "" ? undefined : legacyEnvironmentToken;
  });
  if (typeof resolvedGetToken !== "function" || typeof fetchImpl !== "function") {
    throw new TypeError("YipYap connector dependencies are invalid.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new TypeError("YipYap connector timeout is invalid.");
  }
  const callCallable = createTransport({ profile, getToken: resolvedGetToken, fetchImpl, timeoutMs });
  const redeemCode = createRedeemTransport({ profile, fetchImpl, timeoutMs });
  let readCycle = null;
  let proposalWindow = null;

  function clearTeachingCycle() {
    readCycle = null;
    proposalWindow = null;
  }

  async function readBinding(capturedToken) {
    return parseConnectionStatus(
      await callCallable("providerReadConnectionStatus", {}, capturedToken),
      providerId,
    );
  }

  return Object.freeze({
    tools: CONNECTOR_TOOLS,
    async callTool(name, args = {}) {
      try {
        switch (name) {
          case "yipyapPair": {
            clearTeachingCycle();
            const normalizedCode = parseToolArguments(parsePairArguments, args);
            const existing = readConnectorConfigToken(resolvedConfigPath, providerId, profile);
            if (existing === CONFIG_BINDING_MISMATCH) {
              fail("needs_reconnect", "transport_binding_mismatch");
            }
            const sessionToken = await redeemCode(normalizedCode);
            writeConnectorConfig(resolvedConfigPath, sessionToken, providerId, profile);
            // The token variable dies here; the result names only the fact.
            return toolSuccess(Object.freeze({
              paired: true,
              providerId,
              message: "Paired to your YipYap account. The credential is stored locally and never shown.",
            }));
          }
          case "providerReadConnectionStatus": {
            clearTeachingCycle();
            parseToolArguments(parseEmptyArguments, args);
            const sessionToken = tokenFrom(resolvedGetToken);
            const status = await readBinding(sessionToken);
            readCycle = status.visible.converged === true
              && ["connection.status", "teaching.read", "lexicon.read"]
                .every((scope) => status.visible.grantedScopes.includes(scope))
              ? Object.freeze({
                tokenDigest: sessionTokenDigest(sessionToken),
                transportBindingKey: selectedTransportBindingKey,
                binding: status.binding,
                settings: null,
              })
              : null;
            return toolSuccess({ status: status.visible });
          }
          case "providerReadTeachingSettings": {
            parseToolArguments(parseEmptyArguments, args);
            const sessionToken = tokenFrom(resolvedGetToken);
            const tokenDigest = sessionTokenDigest(sessionToken);
            if (
              readCycle === null
              || readCycle.tokenDigest !== tokenDigest
              || readCycle.transportBindingKey !== selectedTransportBindingKey
            ) {
              clearTeachingCycle();
              fail("needs_reconnect", "read_cycle_invalid");
            }
            const settings = parseSettings(
              await callCallable("providerReadTeachingSettings", {}, sessionToken),
            );
            readCycle = Object.freeze({ ...readCycle, settings });
            return toolSuccess({ settings });
          }
          case "providerReadTeachingContext": {
            const signals = parseToolArguments(parseContextArguments, args);
            const sessionToken = tokenFrom(resolvedGetToken);
            const tokenDigest = sessionTokenDigest(sessionToken);
            if (
              readCycle === null
              || readCycle.settings === null
              || readCycle.tokenDigest !== tokenDigest
              || readCycle.transportBindingKey !== selectedTransportBindingKey
            ) {
              clearTeachingCycle();
              fail("needs_reconnect", "read_cycle_invalid");
            }
            const context = parseContext(
              await callCallable("providerReadTeachingContext", signals, sessionToken),
            );
            if (context !== null && !settingsMatchContext(readCycle.settings, context)) {
              clearTeachingCycle();
              fail("invalid_response", "settings_context_mismatch");
            }
            proposalWindow = context === null
              ? null
              : Object.freeze({
                tokenDigest,
                transportBindingKey: selectedTransportBindingKey,
                binding: readCycle.binding,
                languageTag: context.languageTag,
                script: context.script,
                remaining: 2,
              });
            readCycle = null;
            return toolSuccess(context === null
              ? { context: null, effectiveLevel: 0 }
              : { context });
          }
          case "providerReadLexiconProjection": {
            const request = parseToolArguments(parseProjectionArguments, args);
            clearTeachingCycle();
            const lexiconRead = parseLexiconRead(
              await callCallable("providerReadLexiconProjection", request),
              request,
            );
            return toolSuccess(lexiconRead);
          }
          case "providerSubmitLearnerEvent": {
            const event = parseToolArguments(parseEventArguments, args);
            try {
              const sessionToken = tokenFrom(resolvedGetToken);
              const tokenDigest = sessionTokenDigest(sessionToken);
              const status = await readBinding(sessionToken);
              if (status.visible.converged !== true) {
                fail("refused", "identity_conflict");
              }
              const requiredScope = REQUIRED_SCOPE_BY_EVENT_KIND[event.kind];
              if (!status.visible.grantedScopes.includes(requiredScope)) {
                fail("refused", "scope_denied");
              }
              if (event.kind === "item_proposed") {
                if (
                  proposalWindow === null
                  || proposalWindow.remaining < 1
                  || proposalWindow.tokenDigest !== tokenDigest
                  || proposalWindow.transportBindingKey !== selectedTransportBindingKey
                  || !sameBinding(proposalWindow.binding, status.binding)
                  || proposalWindow.languageTag !== event.languageTag
                  || proposalWindow.script !== event.script
                ) {
                  fail("refused", "identity_conflict");
                }
                proposalWindow = Object.freeze({
                  ...proposalWindow,
                  remaining: proposalWindow.remaining - 1,
                });
              }
              const boundEvent = Object.freeze({
                ...event,
                accountId: status.binding.accountId,
                installationId: status.binding.installationId,
                providerId: status.binding.providerId,
              });
              const receipt = parseEventReceipt(
                await callCallable(
                  "providerSubmitLearnerEvent",
                  { event: boundEvent },
                  sessionToken,
                ),
                status.binding,
                event,
              );
              if (event.kind === "item_proposed" && proposalWindow?.remaining === 0) {
                proposalWindow = null;
              }
              return toolSuccess(receipt);
            } catch (error) {
              if (event.kind === "item_proposed") {
                proposalWindow = null;
                return proposalSyncFailure(error);
              }
              throw error;
            }
          }
          default:
            fail("invalid_request", "unknown_tool");
        }
      } catch (error) {
        clearTeachingCycle();
        return toolFailure(error);
      }
    },
  });
}
