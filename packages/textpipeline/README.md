# `@ismail-elkorchi/textpipeline`

Deterministic text pipeline processor contract package.

Current scope:

- synchronous, in-memory processor execution;
- asynchronous processor execution;
- input-order batch and stream runners;
- cancellation via `AbortSignal`;
- explicit cache-hit trace entries for caller-provided document caches;
- failed-processor trace entries when the caller selects continue-on-error behavior;
- explicit processor descriptors with dependency metadata;
- deterministic ready-queue ordering by `processor.id`;
- machine-readable execution traces for result-envelope transport.

This package does not define remote orchestration, distributed scheduling, durable cache storage, or
worker pools. Callers provide documents, processors, cancellation signals, and optional cache
objects.
