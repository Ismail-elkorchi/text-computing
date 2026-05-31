import {
  exportTextDocDocumentBundlePayloadV1,
  importTextDocDocumentBundlePayloadV1,
  isTextDocDocumentBundlePayloadV1,
  isTextDocDocumentV1,
  packageName as textdocPackageName,
  textDocDocumentPayloadKind,
} from "@ismail-elkorchi/textdoc";
import {
  checkTextProtocolSchemaFamilyEnvelope,
  checkTextProtocolResultEnvelopeCompatibility,
  isTextProtocolDocumentBundleV1,
  isTextProtocolProcessorTraceV1,
  isTextProtocolResultEnvelopeForPayloadKind,
  isTextProtocolSchemaFamilyEnvelopeJsonTransportV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolDocumentBundleSchemaId,
  textProtocolPayloadKindTextconformanceReportV1,
  textProtocolPayloadKindTextdocDocumentV1,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  textProtocolPayloadKindTextpipelineTraceV1,
  textProtocolPayloadKindVerticalSliceResultV1,
  textProtocolProcessorTraceSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import {
  createTextPipelineBatchRunReport,
  createTextPipelineBatchRunReportEnvelope,
  isTextPipelineBatchRunReportEnvelopeV1,
  isTextPipelineBatchRunReportV1,
  isTextPipelineTraceV1,
  runTextPipeline,
  textPipelineBatchRunReportPayloadKind,
  textPipelineTracePayloadKind,
} from "@ismail-elkorchi/textpipeline";
import { isTextConformanceReportV1, runTextConformanceChecks } from "@ismail-elkorchi/textconformance";
import {
  inspectTextdocAnnotations,
  inspectTextProtocolResultEnvelope,
  inspectTextProtocolSchemaFamilyEnvelope,
} from "@ismail-elkorchi/textlab";

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function envelope(producerPackage, payloadKind, payload) {
  return {
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    producer: {
      package: producerPackage,
      version: "0.0.0",
    },
    payloadKind,
    payload,
    provenance: {
      references: [
        {
          kind: "fixture",
          id: "textprotocol-interop-smoke",
        },
      ],
    },
    scopeBoundary: "Repository interop smoke payload only.",
    limitations: ["This validator verifies package exchange shape, not broad task behavior."],
  };
}

function assertEnvelope(value, payloadKind, producerPackage) {
  if (!isTextProtocolResultEnvelopeForPayloadKind(value, payloadKind)) {
    fail(`Envelope for ${payloadKind} did not satisfy the typed payload-kind guard.`, value);
  }
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(value, {
    expectedPayloadKind: payloadKind,
    expectedProducerPackage: producerPackage,
    requireProvenance: true,
    requireScopeBoundary: true,
    requireLimitations: true,
  });
  if (!compatibility.ok) {
    fail(`Envelope for ${payloadKind} failed compatibility checks.`, compatibility.diagnostics);
  }
}

function assertProtocolFamily(value, expectedFamily, producerPackage) {
  const result = checkTextProtocolSchemaFamilyEnvelope(value, {
    expectedFamily,
    expectedProducerPackage: producerPackage,
    requireProvenance: true,
    requireLimitations: true,
  });
  if (!result.ok) {
    fail(`Protocol schema-family envelope for ${expectedFamily} failed compatibility checks.`, result.diagnostics);
  }
}

if (textDocDocumentPayloadKind !== textProtocolPayloadKindTextdocDocumentV1) {
  fail("textdoc document payload kind must match the textprotocol registry.");
}

if (textPipelineTracePayloadKind !== textProtocolPayloadKindTextpipelineTraceV1) {
  fail("textpipeline trace payload kind must match the textprotocol registry.");
}

if (textPipelineBatchRunReportPayloadKind !== textProtocolPayloadKindTextpipelineBatchRunReportV1) {
  fail("textpipeline batch report payload kind must match the textprotocol registry.");
}

const document = {
  schemaVersion: 1,
  documentId: "doc:textprotocol-interop",
  revision: "1",
  textLengthCU: 5,
  text: "Alice",
  units: { text: "utf16-code-unit" },
  views: [{ id: "analysis", kind: "raw" }],
  layers: [
    {
      id: "tokens",
      kind: "token",
      viewId: "analysis",
      annotations: [
        {
          id: "token-1",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis", startCU: 0, endCU: 5 }],
          text: "Alice",
        },
      ],
    },
  ],
};

if (!isTextDocDocumentV1(document)) {
  fail("Interop document must satisfy textdoc runtime guard.", document);
}

const pipelineRun = runTextPipeline(document, []);
if (!isTextPipelineTraceV1(pipelineRun.trace)) {
  fail("Interop pipeline trace must satisfy textpipeline runtime guard.", pipelineRun.trace);
}

const textdocEnvelope = envelope(textdocPackageName, textProtocolPayloadKindTextdocDocumentV1, document);
assertEnvelope(textdocEnvelope, textProtocolPayloadKindTextdocDocumentV1, textdocPackageName);

const documentBundlePayload = exportTextDocDocumentBundlePayloadV1([document]);
if (!isTextDocDocumentBundlePayloadV1(documentBundlePayload)) {
  fail("Interop document-bundle payload must satisfy textdoc runtime guard.", documentBundlePayload);
}
const documentBundle = {
  schemaId: textProtocolDocumentBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.0.0",
  },
  payload: documentBundlePayload,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural document-bundle interop smoke only."],
};
if (!isTextProtocolDocumentBundleV1(documentBundle)) {
  fail("Interop document bundle must satisfy textprotocol structural guard.", documentBundle);
}
assertProtocolFamily(documentBundle, "document-bundle", textdocPackageName);
const documentBundleTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(documentBundle, {
  expectedFamily: "document-bundle",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
if (!isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(documentBundleTransport)) {
  fail("Interop document-bundle transport must satisfy textprotocol transport guard.", documentBundleTransport);
}
const parsedDocumentBundle = parseTextProtocolSchemaFamilyEnvelopeJson(documentBundleTransport);
if (!isTextProtocolDocumentBundleV1(parsedDocumentBundle)) {
  fail("Interop document-bundle transport must parse back into a document bundle.");
}
const importedDocumentBundle = importTextDocDocumentBundlePayloadV1(parsedDocumentBundle.payload);
if (!importedDocumentBundle.ok || importedDocumentBundle.documents?.[0]?.documentId !== document.documentId) {
  fail("Interop document-bundle payload must import through textdoc package APIs.", importedDocumentBundle);
}
const documentBundleInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedDocumentBundle);
if (documentBundleInspection.family !== "document-bundle" || !documentBundleInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve schema-family envelope metadata.", documentBundleInspection);
}

const traceEnvelope = envelope(
  "@ismail-elkorchi/textpipeline",
  textProtocolPayloadKindTextpipelineTraceV1,
  pipelineRun.trace,
);
assertEnvelope(traceEnvelope, textProtocolPayloadKindTextpipelineTraceV1, "@ismail-elkorchi/textpipeline");

const batchReport = createTextPipelineBatchRunReport([pipelineRun]);
if (!isTextPipelineBatchRunReportV1(batchReport)) {
  fail("Interop batch report must satisfy textpipeline runtime guard.", batchReport);
}

const batchReportEnvelope = envelope(
  "@ismail-elkorchi/textpipeline",
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  batchReport,
);
assertEnvelope(
  batchReportEnvelope,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  "@ismail-elkorchi/textpipeline",
);

const ownedBatchReportEnvelope = createTextPipelineBatchRunReportEnvelope(batchReport, "0.0.0", {
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  scopeBoundary: "Repository interop smoke payload only.",
  limitations: ["This validator verifies batch report exchange shape, not broad task behavior."],
});
if (!isTextPipelineBatchRunReportEnvelopeV1(ownedBatchReportEnvelope)) {
  fail("Owned batch report envelope must satisfy textpipeline runtime guard.", ownedBatchReportEnvelope);
}
const batchEnvelopeInspection = inspectTextProtocolResultEnvelope(ownedBatchReportEnvelope);
if (
  !batchEnvelopeInspection.registeredPayloadKind ||
  batchEnvelopeInspection.payloadKind !== textProtocolPayloadKindTextpipelineBatchRunReportV1
) {
  fail("Interop textlab inspection must preserve batch report envelope metadata.", batchEnvelopeInspection);
}

const processorTrace = {
  schemaId: textProtocolProcessorTraceSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: "@ismail-elkorchi/textpipeline",
    version: "0.0.0",
  },
  payload: pipelineRun.trace,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural processor-trace interop smoke only."],
};
if (!isTextProtocolProcessorTraceV1(processorTrace)) {
  fail("Interop processor trace must satisfy textprotocol structural guard.", processorTrace);
}
assertProtocolFamily(processorTrace, "processor-trace", "@ismail-elkorchi/textpipeline");

const report = runTextConformanceChecks(
  [
    {
      checkId: "textprotocol-interop-document",
      run: () => "pass",
    },
    {
      checkId: "textprotocol-interop-trace",
      run: () => "pass",
    },
  ],
  {
    reportId: "textprotocol:interop-smoke",
    subject: {
      kind: "textprotocol-result-envelope",
      id: document.documentId,
      schemaId: resultEnvelopeSchemaId,
    },
  },
);

if (!isTextConformanceReportV1(report)) {
  fail("Interop conformance report must satisfy textconformance runtime guard.", report);
}

const reportEnvelope = envelope(
  "@ismail-elkorchi/textconformance",
  textProtocolPayloadKindTextconformanceReportV1,
  report,
);
assertEnvelope(reportEnvelope, textProtocolPayloadKindTextconformanceReportV1, "@ismail-elkorchi/textconformance");

const inspection = inspectTextdocAnnotations(document);
if (inspection.annotationCount !== 1 || inspection.rows[0]?.annotationId !== "token-1") {
  fail("Interop textlab inspection must preserve document annotation identity.", inspection);
}

const verticalSliceEnvelope = envelope(
  "@ismail-elkorchi/textlab",
  textProtocolPayloadKindVerticalSliceResultV1,
  {
    document: textdocEnvelope,
    trace: traceEnvelope,
    report: reportEnvelope,
    inspection,
  },
);
assertEnvelope(
  verticalSliceEnvelope,
  textProtocolPayloadKindVerticalSliceResultV1,
  "@ismail-elkorchi/textlab",
);

console.log("Textprotocol package interop OK.");
