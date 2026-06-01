# `@ismail-elkorchi/textconformance`

Conformance report package.

The current public surface defines machine-readable conformance report and
suite shapes for repository-level checks and fixture-derived evidence.

It also exposes a minimal synchronous runner that executes named checks and
summarizes `pass`, `fail`, and `not-run` outcomes into the same report shape,
plus a benchmark runner that executes benchmark cases into separate benchmark
report records.

## Suite harness and fixture policy

Use `runTextConformanceSuite()` to execute a declarative suite with one of the
bounded suite classes: `spec`, `profile`, `pack`, `interchange`, `workflow`, or
`benchmark`.

Suite fixtures must declare their role. Development fixtures cannot be the sole
basis for a public statement, and scope-bearing suites can require holdout and
negative-control fixtures through `validateTextConformanceFixturePolicy()`.

Use `runTextConformanceDifferentialOracle()` for deterministic JSON comparison
when expected and actual outputs have an explicit allowed-difference policy.

Use `runTextConformanceSuiteWithTargets()` when a suite needs to verify declared
package fixtures, external consumer evidence, and generated package artifacts in
the same conformance report. The target runner keeps those checks in the
conformance report model; benchmark measurements still belong in benchmark
reports.

The benchmark report contract is intentionally separate from the conformance
report contract. Use `runTextConformanceBenchmark()` to execute warmup and
measurement iterations for caller-provided benchmark cases. Benchmark metrics
can be recorded, but benchmark metrics are not pass/fail conformance results.
Use `evaluateTextConformanceBenchmarkThresholds()` to apply a calibrated
benchmark threshold policy to a benchmark report and produce a deterministic
pass/warn/fail/missing threshold-evaluation record.
Use `calibrateTextConformanceBenchmarkReports()` to compare multiple
caller-provided benchmark reports for the same benchmark and subject across
declared hosts, producing deterministic observed/stable/variable/incomplete
metric rows without provisioning hosts.

## CLI

The package ships a `textconformance` command:

```sh
textconformance validate-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textconformance render-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textconformance diff-reports expected.json actual.json
textconformance validate-suite fixtures/conformance/package-suites.v1.json
textconformance run-suite fixtures/conformance/package-suites.v1.json --target-root .
textconformance run-benchmark fixtures/conformance/package-suites.v1.json --target-root . --iterations 3 --warmup 1
textconformance evaluate-benchmark benchmark-report.json threshold-policy.json --markdown
```

Runnable repository examples:

- [`../../examples/textconformance-benchmark-runner-consumer.mjs`](../../examples/textconformance-benchmark-runner-consumer.mjs)
  runs a suite benchmark through package APIs and keeps benchmark output separate from conformance reports.
- [`../../examples/textconformance-benchmark-calibration-consumer.mjs`](../../examples/textconformance-benchmark-calibration-consumer.mjs)
  calibrates benchmark reports from declared hosts and prints the resulting cross-host metric summary.

## Report diff and capability registry

Use `diffTextConformanceReports()` to compare expected and actual conformance
reports by stable check id. The diff distinguishes unchanged, changed, added,
and removed checks and rejects duplicate check ids.

Use `validateTextConformanceCapabilityRegistry()` to verify that support statements carry
traceability links to requirements, APIs, inputs, oracles, evidence,
conformance reports, and limitations.

## Markdown rendering

Use `renderTextConformanceReportMarkdown()` and
`renderTextConformanceReportDiffMarkdown()`,
`renderTextConformanceBenchmarkThresholdEvaluationMarkdown()`, and
`renderTextConformanceBenchmarkCalibrationMarkdown()` to produce deterministic
release-oriented Markdown summaries from machine-readable reports and benchmark
artifacts. The renderers validate their inputs, sort rows by stable ids, escape
table cells, and emit a final newline.
