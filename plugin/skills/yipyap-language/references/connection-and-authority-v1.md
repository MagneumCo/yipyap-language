# Connection and authority boundary v1

## Keep activation layers independent

1. Package installation places a reviewed artifact on a provider host.
2. Plugin enablement makes the shared Skill and lifecycle carrier discoverable.
3. Root-session startup or restoration delivers the reviewed lifecycle marker.
4. The fixed connector can reach the bounded Yip-Yap provider service with a
   locally configured opaque session token.
5. A fresh binding round trip establishes Connected state.
6. Learning Mode is separately controlled by the account holder on a Yip-Yap
   surface and evaluated privately by the service.
7. Complete, fresh, compatible settings and teaching context establish
   teaching readiness.

No layer implies a later one. Installing the plugin does not connect an account;
connecting an account does not enable Learning Mode; a stored level does not
prove that the current reply may be mixed.

## Fixed connector surface

The provider bridge exposes exactly these five operations and a fixed
production service origin:

| Operation | Purpose | Ordinary rendering |
| --- | --- | --- |
| `providerReadConnectionStatus` | Fresh binding, provider, scope, and convergence attestation | First read |
| `providerReadTeachingSettings` | Bounded track, language/script, stored level, revision, and version | Second read |
| `providerReadTeachingContext` | Generic readiness gate plus at most 12 eligible target/gloss entries | Third read |
| `providerReadLexiconProjection` | Explicit bounded lexicon-page request | Never automatic |
| `providerSubmitLearnerEvent` | Separately reviewed, explicitly requested closed event | Never during rendering |

The connector uses one opaque, revocable token created through the Yip-Yap
app's AI-connections flow. It is stored in host-local connector configuration,
outside versioned plugin files. The token is never a tool argument, model
result, prompt value, command-line argument, log field, or Firebase, Apple, or
Google credential.

Connection status contains raw account and installation binding values only
inside the connector so it can validate the round trip. Strip those identities
before returning status to the Skill or model. Teaching settings and teaching
context contain no identity and no Learning Mode field.

Every request reauthenticates the token. Do not treat possession, a previous
success, or cached data as Connected. Missing local configuration is Not set
up. An invalid or revoked binding is Needs reconnect. A network or safe-carrier
failure is Unavailable. A credential whose round trip or shape cannot yet be
verified is Authorized but unverified. Every non-ready state uses effective L0.

## Read-first teaching boundary

At a root bootstrap or restore, use only the three ordered reads above. The
context request may contain `redPresent` and `mostlyFrozen` booleans and
nothing from the conversation. A non-null context is usable only when its
contract, language, script, stored level, cap, entries, and settings agreement
all validate. Context `null` is the single generic unavailable result; do not
infer whether Learning Mode, settings, a track, or another private gate caused
it.

Any missing, empty, malformed, stale, unsupported, mismatched, or unavailable
result fails the whole reply closed to effective L0. Do not fall back to an old
context, local vocabulary, history reconstruction, offline queue, or promised
replay.

Startup must never begin authentication or consent, mutate Learning Mode,
create or reset an account learning session, persist a provider bootstrap
marker, inspect the public update channel, or write learner state. If the hook
is disabled, untrusted, skipped, or fails, package presence and implicit Skill
selection are not proof that automatic startup completed.

## Authority limits

The Yip-Yap app and service own identity, installation binding, scope grants,
revocation, Learning Mode, settings, master lexicon, selection, evidence,
export, deletion, and server time. The plugin shapes replies from bounded
projections; it is not a second account store or curriculum owner.

The fixed provider surface has no operation to grant or revoke scopes, toggle
Learning Mode, mutate teaching settings, import or migrate an account, export
or delete an account, or reach another installation. The model never chooses
account identity, installation identity, provider identity, authority rung,
event identity, or server time.

## Data minimization

Never send through the connector or persist as Yip-Yap state:

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
sent to the connector, retained as Yip-Yap state, or admitted as evidence.

## Learner truth

A provider model can suggest but cannot author learner truth. Continued chat,
reading, repetition, model confidence, and provider rendering prove nothing
about exposure, recall, correctness, confirmation, mastery, or known status.
Ordinary rendering calls no write operation. No response-submission or
answer-reveal producer is authorized by this Skill.

`providerSubmitLearnerEvent` is not a general persistence channel. It remains
unused unless a separately reviewed, explicit learner action supplies an
allowed event kind and the service confirms the necessary scope, closed shape,
idempotency, tenant, and evidence rules. Never derive such an event from chat,
rendering, playback, or model judgment.

The server must enforce every scope, schema, tenant, idempotency, concurrency,
and evidence rule even if a model ignores this Skill.
