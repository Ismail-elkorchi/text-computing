# textpipeline processor contract

## Why this document exists

The repository needs a public contract for deterministic processor ordering before higher-level task
packages can declare orchestration semantics. This document records the local processor surface, the
dependency policy, and the execution-trace payload validated for the alpha package scope.

## Processor descriptor

Each processor descriptor records:

- `id` and `version`;
- `dependsOn` as an ordered-insensitive set of processor ids;
- `requires` as required view ids, layer ids, package ids, pack ids, profile ids, and optional
  required versions for packages, packs, and profiles;
- `emits` as declared view ids and layer ids;
- `purity` as `pure` or `stateful`; and
- `parallelSafe` as an explicit boolean.

`requires` and `emits` use **ids**, not kinds. Version requirements are matched only against
explicit caller-provided context; there is no hidden package, pack, or profile discovery.

## Execution rules

The v1 runner is local, in-memory, and deterministic.

- duplicate processor ids are invalid;
- self-dependencies are invalid;
- missing dependencies are invalid;
- cyclic dependency graphs are invalid;
- processors that become ready at the same time run in ascending lexical `processor.id` order;
- missing `requires` inputs do not throw; they produce a `skipped` trace entry with deterministic
  diagnostics and leave the document unchanged;
- dependents of skipped or failed processors are skipped with a blocked-dependency diagnostic;
- undeclared emitted view ids or layer ids are rejected; and
- asynchronous, batch, and stream runners preserve input order and use the same graph semantics.

The default error policy is fail-fast. With `errorPolicy: "continue"`, failed processors are
recorded as `failed`, their dependents are skipped, and the trace run status is `partial`.

## Cache policy

Cache use is caller-provided and read-through only. Cache keys include processor descriptor fields,
processor version, document id, document revision, package/pack/profile version context, and an
optional cache namespace. Skipped and failed processors do not populate cache entries.

## Trace payload

The canonical schema is
[`../../schemas/textpipeline-trace-v1.schema.json`](../../schemas/textpipeline-trace-v1.schema.json).

Each trace records:

- `schemaVersion`, `documentId`, and `finalRevision`;
- `executionMode` as `sync` or `async`;
- `runStatus` as `complete` or `partial`;
- deterministic `processorOrder`;
- deterministic `contextFingerprint`;
- `cachePolicy`; and
- ordered `entries` containing `processorId`, `version`, `status`, emitted view ids, emitted layer
  ids, diagnostics, cache key when present, and input/output revisions.

The trace payload is designed to sit inside
[`../../schemas/textprotocol-result-envelope-v1.schema.json`](../../schemas/textprotocol-result-envelope-v1.schema.json)
with payload kind `textpipeline-trace-v1`.

## Batch report payload

The canonical batch report schema is
[`../../schemas/textpipeline-batch-run-report-v1.schema.json`](../../schemas/textpipeline-batch-run-report-v1.schema.json).
It summarizes input-order batch execution without embedding full documents or full trace entries.

Each batch report records:

- `schemaVersion`, `documentCount`, `completeCount`, and `partialCount`;
- deterministic `executionModes`, `cachePolicies`, and `contextFingerprints`;
- ordered `items` with input index, document id, final revision, run status, execution mode, cache
  policy, processor order, and trace-entry count.

The batch report payload is designed to sit inside the result envelope with payload kind
`textpipeline-batch-run-report-v1`.

## Deliberate v1 exclusions

This contract does not define remote orchestration, distributed scheduling, durable cache storage,
worker pools, or recovery after a process boundary. Those remain outside the alpha package scope.

## Verification

`npm run -s test:all` executes runtime tests for graph validation, deterministic ordering,
versioned requirement checks, missing-requirement skipping, blocked dependents, undeclared output
rejection, cache-key invalidation, async/batch/stream behavior, cancellation, partial-run traces, and
envelope-compatible trace serialization. `npm run -s schema:validate` validates the repository trace
schema.
