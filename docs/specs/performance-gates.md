# Performance gates

- **Status:** Draft 0.1
- **Scope:** Public performance and scale gate requirements
- **Data:** `fixtures/performance/gates.v1.json`
- **Schema:** `schemas/performance-gates-v1.schema.json`

## Why this document exists

Small fixture correctness can be mistaken for operational scale. This document records which
throughput, memory, streaming, large-corpus, and regression-threshold gates must exist before broader
operational claims are made.

## Gate dimensions

- `throughput` — command-level processing rate must be measured against a named fixture class.
- `memory` — peak or bounded memory behavior must be measured or justified.
- `streaming` — streaming claims require a streaming fixture and replay command.
- `large-corpus` — large-corpus claims require corpus size, token count, query count, and index size policy.
- `regression-threshold` — regression checks require stable baseline metadata before failing CI.

## Current boundary

The current manifest defines gate requirements. It does not persist wall-clock or memory measurements.
Those measurements require a benchmark-host policy to avoid noisy CI assertions.

## Verification

Run:

```sh
node tools/validate-performance-gates.mjs
npm run -s check:fixtures
```
