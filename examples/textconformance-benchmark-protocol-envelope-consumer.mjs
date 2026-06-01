import {
  calibrateTextConformanceBenchmarkReports,
  conformanceBenchmarkThresholdPolicySchemaVersion,
  createTextConformanceBenchmarkCalibrationReportEnvelope,
  createTextConformanceBenchmarkMatrixReport,
  createTextConformanceBenchmarkMatrixReportEnvelope,
  createTextConformanceBenchmarkReportEnvelope,
  createTextConformanceBenchmarkThresholdEvaluationEnvelope,
  createTextConformanceBenchmarkThresholdPolicyEnvelope,
  evaluateTextConformanceBenchmarkThresholds,
  isTextConformanceBenchmarkArtifactEnvelopeV1,
  runTextConformanceBenchmark,
} from "@ismail-elkorchi/textconformance";
import {
  checkTextProtocolResultEnvelopeCompatibility,
  parseTextProtocolResultEnvelopeJson,
  serializeTextProtocolResultEnvelopeJson,
} from "@ismail-elkorchi/textprotocol";

function expect(condition, message, details = undefined) {
  if (!condition) {
    const error = new Error(message);
    if (details !== undefined) error.details = details;
    throw error;
  }
}

const subject = {
  kind: "package",
  id: "@ismail-elkorchi/textconformance",
};

let clock = 0;
const benchmarkReport = await runTextConformanceBenchmark({
  benchmarkId: "benchmark:example:protocol-envelope",
  subject,
  generatedAt: "2026-04-30T00:00:00.000Z",
  iterations: 2,
  clock() {
    const value = clock;
    clock += 3;
    return value;
  },
  evidenceRefs: ["examples/textconformance-benchmark-protocol-envelope-consumer.mjs#benchmark"],
  limitations: ["Example benchmark report uses an injected deterministic clock."],
  cases: [
    {
      caseId: "envelope-smoke",
      run() {},
    },
  ],
});

const thresholdPolicy = {
  schemaVersion: conformanceBenchmarkThresholdPolicySchemaVersion,
  policyId: "policy:example:protocol-envelope",
  benchmarkId: benchmarkReport.benchmarkId,
  subject,
  calibratedAt: "2026-04-30T00:00:00.000Z",
  thresholds: [
    {
      metricId: "envelope-smoke.duration-ms.mean",
      unit: "ms",
      max: 3,
      evidenceRefs: ["examples/textconformance-benchmark-protocol-envelope-consumer.mjs#threshold"],
    },
  ],
  evidenceRefs: ["examples/textconformance-benchmark-protocol-envelope-consumer.mjs#policy"],
  limitations: ["Example threshold policy for protocol-envelope exchange."],
};
const thresholdEvaluation = evaluateTextConformanceBenchmarkThresholds(
  benchmarkReport,
  thresholdPolicy,
  { generatedAt: "2026-04-30T00:00:00.000Z" },
);

const hostBReport = {
  ...benchmarkReport,
  generatedAt: "2026-05-01T00:00:00.000Z",
  evidenceRefs: ["examples/textconformance-benchmark-protocol-envelope-consumer.mjs#host-b"],
  metrics: benchmarkReport.metrics.map((metric) =>
    metric.metricId === "envelope-smoke.duration-ms.mean"
      ? { ...metric, value: metric.value + 0.25 }
      : metric,
  ),
};
const calibration = calibrateTextConformanceBenchmarkReports(
  [
    {
      host: {
        hostId: "host-a",
        runtime: "node-24",
        evidenceRefs: ["examples/textconformance-benchmark-protocol-envelope-consumer.mjs#host-a"],
      },
      report: benchmarkReport,
    },
    {
      host: {
        hostId: "host-b",
        runtime: "node-24",
        evidenceRefs: ["examples/textconformance-benchmark-protocol-envelope-consumer.mjs#host-b"],
      },
      report: hostBReport,
    },
  ],
  {
    calibrationId: "calibration:example:protocol-envelope",
    generatedAt: "2026-05-01T00:00:00.000Z",
    maxRelativeSpread: 0.2,
    limitations: ["Example calibration over caller-provided benchmark reports."],
  },
);
const matrix = createTextConformanceBenchmarkMatrixReport(
  [
    { runId: "host-a-run", host: { hostId: "host-a" }, report: benchmarkReport },
    { runId: "host-b-run", host: { hostId: "host-b" }, report: hostBReport },
  ],
  {
    matrixId: "matrix:example:protocol-envelope",
    generatedAt: "2026-05-01T00:00:00.000Z",
    limitations: ["Example matrix over caller-provided benchmark reports."],
  },
);

const producerVersion = "0.1.0";
const envelopes = [
  createTextConformanceBenchmarkReportEnvelope(benchmarkReport, producerVersion),
  createTextConformanceBenchmarkThresholdPolicyEnvelope(thresholdPolicy, producerVersion),
  createTextConformanceBenchmarkThresholdEvaluationEnvelope(thresholdEvaluation, producerVersion),
  createTextConformanceBenchmarkCalibrationReportEnvelope(calibration, producerVersion),
  createTextConformanceBenchmarkMatrixReportEnvelope(matrix, producerVersion),
];
for (const envelope of envelopes) {
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(envelope, {
    expectedPayloadKind: envelope.payloadKind,
    expectedProducerPackage: "@ismail-elkorchi/textconformance",
    requireProvenance: true,
    requireScopeBoundary: true,
    requireLimitations: true,
  });
  expect(
    isTextConformanceBenchmarkArtifactEnvelopeV1(envelope) && compatibility.ok,
    "Benchmark artifact envelope failed compatibility checks.",
    compatibility,
  );
}

const matrixTransport = serializeTextProtocolResultEnvelopeJson(envelopes[4], {
  expectedPayloadKind: envelopes[4].payloadKind,
  expectedProducerPackage: "@ismail-elkorchi/textconformance",
  requireProvenance: true,
  requireScopeBoundary: true,
  requireLimitations: true,
});
const parsedMatrixEnvelope = parseTextProtocolResultEnvelopeJson(matrixTransport, {
  expectedPayloadKind: envelopes[4].payloadKind,
  expectedProducerPackage: "@ismail-elkorchi/textconformance",
  requireProvenance: true,
  requireScopeBoundary: true,
  requireLimitations: true,
});

console.log(
  JSON.stringify(
    {
      envelopeCount: envelopes.length,
      payloadKinds: envelopes.map((envelope) => envelope.payloadKind),
      matrixPayloadKind: parsedMatrixEnvelope.payloadKind,
      firstEnvelopeEvidenceRefs: envelopes[0].provenance?.references?.length ?? 0,
    },
    null,
    2,
  ),
);
