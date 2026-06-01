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

The package exposes conformance report, suite-target, benchmark, threshold,
calibration, and matrix helpers for fixture, consumer, and generated-artifact evidence.
