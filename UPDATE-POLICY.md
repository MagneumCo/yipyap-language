# Update policy

Yip-Yap publishes immutable versioned releases. Replacement assets are not an
update mechanism. The stable-channel pointer is signed, expires no more than 31
days ahead, and names the exact release manifest and archive digests.

Signed self-update assumes a previously trusted installation. For first
install, the Yip-Yap app supplies the release-key pin independently and verifies
the immutable bundle. A public key downloaded from the same untrusted package
cannot authenticate that package.

Immutable v0.2.0 exact-pins the pre-pairing interface packet, so its updater
correctly rejects v0.2.1 and must not be weakened. Cross that one-time contract
boundary only with a fresh v0.2.1 install or a provider-native or Yip-Yap
app-controlled reinstall of its signed immutable release. Later releases that
retain the installed interface contract follow the normal signed sequence
rules below.

Update checking is separate from provider startup. The lifecycle hook never
contacts GitHub or changes installed files. A separately trusted,
Yip-Yap-controlled surface may check automatically on a bounded cadence or for
an explicit status request. Version 1 never applies an update automatically.

The current checker/fetcher verifies signed index/archive/manifest records,
exact deterministic archive inventory, release identity, and trust-root parity,
then downloads an atomic candidate bundle plus its signed receipt. It does not
expand and verify a filesystem tree, create provider staging, apply to a
provider, smoke an installed host, or roll back. Until those gates are closed,
follow only the official immutable tagged-release installation instructions;
do not treat a downloaded bundle as staged, installed, or active.

The new release becomes active only after a complete provider restart and a
new root task. Failed verification or installation leaves the prior verified
release untouched. The future controlled apply must preserve that release for
explicit rollback and persist a sequence-plus-manifest high-water record
outside versioned artifacts. Downgrades require an explicit rollback act; they
are never accepted as an ordinary update.

Official update records contain data only and never supply shell commands.

Signature, inventory, and sequence verification protect against a tampered
feed, mirror, or archive. They cannot protect a machine whose local OS or root
administrator has replaced both the updater and its pinned trust root.
