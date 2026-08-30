# YipYap (Language)

The official provider-neutral YipYap (Language) plugin package for
Claude and Codex. The same shared Skill is prepared for OpenAI's universal
ChatGPT/Codex directory once its app-owned remote-service gates close. The Skill
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

The current checker/fetcher verifies the signed stable index, exact
deterministic archive inventory, embedded release identity, and trust-root
parity, then downloads an atomic candidate bundle plus its signed receipt. It
does not expand and verify a filesystem tree, create provider staging, apply to
a provider, or perform rollback. Do not treat a downloaded bundle as staged,
installed, or active.

Never install or update from an unreviewed fork, mutable branch archive, copied
command, or unsigned release record. See [UPDATE-POLICY.md](UPDATE-POLICY.md).

## Security and privacy

Report vulnerabilities through [SECURITY.md](SECURITY.md). The connector's
data boundary is summarized in [PRIVACY.md](PRIVACY.md).

Copyright © 2026 BDI Labs. All rights reserved. See [LICENSE.md](LICENSE.md).
