# Repository schemas

This directory stores repository-level JSON Schemas.

Package-local schemas remain inside the package that owns their runtime or documentation contract, such as `packages/textfacts/schemas/`.

## Repository-level schemas

- [`textdoc-json-v1.schema.json`](textdoc-json-v1.schema.json) — final stable `TextDocJson` document serialization schema.
- [`textpipeline-trace-v1.schema.json`](textpipeline-trace-v1.schema.json) — deterministic processor trace schema.
- [`textpipeline-batch-run-report-v1.schema.json`](textpipeline-batch-run-report-v1.schema.json) — deterministic textpipeline batch run report schema.
- [`textpipeline-worker-run-report-v1.schema.json`](textpipeline-worker-run-report-v1.schema.json) — deterministic textpipeline worker run report schema.
- [`textpipeline-worker-pool-run-report-v1.schema.json`](textpipeline-worker-pool-run-report-v1.schema.json) — deterministic textpipeline worker-pool run report schema.
- [`textpipeline-distributed-schedule-plan-v1.schema.json`](textpipeline-distributed-schedule-plan-v1.schema.json) — deterministic textpipeline distributed schedule plan schema for caller-declared nodes and workers.
- [`textpipeline-recovery-plan-v1.schema.json`](textpipeline-recovery-plan-v1.schema.json) — deterministic caller-managed recovery plan schema for partial textpipeline run reports.
- [`textpipeline-recovery-execution-report-v1.schema.json`](textpipeline-recovery-execution-report-v1.schema.json) — deterministic automatic recovery execution report schema for retrying partial textpipeline run reports.
- [`textpack-manifest.schema.json`](textpack-manifest.schema.json) — final resource-pack manifest schema.
