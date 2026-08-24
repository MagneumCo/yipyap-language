# Yip-Yap Language controls v1

This file distinguishes account controls, stored teaching controls, and
session-only controls. Do not merge those categories.

## Account-held Learning Mode

Recognize these exact public forms:

- `LL on` or `LL enable`
- `LL off` or `LL disable`
- `LL status`
- `Yip-Yap on`, `Yip-Yap off`, or `Yip-Yap status`
- spoken-equivalent text `Yip Yap on`, `Yip Yap off`, or `Yip Yap status`

The stable internal product token is `yipyap`.

Learning Mode belongs to the Yip-Yap account. A provider host must not turn it
on or off, and installing a Skill or authorizing a connector does not change it.
Automatic provider-session bootstrap is not `LL on` and never changes Learning
Mode. The fixed connector exposes no Learning Mode read or write; the service
evaluates it privately when returning teaching context. Direct the learner to
the Yip-Yap-controlled surface instead of simulating a result.

## Stored teaching controls

These are the only declared persistent command tokens:

- `set_level <0..10>`
- `level_up`
- `level_down`

A real persistent change requires account-holder authority, the current
settings revision, and idempotency. The fixed provider connector deliberately
exposes no `teaching.write` operation, so recognize the request but direct the
learner to the Yip-Yap-controlled surface. Never simulate or queue a stored
change.

Reject a boolean, fraction, stringified unknown, or level outside 0 through 10;
never clamp it. A move below 0 or above 10 is a no-op. Setting the current level
again is also a no-op. Levels 9 and 10 are opt-in: the learner must explicitly
name the target level. A relative command may not cross from level 8 to level 9.
Until the teaching owner clarifies how their cumulative L8 dose is represented,
recognize but refuse levels 9 and 10 rather than guess.

## Session-only teaching controls

These exact tokens never persist:

- `more` adds one level to the current session dose.
- `less` subtracts one level from the current session dose.
- `pause` suspends mixing while preserving the stored and effective level.

`more` and `less` need a verified stored level, and all three controls need a
published account learning-session and paused-state contract. Those contracts
remain undefined in v1, so recognize but do not apply these controls. There is
no declared `resume` command; do not invent one.

The account learning-session lifecycle is not published in v1. Do not assume a
Claude or ChatGPT/Codex task boundary creates, resumes, or resets that session;
the reviewed app contract must define those transitions.

Do not fuzzy-match additional friendly teaching commands. A future friendly
grammar must arrive as a versioned Yip-Yap teaching contract.

## Connection state labels

Use only these labels for provider setup state:

- Not set up
- Authorizing
- Authorized but unverified
- Connected
- Needs reconnect
- Unavailable

Token possession is not Connected. Connected requires a fresh successful round
trip whose connector-internal response matches the bound account,
installation, provider, required scopes, and convergence state. Those raw
identities never enter Skill or model context. Connected still does not prove
that Learning Mode is on or that teaching context is available.
