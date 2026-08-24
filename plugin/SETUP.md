# Yip-Yap Language setup

This guide covers the packaged local connector used by supported Claude and
Codex hosts. It does not claim that either public provider directory has
published Yip-Yap Language.

## Requirements

- Node.js 22.23.1 or later within major version 22
  (`>=22.23.1 <23`).
- A supported host with the Yip-Yap Language plugin installed and enabled.
- A Yip Yap account managed through the Yip Yap app.
- Network access to the fixed production connector service.

Starting without an account connection is valid. The Skill remains useful for
explaining its teaching model and for direct language questions, but it uses
effective L0 and introduces no account-selected Yip-Yap items.

## Pair without exposing a session token

The supported setup path is app-led pairing:

1. In the Yip Yap app, begin its AI-connection flow for the provider you are
   connecting.
2. Obtain the short, one-time pairing code supplied by that flow.
3. Ask the provider host to connect Yip-Yap Language and provide only that
   one-time code through the host's supported plugin invocation path.
4. The connector's `yipyapPair` operation normalizes and redeems the code at
   the fixed service. It stores the returned session credential in its own
   provider-specific local configuration and returns only whether pairing
   succeeded.
5. Ask Yip-Yap Language for setup status. Treat the account as Connected only
   after a fresh binding round trip validates the provider, required scopes,
   and convergence state.

The pairing code is short-lived and single-use; it is not the session token.
Never paste a session token into chat, a shell command, a provider setting, a
log, a public issue, or a support message. The supported flow does not require
a person or model to see token material.

The local connector reads the credential for each invocation, so successful
pairing can be observed without restarting the connector. Its default file is
`connector-<provider>.json` inside the current user's `.yipyap` home-directory
folder; on hosts that enforce POSIX modes, the folder is `0700` and the file is
`0600`. The credential stays outside versioned plugin files.

Pairing succeeds only when the app-owned code issuer and redemption service
are deployed and compatible with this package. A local package test is not
evidence that those production gates are live.

## L0 is the fail-closed state

Every non-ready path settles the complete reply at effective L0. The plugin
does not reuse old vocabulary, reconstruct state from chat history, queue a
write, or promise replay.

| Observed state | Required behavior |
| --- | --- |
| Not set up | No usable local credential exists. Remain at L0 and use the app-led pairing flow. |
| Authorizing | Pairing has not reached a fresh verified binding. Remain at L0. |
| Authorized but unverified | Credential presence is not enough. Remain at L0 until a fresh binding response validates. |
| Connected | The current binding round trip passed. Teaching still requires compatible settings, private Learning Mode, and a complete non-null context. |
| Needs reconnect | The credential is invalid, expired, revoked, unknown, or bound incorrectly. Remain at L0 and pair again through the app. |
| Unavailable | The service, network, or safe response carrier cannot complete. Remain at L0 and do not use cached teaching context. |

Connected does not mean Learning Mode is on. Learning Mode is an account-holder
control on a Yip Yap-controlled surface and is evaluated privately by the
service.

## Revoke or reconnect

Revoke provider access from the Yip Yap app or another Yip Yap-controlled
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
disabled or untrusted. Invoke Yip-Yap Language explicitly and ask it to check
the connection. Do not report automatic-start parity until that exact host has
passed a fresh-root test.

### The connector reports Not set up

Complete the app-led pairing flow. If pairing was previously attempted, obtain
a new one-time code; do not reuse an old code and do not substitute a session
token.

### The connector reports Needs reconnect

The previous capability is no longer valid for this provider installation.
Use the Yip Yap app to review or revoke the old connection, then pair again
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

Confirm that the host is using Node.js `>=22.23.1 <23` and that the plugin is
enabled. A different Node major version is outside this package's declared
runtime contract.

## One-time upgrade from v0.2.0

Version 0.2.1 pins the app's amended connector-interface packet that introduced
one-time-code pairing. The immutable v0.2.0 updater correctly refuses a release
whose interface packet differs from its own exact pin. Do not weaken that check
or edit an installed package to get around it.

Cross this one-time boundary with a fresh v0.2.1 install or a provider-native or
Yip Yap app-controlled reinstall of the immutable signed release. The external
provider-specific connector config is not part of the versioned package. After
installation, pair with a new app-issued code and verify a fresh Connected
status. Future same-contract updates continue to use the signed sequence rules.

## Public-directory boundary

The OpenAI public-directory topology requires an app-owned production HTTPS
MCP endpoint, supported authentication, domain verification, and reviewer-safe
credentials or sample data. Those are service gates, not features supplied by
this local setup guide. Claude public-directory review likewise requires a
working app-led pairing path and reviewer-safe evidence. Until the relevant
provider publishes the reviewed card, repository or local installation is a
separate distribution path.
