# Yip-Yap Language

Yip-Yap Language is one provider-neutral language-learning Skill for Claude
and ChatGPT/Codex. It can shape an ordinary reply with a small, bounded set of
language items selected by the Yip Yap service. The Yip Yap app and service,
not the plugin or model, remain authoritative for account access, Learning
Mode, teaching settings, curriculum selection, and learner records.

A new or disconnected installation is safe by default: it operates at
effective level L0 and introduces no Yip-Yap teaching items.

## What installation does

Installation makes the shared Skill and connector available. It does not:

- connect a Yip Yap account;
- enable Learning Mode;
- prove that a lifecycle hook ran;
- prove that current teaching context is available; or
- authorize the model to grade, promote, or save learner activity.

The connector reads fresh, bounded account projections when the current host
and account are ready. Ordinary reply rendering uses connection status,
teaching settings, and teaching context reads. It does not submit a learner
event.

## Behavior by surface

Lifecycle hooks are not universal across provider products. The plugin makes
only these bounded claims:

| Surface | Startup behavior |
| --- | --- |
| Claude Code or Cowork | A supported host may run the packaged, trusted `SessionStart` carrier. When it does, the carrier invokes the shared Skill for a fresh root task or restores it after continuation. Installation alone is not evidence that the carrier ran. |
| Claude Chat | Ordinary Claude Chat does not run the packaged lifecycle hook. Invoke Yip-Yap Language explicitly. |
| Codex | A Codex host that supports and runs the packaged lifecycle carrier may bootstrap or restore the shared Skill. Verify the current host before claiming automatic startup. |
| ChatGPT | ChatGPT does not run Codex lifecycle hooks. Invoke Yip-Yap Language explicitly; the connected public-directory experience also depends on the app-owned remote MCP service. |

When a carrier is disabled, untrusted, skipped, unsupported, or fails, the
Skill remains explicitly invocable. The plugin must not claim automatic
startup merely because it is installed, enabled, or selected by the host.

## Three Claude use cases

1. **Check setup truth.** Ask, “Use Yip-Yap Language to show my current setup
   status.” The reply separates installation, startup, connection, stored
   level, and effective level instead of inferring one from another.
2. **Understand the learning model.** Ask, “Use Yip-Yap Language to explain
   how its levels work.” The Skill can explain the published teaching rules
   without claiming access to private account state.
3. **Use bounded immersion during ordinary work.** Ask, “Use Yip-Yap Language
   while helping me plan my day.” Mixed language appears only when fresh
   connection, settings, private Learning Mode, and teaching-context gates all
   pass. Otherwise the complete reply remains at effective L0.

These examples work through explicit invocation even on a Claude surface that
does not execute plugin hooks.

## Explicit fallback

If automatic startup is unavailable, say:

> Use Yip-Yap Language for this reply. Check the current connection before
> using any teaching context, and use effective L0 if it cannot be verified.

On hosts that expose Skill names directly, `$yipyap-language` is the equivalent
explicit selection. Explicit invocation does not turn Learning Mode on and
does not permit cached teaching context.

## Pairing and privacy boundary

Account pairing is app-led. Provide only the short, one-time pairing code
created by the Yip Yap app through the host's supported plugin invocation
path. Never paste a Yip Yap session token into a conversation, command,
configuration prompt, log, issue, or support message. The connector redeems
the one-time code, stores the resulting credential locally, and never returns
that credential to the model.

The language connector does not send conversation text, prompts, transcripts,
hidden instructions, files, repository context, embeddings, provider task or
session identifiers, email addresses, identity-provider credentials, or raw
account and installation identifiers to Yip Yap. The teaching-context request
contains only two content-free booleans describing the reply's safety zones.

The model cannot infer learner truth from conversation. Displaying, repeating,
or correcting text does not prove exposure, recall, correctness, mastery, or
known status, and ordinary rendering writes nothing to the Yip Yap account.

See [SETUP.md](SETUP.md) for runtime, pairing, reconnect, and troubleshooting
details.
