# `@ismail-elkorchi/textpipeline`

Deterministic text pipeline processor contract package.

Current scope:

- synchronous, in-memory processor execution;
- asynchronous processor execution;
- input-order batch and stream runners;
- cancellation via `AbortSignal`;
- deterministic dependency graph validation and exported execution plans;
- requirements over declared views, layers, packages, packs, profiles, and their versions;
- conservative cache keys for caller-provided document caches;
- explicit cache-hit trace entries for caller-provided document caches;
- failed-processor and blocked-dependent trace entries when the caller selects continue-on-error behavior;
- explicit processor descriptors with dependency metadata;
- deterministic ready-queue ordering by `processor.id`;
- machine-readable execution traces and typed result-envelope helpers.

This package does not define remote orchestration, distributed scheduling, durable cache storage, or
worker pools. Callers provide documents, processors, versioned context, cancellation signals, and
optional cache objects.
