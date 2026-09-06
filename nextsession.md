# Next session — YipYap (Language) public distribution

## Package truth

- The package is one provider-neutral Skill plus thin Claude and Codex
  manifests, a static lifecycle carrier, and one bounded local connector.
- Every new or disconnected installation starts at effective L0. Installation,
  connection, Learning Mode, stored settings, and teaching readiness remain
  independent gates.
- Ordinary teaching is read-first and fails closed. Generated vocabulary may
  use only the bounded reply-local proposal path; provider conversation never
  becomes learner evidence.
- The v0.3 line compiles the exact `future-production` profile and reaches only
  `https://api.magneum.co` through the fixed local-gateway routes.
- Its credential is stored outside the package in a separate
  `connector-<provider>-future-production.json` file, bound to the exact
  provider/profile/transport/gateway tuple. Legacy credential files and
  `YIPYAP_SESSION_TOKEN` are not inherited.
- Existing v0.2 installations are never silently repointed. Their immutable
  updater contract correctly rejects the v0.3 transport boundary as an
  ordinary in-place update, but the app/service may account for every
  non-deleted production installation under one explicit promotion
  authorization.

## Release law

- Trust only an immutable release whose detached Ed25519 signature and exact
  inventory verify against the independently pinned BDI Labs public key.
- A signed channel notification is not a promotion authorization. One explicit,
  consequence-aware promotion authorization may cover both the
  `future-production` default and every non-deleted production installation;
  installation age alone does not require repeated approvals.
- The migration must preserve the exact account, installation, provider,
  transport, lifecycle state, exact granted scopes, and customer/learning data
  through separately bound future credentials for still-authorized
  connections, never retagged legacy bearer bytes. Revoked or disconnected
  installations keep that state and receive no replacement credential.
  Preparation and commit are
  transactional, idempotent, and resumable. Precommit abort leaves legacy
  untouched; postcommit recovery is forward-only with no redirect, fallback,
  mirror, or dual write.
- Provider activation requires a complete restart and new root task. Preserve
  the previous verified artifact and its external high-water receipt for
  evidence and precommit recovery; after target commit it must not reactivate
  legacy routing.
- Signing, public publication, provider installation, service deployment, and
  directory submission remain distinct owner gates. The single API-origin
  promotion gate intentionally couples the new default with the authorized
  every non-deleted production installation.
- Immutable candidate publication pushes only the reviewed tag and keeps its
  GitHub release non-latest; public `main` and raw stable-index bytes remain on
  the retained prior stable until a separate promotion approval.

## Next safe step

Verify the exact candidate source, produce two byte-identical allowlisted
exports, inspect their manifests and inventory, and freeze the unsigned hashes.
Stop before private-key access unless signing is explicitly authorized.
