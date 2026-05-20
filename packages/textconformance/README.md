# `@ismail-elkorchi/textconformance`

Conformance report package.

The current public surface defines machine-readable conformance report and
suite shapes for repository-level checks and fixture-derived evidence.

It also exposes a minimal synchronous runner that executes named checks and
summarizes `pass`, `fail`, and `not-run` outcomes into the same report shape.

## Suite harness and fixture policy

Use `runTextConformanceSuite()` to execute a declarative suite with one of the
bounded suite classes: `spec`, `profile`, `pack`, `interchange`, `workflow`, or
`benchmark`.

Suite fixtures must declare their role. Development fixtures cannot be the sole
basis for a public claim, and claim-bearing suites can require holdout and
negative-control fixtures through `validateTextConformanceFixturePolicy()`.

Use `runTextConformanceDifferentialOracle()` for deterministic JSON comparison
when expected and actual outputs have an explicit allowed-difference policy.

The benchmark report contract is intentionally separate from the conformance
report contract. Benchmark metrics can be recorded, but benchmark metrics are
not pass/fail conformance results.

## CLI

The package ships a `textconformance` command:

```sh
textconformance validate-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textconformance render-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textconformance diff-reports expected.json actual.json
textconformance validate-suite fixtures/conformance/package-suites.v1.json
```

## Report diff and claim registry

Use `diffTextConformanceReports()` to compare expected and actual conformance
reports by stable check id. The diff distinguishes unchanged, changed, added,
and removed checks and rejects duplicate check ids.

Use `validateTextConformanceClaimRegistry()` to verify that support claims carry
traceability links to requirements, APIs, inputs, oracles, evidence,
conformance reports, and limitations.

## Markdown rendering

Use `renderTextConformanceReportMarkdown()` and
`renderTextConformanceReportDiffMarkdown()` to produce deterministic
release-oriented Markdown summaries from machine-readable reports and report
diffs. The renderers validate their inputs, sort check rows by stable check id,
escape table cells, and emit a final newline.
