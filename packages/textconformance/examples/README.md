# @ismail-elkorchi/textconformance examples

- [`../../../examples/textconformance-suite-target-consumer.mjs`](../../../examples/textconformance-suite-target-consumer.mjs)
  runs a target-backed suite through the public package entrypoint and emits a
  conformance report summary.
- [`../../../examples/textconformance-benchmark-runner-consumer.mjs`](../../../examples/textconformance-benchmark-runner-consumer.mjs)
  runs a benchmark report through the public package entrypoint.
- [`../../../examples/textconformance-benchmark-calibration-consumer.mjs`](../../../examples/textconformance-benchmark-calibration-consumer.mjs)
  calibrates caller-provided benchmark reports across declared hosts.
- [`../../../examples/textconformance-benchmark-matrix-consumer.mjs`](../../../examples/textconformance-benchmark-matrix-consumer.mjs)
  builds a deterministic benchmark matrix from caller-provided report runs.
- [`../../../examples/textconformance-benchmark-protocol-envelope-consumer.mjs`](../../../examples/textconformance-benchmark-protocol-envelope-consumer.mjs)
  wraps benchmark artifacts in registered textprotocol result envelopes.

The package exposes conformance report, suite-target, benchmark, threshold,
calibration, matrix, and benchmark artifact envelope helpers for fixture,
consumer, generated-artifact, and protocol-exchange evidence.
