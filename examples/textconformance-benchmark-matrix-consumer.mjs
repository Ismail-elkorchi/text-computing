#!/usr/bin/env node
import {
  createTextConformanceBenchmarkMatrixReport,
  isTextConformanceBenchmarkMatrixReportV1,
  renderTextConformanceBenchmarkMatrixMarkdown,
  runTextConformanceBenchmark,
  runTextConformanceChecks,
} from "@ismail-elkorchi/textconformance";

function deterministicClock(stepMs) {
  let current = 0;
  return () => {
    const value = current;
    current += stepMs;
    return value;
  };
}

async function benchmarkRun(runId, hostId, stepMs, extraMetric = false) {
  const report = await runTextConformanceBenchmark({
    benchmarkId: "benchmark:example:textconformance-matrix",
    subject: {
      kind: "package",
      id: "@ismail-elkorchi/textconformance",
    },
    generatedAt: hostId === "host-a" ? "2026-04-23T00:00:00.000Z" : "2026-04-24T00:00:00.000Z",
    iterations: 2,
    warmupIterations: 1,
    clock: deterministicClock(stepMs),
    evidenceRefs: [`examples/textconformance-benchmark-matrix-consumer.mjs#${runId}`],
    limitations: ["Example benchmark report over an injected deterministic clock."],
    cases: [
      {
        caseId: "example-suite",
        run() {
          runTextConformanceChecks(
            [
              {
                checkId: "example-check",
                run: () => "pass",
              },
            ],
            {
              reportId: "example:matrix-check",
              subject: { kind: "package", id: "@ismail-elkorchi/textconformance" },
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
      evidenceRefs: [`examples/textconformance-benchmark-matrix-consumer.mjs#${hostId}`],
    },
    report: extraMetric
      ? {
          ...report,
          metrics: [
            ...report.metrics,
            {
              metricId: "example-suite.host-only",
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
    matrixId: "matrix:example:textconformance",
    generatedAt: "2026-04-25T00:00:00.000Z",
    limitations: [
      "Example matrix over caller-provided benchmark reports; it does not provision hosts.",
    ],
  },
);

if (!isTextConformanceBenchmarkMatrixReportV1(matrix)) {
  throw new Error("benchmark matrix report is invalid");
}

console.log(JSON.stringify({
  matrixId: matrix.matrixId,
  runCount: matrix.runCount,
  benchmarkCount: matrix.benchmarkCount,
  subjectCount: matrix.subjectCount,
  summary: matrix.summary,
  firstMetric: matrix.rows[0],
  markdownIncludesSummary: renderTextConformanceBenchmarkMatrixMarkdown(matrix).includes("Summary"),
}, null, 2));
