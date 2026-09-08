# YipYap (Language) setup

This guide covers the packaged local connector used by supported Claude and
Codex hosts. It does not claim that either public provider directory has
published YipYap (Language).

## Requirements

- Node.js 22.23.1 or later (`>=22.23.1`). The package is verified on the 22
  and 26 majors; hosts launch it with their own `node`.
- A supported host with the YipYap (Language) plugin installed and enabled.
- A YipYap account managed through the YipYap app.
- Network access to the fixed production connector service at
  `https://api.magneum.co`.

Starting without an account connection is valid. The Skill remains useful for
explaining its teaching model and for direct language questions, but it uses
effective L0 and introduces no account-selected YipYap items.

## Install on a developer host

The hosted YipYap connector is the primary product surface for claude.ai, the
Claude mobile app, and ChatGPT; nothing is installed there. This plugin is the
developer-host add-on for Claude Code and Codex. Install it from the `yipyap`
marketplace at the official public repository, pinned to an immutable release
tag, then fully restart the host and open a new session:

```sh
claude plugin marketplace add MagneumCo/yipyap-language
claude plugin install yipyap-language@yipyap
```

```sh
codex plugin marketplace add MagneumCo/yipyap-language --ref v0.3.6
codex plugin add yipyap-language@yipyap
```

The YipYap app's AI-connections walkthrough remains the trust anchor for the
release key and issues the one-time pairing code used below.

## Pair without exposing a session token

The supported setup path is app-led pairing:

1. In the YipYap app, begin its AI-connection flow for the provider you are
   connecting.
2. Obtain the short, one-time pairing code supplied by that flow.
3. Ask the provider host to connect YipYap (Language) and provide only that
   one-time code through the host's supported plugin invocation path.
4. The connector's `yipyapPair` operation normalizes and redeems the code at
   the fixed service. It stores the returned session credential in its own
   provider-specific local configuration and returns only whether pairing
   succeeded.
5. Ask YipYap (Language) for setup status. Treat the account as Connected only
   after a fresh binding round trip validates the provider, required scopes,
   and convergence state.

The pairing code is short-lived and single-use; it is not the session token.
Never paste a session token into chat, a shell command, a provider setting, a
log, a public issue, or a support message. The supported flow does not require
a person or model to see token material.

The local connector reads the credential for each invocation, so successful
pairing can be observed without restarting the connector. The v0.3
future-production file is
`connector-<provider>-future-production.json` inside the current user's
`.yipyap` home-directory folder; on hosts that enforce POSIX modes, the folder
is `0700` and the file is `0600`. The credential stays outside versioned plugin
files and is bound to the exact provider, profile, transport, gateway profile,
and `https://api.magneum.co` origin. The v0.3 host manifests do not forward
`YIPYAP_SESSION_TOKEN`, and the new profile never reads the unchanged legacy
`connector-<provider>.json` file.

Pairing succeeds only when the app-owned code issuer and redemption service
are deployed and compatible with this package. A local package test is not
evidence that those production gates are live.

## L0 is the fail-closed state

Every non-ready path settles the complete reply at effective L0. The plugin
does not reuse old vocabulary, reconstruct state from chat history, create a
durable write queue, or promise replay. The bounded ephemeral generated-item
set is not teaching input; it flushes only when a teaching-ready connection
also grants `lexicon.propose`, and losing it is acceptable.

| Observed state | Required behavior |
| --- | --- |
| Not set up | No usable local credential exists. Remain at L0 and use the app-led pairing flow. |
| Authorizing | Pairing has not reached a fresh verified binding. Remain at L0. |
| Authorized but unverified | Credential presence is not enough. Remain at L0 until a fresh binding response validates. |
| Connected | The current binding round trip passed. Teaching still requires compatible settings, private Learning Mode, and a complete non-null context. |
| Needs reconnect | The credential is invalid, expired, revoked, unknown, or bound incorrectly. Remain at L0 and pair again through the app. |
| Unavailable | The service, network, or safe response carrier cannot complete. Remain at L0 and do not use cached teaching context. |

Connected does not mean Learning Mode is on. Learning Mode is an account-holder
control on a YipYap-controlled surface and is evaluated privately by the
service.

Every potentially mixed reply runs a new status → settings → context cycle.
The connector keeps only a bounded process-memory guard while those calls and
at most two following proposal attempts complete. It may contain a one-way
credential digest, raw service binding, settings or verified track, and a
remaining count; it never reaches model output, stores no conversation or
vocabulary tuple, writes nowhere, and clears on a new status cycle, pairing,
completion, or failure.

Target and instruction language pairs must satisfy the packet's bounded BCP 47
tag plus explicit matching-script grammar. The plugin does not infer language
from locale and has no Spanish- or English-only allowlist.

## Revoke or reconnect

Revoke provider access from the YipYap app or another YipYap-controlled
account surface. The provider plugin has no operation that grants or revokes
account scopes. A revoked credential must fail the next fresh connector call,
produce Needs reconnect, and keep the reply at effective L0.

Do not treat uninstalling or disabling the plugin as service-side revocation.
If access must end, revoke it at the account authority. Reconnect by starting a
new app-led connection flow, obtaining a new one-time code, and invoking
`yipyapPair` again. Successful redemption replaces the provider-specific local
credential without exposing it to the model.

## Troubleshooting

### The plugin is installed but does not start automatically

The current surface may not run packaged lifecycle hooks, or the hook may be
disabled or untrusted. Invoke YipYap explicitly and ask it to check
the connection. Do not report automatic-start parity until that exact host has
passed a fresh-root test.

### The connector reports Not set up

Complete the app-led pairing flow. If pairing was previously attempted, obtain
a new one-time code; do not reuse an old code and do not substitute a session
token.

### The connector reports Needs reconnect

The previous capability is no longer valid for this provider installation.
Use the YipYap app to review or revoke the old connection, then pair again
with a new one-time code. No teaching context may be reused while reconnecting.

### The connector reports Unavailable

Keep working at L0. Check the host's network access and retry an explicit
status read later. Do not fall back to cached account data or repeatedly retry
inside one reply.

### Status is Connected but no language is mixed

This can be correct. The stored level may be L0, Learning Mode may be off, or
the current teaching context may be null, incompatible, or ineligible for the
reply. The plugin must not expose which private service gate returned a null
context, and it cannot enable Learning Mode or change the stored level.

### The connector does not launch

Confirm that the host's `node` is 22.23.1 or later and that the plugin is
enabled. Versions below that minimum are refused by the updater and are not
supported.

## Upgrade compatibility

Version 0.2.1 pins the app's amended connector-interface packet that introduced
one-time-code pairing. The immutable v0.2.0 updater correctly refuses a release
whose interface packet differs from its own exact pin. Do not weaken that check
or edit an installed package to get around it.

Cross this one-time boundary with a fresh v0.2.1 install or a provider-native or
YipYap app-controlled reinstall of the immutable signed release. The external
provider-specific connector config is not part of the versioned package. After
installation, pair with a new app-issued code and verify a fresh Connected
status.

Version 0.2.2 retains the v0.2.1 interface packet and is therefore a normal
same-contract signed sequence update from v0.2.1. It narrows the provider event
schema to the five Rule 43 kinds; it does not add account authority.

The v0.3 line changes the compiled transport profile and signed runtime
contract to `future-production` at `https://api.magneum.co`. Immutable v0.2.1
and v0.2.2 updaters correctly reject that different contract. That rejection
blocks an ordinary in-place update; it does not require a second owner approval
merely because a production installation already exists.

One explicit, consequence-aware promotion authorization may make
`future-production` the default and cover every non-deleted production
installation. Missing and legacy bindings migrate; an exact future binding is
an idempotent no-op that still counts; revoked or disconnected installations
keep that state and move their next connection path without receiving a
replacement credential; and malformed or contradictory rows block rather than
being skipped. Isolated development is outside this production scope.

The app and service own the migration. For each still-authorized connection,
they must preserve the exact account, installation, provider, transport,
exact granted scopes, lifecycle state, and customer/learning data while staging
a separately bound future-production credential in its provider-specific
mode-`0600` file. Legacy bearer bytes remain unchanged and must never be
copied, edited, retagged, or inherited as the target credential. Provider OAuth
or host confirmation may still be required by its security protocol; that is
not a second YipYap owner-approval gate.

Preparation and commit must be transactional, idempotent, and resumable. An
abort before commit leaves the legacy binding and credential untouched. After
the target profile commits, its profile high-water is forward-only: repair or
roll forward at `future-production`, then verify a fresh read-only connection
cycle. Never downgrade that installation to legacy routing or introduce a
redirect, fallback, mirror, or dual write.

## Public-directory boundary

The real OpenAI install path is a public MCP+Skill plugin submitted through the
OpenAI plugin portal, not a copied developer-mode connection. Create the
submission from the production MCP URL `https://api.magneum.co`, scan its five
tools, attach the reviewed YipYap (Language) Skill bytes, complete publisher and
domain verification, and use reviewer-safe credentials plus the approved five
positive and three negative cases. Do not derive a public `.app.json`, plugin
identifier, or submission artifact from a `plugin_asdk_app` developer-mode id;
OpenAI creates the public listing from the submitted production server.

Developer mode remains only a pre-submission test surface. No portal submit,
review approval, publish act, public directory card, or directory install is
claimed until its separate owner gate and retained receipt exist. Claude public
directory review likewise requires a working app-led pairing path and
reviewer-safe evidence. Repository or local installation remains a separate
distribution path.
