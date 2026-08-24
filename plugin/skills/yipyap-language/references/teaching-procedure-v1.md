# Teaching procedure v1

This is a readable projection of the versioned Yip-Yap teaching-behavior
contract, schemaVersion 1. That contract is authoritative; this Skill consumes
it. The copied conformance corpus, not this prose, is the executable authority
for settled operations. If owner prose and a vector disagree, the plugin must
not choose a local meaning; keep the affected behavior unavailable until
Yip-Yap publishes a versioned clarification.

The procedure shapes a reply after correct content has been drafted. It does
not determine vocabulary eligibility, author or alter curriculum meaning,
render audio, grade, persist settings, or admit learner evidence. It may choose
among eligible supplied items for local task fit and may provide an ephemeral
translation/correction when the learner directly asks or writes target text.

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

## Selection inside a reply

The account service supplies the eligible items and their exact glosses. Within
that bounded set, reuse due items and items already used in the session before
introducing something new. The provider may choose or order an eligible item
to fit the current work and may leave candidates unused to honor the dose and
cap. It must not add a candidate, translate, canonicalize, or alter the
supplied meaning, and it must never send conversation or repository context
back to the connector to make that choice.

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
response on a Yip-Yap-controlled surface. A Claude or ChatGPT/Codex conversation
does not satisfy that gate.

When the learner writes any target-language text in provider conversation—even
one target-language word inside an instruction-language sentence—acknowledge it
before returning to the work: quote the learner's line, give the complete
instruction-language meaning, provide a corrected target-language version,
and identify actual errors or say plainly that none are present. Separate
correctness from optional register improvements, do not attribute likely
transcription noise to the learner, and do not invent a meaning to make a
correction work. This recast is ephemeral presentation only: do not transmit,
log, score, or admit the learner's conversation text as Yip-Yap evidence.

## Audio and absent machinery

The declared policy is `new-items-only` and never autoplay. The connector may
return eligible text and glosses but provides no approved renderer or audio
source, so this release produces no Yip-Yap audio.

A connected status banner or footer may show only fields from a reviewed,
bounded app projection. Never reconstruct counts, due items, scores, streaks,
or promotion progress from provider chat. The exact customer-facing footer
shape is not published in v1, so this release omits it.
