#!/usr/bin/env node
import {
  createTextConformanceBenchmarkMatrixReport,
  runTextConformanceBenchmark,
  runTextConformanceChecks,
} from "@ismail-elkorchi/textconformance";
import {
  inspectTextConformanceBenchmarkMatrixReport,
  renderTextConformanceBenchmarkMatrixInspection,
} from "@ismail-elkorchi/textlab";

function deterministicClock(stepMs) {
  let current = 0;
  return () => {
    const value = current;
    current += stepMs;
    return value;
  };
}

async function benchmarkRun(runId, hostId, stepMs, includeExtraMetric = false) {
  const report = await runTextConformanceBenchmark({
    benchmarkId: "benchmark:example:textlab-matrix",
    subject: {
      kind: "package",
      id: "@ismail-elkorchi/textlab",
    },
    generatedAt: hostId === "host-a" ? "2026-05-31T00:00:00.000Z" : "2026-06-01T00:00:00.000Z",
    iterations: 2,
    warmupIterations: 1,
    clock: deterministicClock(stepMs),
    evidenceRefs: [`examples/textlab-benchmark-matrix-consumer.mjs#${runId}`],
    limitations: ["Example benchmark report over an injected deterministic clock."],
    cases: [
      {
        caseId: "inspection",
        run() {
          runTextConformanceChecks(
            [
              {
                checkId: "inspect",
                run: () => "pass",
              },
            ],
            {
              reportId: "example:textlab-matrix-check",
              subject: { kind: "package", id: "@ismail-elkorchi/textlab" },
            },
          );
        },
      },
    ],
  });
  return {
    runId,
    host: {
      hostId,
      runtime: "node-24",
      evidenceRefs: [`examples/textlab-benchmark-matrix-consumer.mjs#${hostId}`],
    },
    report: includeExtraMetric
      ? {
          ...report,
          metrics: [
            ...report.metrics,
            {
              metricId: "inspection.host-only",
              value: 1,
              unit: "count",
              higherIsPreferred: true,
            },
          ],
        }
      : report,
  };
}

const matrix = createTextConformanceBenchmarkMatrixReport(
  [
    await benchmarkRun("host-a-run", "host-a", 5, true),
    await benchmarkRun("host-b-run", "host-b", 6),
  ],
  {
    matrixId: "matrix:example:textlab",
    generatedAt: "2026-06-01T00:00:00.000Z",
    limitations: [
      "Example matrix over caller-provided benchmark reports; it does not provision hosts.",
    ],
  },
);

const inspection = inspectTextConformanceBenchmarkMatrixReport(matrix);
console.log(JSON.stringify({
  matrixId: inspection.matrixId,
  runCount: inspection.runCount,
  metricCount: inspection.metricCount,
  completeMetricCount: inspection.completeMetricCount,
  incompleteMetricCount: inspection.incompleteMetricCount,
  firstMetric: inspection.rows[0],
  renderedIncludesMatrix: renderTextConformanceBenchmarkMatrixInspection(inspection).includes("Matrix: matrix:example:textlab"),
}, null, 2));
