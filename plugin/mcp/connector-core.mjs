import { randomBytes } from "node:crypto";

/**
 * Yip-Yap account connector v1.
 *
 * This module is deliberately dependency-free. It owns the narrow trust
 * boundary between an MCP host and the five Firebase provider callables:
 * credentials come from the environment, service binding identities never
 * enter tool inputs, and account/installation/provider identities never leave
 * the connector in model-visible results.
 */

export const FIREBASE_CALLABLE_BASE =
  "https://us-central1-yipyap-language.cloudfunctions.net";
export const SESSION_TOKEN_ENV = "YIPYAP_SESSION_TOKEN";
export const CONNECTOR_VERSION = "0.2.0";

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
const AUTHORITY_BY_KIND = Object.freeze({
  item_proposed: "provider-suggestion",
  item_edited: "learner-confirmation",
  item_archived: "learner-confirmation",
  item_rendered: "provider-render-report",
  playback_completed: "provider-render-report",
  response_submitted: "yipyap-review-interaction",
  answer_revealed: "yipyap-review-interaction",
});
const PAYLOAD_KINDS = new Set(["item_proposed", "item_edited"]);
const MUTATING_KINDS = new Set(["item_edited", "item_archived"]);
const PERSONAL_ONLY_KINDS = new Set(["item_proposed", "item_edited", "item_archived"]);
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;

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

const PROJECTION_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({
    cursor: Object.freeze({ type: "string", pattern: "^cur_[A-Za-z0-9_-]{16,252}$" }),
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
        kind: Object.freeze({ enum: Object.freeze(Object.keys(AUTHORITY_BY_KIND)) }),
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

export const CONNECTOR_TOOLS = Object.freeze([
  Object.freeze({
    name: "providerReadConnectionStatus",
    description: "Read model-safe connection scopes and convergence status. Returns no binding IDs.",
    inputSchema: EMPTY_INPUT_SCHEMA,
  }),
  Object.freeze({
    name: "providerReadTeachingSettings",
    description: "Read the bounded Yip-Yap teaching settings projection.",
    inputSchema: EMPTY_INPUT_SCHEMA,
  }),
  Object.freeze({
    name: "providerReadTeachingContext",
    description: "Read a bounded teaching context using content-free per-reply zone signals.",
    inputSchema: CONTEXT_INPUT_SCHEMA,
  }),
  Object.freeze({
    name: "providerReadLexiconProjection",
    description: "Read one bounded page of the account lexicon projection.",
    inputSchema: PROJECTION_INPUT_SCHEMA,
  }),
  Object.freeze({
    name: "providerSubmitLearnerEvent",
    description:
      "Submit one bounded learner event. Binding, event, idempotency, and proposal identities are minted or injected internally.",
    inputSchema: EVENT_INPUT_SCHEMA,
  }),
]);

class ConnectorFailure extends Error {
  constructor(state, code) {
    super("Yip-Yap connector request failed.");
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

function parseProjection(result) {
  const wrapper = requireRecord(result);
  requireExactKeys(wrapper, new Set(["projection"]));
  const projection = requireRecord(wrapper.projection);
  if (projection.schema !== "yipyap.lexicon-projection.v1") {
    if (
      typeof projection.schema === "string"
      && /^yipyap\.lexicon-projection\.v\d+$/u.test(projection.schema)
    ) {
      fail("invalid_response", "contract_version_unsupported");
    }
    fail("invalid_response", "schema_invalid");
  }
  requireExactKeys(projection, new Set(["schema", "authority", "entries", "cursor"]));
  if (!Array.isArray(projection.entries) || projection.entries.length > 200) {
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
  const eventWithoutServerTime = { ...event };
  delete eventWithoutServerTime.serverRecordedAt;
  if (JSON.stringify(eventWithoutServerTime) !== JSON.stringify(submittedEvent)) {
    fail("invalid_response", "receipt_mismatch");
  }
  const item = parseReturnedItem(receipt.item, binding);
  if (item !== null && event.personalItemId !== item.personalItemId) {
    fail("invalid_response", "receipt_mismatch");
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

function createTransport({ getToken, fetchImpl, timeoutMs }) {
  return async function callCallable(name, input) {
    if (!CALLABLE_NAME_SET.has(name)) fail("invalid_request", "unknown_tool");
    const sessionToken = tokenFrom(getToken);
    const body = JSON.stringify({ data: { sessionToken, ...input } });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
      fail("invalid_request", "request_too_large");
    }
    const url = `${FIREBASE_CALLABLE_BASE}/${name}`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
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
          try {
            parseFirebaseEnvelope(responseText);
          } catch (error) {
            if (error instanceof ConnectorFailure && error.state !== "invalid_response") throw error;
          }
          if (attempt === 0 && retryableHttpStatus(response.status)) continue;
          if (response.status === 401) fail("needs_reconnect", "unauthenticated");
          fail("unavailable", "service_unavailable");
        }
        return parseFirebaseEnvelope(responseText).result;
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
  not_configured: "Yip-Yap is not set up for this host; use effective level L0.",
  needs_reconnect: "Yip-Yap needs to be reconnected; use effective level L0.",
  unavailable: "Yip-Yap is temporarily unavailable; use effective level L0.",
  refused: "Yip-Yap refused the request; use effective level L0.",
  invalid_response: "Yip-Yap returned an unusable response; use effective level L0.",
  invalid_request: "The Yip-Yap tool request was invalid; use effective level L0.",
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

/** Create a lazy connector. Construction performs no credential read and no network I/O. */
export function createYipYapConnector({
  providerId,
  getToken = () => process.env[SESSION_TOKEN_ENV],
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!PROVIDER_IDS.has(providerId)) throw new TypeError("Unsupported Yip-Yap provider id.");
  if (typeof getToken !== "function" || typeof fetchImpl !== "function") {
    throw new TypeError("Yip-Yap connector dependencies are invalid.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new TypeError("Yip-Yap connector timeout is invalid.");
  }
  const callCallable = createTransport({ getToken, fetchImpl, timeoutMs });

  async function readBinding() {
    return parseConnectionStatus(
      await callCallable("providerReadConnectionStatus", {}),
      providerId,
    );
  }

  return Object.freeze({
    tools: CONNECTOR_TOOLS,
    async callTool(name, args = {}) {
      try {
        switch (name) {
          case "providerReadConnectionStatus": {
            parseToolArguments(parseEmptyArguments, args);
            const status = await readBinding();
            return toolSuccess({ status: status.visible });
          }
          case "providerReadTeachingSettings": {
            parseToolArguments(parseEmptyArguments, args);
            const settings = parseSettings(
              await callCallable("providerReadTeachingSettings", {}),
            );
            return toolSuccess({ settings });
          }
          case "providerReadTeachingContext": {
            const signals = parseToolArguments(parseContextArguments, args);
            const context = parseContext(
              await callCallable("providerReadTeachingContext", signals),
            );
            return toolSuccess(context === null
              ? { context: null, effectiveLevel: 0 }
              : { context });
          }
          case "providerReadLexiconProjection": {
            const request = parseToolArguments(parseProjectionArguments, args);
            const projection = parseProjection(
              await callCallable("providerReadLexiconProjection", request),
            );
            return toolSuccess({ projection });
          }
          case "providerSubmitLearnerEvent": {
            const event = parseToolArguments(parseEventArguments, args);
            const status = await readBinding();
            const boundEvent = Object.freeze({
              ...event,
              accountId: status.binding.accountId,
              installationId: status.binding.installationId,
              providerId: status.binding.providerId,
            });
            const receipt = parseEventReceipt(
              await callCallable("providerSubmitLearnerEvent", { event: boundEvent }),
              status.binding,
              event,
            );
            return toolSuccess(receipt);
          }
          default:
            fail("invalid_request", "unknown_tool");
        }
      } catch (error) {
        return toolFailure(error);
      }
    },
  });
}
