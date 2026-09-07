# Update policy

YipYap (Language) publishes immutable versioned releases. Replacement assets are
not an update mechanism. The stable-channel pointer is signed, expires no more
than 31 days ahead, and names the exact release manifest and archive digests.

Signed self-update assumes a previously trusted installation. For first
install, the YipYap app supplies the release-key pin independently and verifies
the immutable bundle. A public key downloaded from the same untrusted package
cannot authenticate that package.

Immutable v0.2.0 exact-pins the pre-pairing interface packet, so its updater
correctly rejects v0.2.1 and must not be weakened. Cross that one-time contract
boundary only with a fresh v0.2.1 install or a provider-native or YipYap
app-controlled reinstall of its signed immutable release. Later releases that
retain the installed interface contract follow the normal signed sequence
rules below.

Version 0.2.2 retains the v0.2.1 interface contract and is therefore a normal
higher-sequence signed update from v0.2.1.

The v0.3 line selects the `future-production` local-gateway profile at
`https://api.magneum.co`, uses a profile-bound credential file, and removes
legacy environment-token forwarding from new provider manifests. Immutable
v0.2.1 and v0.2.2 updaters correctly reject this different runtime contract.
That refusal blocks ordinary in-place update; it does not exclude existing
production installations from an owner-approved promotion.

One explicit, consequence-aware promotion authorization may both make
`future-production` the default and cover every non-deleted production
installation. It is never inferred from signing, publication,
download, installation, or service deployment, but it does not require a
second approval per installation merely because the installation already
exists. Missing and legacy bindings migrate, exact future bindings count as
idempotent no-ops, revoked or disconnected installations keep that state and
receive no replacement credential, and malformed or contradictory rows block
instead of being skipped. Isolated development is outside the production
sweep. The app and service own the migration. They preserve continuity of the
exact account, installation, provider, transport, lifecycle state, exact
granted scopes, and customer/learning data while issuing separately bound
future-production credentials for still-authorized connections. Legacy bearer
bytes remain unchanged and are never copied, edited, retagged, or inherited.

Preparation and commit are transactional, idempotent, and resumable. A
precommit abort leaves the legacy binding and credential untouched. After
commit, the target API-profile high-water is forward-only: repair or roll
forward at `future-production`; never downgrade to legacy routing or add a
redirect, fallback, mirror, dual read, or dual write.

Update checking is separate from provider startup. The lifecycle hook never
contacts GitHub or changes installed files. A separately trusted,
YipYap-controlled surface may check automatically on a bounded cadence or for
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
precommit recovery and persist a sequence-plus-manifest high-water record
outside versioned artifacts. Ordinary artifact rollback may not lower a
committed API-profile high-water or reactivate legacy routing; postcommit
recovery is forward-only.

Official update records contain data only and never supply shell commands.

Signature, inventory, and sequence verification protect against a tampered
feed, mirror, or archive. They cannot protect a machine whose local OS or root
administrator has replaced both the updater and its pinned trust root.

Version 0.3.4, release sequence 7, moves the official public repository to
`MagneumCo/yipyap-language`. Its updater pins that location for the signed
stable index and release assets. Immutable v0.3.3 installations keep the
previous location pinned; GitHub redirects it after the repository transfer,
and the v0.3.3 updater correctly rejects the moved asset URLs, so those
installations cross to v0.3.4 by a provider-native marketplace update or
reinstall rather than by self-update. The declared Node.js requirement is
22.23.1 or later; the package is verified on the 22 and 26 majors.
