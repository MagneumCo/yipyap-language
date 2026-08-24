# Next session — Yip-Yap Language public distribution

## Proven

- The repository is a generated, allowlisted public release surface.
- Public installs start at L0 and require separate account authorization for
  connected teaching.
- The lifecycle hook is static, read-only, and network-free.
- The connected profile uses one five-operation bridge. Ordinary rendering
  performs status, settings, and context reads only and fails closed to L0 on
  every missing, malformed, stale, revoked, null, or incompatible result.

## Blocked

- A release is not trusted unless its detached signature and exact inventory
  verify against the pinned BDI Labs public key.
- The current checker/fetcher verifies signed records, exact deterministic
  archive inventory, release identity, and trust-root parity, then downloads an
  atomic candidate bundle plus its signed receipt. Expanded-filesystem
  verification, provider staging/apply, installed-host smoke, and rollback must
  not be claimed until their release gates close.

## Next safe step

For a release candidate, regenerate from the private authority, verify the
expanded tree and archive twice, review the exact diff, then publish one
immutable signed version. Apply only through an explicit controlled provider
path and activate only after a full restart plus a new root task.
