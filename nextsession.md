# Next session — YipYap (Language) public distribution

## Proven

- The repository is a generated, allowlisted public release surface.
- Public installs start at L0 and require separate account authorization for
  connected teaching.
- The lifecycle hook is static, read-only, and network-free.
- The connected profile uses one explicit pairing bootstrap plus five
  authenticated provider operations. Ordinary teaching begins with status,
  settings, and context reads and fails closed to L0 on every missing,
  malformed, stale, revoked, null, unsupported, or incompatible result.
- The AI/Skill is the multilingual conversational teacher. It follows the
  verified active track and stored-level dose, prefers supplied vocabulary,
  may generate within the introduction cap, and renders a compact
  current-reply track/level/new/review footer.
- Target and instruction language support uses the contract's bounded BCP 47
  tag plus explicit matching script, without a Spanish- or English-only
  allowlist. The six lexical-vector tracks are conformance coverage only.
- Generated items may enter a maximum-12 reply-local exact-tuple set and,
  when `lexicon.propose` is granted, flush at most two at a time through
  `item_proposed`, then the full set is discarded. Capture is
  membership/provenance only and never suppresses or invalidates the reply or
  becomes learner evidence.
- Provider learner-event discovery admits exactly `item_proposed`,
  `item_edited`, `item_archived`, `item_rendered`, and `playback_completed`.
  Review-only response and reveal kinds remain app-controlled.
- The connector's unfinished read guard and at-most-two proposal window are
  bounded process memory only: no model-visible identity, conversation,
  vocabulary tuple, persistence, or cross-reply authority.

## Blocked

- A release is not trusted unless its detached signature and exact inventory
  verify against the pinned BDI Labs public key.
- The current checker/fetcher verifies signed records, exact deterministic
  archive inventory, release identity, and trust-root parity, then downloads an
  atomic candidate bundle plus its signed receipt. Expanded-filesystem
  verification, provider staging/apply, installed-host smoke, and rollback must
  not be claimed until their release gates close.
- Immutable v0.2.0 pins the pre-pairing interface packet and correctly rejects
  v0.2.1. That one transition requires a fresh install or controlled reinstall;
  it is not a normal signed-channel apply.
- Version 0.2.2 keeps the v0.2.1 packet and can advance from v0.2.1 through the
  normal signed sequence. Provider-directory submission and publication remain
  separate evidence and owner-approval gates.

## Next safe step

For a release candidate, regenerate from the private authority, verify the
expanded tree and archive twice, review the exact diff, then publish one
immutable signed version. Apply only through an explicit controlled provider
path and activate only after a full restart plus a new root task.
