# Connection and authority boundary v1

## Static help is outside the account path

Exact whole-message `YipYap help` returns the packaged static menu before any
startup, restore or ordinary account reads. It makes no Connector call, including
status, settings, context, lexicon, pairing and events. It starts no authorization,
settings write, update check/fetch/apply, installation or teaching footer.
It works without an account connection and asserts no current account state.
The later teaching path still requires its own fresh ordered reads.

## Keep activation layers independent

1. Package installation places a reviewed artifact on a provider host.
2. Plugin enablement makes the shared Skill and lifecycle carrier discoverable.
3. Root-session startup or restoration delivers the reviewed lifecycle marker.
4. An explicit setup request uses the host's supported authorization route:
   OAuth for hosted ChatGPT, or `yipyapPair` for a local connector host that
   exposes it. The provider or connector keeps credentials out of model context.
5. The authenticated transport can reach the bounded YipYap provider service.
6. A fresh binding round trip establishes Connected state.
7. Learning Mode is separately controlled by the account holder on a YipYap
   surface and evaluated privately by the service.
8. Complete, fresh, compatible settings and teaching context establish
   teaching readiness.

No layer implies a later one. Installing the plugin does not connect an account;
connecting an account does not enable Learning Mode; a stored level does not
prove that the current reply may be mixed.

## Fixed connector surface

The local provider bridge exposes
exactly one explicit pairing bootstrap plus five
authenticated provider operations at a fixed production service origin.
Hosted ChatGPT exposes only the five authenticated operations; its setup uses
the provider's OAuth flow, not a sixth remote tool:

| Operation | Purpose | Ordinary rendering |
| --- | --- | --- |
| `yipyapPair` | Local connector only: redeem one short app-issued code and persist the returned credential internally | Explicit local setup only; never automatic |
| `providerReadConnectionStatus` | Fresh binding, provider, scope, and convergence attestation | First read |
| `providerReadTeachingSettings` | Bounded track, language/script, stored level, revision, and version | Second read |
| `providerReadTeachingContext` | Generic readiness gate plus at most 12 eligible target/gloss entries | Third read |
| `providerReadLexiconProjection` | Explicit legacy bounded page or one versioned recent/summary My Lexicon read | Never automatic; exact command only |
| `providerSubmitLearnerEvent` | Closed provider event; ordinary teaching may use only bounded `item_proposed` membership sync | After a teaching-ready draft only; never gates the reply |

The app's AI-connections flow creates the short, single-use pairing code. On an
explicit local-connector setup request, `yipyapPair` normalizes and redeems that code exactly
once; it never retries an ambiguous redemption. The returned opaque, revocable
session credential is stored in host-local connector configuration outside
versioned plugin files. That credential is never a tool argument, model result,
prompt value, command-line argument, log field, or Firebase, Apple, or Google
credential. Pairing success proves only credential storage, not Connected or
teaching-ready state.

### Hosted authorization

Hosted ChatGPT uses OAuth through the provider-owned connection interface.
Never request a pairing code or credential in chat, call `yipyapPair`, create
a local credential file, or send the learner to a terminal for this route.
An explicit connection request may direct the learner to the supported
provider connection interface and YipYap walkthrough. If the exact listing or
connection route is unavailable, say so and use YipYap support; do not invent
a deep link, treat a generic directory as an installation, or fall back to the
local transport. Cancellation or refusal leaves authorization incomplete and
does not trigger an automatic retry. Only a fresh compatible status round trip
can establish Connected after the provider finishes OAuth.

This transport distinction changes no teaching procedure, scope, Learning Mode
or account authority. Installation and OAuth success alone never authorize
teaching; the same fresh status, settings and context gates still apply.

Connection status contains raw account and installation binding values only
inside the connector so it can validate the round trip. Strip those identities
before returning status to the Skill or model. Teaching settings and teaching
context contain no identity and no Learning Mode field.

The remote ChatGPT MCP result may additionally carry one identity-free
`workflowHandle` in the exact published `yyp_mcp_w1_` shape. It is a
five-minute current-reply capability used only because actual ChatGPT tool
execution does not reliably preserve the standard MCP session header. Pass it
unchanged from status into settings, from the exact settings echo into context,
and from a non-null context echo into each bounded `item_proposed` call. Never
render, quote, log, persist, transform, or carry it into another reply. Null,
missing, malformed, changed, stale, or unexpected handle state is effective L0
and clears pending proposals. The local connector returns no such field and
continues to enforce its process-memory coherence guard; never add a handle to
its closed input shapes.

Every authenticated provider request reauthenticates the credential. Do not
treat possession, a previous
success, or cached data as Connected. Missing local configuration is Not set
up. An invalid or revoked binding is Needs reconnect. A network or safe-carrier
failure is Unavailable. A credential whose round trip or shape cannot yet be
verified is Authorized but unverified. Every non-ready state uses effective L0.

## Read-first teaching boundary

For every potentially mixed root reply, including bootstrap and restore, use
the three ordered reads above. The context request may contain `redPresent` and
`mostlyFrozen` booleans and nothing from the conversation. A non-null context is usable only when its
contract, language, script, stored level, cap, entries, and settings agreement
all validate. Context `null` is the single generic unavailable result; do not
infer whether Learning Mode, settings, a track, or another private gate caused
it.

Any missing, malformed, stale, unsupported, mismatched, or unavailable result
fails the whole reply closed to effective L0. A complete non-null context with
zero entries is valid and may authorize generated items within its verified
dose and cap. Do not fall back to an old context, use pending proposals as
teaching eligibility, reconstruct vocabulary from history, create an offline
queue, or promise replay.

## Independent My Lexicon read boundary

The exact `yip new`, `yip new day`, `yip new week`, and `yip summary` controls
are explicit account-data reads, not teaching cycles. After exact command
matching, call `providerReadConnectionStatus` once and require a compatible,
converged result with `connection.status` and `lexicon.read`. Then call
`providerReadLexiconProjection` exactly once with the closed request in
`controls-v1.md`. Local and remote MCP surfaces use this same tool name.
Do not require `teaching.read`, teaching settings,
teaching context, or Learning Mode. Do not append teaching content or its
footer, and do not call the event operation.

Every explicit lexicon read clears any unfinished Rule 49 reply cycle and any
open proposal capacity before the read proceeds. It cannot preserve, reopen,
or create proposal authority. The unchanged legacy schema-less `{cursor?}`
request remains an explicit bounded-page path; the versioned recent and summary
requests do not widen that legacy shape.

Recent and summary responses contain only personal My Lexicon membership.
Migrated baseline vocabulary remains baseline-only unless an independent
proposal created or collapsed it into personal membership. Validate the whole
closed response before exposing any part of it. Preserve the server's inclusive
UTC windows, original capture timestamps, current active or archived labels,
and truncation signals. Treat `generatedAt` only as the response's
service-visibility snapshot and window anchor. Never derive teaching standing,
learner evidence, or complete totals from returned rows.

Startup must never begin authentication or consent, mutate Learning Mode,
create or reset an account learning session, persist a provider bootstrap
marker, inspect the public update channel, or write learner evidence. It also
does not flush pending proposals: proposal sync may run only after fresh
teaching readiness is established and a visible draft is settled. If the hook
is disabled, untrusted, skipped, or fails, package presence and implicit Skill
selection are not proof that automatic startup completed.

## Authority limits

The YipYap app and service own identity, installation binding, scope grants,
revocation, Learning Mode, durable settings, the master My Lexicon,
cross-provider canonicalization and duplicate collapse, evidence, review,
export, deletion, and server time. The AI and Skill own conversational teaching:
they prefer bounded supplied vocabulary and may generate context-relevant items
within the verified dose and cap. The plugin is not a second account store or
durable curriculum owner.

The fixed provider surface has no operation to grant or revoke scopes, toggle
Learning Mode, mutate teaching settings, import or migrate an account, export
or delete an account, or reach another installation. The model never chooses
account identity, installation identity, provider identity, authority rung,
event identity, or server time.

## Data minimization

Never send through the connector or persist as YipYap state:

- raw or quoted conversation text, transcripts, summaries, embeddings, prompts,
  hidden instructions, or chain-of-thought;
- message, conversation, provider-task, or provider-session identifiers, files,
  repository context, unrelated prose, free-form reasons, scores, or
  confidence;
- account credentials, provider tokens, identity-provider tokens, email
  addresses, raw account or installation identifiers, or another
  installation's token.

Quoting learner text back inside the same provider reply for an ephemeral
language correction does not cross this boundary. That text still must not be
sent to the connector, retained as YipYap state, or admitted as evidence.

The one narrow reply-local working-state exception is a maximum-12 ephemeral set of
exact `{languageTag, script, target, meaning}` tuples for generated items that
were actually rendered. No other field may enter that set. It is neither a
transcript nor learner state, and it must never be persisted or reconstructed
from chat. Start it empty for every teaching-ready reply and discard all of it
after that reply's proposal attempt or skip. Never carry it across replies,
resume, compact, pairing, reconnect, or settings state. The packaged local
connector binds the ordered status/settings/context reads and proposal window
to one non-model-visible credential digest and raw service binding, refusing a
change without returning either identity. The production HTTPS MCP facade must
prove equivalent binding coherence before release.

That connector guard is process memory, not an account or teaching cache. The
unfinished read guard contains only the credential digest, raw service binding,
and verified settings; successful context replaces it with a proposal guard
containing only the digest, raw binding, verified target track, and a remaining
count capped at two. Neither contains reply text or a pending vocabulary tuple.
A new status cycle, pairing, completion, or any failure clears the applicable
guard. Every potentially mixed reply must begin a new three-read cycle, so no
guard can authorize teaching in a later reply.

## Learner truth

A provider model can suggest but cannot author learner truth. Continued chat,
reading, repetition, model confidence, and provider rendering prove nothing
about exposure, recall, correctness, confirmation, mastery, or known status.
Ordinary rendering admits no evidence write. The only automatic write is a
best-effort `item_proposed` record for generated vocabulary membership and
provider provenance. No response-submission or answer-reveal producer is
authorized by this Skill.

`providerSubmitLearnerEvent` is not a general persistence channel. Its provider
schema admits exactly `item_proposed`, `item_edited`, `item_archived`,
`item_rendered`, and `playback_completed`. It never admits
`response_submitted` or `answer_revealed`, and the adapter never requests
`events.response`. During ordinary teaching the tool may send only
`item_proposed`, only from the exact bounded pending tuples, and only when fresh
status grants `lexicon.propose`. The remaining four admitted kinds require a
separately reviewed explicit learner action plus the necessary scope, closed
shape, idempotency, tenant, and evidence rules. Never derive an `item_rendered`,
`playback_completed`, response, reveal, grade, or learner-state claim from chat,
rendering, playback, or model judgment.

Proposal sync is deliberately lossy. Attempt at most two oldest reply-local
tuples per teaching-ready reply and stop on the first failure. Then discard the
entire set, including failed or unattempted entries. Missing scope, delay,
refusal, timeout, malformed receipt, overflow, or task end never fails teaching
and never creates a replay promise. The service, not the provider, canonicalizes
and merges proposals into the corresponding account track. Treat a proposal
receipt only as a success or failure signal; do not use its item or event
details as teaching context or learner state.

The server must enforce every scope, schema, tenant, idempotency, concurrency,
and evidence rule even if a model ignores this Skill.
