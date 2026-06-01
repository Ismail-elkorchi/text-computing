# `@ismail-elkorchi/textpipeline`

Deterministic text pipeline processor contract package.

Current scope:

- synchronous, in-memory processor execution;
- asynchronous processor execution;
- input-order batch and stream runners;
- caller-provided worker execution with deterministic worker run reports;
- caller-provided worker-pool execution with deterministic round-robin assignment reports;
- caller-managed recovery plan reports for partial batch, worker, and worker-pool run reports;
- cancellation via `AbortSignal`;
- deterministic dependency graph validation and exported execution plans;
- requirements over declared views, layers, packages, packs, profiles, and their versions;
- conservative cache keys for caller-provided document caches;
- explicit cache-hit trace entries for caller-provided document caches;
- snapshot-backed cache import/export helpers for caller-managed durable cache storage;
- failed-processor and blocked-dependent trace entries when the caller selects continue-on-error behavior;
- explicit processor descriptors with dependency metadata;
- deterministic ready-queue ordering by `processor.id`;
- machine-readable execution traces, batch run reports, and typed result-envelope helpers.
- processor-trace schema-family payload and envelope helpers for textprotocol JSON transport.

This package does not define remote orchestration, distributed scheduling, or automatic recovery
execution. Callers provide documents, processors, workers, versioned context, cancellation signals,
optional cache objects, and any retry execution loop. Cache durability is caller-managed through
snapshot JSON helpers, and recovery plans are deterministic retry metadata for caller-managed execution.

## Runnable examples

- [`../../examples/textpipeline-batch-report-consumer.mjs`](../../examples/textpipeline-batch-report-consumer.mjs)
  runs complete and partial document batches, then prints deterministic batch reports and typed result
  envelopes with per-document completion state and trace sizes.
- [`../../examples/textpipeline-processor-trace-envelope-consumer.mjs`](../../examples/textpipeline-processor-trace-envelope-consumer.mjs)
  runs a cache-backed processor, wraps the cached execution trace in textprotocol processor-trace
  schema-family JSON transport, parses it, and inspects the parsed envelope through textlab.
- [`../../examples/textpipeline-cache-snapshot-consumer.mjs`](../../examples/textpipeline-cache-snapshot-consumer.mjs)
  persists a snapshot-backed document cache through caller-provided filesystem writes, restores it,
  and verifies the next pipeline run uses a cached processor result.
- [`../../examples/textpipeline-worker-batch-consumer.mjs`](../../examples/textpipeline-worker-batch-consumer.mjs)
  runs a batch through a caller-provided local worker and prints the deterministic worker run report.
- [`../../examples/textpipeline-worker-pool-consumer.mjs`](../../examples/textpipeline-worker-pool-consumer.mjs)
  runs a batch through a caller-provided local worker pool and prints deterministic round-robin
  assignments.
- [`../../examples/textpipeline-recovery-plan-consumer.mjs`](../../examples/textpipeline-recovery-plan-consumer.mjs)
  creates a recovery plan from a partial batch report and prints retry input indexes with failed/skipped processor ids.
