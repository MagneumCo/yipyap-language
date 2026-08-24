# Golden rules — Yip-Yap Language public distribution

This repository inherits BDI Labs' repository standard. Its public-specific
rules are:

14. **Generated means generated.** Release payloads come only from the reviewed
    exporter and exact allowlist; never patch public output by hand.
15. **No secrets or customer state.** Tokens, private keys, account rows,
    personal baselines, and private source coordinates never enter this repo.
16. **One Skill, thin hosts.** Claude and Codex load the same teaching Skill;
    provider adapters contain no separate teaching meaning.
17. **Signed immutable releases.** Install and update only exact versioned
    artifacts whose manifest, signature, inventory, and hashes verify.
18. **Restart is activation.** An update never changes instructions inside an
    active task; activation requires a provider restart and new root task.
19. **The service is the moat.** Installed bytes are readable. Account truth,
    entitlement, selection, and learner evidence remain server-authoritative.
20. **Pairing plus five calls, read-only rendering.** The connector exposes one
    explicit pairing bootstrap plus five authenticated provider operations.
    Ordinary replies use the three ordered reads; incomplete input is L0 and
    rendering submits no learner event.
21. **No automatic apply.** Update checks stay outside lifecycle startup.
    Candidate-bundle download and future provider staging/apply require
    explicit user acts, and downloaded bytes are not staged, installed, or
    active.
