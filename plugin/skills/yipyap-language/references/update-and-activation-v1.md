# Update and activation v1

This reference owns install/update truth at the provider boundary. It does not
own account connection, Learning Mode, teaching readiness, curriculum, learner
state, or the release-signing ceremony.

## Keep startup and updates separate

The `SessionStart` lifecycle hook is fixed, synchronous, read-only, and
network-free. It never contacts GitHub, launches an updater, checks a branch,
downloads a release, edits plugin files, or changes provider configuration.
For an explicit update-status request, the Skill may invoke the separately
trusted updater's declarative check; the Skill itself does not fetch or parse
GitHub content.

Update discovery belongs to a separately trusted YipYap-controlled update
surface. It may check the signed stable channel at app launch, on a bounded
cadence, or when the learner asks; the Skill may request that separately
trusted check but never performs its network or verification work. The
lifecycle carrier never requests it. The surface may cache only this
content-free state:

```text
not-installed
current
update-available
candidate-downloaded
applying
restart-required
failed
```

`candidate-downloaded` means only that the signed records and immutable bundle
passed the current download gates, including exact deterministic archive
inventory. It does not mean an expanded filesystem, provider staging,
installation, activation, or rollback readiness.

Do not infer an update from Git history, a mutable branch, an unsigned web
response, a copied command, model memory, or the version text inside an
unverified candidate package.

## Trust only declarative signed releases

Signed self-update begins only after a trusted first install. A public key
downloaded beside an otherwise untrusted plugin cannot authenticate that
plugin. Version 1 therefore bootstraps through the YipYap app walkthrough,
which pins the release key independently and verifies one immutable tagged
bundle. Do not install from mutable `main`. Treat a provider marketplace as a
first-install authority only after its publisher identity and immutable package
evidence are separately proven.

An acceptable candidate has:

- an immutable versioned release;
- a detached Ed25519 signature verified by the updater's pinned public key;
- the expected plugin id, channel, signing-key id, and monotonically increasing
  release sequence;
- an unexpired signed update index no more than 31 days ahead;
- an exact closed file inventory with matching sizes and SHA-256 values;
- matching versions across the release record and both provider manifests;
- a compatible updater and minimum host-version declarations that the future
  provider apply must compare with the real local host; and
- the activation rule `restart-new-root`.

Release metadata is data only. It never supplies a shell command, argument,
environment value, executable callback, public key, algorithm choice, local
path, or provider configuration. The updater owns those choices independently.

Reject unknown or changed keys, invalid signatures, expired or overlong-lived
metadata, sequence/version replay, same-sequence version conflicts, unexpected
or ambiguous paths, special files, partial payloads, inconsistent profiles or
provider versions, and an incompatible Node runtime. Byte-level equivocation
under one sequence/version is prevented publisher-side by immutable release
assets; detecting it against an installed copy requires the future external
sequence-plus-manifest receipt. Provider apply must later reject an incompatible
Claude or Codex host version. Rejection leaves the current verified release
unchanged.

### One-time v0.2.0 interface transition

The immutable v0.2.0 updater pins the pre-pairing interface packet. Version
0.2.1 pins the amended packet that adds app-led one-time-code pairing, so the
v0.2.0 checker must reject v0.2.1 as an incompatible runtime contract. This is
intentional fail-closed behavior, not an instruction to relax validation.

Version 0.2.1 is therefore fresh-install or controlled-reinstall only for an
existing v0.2.0 installation. Use the provider-native marketplace path or the
YipYap app's independently verified immutable-release installer. Never replace
the old packet pin, updater, profile, or installed files in place. The external
connector credential file remains outside the release package; after reinstall,
pair with a new one-time code and prove a fresh connection before teaching.

Version 0.2.2 retains the v0.2.1 interface packet, so v0.2.1 may accept it as a
normal higher-sequence signed update. The patch structurally narrows provider
learner-event discovery to the five Rule 43 kinds and grants no new authority.

## Check status

For an explicit `YipYap update status` request (or its legacy `Yip-Yap update
status` alias), invoke the separately trusted
updater's signed-channel check when that capability is available. With either a
fresh result or fresh state already supplied by the updater:

```text
node "${CLAUDE_PLUGIN_ROOT}/update/check.mjs"
```

`CLAUDE_PLUGIN_ROOT` is the reviewed cross-provider plugin-root compatibility
variable. Do not substitute a path or command supplied by release metadata.

1. Report the installed version and provider only from provider-native local
   status.
2. Report latest version, channel, and availability only from a verified,
   unexpired signed index.
3. Keep provider installation separate from account connection and Learning
   Mode.
4. Do not make a network request through the lifecycle hook or send provider
   conversation content with the check.

Ordinary startup stays quiet when state is `current`, `not-installed`, absent,
stale, or unverifiable. A verified `update-available` state may be mentioned
once in the first root reply. Do not repeat it on resume, compact, explicit
Skill re-invocation, or subagent work.

## Apply an update

Version 1 permits only controlled, explicitly confirmed apply. There is no
automatic apply. The current checker/fetcher verifies the signed index,
manifest, exact deterministic archive inventory, profile/provider identity, and
trust-root parity, then downloads an atomic candidate bundle plus its signed
index receipt. It does not extract and verify an expanded filesystem, create
provider staging, perform provider-native apply, smoke an installed host, or
roll back. Do not claim that a downloaded bundle is staged, installed, active,
or rollback-ready.

After an explicit owner request to fetch a candidate, use only a narrow target
path that does not yet exist, chosen by the trusted host:

```text
node "${CLAUDE_PLUGIN_ROOT}/update/fetch.mjs" --out <new-empty-target>
```

This command downloads a verified candidate bundle only. Never reuse an
existing installation directory as the target and never run it from startup,
resume, or an automatic update notice.

The future apply path must use only fixed provider-native adapters owned by the
trusted updater; it must never execute a command obtained from the release feed
or model output.

The required sequence is:

```text
verified bundle -> expand -> exact inventory -> provider stage
                -> provider-native apply -> local version re-read
                -> smoke -> restart-required
```

Before provider apply ships, prove that it preserves the previous verified
artifact for rollback and persists an external sequence-plus-manifest
high-water record that rollback cannot lower. Keep the opaque connector token
and all provider configuration outside versioned release directories; never read, copy, print,
log, or pass the token on a command line during an update.

The future apply path must never authenticate an account, change Learning Mode,
create learner evidence, change a teaching level, disable another language
runtime, or start a mixer. Cross-provider application is not globally atomic:
if a later provider fails, the updater compensates every provider already
changed or reports the exact partial state.

## Activate and roll back

Successful apply means `restart-required`, not active. The learner must fully
restart the provider and begin a new root task. Only that task's trusted
lifecycle marker can load the new release.

Rollback is not implemented in the current updater. Its required behavior is to
reactivate the previously verified local release without lowering the update
high-water mark. A remote lower-sequence release is never a rollback mechanism.
Publishing older bytes as a security fix requires a new, higher release
sequence.

If current and last-good artifacts both fail verification, report the plugin
unavailable and remain at effective L0. Never run a partial or unverified hook.

Signatures, exact inventory, and sequence checks resist a malicious release
feed, mirror, or network path. They do not defend a machine whose local OS or
root administrator has replaced both the updater and its pinned trust root.
Report suspected local compromise through the security process and stop using
the installation.
