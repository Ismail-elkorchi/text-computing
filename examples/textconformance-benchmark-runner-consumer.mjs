#!/usr/bin/env node
import {
  conformanceBenchmarkThresholdPolicySchemaVersion,
  evaluateTextConformanceBenchmarkThresholds,
  isTextConformanceBenchmarkReportV1,
  isTextConformanceBenchmarkThresholdEvaluationReportV1,
  isTextConformanceReportV1,
  runTextConformanceBenchmark,
  runTextConformanceSuite,
} from "@ismail-elkorchi/textconformance";

const suite = {
  schemaId: "urn:ismail-elkorchi:textconformance:suite:v1",
  schemaVersion: 1,
  suiteId: "suite:example:textconformance-benchmark",
  suiteVersion: "1.0.0",
  suiteClass: "benchmark",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textconformance",
    version: "0.1.0",
  },
  scopeBoundary: "Example suite for benchmark-runner package usage.",
  fixtures: [
    { role: "validation", ref: "examples/textconformance-benchmark-runner-consumer.mjs#validation" },
    { role: "holdout", ref: "examples/textconformance-benchmark-runner-consumer.mjs#holdout" },
    { role: "negative-control", ref: "examples/textconformance-benchmark-runner-consumer.mjs#negative" },
  ],
  oracles: [{ oracleId: "example-oracle", kind: "runtime-guard" }],
  checks: [
    {
      checkId: "example-check",
      oracleId: "example-oracle",
      evidenceRefs: ["examples/textconformance-benchmark-runner-consumer.mjs"],
    },
  ],
  limitations: ["Example suite only; benchmark metrics are not pass/fail conformance results."],
};

let clock = 0;
const benchmarkReport = await runTextConformanceBenchmark({
  benchmarkId: "benchmark:example:textconformance-suite-runner",
  subject: suite.subject,
  iterations: 2,
  warmupIterations: 1,
  clock() {
    const value = clock;
    clock += 4;
    return value;
  },
  evidenceRefs: ["examples/textconformance-benchmark-runner-consumer.mjs"],
  limitations: ["Example benchmark uses an injected deterministic clock."],
  cases: [
    {
      caseId: "suite-runner",
      run() {
        const report = runTextConformanceSuite(suite, {
          fixturePolicy: { requireHoldout: true },
        });
        if (report.summary.fail !== 0) {
          throw new Error("example suite did not pass before benchmark reporting");
        }
      },
    },
  ],
});

if (!isTextConformanceBenchmarkReportV1(benchmarkReport)) {
  throw new Error("benchmark runner produced an invalid benchmark report");
}
if (isTextConformanceReportV1(benchmarkReport)) {
  throw new Error("benchmark reports must remain separate from conformance reports");
}

const thresholdPolicy = {
  schemaVersion: conformanceBenchmarkThresholdPolicySchemaVersion,
  policyId: "policy:example:textconformance-suite-runner",
  benchmarkId: benchmarkReport.benchmarkId,
  subject: suite.subject,
  calibratedAt: "2026-04-23T00:00:00.000Z",
  thresholds: [
    {
      metricId: "suite-runner.duration-ms.mean",
      unit: "ms",
      max: 4,
      warnMax: 3,
      evidenceRefs: ["examples/textconformance-benchmark-runner-consumer.mjs#threshold-mean"],
    },
    {
      metricId: "suite-runner.iterations",
      unit: "count",
      min: 2,
      evidenceRefs: ["examples/textconformance-benchmark-runner-consumer.mjs#threshold-iterations"],
    },
  ],
  evidenceRefs: ["examples/textconformance-benchmark-runner-consumer.mjs#threshold-policy"],
  limitations: ["Example threshold policy uses an injected deterministic clock and local calibration."],
};
const thresholdEvaluation = evaluateTextConformanceBenchmarkThresholds(benchmarkReport, thresholdPolicy, {
  generatedAt: "2026-04-23T00:00:00.000Z",
});
if (!isTextConformanceBenchmarkThresholdEvaluationReportV1(thresholdEvaluation)) {
  throw new Error("benchmark threshold evaluation produced an invalid report");
}

console.log(JSON.stringify({
  benchmarkId: benchmarkReport.benchmarkId,
  metricIds: benchmarkReport.metrics.map((metric) => metric.metricId),
  meanDurationMs: benchmarkReport.metrics.find((metric) => metric.metricId === "suite-runner.duration-ms.mean")?.value,
  thresholdSummary: thresholdEvaluation.summary,
}, null, 2));
