# Fresh-session startup and invocation v1

This reference owns provider lifecycle dispatch into the shared Skill. It does
not own teaching meaning, account state, connector authority, or an account
learning-session lifecycle.

## Keep the gates independent

Never collapse these facts:

1. The package is installed on the provider host.
2. The plugin is enabled and its Skill is discoverable.
3. The root provider session received `YIPYAP_SESSION_BOOTSTRAP_V1` from the
   plugin-bundled lifecycle carrier, or received
   `YIPYAP_SESSION_RESTORE_V1` while continuing an established scope.
4. The Connector has one of the six states in `controls-v1.md`.
5. The account-held Learning Mode is verified on or off.
6. Teaching context is complete, fresh, compatible, and supported.

Installation or enablement does not prove that the hook ran. Hook delivery does
not prove account connection or Learning Mode. Connected does not prove that
Learning Mode is on, and mode on does not prove teaching readiness.

## Define one provider bootstrap scope

A provider bootstrap scope is one top-level, user-visible provider task. It is
not an account learning session.

The packaged `SessionStart` carrier dispatches the bootstrap marker on
`startup`, `clear`, and `fork`. Those sources begin a fresh provider bootstrap
scope. `fork` is currently a Claude Code source; Codex currently emits only
the other four reviewed sources. The carrier dispatches the restore marker on
`resume` and `compact`. Those sources continue the existing scope and must not
start a second bootstrap or reset a session override, pause, banner, mixer, or
account learning session. Vocabulary proposal state is never restored or
reconstructed: every teaching-ready reply creates and destroys its own bounded
set. A host-specific lifecycle source that v1 does not recognize is not proof
of startup completion or restoration.

Claude Code before 2.1.214 reports a fork as `resume`, so it cannot distinguish
a fresh fork from a same-scope resume through this static carrier. Such a host
is not fork-auto-launch-ready and must not claim complete fresh-session parity.

Within one scope:

- automatic bootstrap dispatch happens once before the first user-visible
  reply;
- later explicit invocation reuses the established scope and never starts a
  second mixer or bootstrap;
- restore dispatch reloads this contract without treating continuation as a
  fresh scope. It may use only provider-native context already belonging to
  that scope; if required context is unavailable after compaction, fail closed
  instead of reconstructing it from chat history;
- subagents and delegated workers do not bootstrap, call the Connector, render
  a banner or footer, or hold a session override; and
- provider-native ephemeral context is the only place that may remember the
  bootstrap. Reply-local vocabulary tuples exist only while settling and
  syncing one teaching-ready reply. Never create a file, database row,
  environment marker, durable queue, or account record for either purpose. The
  connector may retain only its bounded in-process coherence guards: the raw
  binding plus token digest and settings between the three ordered reads, then
  the raw binding, token digest, track, and remaining count for at most two
  proposal attempts. Those guards contain no prompt, reply, vocabulary tuple,
  or learner evidence; they clear on a new status cycle, pairing, completion,
  or any connector failure and never authorize a later reply.

If a provider cannot distinguish root `startup`, `clear`, or `fork` from
continuation and subagent events, it is not auto-launch-ready.

## Run a read-first bootstrap

The carrier itself emits only the fixed lifecycle markers. It ignores hook
input, reads no files or environment state, performs no network request, and
writes nothing.

The connected profile uses its already-authorized fixed connector before the
first visible root reply and repeats the cycle before every later root reply
that might contain YipYap teaching. It calls connection status, teaching
settings, and teaching context in that order. The context request carries only
`redPresent` and `mostlyFrozen`, the two content-free booleans derived after
the correct answer has been drafted and zoned. It never sends the draft,
prompt, or conversation.

The three fresh reads are required for every potentially mixed root reply,
including the first reply in a new scope and the first reply after a restore.
Do not substitute a prior response or locally cached vocabulary. A verified
stored level is reportable but insufficient for teaching: only a complete,
compatible, non-null teaching context authorizes mixing. Any missing,
malformed, stale, revoked, unsupported, mismatched, or unavailable result
settles the whole reply at effective L0.

The read-first bootstrap itself must never:

- launch authentication, authorization, consent, or setup UI automatically;
- enable, disable, or otherwise mutate Learning Mode;
- create, resume, reset, or infer an account learning session;
- send a prompt, reply, transcript, repository context, message identifier,
  provider-task identifier, or provider-session identifier;
- write learner evidence, settings, vocabulary proposals, operational retries,
  or telemetry content;
  or
- reconstruct state from provider history.

The app-owned interface defines per-call authority. Every call reauthenticates
the opaque session token; success is not permanent authority to keep mixing
after a response becomes stale or the binding is revoked.

## Decide activation without a magic phrase

For the connected profile:

```text
teaching-ready =
  plugin enabled
  AND root-session bootstrap completed
  AND Connector Connected and fresh
  AND account Learning Mode on
  AND complete compatible settings
  AND complete compatible selector/gloss context
  AND supported level
```

When every gate passes, ordinary work may be shaped without the learner
re-invoking the Skill or remembering a command in each task. Stored L0 still
intentionally produces no mixed prose; pause remains unavailable until its
owner contract is published.

When any required input is absent, malformed, stale, expired, unauthorized,
mismatched, or incompatible, use effective L0 immediately. Do not use cached
mixing, pending proposals as teaching input, start authorization, write state,
create a durable retry, or promise later replay. Once teaching readiness is
freshly established, the separate best-effort proposal flush may run after the
visible draft is settled; its failure never changes that reply.

## Keep startup quiet and truthful

- Not-set-up, authorizing, unverified, and connected-but-context-unavailable
  states remain silent during unrelated ordinary work.
- A teaching-ready profile may show one compact activation banner in
  the first root reply only when a separately reviewed presentation contract
  supplies it.
- A connected profile that becomes unavailable or needs reconnect may
  show one concise fail-closed warning when the state changes, not every turn.
- `YipYap status` may show each independent gate explicitly; legacy
  `Yip-Yap status` and spoken `Yip Yap status` remain accepted aliases.
- Resume, compaction, explicit re-invocation, and subagent work never repeat an
  activation banner.

If the hook is disabled, untrusted, skipped, malformed, or fails, automatic
startup is not complete. Direct Skill invocation remains available, but the
provider must not claim auto-launch parity from installation or implicit Skill
selection alone.

If startup or restoration fails, fail closed to effective L0 with no cached
mixing, durable retry, or replay. There is no cross-reply proposal set to
restore.
