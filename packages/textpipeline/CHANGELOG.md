# Changelog

## 0.1.0

- Add automatic local recovery execution reports for retrying recovery plan items.
- Add deterministic distributed schedule plans over caller-declared nodes, workers, and active capacity.
- Add deterministic caller-managed recovery plan reports for partial batch, worker, and worker-pool run reports.
- Add caller-provided worker-pool execution with deterministic round-robin assignment reports.
- Add caller-provided worker execution APIs and deterministic worker run reports.
- Promote package metadata to public alpha for deterministic local pipeline execution.
- Add exported graph-plan validation, versioned requirement checks, conservative cache-key creation,
  partial-run traces, and blocked-dependent recovery semantics.
- Add snapshot-backed cache import/export helpers for caller-managed durable cache storage.
- Add batch run report schema and runtime guard.

## 0.0.0

- Add the deterministic processor descriptor contract, synchronous runner, and trace payload shape.
- Add async, batch, stream, cancellation, cache-hit, and continue-on-error execution hooks.
