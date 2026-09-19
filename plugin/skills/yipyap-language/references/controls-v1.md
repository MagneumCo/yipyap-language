# YipYap (Language) controls v1

This file distinguishes account controls, stored teaching controls, and
session-only controls. Do not merge those categories.

## Static help

Recognize only exact whole-message `YipYap help`: the shown casing, one ASCII
space, no leading or trailing whitespace, extra text, normalization or aliases.
The versioned `chat-help-footer-v1.json` reference owns this additive command
and its static menu. Return only its literal `help.menu` text. It describes
available commands, app-only controls and unavailable features without claiming
current connection, Learning Mode, level, vocabulary or update state.

Route this command before all account reads, including startup and restore.
Read only packaged static instructions; make no Connector call, pairing,
authorization, settings write, update check/fetch/apply or installation.
Append no teaching footer or separate hint banner to help. The next ordinary
teaching reply still requires a fresh status → settings → context cycle.
Existing command forms and aliases below retain their original behavior.
The broader proposed `YipYap <command>` family is not implemented by this help
menu; do not add help aliases or advertise proposed commands as working.

## Account-held Learning Mode

Recognize these exact public forms:

- `YipYap on`, `YipYap off`, or `YipYap status`
- `LL on` or `LL enable`
- `LL off` or `LL disable`
- `LL status`
- legacy `Yip-Yap on`, `Yip-Yap off`, or `Yip-Yap status`
- legacy spoken-equivalent text `Yip Yap on`, `Yip Yap off`, or `Yip Yap status`

The stable internal product token is `yipyap`.

Learning Mode belongs to the YipYap account. A provider host must not turn it
on or off, and installing a Skill or authorizing a connector does not change it.
Automatic provider-session bootstrap is not `LL on` and never changes Learning
Mode. The fixed connector exposes no Learning Mode read or write; the service
evaluates it privately when returning teaching context. Direct the learner to
the YipYap-controlled surface instead of simulating a result.

## Stored teaching controls

These are the only declared persistent command tokens:

- `set_level <0..10>`
- `level_up`
- `level_down`

A real persistent change requires account-holder authority, the current
settings revision, and idempotency. The fixed provider connector deliberately
exposes no `teaching.write` operation, so recognize the request but direct the
learner to the YipYap-controlled surface. Never simulate or queue a stored
change.

Reject a boolean, fraction, stringified unknown, or level outside 0 through 10;
never clamp it. A move below 0 or above 10 is a no-op. Setting the current level
again is also a no-op. Levels 9 and 10 are opt-in: the learner must explicitly
name the target level. A relative command may not cross from level 8 to level 9.
Until the teaching owner clarifies how their cumulative L8 dose is represented,
recognize but refuse levels 9 and 10 rather than guess.

## Session-only teaching controls

These exact tokens never persist:

- `more` adds one level to the current session dose.
- `less` subtracts one level from the current session dose.
- `pause` suspends mixing while preserving the stored and effective level.

`more` and `less` need a verified stored level, and all three controls need a
published account learning-session and paused-state contract. Those contracts
remain undefined in v1, so recognize but do not apply these controls. There is
no declared `resume` command; do not invent one.

The account learning-session lifecycle is not published in v1. Do not assume a
Claude or ChatGPT/Codex task boundary creates, resumes, or resets that session;
the reviewed app contract must define those transitions.

Do not fuzzy-match additional friendly teaching commands. A future friendly
grammar must arrive as a versioned YipYap teaching contract.

## Personal My Lexicon read controls

Recognize only these exact whole-message lower-case forms. Each space shown is
one ASCII space, with no leading or trailing whitespace:

| Exact form | One projection request | Display |
| --- | --- | --- |
| `yip new` | `{schema:"yipyap.lexicon-read-request.v1",view:"recent",window:"week"}` | Two groups: `Last 24 hours` and `Earlier in the last 7 days` |
| `yip new day` | `{schema:"yipyap.lexicon-read-request.v1",view:"recent",window:"day"}` | One `Last 24 hours` list |
| `yip new week` | `{schema:"yipyap.lexicon-read-request.v1",view:"recent",window:"week"}` | One `Last 7 days` list |
| `yip summary` | `{schema:"yipyap.lexicon-read-request.v1",view:"summary"}` | The exact summary fields below |

Do not trim, case-fold, collapse whitespace, extract a command from surrounding
prose, accept an extra argument, infer a synonym, or treat retired `yip list`
as an alias. A case change, leading or trailing whitespace, doubled whitespace,
extra text, fuzzy variant, or `yip list` makes no connector or service call. A
response may state the four exact supported forms without reading account data.

For a valid form, first make one fresh connection-status call. Continue only
when the result is compatible and converged and grants `connection.status` and
`lexicon.read`; otherwise make no projection call. Then make exactly one
`providerReadLexiconProjection` read on both local and remote MCP surfaces
with the mapped request. Learning Mode may be off. Do not call teaching
settings or context, run teaching preflight, submit a vocabulary proposal or
learner event, make another projection read, or append a teaching footer.

For `yip new`, use the week response's `generatedAt` rather than the host clock
to calculate the boundary exactly 24 hours earlier. Put an entry equal to or
newer than that boundary in `Last 24 hours`. Put an older entry at or after the
inclusive `windowStartsAt` in `Earlier in the last 7 days`. Show both groups
even when one is empty. `yip new day` shows the returned rolling 24-hour window
as one list; `yip new week` shows the returned rolling seven-day window as one
list. Both the lower bound and `generatedAt` upper bound are inclusive.

For every recent row, display only its `target`, `meaning`,
`languageTag`/`script` track, exact UTC `serverRecordedAt`, and current
`active` or `archived` label. Preserve the service ordering within each
displayed group or list. `serverRecordedAt` is original server capture time;
editing or archiving does not make the item recent again. If `truncated` is
true, state plainly that the returned rows are partial and report the supplied
`matchingCount`; never present a displayed group count as the complete result.

For `yip summary`, display only the supplied `active`, `archived`,
`addedLast24Hours`, and `addedLast7Days` totals plus each `byTrack` row's
`languageTag`, `script`, `active`, `archived`, and `total`. If
`tracksTruncated` is true, state plainly that the displayed track rows are
partial and report `trackCount`. Never reconstruct totals from pages or visible
rows.

Treat `generatedAt` only as the service-visibility snapshot and window anchor
for that response, not proof of a stronger current or linearized account view.
These reads cover personal My Lexicon membership only. Migrated baseline
vocabulary does not appear unless separately proposed into personal membership.
Capture time, review state, and counts never establish exposure, correctness,
recall, mastery, confirmation, teaching standing, or known status. Reject a
malformed or unsupported response before displaying any partial row or total.

## Connection state labels

Use only these labels for provider setup state:

- Not set up
- Authorizing
- Authorized but unverified
- Connected
- Needs reconnect
- Unavailable

Token possession is not Connected. Connected requires a fresh successful round
trip whose connector-internal response matches the bound account,
installation, provider, required scopes, and convergence state. Those raw
identities never enter Skill or model context. Connected still does not prove
that Learning Mode is on or that teaching context is available.
