# `@ismail-elkorchi/textpipeline`

Deterministic text pipeline processor contract package.

Current scope:

- synchronous, in-memory processor execution;
- explicit processor descriptors with dependency metadata;
- deterministic ready-queue ordering by `processor.id`;
- machine-readable execution traces for result-envelope transport.

This package does not yet define asynchronous execution, remote orchestration, batching, or cache
semantics.
