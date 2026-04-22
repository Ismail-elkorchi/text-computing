# textpipeline processor contract

## Why this document exists

The repository needs a public contract for deterministic processor ordering before higher-level task
packages can claim orchestration semantics. This document records the minimal synchronous processor
surface, the dependency policy, and the execution-trace payload that Stage 2A validates.

## Processor descriptor

Each processor descriptor records:

- `id` and `version`;
- `dependsOn` as an ordered-insensitive set of processor ids;
- `requires` as required view ids, layer ids, pack ids, and profile ids;
- `emits` as declared view ids and layer ids;
- `purity` as `pure` or `stateful`; and
- `parallelSafe` as an explicit boolean.

`requires` and `emits` use **ids**, not kinds.

## Execution rules

The v1 runner is synchronous, in-memory, and deterministic.

- duplicate processor ids are invalid;
- self-dependencies are invalid;
- missing dependencies are invalid;
- cyclic dependency graphs are invalid;
- processors that become ready at the same time run in ascending lexical `processor.id` order; and
- missing `requires` inputs do not throw; they produce a `skipped` trace entry with deterministic
  diagnostics and leave the document unchanged.

When a processor runs successfully, any newly introduced view ids or layer ids are recorded in the
trace entry. If a processor emits view ids or layer ids that are not declared in `descriptor.emits`,
the run is rejected.

## Trace payload

The canonical schema is
[`../../schemas/textpipeline-trace-v1.schema.json`](../../schemas/textpipeline-trace-v1.schema.json).

Each trace records:

- `schemaVersion`;
- `documentId`;
- `finalRevision`; and
- ordered `entries` containing `processorId`, `version`, `status`, emitted view ids, emitted layer
  ids, diagnostics, and input/output revisions.

The trace payload is designed to sit inside
[`../../schemas/textprotocol-result-envelope-v1.schema.json`](../../schemas/textprotocol-result-envelope-v1.schema.json)
with payload kind `textpipeline-trace`.

## Deliberate v1 exclusions

This contract does not yet standardize:

- asynchronous execution;
- streaming or batching;
- cache semantics;
- remote execution; or
- scheduler policies beyond stable ready-queue ordering.

## Verification

`npm run -s test:all` executes runtime tests for deterministic ordering, dependency rejection,
missing-requirement skipping, undeclared output rejection, and envelope-compatible trace
serialization. `npm run -s schema:validate` validates the repository trace schema.
