# Task evidence reports

This directory contains persisted public `TextConformanceReportV1` artifacts for
current slice-proven task surfaces.

- `task-evidence-manifest.v1.json` maps each task to its report, evidence
  references, comparator references, and known gaps.
- Each `<task-id>/conformance-report.json` validates against
  [`../../schemas/textconformance-report-v1.schema.json`](../../schemas/textconformance-report-v1.schema.json).

These reports are evidence records. They do not expand support beyond the
claim boundaries in [`../../docs/specs/support-status.md`](../../docs/specs/support-status.md).
