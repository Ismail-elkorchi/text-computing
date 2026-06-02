# `@ismail-elkorchi/textpipeline`

Deterministic text pipeline processor contract package.

Current scope:

- synchronous, in-memory processor execution;
- asynchronous processor execution;
- input-order batch and stream runners;
- caller-provided worker execution with deterministic worker run reports;
- caller-provided worker-pool execution with deterministic round-robin assignment reports;
- deterministic distributed schedule plans over caller-declared nodes, workers, and active capacity;
- caller-managed recovery plan reports for partial batch, worker, and worker-pool run reports;
- automatic local recovery execution for retrying recovery plan items with deterministic execution reports;
- cancellation via `AbortSignal`;
- deterministic dependency graph validation and exported execution plans;
- requirements over declared views, layers, packages, packs, profiles, and their versions;
- conservative cache keys for caller-provided document caches;
- explicit cache-hit trace entries for caller-provided document caches;
- snapshot-backed cache import/export helpers for caller-managed durable cache storage;
- failed-processor and blocked-dependent trace entries when the caller selects continue-on-error behavior;
- explicit processor descriptors with dependency metadata;
- deterministic ready-queue ordering by `processor.id`;
- machine-readable execution traces and batch run reports.

This package does not define remote orchestration. Distributed scheduling is a deterministic plan
artifact over caller-declared nodes and workers; callers provide documents, processors, workers,
versioned context, cancellation signals, and optional cache objects.
Cache durability is caller-managed through snapshot JSON helpers, and recovery execution is local to
the caller-provided documents and processors.
