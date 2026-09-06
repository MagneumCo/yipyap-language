# YipYap (Language)

The official provider-neutral YipYap (Language) plugin package for
Claude and Codex. The app-owned remote MCP is live at
`https://api.magneum.co`; the same shared Skill is prepared for OpenAI's
universal ChatGPT/Codex directory once the separate directory-review gates
close. The Skill
is the conversational teaching surface: it follows the verified active track,
prefers supplied vocabulary, and may generate useful items within the verified
level dose and introduction cap. The YipYap service owns durable settings,
the master My Lexicon, cross-provider combination/deduplication, privacy/sync,
review, and learner truth.

## Product boundary

- A new installation starts safely at L0.
- On supported hosts, the lifecycle hook bootstraps or restores the shared
  Skill. It performs no network request and changes no account state.
- Connected teaching requires an authorized YipYap account projection.
- Target and instruction languages use the contract's bounded BCP 47 tag plus
  explicit matching script; there is no Spanish- or English-only allowlist.
  The six pinned lexical-vector tracks are conformance coverage, not the
  product boundary.
- The connector exposes one explicit pairing bootstrap plus five fixed
  authenticated operations. Ordinary teaching is read-first. After a verified
  draft, the Skill may best-effort flush at most two entries from a maximum-12
  reply-local generated-vocabulary set through `item_proposed` when
  `lexicon.propose` is granted, then discards the entire set; failed or missed
  capture never suppresses or invalidates a reply.
- A provider event request admits only `item_proposed`,
  `item_edited`, `item_archived`, `item_rendered`, and `playback_completed`.
  Review-only response and reveal kinds are not provider tools.
- The Skill forbids sending conversation text, files, repository context,
  prompts, or transcripts. The connector mechanically closes request shapes
  and limits proposals to target/meaning/track, but cannot semantically prove a
  model did not copy those bounded strings from conversation.
- Two bounded process-memory coherence guards bind the ordered read cycle and
  at-most-two proposal window to one credential and account. They expose
  nothing to the model, contain no conversation or vocabulary tuple, persist
  nowhere, and clear on a new cycle, pairing, completion, or failure.
- Proposal sync records vocabulary membership and provenance only. The provider
  model cannot mark vocabulary known, grade a learner, promote a level, or
  manufacture learner evidence.
- The v0.3 package selects the exact `future-production` profile at
  `https://api.magneum.co`. It uses a separate provider/profile-bound
  credential file and never inherits the legacy environment token or
  credential. Existing installations move only under one explicit,
  consequence-aware promotion authorization covering the default and every
  non-deleted production installation—not through silent repointing or
  repeated installation-age approvals.
- The app/service migration preserves the exact account, installation,
  provider, lifecycle state, exact granted scopes, and customer/learning data
  while issuing distinct future-production credentials for still-authorized
  connections. Revoked or disconnected installations keep that state and
  receive no replacement credential. It never retags legacy bearer bytes.
  Transactional, idempotent preparation may abort with legacy untouched; a
  completed target-profile commit is forward-only and permits no redirect,
  fallback, mirror, or dual write.

## Installation and updates

Install through the YipYap app's AI-connections walkthrough, which supplies
the release-key trust pin independently of this repository. Never bootstrap
trust from a key downloaded beside the plugin or install from mutable `main`.
A provider marketplace becomes an official first-install path only when its
verified publisher and immutable package evidence are published. Releases
activate only after a complete provider restart and a new root task.

The immutable v0.2.0 updater exact-pins the pre-pairing interface contract and
correctly rejects v0.2.1. Cross that one-time boundary only with a fresh install
or provider-native/app-controlled reinstall of signed immutable v0.2.1 or
later; do not weaken the old pin. Version 0.2.2 retains the v0.2.1 interface
packet and follows the normal higher-sequence signed-update path from v0.2.1.

The v0.3 line changes the signed runtime transport contract. Immutable v0.2.1
and v0.2.2 updaters correctly reject it; do not weaken those pins or treat a
channel notification as promotion authorization. That refusal blocks ordinary
in-place update, not an explicitly authorized app/service cohort migration.
One consequence-aware authorization may cover the new default and every
non-deleted production installation without a second owner approval based only
on installation age.

The current checker/fetcher verifies the signed stable index, exact
deterministic archive inventory, embedded release identity, and trust-root
parity, then downloads an atomic candidate bundle plus its signed receipt. It
does not expand and verify a filesystem tree, create provider staging, apply to
a provider, or perform rollback. Do not treat a downloaded bundle as staged,
installed, active, or authorized to migrate an installation.

Never install or update from an unreviewed fork, mutable branch archive, copied
command, or unsigned release record. See [UPDATE-POLICY.md](UPDATE-POLICY.md).

## Security and privacy

Report vulnerabilities through [SECURITY.md](SECURITY.md). The connector's
data boundary is summarized in [PRIVACY.md](PRIVACY.md).

Copyright © 2026 BDI Labs. All rights reserved. See [LICENSE.md](LICENSE.md).
