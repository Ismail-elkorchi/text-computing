#!/usr/bin/env node
import {
  calibrateTextConformanceBenchmarkReports,
  isTextConformanceBenchmarkCalibrationReportV1,
  renderTextConformanceBenchmarkCalibrationMarkdown,
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

async function hostBenchmark(hostId, stepMs) {
  return {
    host: {
      hostId,
      runtime: "node-24",
      evidenceRefs: [`examples/textconformance-benchmark-calibration-consumer.mjs#${hostId}`],
    },
    report: await runTextConformanceBenchmark({
      benchmarkId: "benchmark:example:textconformance-calibration",
      subject: {
        kind: "package",
        id: "@ismail-elkorchi/textconformance",
      },
      generatedAt: `2026-04-2${hostId === "host-a" ? "3" : "4"}T00:00:00.000Z`,
      iterations: 2,
      warmupIterations: 1,
      clock: deterministicClock(stepMs),
      evidenceRefs: [`examples/textconformance-benchmark-calibration-consumer.mjs#${hostId}-report`],
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
                reportId: "example:calibration-check",
                subject: { kind: "package", id: "@ismail-elkorchi/textconformance" },
              },
            );
          },
        },
      ],
    }),
  };
}

const calibration = calibrateTextConformanceBenchmarkReports(
  [
    await hostBenchmark("host-a", 5),
    await hostBenchmark("host-b", 6),
  ],
  {
    calibrationId: "calibration:example:textconformance",
    generatedAt: "2026-04-25T00:00:00.000Z",
    baselineHostId: "host-a",
    maxRelativeSpread: 0.25,
    limitations: [
      "Example calibration over caller-provided benchmark reports; it does not provision hosts.",
    ],
  },
);

if (!isTextConformanceBenchmarkCalibrationReportV1(calibration)) {
  throw new Error("benchmark calibration report is invalid");
}

console.log(JSON.stringify({
  calibrationId: calibration.calibrationId,
  hostCount: calibration.hostCount,
  metricCount: calibration.metricCount,
  summary: calibration.summary,
  firstMetric: calibration.rows[0],
  markdownIncludesSummary: renderTextConformanceBenchmarkCalibrationMarkdown(calibration).includes("Summary"),
}, null, 2));
