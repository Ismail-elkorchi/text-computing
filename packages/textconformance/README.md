# `@ismail-elkorchi/textconformance`

Conformance report package.

The current public surface defines a machine-readable conformance report shape
for repository-level checks and fixture-derived evidence.

It also exposes a minimal synchronous runner that executes named checks and
summarizes `pass`, `fail`, and `not-run` outcomes into the same report shape.

## Report diff and claim registry

Use `diffTextConformanceReports()` to compare expected and actual conformance
reports by stable check id. The diff distinguishes unchanged, changed, added,
and removed checks and rejects duplicate check ids.

Use `validateTextConformanceClaimRegistry()` to verify that support claims carry
traceability links to requirements, APIs, evidence, conformance reports, and
limitations. The package does not define a benchmark runner.
