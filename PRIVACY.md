# Privacy boundary

The YipYap (Language) plugin applies a provider-neutral reply-shaping procedure.
When an account connector is authorized, it may request only bounded connection
status, teaching settings, and teaching context required for the current reply.
The fixed connector also declares bounded lexicon paging and learner-event
operations. Ordinary bootstrap calls neither one. After a teaching-ready draft,
the Skill may periodically submit only generated target-language item plus
instruction-language meaning and verified target-track identity through
`item_proposed` when `lexicon.propose` is granted. This records vocabulary
membership and provider provenance only; it never records exposure,
correctness, recall, mastery, confirmation, or known status. Every other event
kind requires its separately reviewed action and scope.

Generated items waiting to sync live only in a maximum-12 reply-local set,
deduplicated by exact target/meaning/track tuple. The plugin creates no file,
database, durable connector cache, or replay guarantee for that intentionally
lossy set. The provider host may retain task context under its own data-retention
policy, but the Skill never carries a proposal tuple into another reply. The
entire set is discarded after the current reply's bounded attempt or skip.
Failed, delayed, or missed sync never suppresses or invalidates the reply.

The local connector holds two bounded process-memory coherence guards to stop
credential or account switching between calls. Before context, the guard may
contain a one-way session-token digest, raw account/installation/provider
binding, and verified settings. After context, the guard may contain that
digest and binding, the verified target track, and a remaining proposal count
of at most two. These values never enter model-visible output, contain no
conversation or vocabulary text, are never written to disk, and clear on a new
status cycle, pairing, completion, or failure. A fresh three-read cycle is
required for every potentially mixed reply.

The Skill must not transmit conversation text, prompts, transcripts, hidden
instructions, files, repository context, embeddings, provider-task or
provider-session identifiers, email addresses, identity-provider credentials,
or another installation's token. None may enter the pending vocabulary set or
an `item_proposed` payload. The connector mechanically enforces closed shapes,
field bounds, credential stripping, and the target/meaning/track-only proposal
surface. It cannot semantically determine whether a model copied bounded
target or meaning text from a conversation, so that content prohibition also
depends on the Skill instruction and service-side validation/abuse controls.

The local session token is an opaque, revocable capability. It is stored
outside versioned plugin files and must not be logged or placed in model
context. Account settings, learner records, entitlements, master My Lexicon,
cross-provider duplicate collapse, and review remain in the YipYap service.

Checking the public update channel contacts GitHub and therefore exposes
ordinary network metadata to GitHub. The lifecycle hook itself performs no
network request.
