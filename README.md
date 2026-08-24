# Yip-Yap Language

The official provider-neutral Yip-Yap language-learning plugin for Claude and
Codex. One shared Skill shapes ordinary replies while the Yip-Yap service owns
account settings, curriculum selection, and learner truth.

## Product boundary

- A new installation starts safely at L0.
- The lifecycle hook only restores the shared Skill. It performs no network
  request and changes no account state.
- Connected teaching requires an authorized Yip-Yap account projection.
- The connector exposes five fixed operations. Ordinary reply rendering uses
  only connection-status, teaching-settings, and teaching-context reads; it
  never submits a learner event.
- Conversation text, files, repository context, prompts, and transcripts are
  never sent to Yip-Yap by the language connector.
- The provider model cannot mark vocabulary known, grade a learner, promote a
  level, or manufacture learner evidence.

## Installation and updates

Install through the Yip-Yap app's AI-connections walkthrough, which supplies
the release-key trust pin independently of this repository. Never bootstrap
trust from a key downloaded beside the plugin or install from mutable `main`.
A provider marketplace becomes an official first-install path only when its
verified publisher and immutable package evidence are published. Releases
activate only after a complete provider restart and a new root task.

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
