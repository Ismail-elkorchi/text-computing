#!/usr/bin/env node
import { isTextConformanceBenchmarkReportV1 } from "@ismail-elkorchi/textconformance";
import {
  inspectTextConformanceBenchmarkReport,
  renderTextConformanceBenchmarkReportInspection,
} from "@ismail-elkorchi/textlab";

const benchmarkReport = {
  schemaId: "urn:ismail-elkorchi:textconformance:benchmark-report:v1",
  schemaVersion: 1,
  benchmarkId: "benchmark:example:textlab",
  subject: {
    kind: "package",
    id: "@ismail-elkorchi/textlab",
    version: "0.1.0",
  },
  generatedAt: "2026-05-31T00:00:00.000Z",
  metrics: [
    {
      metricId: "render-duration-ms",
      value: 3,
      unit: "ms",
      higherIsPreferred: false,
    },
    {
      metricId: "reports-per-second",
      value: 120,
      unit: "reports/s",
      higherIsPreferred: true,
    },
  ],
  evidenceRefs: ["examples/textlab-benchmark-report-consumer.mjs"],
  limitations: ["Example benchmark report only; it is not a pass/fail conformance result."],
};

if (!isTextConformanceBenchmarkReportV1(benchmarkReport)) {
  throw new Error("benchmark report fixture is invalid");
}

const inspection = inspectTextConformanceBenchmarkReport(benchmarkReport);
const rendered = renderTextConformanceBenchmarkReportInspection(inspection);

console.log(JSON.stringify({
  benchmarkId: inspection.benchmarkId,
  metricCount: inspection.metricCount,
  preferences: inspection.metrics.map((metric) => `${metric.metricId}:${metric.preference}`),
  renderedIncludesBenchmark: rendered.includes("Benchmark: benchmark:example:textlab"),
}, null, 2));
