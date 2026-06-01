# Changelog

## Next

- Add textprotocol result-envelope helpers for benchmark reports, calibration reports, matrix reports, threshold policies, and threshold evaluations.

## 0.1.0

- Add benchmark matrix reports and CLI output over caller-provided benchmark reports.
- Add cross-host benchmark calibration reports over caller-provided benchmark reports.
- Add benchmark threshold policy APIs, schemas, Markdown rendering, and the `evaluate-benchmark` CLI path.
- Add benchmark runner APIs and the `run-benchmark` CLI path for suite-execution benchmark reports.
- Add suite target declarations, target probe guards, target-backed suite reports,
  the `run-suite` CLI path, and a consumer example for fixture, external consumer,
  and generated-artifact evidence.
- Add declarative conformance suite classes, fixture-role policy checks, a differential oracle helper, a separated benchmark report contract, and the `textconformance` CLI.
- Promote the conformance report package surface to public alpha for bounded package interop.

## 0.0.0

- Establish package workspace metadata.
- Add the `textconformance-report-v1` contract and runtime guards for machine-readable check reports.
- Add report diff, capability-registry validation, and deterministic Markdown rendering helpers.
