# YipYap (Language)

YipYap is one provider-neutral language-learning Skill for Claude
and ChatGPT/Codex. The AI is the conversational teacher: it prefers bounded
vocabulary supplied by YipYap and may generate useful new target-language
items within the verified level dose and introduction cap. The YipYap app and
service remain authoritative for account access, Learning Mode, durable
settings, the master My Lexicon, cross-provider combination and deduplication,
privacy, sync, review, and learner records.

A new or disconnected installation is safe by default: it operates at
effective level L0 and introduces no YipYap teaching items.

## What installation does

Installation makes the shared Skill and connector available. It does not:

- connect a YipYap account;
- enable Learning Mode;
- prove that a lifecycle hook ran;
- prove that current teaching context is available; or
- authorize the model to grade, promote, or save learner activity.

The connector reads fresh, bounded account projections when the current host
and account are ready. Ordinary reply shaping starts with connection status,
teaching settings, and teaching context reads. After a valid draft, the Skill
may best-effort sync a maximum-12, exact-tuple-deduplicated ephemeral set of
generated vocabulary through `item_proposed`; sync never gates teaching.

The v0.2.2 language boundary is multilingual: target and instruction pairs use
the packet's bounded BCP 47 tag grammar plus an explicit matching script. There
is no Spanish- or English-only allowlist. The six tracks in the pinned lexical
normalization vectors are conformance coverage, not the product boundary. A
host that cannot reliably render the selected contract-valid pair fails that
reply closed instead of inferring from locale or substituting a language.

The provider event tool admits only
`item_proposed`, `item_edited`, `item_archived`, `item_rendered`, and
`playback_completed`. Review-only `response_submitted` and `answer_revealed`
are structurally unavailable to provider hosts; no adapter requests
`events.response`. Automatic teaching uses only `item_proposed` for vocabulary
membership/provenance; the other admitted kinds still require a separately
reviewed explicit learner action.

## Behavior by surface

Lifecycle hooks are not universal across provider products. The plugin makes
only these bounded claims:

| Surface | Startup behavior |
| --- | --- |
| Claude Code or Cowork | A supported host may run the packaged, trusted `SessionStart` carrier. When it does, the carrier invokes the shared Skill for a fresh root task or restores it after continuation. Installation alone is not evidence that the carrier ran. |
| Claude Chat | Ordinary Claude Chat does not run the packaged lifecycle hook. Invoke YipYap explicitly. |
| Codex | A Codex host that supports and runs the packaged lifecycle carrier may bootstrap or restore the shared Skill. Verify the current host before claiming automatic startup. |
| ChatGPT | ChatGPT does not run Codex lifecycle hooks. Invoke YipYap explicitly; the connected public-directory experience also depends on the app-owned remote MCP service. |

When a carrier is disabled, untrusted, skipped, unsupported, or fails, the
Skill remains explicitly invocable. The plugin must not claim automatic
startup merely because it is installed, enabled, or selected by the host.

## Three Claude use cases

1. **Check setup truth.** Ask, “Use YipYap to show my current setup
   status.” The reply separates installation, startup, connection, stored
   level, and effective level instead of inferring one from another.
2. **Understand the learning model.** Ask, “Use YipYap to explain
   how its levels work.” The Skill can explain the published teaching rules
   without claiming access to private account state.
3. **Use bounded immersion during ordinary work.** Ask, “Use YipYap
   while helping me plan my day.” Mixed language appears only when fresh
   connection, settings, private Learning Mode, and teaching-context gates all
   pass. The AI follows the verified active language and script, prefers
   supplied vocabulary, may generate within the cap, and adds a compact
   current-reply level/new/review footer. Otherwise the complete reply remains
   at effective L0.

These examples work through explicit invocation even on a Claude surface that
does not execute plugin hooks.

## Explicit fallback

If automatic startup is unavailable, say:

> Use YipYap for this reply. Check the current connection before
> using any teaching context, and use effective L0 if it cannot be verified.

On hosts that expose Skill names directly, `$yipyap-language` is the equivalent
explicit selection. Explicit invocation does not turn Learning Mode on and
does not permit cached teaching context.

## Pairing and privacy boundary

Account pairing is app-led. Provide only the short, one-time pairing code
created by the YipYap app through the host's supported plugin invocation
path. Never paste a YipYap session token into a conversation, command,
configuration prompt, log, issue, or support message. The connector redeems
the one-time code, stores the resulting credential locally, and never returns
that credential to the model.

The Skill contract forbids sending conversation text, prompts, transcripts,
hidden instructions, files, repository context, embeddings, provider task or
session identifiers, email addresses, or identity-provider credentials to
YipYap. The teaching-context request mechanically contains only two content-free
booleans describing the reply's safety zones, and raw account/installation
identities are stripped from model output. The closed proposal schema admits
only target, meaning, and track, but code cannot prove semantically that a model
did not copy those strings from conversation; compliance therefore also relies
on the Skill instruction and service-side validation/abuse controls.

The model cannot infer learner truth from conversation. Displaying, repeating,
correcting, or syncing text does not prove exposure, recall, correctness,
mastery, or known status. A generated `item_proposed` sync records only
vocabulary membership and provider provenance. Its reply-local tuple contains
only the verified target track, target item, and instruction-language
meaning—never conversation text, identifiers, scores, evidence, or unrelated
context. The full set is discarded after that reply's bounded attempt.

To prevent account-switch races, the local connector holds two bounded,
process-memory-only coherence guards between calls: one for the ordered
status/settings/context cycle and one for at most two proposal attempts after
context. They contain credential digests and raw binding facts that never reach
the model, plus settings/track/count as needed; they contain no conversation or
pending vocabulary text, persist nowhere, and clear on a new status cycle,
pairing, completion, or failure.

See [SETUP.md](SETUP.md) for runtime, pairing, reconnect, and troubleshooting
details.
