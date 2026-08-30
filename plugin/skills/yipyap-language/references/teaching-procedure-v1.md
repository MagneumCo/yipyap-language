# Teaching procedure v1

This is a readable projection of the versioned YipYap teaching-behavior
contract, schemaVersion 1. That contract is authoritative; this Skill consumes
it. The copied conformance corpus, not this prose, is the executable authority
for settled operations. If owner prose and a vector disagree, the plugin must
not choose a local meaning; keep the affected behavior unavailable until
YipYap publishes a versioned clarification.

The procedure shapes a reply after correct content has been drafted. The AI is
the conversational teaching surface: it prefers eligible vocabulary supplied
by YipYap and may generate the best context-relevant target-language items
needed to fill the verified dose within the introduction cap. It does not alter
curated curriculum meaning, render audio, grade, persist settings, or admit
learner evidence. It may also provide an ephemeral translation or correction
when the learner directly asks or writes target-language text.

## Eight corpus operations

The procedure consumes exactly these operations: `quota`, `zone`,
`restatement`, `introductionCap`, `glossRequired`, `effectiveLevel`,
`promotionProposal`, and `production`. They account for 65 of the 114 corpus
cases. The teaching-state half accounts for the other 49.

## Level dose

| Level | Name | Exact dose |
| --- | --- | --- |
| 0 | Apagado | zero mixed items; the declared footer-word dose cannot run without an eligible selector |
| 1 | Turista | 1–2 items per reply |
| 2 | Cliente | 1 item per paragraph |
| 3 | Aprendiz | 1–2 items per paragraph |
| 4 | Ayudante | 1 item per sentence |
| 5 | Técnico | 1 item per sentence plus 1 full target-language sentence per paragraph |
| 6 | Instalador | 1 item per GREEN sentence; every other GREEN sentence is wholly target-language |
| 7 | Maestro | 1 item per sentence; only 2 instruction-language lines survive |
| 8 | Contratista | all mixable prose is target-language |
| 9 | Ingeniero | opt-in by explicit name; cumulative-dose inheritance awaits owner clarification |
| 10 | El Inge | opt-in by explicit name; cumulative-dose inheritance awaits owner clarification |

The numbers are integer budgets, not percentages. Do not interpolate a new
level or register from a name. Do not activate levels 9 or 10 until the teaching
owner clarifies how their cumulative L8 dose is represented in the conformance
contract.

## Ordered reply zones

Classify segments in this precedence:

1. RED: a command the learner will run; a numeric limit, threshold, or
   instruction-relevant value; a destructive confirmation; a safety warning;
   any physical action; or ambiguous content. Apply the hands rule: if the
   learner is being told to do something with their hands, it is RED.
2. FROZEN: machine text such as code, non-executed command examples, paths,
   URLs, identifiers, logs, error text, numbers with units, register/pin/signal
   names, table data, and other text whose exact bytes matter.
3. GREEN: ordinary prose eligible for mixing.

RED overrides FROZEN and FROZEN overrides GREEN. Ambiguity resolves to RED.
Only GREEN is mixable. At level 6 and above a non-warning RED line may receive a
separate target-language restatement beside the instruction-language line; it
never replaces the original. Warnings and destructive confirmations never get
a restatement at any level.

For an active real-world safety incident, hardware fault, or destructive
operation, make the entire reply effective L0. An ordinary app, build, cloud,
or deployment failure does not trigger the whole-reply override; its RED and
FROZEN segments remain protected by normal zoning.

The consumer's presentation format wins over mixing. Do not put teaching text
in commands, code, commit messages, approval prompts, notifications,
machine-consumed output, or generated artifacts. Teaching belongs only in
learner-chosen conversational prose.

## New-item cap

Maximum newly introduced items per reply:

- level 0: 0
- levels 1–3: 2
- levels 4–6: 3
- levels 7–10: 4

If RED content is present or the reply is mostly FROZEN, halve the cap once by
floor division. If both are true, still halve only once. At active levels the
halved cap has a minimum of one; level 0 remains zero.

## Glosses

Keep the instruction-language gloss until the learner personally confirms the
item. Exposure count, age, and labels such as known or retired do not remove a
gloss. The provider surface has no reviewed confirmation producer, so it must
not claim any item is confirmed.

Place a new item's gloss inline at its first use. Flag a false friend on first
use. While mixing is active, reserve italics for target-language teaching
tokens and use instruction-language emphasis separately. Do not open an
instruction-language verdict with an unglossed new item. At levels where the
contract preserves an instruction-language verdict tag or summary line, keep
those survivors intact.

## Selection and generation inside a reply

The account service supplies the active target-language track, instruction
language, stored level, introduction cap, and bounded preferred vocabulary.
Use only those verified language and script values; never infer a language from
locale or assume that every account uses Spanish. An absent or unsupported
active track or instruction language forces effective L0.

For v0.2.2, the connector's support predicate is the published packet's closed
BCP 47 language-tag grammar plus an explicit ISO 15924 script whose embedded
script subtag, when present, agrees. This applies equally to target and
instruction languages; there is no Spanish or English allowlist. The six
tracks covered by the pinned lexical-normalization vectors (`es-MX`, `fr-FR`,
`de-DE`, `it-IT`, `nb-NO`, and `zh-Hans-CN`) are conformance coverage, not the
product boundary. A host that cannot reliably render a contract-valid selected
language/script still fails that reply closed instead of guessing, translating
through locale, or silently substituting another language.

Prefer supplied due, familiar, learning, known, or otherwise reusable entries
before generating a new item. The provider may choose or order a supplied item
to fit the current work and may leave candidates unused to honor the dose and
cap. Preserve every supplied `target`, `meaning`, `standing`, and `isNew`
exactly; do not translate, canonicalize, expand, or repair it.

After applying that preference, the AI may generate useful target-language
words or phrases that fit the conversation. Give each generated item a concise
meaning in the verified instruction language. Count every supplied `isNew`
item and every generated item against the same `newIntroductionCap`; never
exceed the exact level dose or cap. A valid non-null context with zero supplied
entries may still use generated items within those two bounds. Never send the
conversation, draft, repository context, or the reason for an item to the
connector.

## Best-effort My Lexicon proposal sync

Start every teaching-ready reply with an empty reply-local set. Keep at most 12 pending tuples
while settling and syncing that reply. Each tuple
contains exactly `{languageTag, script, target, meaning}`: the verified target
track, the target-language item actually rendered, and its instruction-language
meaning. It contains no transcript, excerpt, reason, prompt, source text,
message/task/session identity, timestamp, score, status, evidence field, or
unrelated conversation. Do not put supplied context entries in this set;
they already came from YipYap.

Deduplicate pending tuples by byte-exact equality across all four fields. This
is transport housekeeping, not lexical normalization. Never case-fold, strip,
translate, repair, or compute a normalized key; the YipYap service owns
cross-provider canonicalization and duplicate collapse. Add only generated
items that remain in the final visible reply. When adding above 12 would
overflow the set, drop the oldest tuple and keep teaching. Never carry a tuple
from an earlier reply, `resume`, `compact`, pairing, reconnect, or settings
state. This reply-local lifetime intentionally sacrifices uncaptured items
instead of risking an item or meaning crossing accounts or language tracks.

After a teaching-ready draft is final and a fresh connection status grants
`lexicon.propose`, attempt at most the two oldest pending tuples. For each one,
call the existing `providerSubmitLearnerEvent` operation. On the remote MCP
profile, include the exact handle echoed by the current reply's non-null
context:

```json
{
  "workflowHandle": "<exact current-reply workflow handle>",
  "event": {
    "kind": "item_proposed",
    "languageTag": "<verified target language tag>",
    "script": "<verified target script>",
    "payload": { "target": "<rendered item>", "meaning": "<instruction-language meaning>" }
  }
}
```

For the local connector profile, omit `workflowHandle`; its closed schema and
process-memory guard remain unchanged. Never display or persist a remote
handle, and never reuse it in a later reply.

Treat a proposal receipt only as success or failure; never use returned item or
event details as teaching context or learner state. On the first refusal,
timeout, or malformed receipt, stop that reply's flush. If `lexicon.propose` is
absent, skip the flush. After the attempt or skip, discard every tuple,
including successful, failed, unattempted, and overflowed entries. Never retry
one in a later reply. Sync may be delayed, incomplete, or missed; that is
acceptable. A proposal-sync failure never changes, suppresses, or retroactively
invalidates an otherwise verified teaching reply.

Here, non-gating describes the reply's semantic outcome, not zero transport
latency. Obey the connector's bounded request timeout and stop on the first
failed proposal attempt.

The set is never a file, database, environment value, connector cache, durable
queue, cross-reply memory, teaching source, or promise of replay. Never rebuild
it from conversation history. Each proposal records vocabulary membership and
provider provenance only. It never records or implies exposure, correctness,
recall, mastery, confirmation, known status, or an `item_rendered` event.

## Effective level

The effective level is the stored level plus one explicit control. It never
changes automatically from output quality, production, inactivity, model
confidence, or provider inference. `more`, `less`, and `pause` are session-only.
A move outside the ladder is a no-op. Crossing into an opt-in level without the
learner naming it is refused.

`pause` is a separate session mixing suspension, not a stored level mutation.
The v1 effective-level vector preserves both stored and effective level, while
owner prose also calls pause "session-only level 0." Do not serialize or infer
a pause wire shape until the teaching owner resolves that mismatch. `more`,
`less`, and pause are non-persistent, but v1 does not define the account
learning-session lifecycle. Do not equate it with a provider task boundary;
require the reviewed app contract to define creation, resumption, and reset.
Until that contract exists, the connected profile recognizes but does not
apply `more`, `less`, or `pause`.

## Promotion and production

A promotion may be proposed only when bounded app state proves all of these
conditions: at least 3 sessions at the stored level, at least 25 items newly
known at that level, exactly 3 recent session miss counts are available, and
each of those counts is at most 2. Only the last 3 sessions enter the miss
check. Proposals stop at L8, and L9/L10 are never proposed. The provider must
not reconstruct these inputs from chat. A proposal is never applied
automatically; the learner's explicit command is the only level-changing act.

Non-empty learner text that is not a command may be classified as production,
but classification alone is not evidence. Admission requires an authenticated
response on a YipYap-controlled surface. A Claude or ChatGPT/Codex conversation
does not satisfy that gate.

When the learner writes any target-language text in provider conversation—even
one target-language word inside an instruction-language sentence—acknowledge it
before returning to the work: quote the learner's line, give the complete
instruction-language meaning, provide a corrected target-language version,
and identify actual errors or say plainly that none are present. Separate
correctness from optional register improvements, do not attribute likely
transcription noise to the learner, and do not invent a meaning to make a
correction work. This recast is ephemeral presentation only: do not transmit,
log, score, or admit the learner's conversation text as YipYap evidence.

## Per-reply transparency footer

For every teaching-ready reply, append one plain-text final line no longer than
120 characters:

```text
⟦YIP <languageTag> L<storedLevel> │ new <n>: <targets or —> │ review <n>: <targets or —>⟧
```

Use the verified language tag and stored level. `new` counts only supplied
entries rendered with `isNew: true` plus generated items actually rendered in
this reply. `review` counts only rendered supplied entries with `isNew: false`.
Any target names repeated in the footer must already appear as teaching items
in the reply body. Footer-only tokens never count toward the dose, introduction
cap, `new` or `review` totals, pending state, or proposal sync.
The labels describe this reply's presentation; they are not learner truth or a
claim that an item is new, due, familiar, or known in the master lexicon. If the
line would exceed 120 characters, drop both target lists before dropping the
language tag, level, or counts. Never add known totals, scores, streaks, due
totals, mastery, promotion progress, or values reconstructed from chat.

Do not render this footer for disconnected, unavailable, malformed, null,
unsupported, or otherwise non-teaching-ready context. A subagent or delegated
worker never renders it. The footer itself is presentation only and is never
queued or synced.

## Audio and absent machinery

The declared policy is `new-items-only` and never autoplay. The connector may
return eligible text and glosses but provides no approved renderer or audio
source, so this release produces no YipYap audio.

A connected status banner may show only fields from a reviewed, bounded app
projection. The reply footer above is the narrow exception: it uses one
verified stored level plus the items the AI can directly observe in its own
current reply. Never reconstruct account counts, due totals, scores, streaks,
mastery, or promotion progress from provider chat.
