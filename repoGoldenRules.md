# Golden rules — YipYap (Language) public distribution

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
19. **The AI teaches; the service remembers.** Installed bytes are readable.
    The AI/Skill owns conversational teaching. Account truth, durable settings,
    master My Lexicon, cross-provider duplicate collapse, learner evidence, and
    review remain server-authoritative.
20. **Pairing plus five calls, read-first teaching.** The connector exposes one
    explicit pairing bootstrap plus five authenticated provider operations.
    Ordinary replies begin with the three ordered reads; incomplete input is
    L0. A verified reply may best-effort flush only bounded `item_proposed`
    membership records. The five-kind provider boundary remains
    `item_proposed`, `item_edited`, `item_archived`, `item_rendered`, and
    `playback_completed`; review response and reveal remain app-controlled.
21. **Multilingual and lossy by design.** Follow only the verified active
    language/script and instruction language. The connector accepts the
    contract's bounded BCP 47 tag plus explicit matching script, not a Spanish-
    or English-only allowlist. Generated proposal state contains only a
    maximum-12 reply-local exact track/target/meaning tuple set; flush at most
    two entries per ready reply, discard the full set, never retain a transcript
    or learner evidence, and never fail teaching because capture was delayed or
    lost. Bounded process-memory binding guards may protect that one read/write
    cycle but never become teaching authority, content storage, or durability.
22. **No automatic apply.** Update checks stay outside lifecycle startup.
    Candidate-bundle download and future provider staging/apply require
    explicit user acts, and downloaded bytes are not staged, installed, or
    active.
23. **Production origin is finite and compile-time.** Version 0.3 selects only
    the reviewed `future-production` row at `https://api.magneum.co`; the
    connector accepts no runtime profile or endpoint override, redirect,
    fallback, mirror, or dual write. Its provider/profile/gateway/origin-bound
    credential is separate and never inherits a legacy token. One explicit,
    consequence-aware promotion authorization may cover both the new default
    and every non-deleted production installation without a second
    installation-age approval. The app/service preserves the exact account,
    installation, provider, transport, lifecycle state, exact granted scopes,
    and customer/learning data by issuing separately bound future credentials
    for still-authorized connections; revoked or disconnected installations
    keep that state and receive no replacement credential. It never retags
    legacy bearer bytes.
    Transactional, idempotent preparation may abort with legacy untouched. A
    committed target profile is forward-only and can only be repaired or
    rolled forward—never downgraded, redirected, mirrored, or dual-written.
