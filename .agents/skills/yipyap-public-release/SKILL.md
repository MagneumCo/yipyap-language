---
name: yipyap-public-release
description: Review the generated YipYap (Language) public distribution and its signed release boundary. Use for public release inspection, not product development or account operations.
---

# YipYap public release

Treat this repository as generated output. Do not hand-edit the plugin payload
or manufacture a release record.

For release review:

1. Verify `release/latest.json` and `release/latest.sig` with a BDI Labs public
   key pinned independently of this repository before trusting any tag, URL,
   digest, sequence, version, or expiry.
2. Bind the immutable archive, manifest, and manifest signature to that signed
   index, then verify the manifest signature with the same pinned key.
3. Confirm every file is listed in the signed release manifest and verify the
   expanded file hashes and content-root hash.
4. Reject symlinks, executable files, credentials, private paths, unlisted
   content, mutable-branch artifacts, or version disagreement.
5. Require a provider restart and new root task after installation.

A downloaded candidate bundle is not staged, installed, or active. The current
checker/fetcher verifies its exact deterministic archive inventory but does not
expand and verify a filesystem tree or provide provider-native staging, apply,
smoke, or rollback. Signature checks resist remote feed or archive tampering,
not a hostile local administrator who has replaced both updater and pinned
trust root.

This skill does not authorize publication, installation, account connection,
Learning Mode changes, or rollback.
