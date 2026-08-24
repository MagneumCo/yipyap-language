# Privacy boundary

The Yip-Yap Language plugin applies a provider-neutral reply-shaping procedure.
When an account connector is authorized, it may request only bounded connection
status, teaching settings, and teaching context required for the current reply.
The fixed connector also declares bounded lexicon paging and learner-event
operations, but ordinary bootstrap and reply rendering never call either one.
An event requires a separately reviewed explicit learner action and scope; it
is never inferred from conversation.

The connector must not transmit conversation text, prompts, transcripts,
hidden instructions, files, repository context, embeddings, provider-task or
provider-session identifiers, email addresses, identity-provider credentials,
or another installation's token.

The local session token is an opaque, revocable capability. It is stored
outside versioned plugin files and must not be logged or placed in model
context. Account settings, learner records, entitlements, and master curriculum
remain in the Yip-Yap service.

Checking the public update channel contacts GitHub and therefore exposes
ordinary network metadata to GitHub. The lifecycle hook itself performs no
network request.
