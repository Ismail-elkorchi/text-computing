import {
  addTextDocSpanMapV1,
  addTextDocViewV1,
  applyTextDocAnnotationBundlePayloadV1,
  exportTextDocAnnotationBundlePayloadV1,
  exportTextDocDocumentBundlePayloadV1,
  exportTextDocEvidenceBundlePayloadV1,
  exportTextDocMappingLossReportPayloadV1,
  importTextDocDocumentBundlePayloadV1,
  isTextDocAnnotationBundlePayloadV1,
  isTextDocDocumentBundlePayloadV1,
  isTextDocEvidenceBundlePayloadV1,
  isTextDocDocumentV1,
  isTextDocMappingLossReportPayloadV1,
  packageName as textdocPackageName,
  textDocDocumentPayloadKind,
} from "@ismail-elkorchi/textdoc";
import {
  computeTextCorpusFrequencies,
  createTextCorpusCollection,
  exportTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusMetricEnvelopePayloadV1,
  packageName as textcorpusPackageName,
} from "@ismail-elkorchi/textcorpus";
import {
  createTextPackManifest,
  isTextPackManifestV1,
  packageName as textpackPackageName,
  validateTextPackManifestGovernance,
} from "@ismail-elkorchi/textpack";
import {
  checkTextProtocolSchemaFamilyEnvelope,
  checkTextProtocolResultEnvelopeCompatibility,
  createTextProtocolProtocolErrorEnvelopeFromDiagnostics,
  isTextProtocolAnnotationBundleV1,
  isTextProtocolCorpusMetricEnvelopeV1,
  isTextProtocolDocumentBundleV1,
  isTextProtocolEvidenceBundleV1,
  isTextProtocolMappingLossReportV1,
  isTextProtocolProcessorTraceV1,
  isTextProtocolProtocolErrorV1,
  isTextProtocolResultEnvelopeForPayloadKind,
  isTextProtocolSchemaFamilyEnvelopeJsonTransportV1,
  packageName as textprotocolPackageName,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolAnnotationBundleSchemaId,
  textProtocolCorpusMetricEnvelopeSchemaId,
  textProtocolDocumentBundleSchemaId,
  textProtocolEvidenceBundleSchemaId,
  textProtocolMappingLossReportSchemaId,
  textProtocolPackManifestSchemaId,
  textProtocolPayloadKindTextconformanceReportV1,
  textProtocolPayloadKindTextdocDocumentV1,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  textProtocolPayloadKindTextpipelineTraceV1,
  textProtocolPayloadKindVerticalSliceResultV1,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import {
  createTextPipelineBatchRunReport,
  createTextPipelineBatchRunReportEnvelope,
  createTextPipelineProcessorTraceEnvelopeV1,
  isTextPipelineBatchRunReportEnvelopeV1,
  isTextPipelineBatchRunReportV1,
  isTextPipelineProcessorTraceEnvelopeV1,
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

const invalidSchemaFamilyCheck = checkTextProtocolSchemaFamilyEnvelope(
  {
    schemaId: textProtocolAnnotationBundleSchemaId,
    schemaVersion: textProtocolSchemaVersion,
    producer: {
      package: textprotocolPackageName,
      version: "0.0.0",
    },
    payload: { annotations: [] },
    limitations: [""],
  },
  {
    expectedFamily: "document-bundle",
    requireLimitations: true,
  },
);
if (invalidSchemaFamilyCheck.ok || invalidSchemaFamilyCheck.diagnostics.length === 0) {
  fail("Interop invalid schema-family fixture must produce compatibility diagnostics.", invalidSchemaFamilyCheck);
}
const protocolErrorFromDiagnostics = createTextProtocolProtocolErrorEnvelopeFromDiagnostics(
  invalidSchemaFamilyCheck.diagnostics,
  {
    producerPackage: textprotocolPackageName,
    producerVersion: "0.0.0",
    code: "textprotocol.interop.schema-family-invalid",
    message: "Interop schema-family fixture failed compatibility checks.",
    schemaId: textProtocolAnnotationBundleSchemaId,
    path: "/",
    remediation: "Use a registered family and valid payload shape.",
    provenance: {
      references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
    },
    limitations: ["Structural protocol-error diagnostic conversion smoke only."],
  },
);
if (!isTextProtocolProtocolErrorV1(protocolErrorFromDiagnostics)) {
  fail("Interop protocol-error helper must produce a structural protocol-error envelope.", protocolErrorFromDiagnostics);
}
assertProtocolFamily(protocolErrorFromDiagnostics, "protocol-error", textprotocolPackageName);
const protocolErrorTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(protocolErrorFromDiagnostics, {
  expectedFamily: "protocol-error",
  expectedProducerPackage: textprotocolPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedProtocolError = parseTextProtocolSchemaFamilyEnvelopeJson(protocolErrorTransport);
if (!isTextProtocolProtocolErrorV1(parsedProtocolError)) {
  fail("Interop protocol-error transport must parse back into a protocol-error envelope.");
}
const protocolErrorInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedProtocolError);
if (protocolErrorInspection.family !== "protocol-error" || !protocolErrorInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve protocol-error metadata.", protocolErrorInspection);
}

const packManifest = createTextPackManifest({
  id: "pack:textprotocol-interop",
  packageName: "@ismail-elkorchi/textpack-interop",
  version: "0.1.0",
  kind: ["language"],
  targets: {
    languages: ["en"],
    scripts: ["Latn"],
    profiles: ["interop"],
  },
  resources: {
    stopwords: ["resources/stopwords.en.interop.txt"],
  },
  provides: {
    stopwords: ["stopwords-en-interop"],
  },
  licenses: {
    code: ["MIT"],
    data: ["CC0-1.0"],
  },
  provenance: {
    sources: ["repo:tools/validate-textprotocol-interop.mjs"],
    generated: false,
  },
  tests: {
    smoke: ["resources/stopwords.en.interop.txt"],
    negative: ["negative:no-implicit-registry"],
    representative: ["representative:interop-stopwords"],
  },
});
if (!isTextPackManifestV1(packManifest) || !validateTextPackManifestGovernance(packManifest).ok) {
  fail("Interop pack manifest must satisfy textpack runtime and governance checks.", packManifest);
}
const packManifestValidationOptions = {
  expectedFamily: "pack-manifest",
  expectedProducerPackage: textpackPackageName,
  requireProvenance: true,
  requireLimitations: true,
  externallyValidatedFamilies: ["pack-manifest"],
};
const packManifestEnvelope = {
  schemaId: textProtocolPackManifestSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textpackPackageName,
    version: "0.1.0",
  },
  payload: packManifest,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural pack-manifest interop smoke only."],
};
const packManifestCompatibility = checkTextProtocolSchemaFamilyEnvelope(
  packManifestEnvelope,
  packManifestValidationOptions,
);
if (!packManifestCompatibility.ok || packManifestCompatibility.family !== "pack-manifest") {
  fail("Interop pack-manifest envelope must satisfy asserted textprotocol compatibility.", packManifestCompatibility);
}
const packManifestTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(
  packManifestEnvelope,
  packManifestValidationOptions,
);
if (!isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(packManifestTransport)) {
  fail("Interop pack-manifest transport must satisfy textprotocol transport guard.", packManifestTransport);
}
const parsedPackManifestEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(
  packManifestTransport,
  packManifestValidationOptions,
);
if (
  !isTextPackManifestV1(parsedPackManifestEnvelope.payload) ||
  !validateTextPackManifestGovernance(parsedPackManifestEnvelope.payload).ok
) {
  fail("Interop pack-manifest transport must parse back into a textpack-valid manifest.", parsedPackManifestEnvelope);
}
const packManifestInspection = inspectTextProtocolSchemaFamilyEnvelope(
  parsedPackManifestEnvelope,
  packManifestValidationOptions,
);
if (packManifestInspection.family !== "pack-manifest" || !packManifestInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve pack-manifest metadata.", packManifestInspection);
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
          provenance: {
            references: [{ kind: "fixture", id: "textprotocol-interop-tokenizer" }],
          },
          confidence: { value: 0.9, method: "interop-fixture" },
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

const annotationBundlePayload = exportTextDocAnnotationBundlePayloadV1(document);
if (!isTextDocAnnotationBundlePayloadV1(annotationBundlePayload)) {
  fail("Interop annotation-bundle payload must satisfy textdoc runtime guard.", annotationBundlePayload);
}
const annotationBundle = {
  schemaId: textProtocolAnnotationBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.0.0",
  },
  payload: annotationBundlePayload,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural annotation-bundle interop smoke only."],
};
if (!isTextProtocolAnnotationBundleV1(annotationBundle)) {
  fail("Interop annotation bundle must satisfy textprotocol structural guard.", annotationBundle);
}
assertProtocolFamily(annotationBundle, "annotation-bundle", textdocPackageName);
const annotationBundleTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(annotationBundle, {
  expectedFamily: "annotation-bundle",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
if (!isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(annotationBundleTransport)) {
  fail("Interop annotation-bundle transport must satisfy textprotocol transport guard.", annotationBundleTransport);
}
const parsedAnnotationBundle = parseTextProtocolSchemaFamilyEnvelopeJson(annotationBundleTransport);
if (!isTextProtocolAnnotationBundleV1(parsedAnnotationBundle)) {
  fail("Interop annotation-bundle transport must parse back into an annotation bundle.");
}
const annotationSkeletonDocument = {
  ...document,
  layers: document.layers.map((layer) => ({ ...layer, annotations: [] })),
};
const appliedAnnotationBundle = applyTextDocAnnotationBundlePayloadV1(
  annotationSkeletonDocument,
  parsedAnnotationBundle.payload,
);
if (!appliedAnnotationBundle.ok || appliedAnnotationBundle.document?.layers[0]?.annotations.length !== 1) {
  fail("Interop annotation-bundle payload must apply through textdoc package APIs.", appliedAnnotationBundle);
}
const annotationBundleInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedAnnotationBundle);
if (annotationBundleInspection.family !== "annotation-bundle" || !annotationBundleInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve annotation-bundle envelope metadata.", annotationBundleInspection);
}

const evidenceBundlePayload = exportTextDocEvidenceBundlePayloadV1(document, {
  recordIdPrefix: "evidence:textprotocol-interop",
  supportByAnnotationId: {
    "token-1": [{ kind: "fixture", id: "textprotocol-interop-support" }],
  },
});
if (!isTextDocEvidenceBundlePayloadV1(evidenceBundlePayload) || evidenceBundlePayload.records.length !== 1) {
  fail("Interop evidence-bundle payload must satisfy textdoc runtime guard.", evidenceBundlePayload);
}
const evidenceBundle = {
  schemaId: textProtocolEvidenceBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.0.0",
  },
  payload: evidenceBundlePayload,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural evidence-bundle interop smoke only."],
};
if (!isTextProtocolEvidenceBundleV1(evidenceBundle)) {
  fail("Interop evidence bundle must satisfy textprotocol structural guard.", evidenceBundle);
}
assertProtocolFamily(evidenceBundle, "evidence-bundle", textdocPackageName);
const evidenceBundleTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(evidenceBundle, {
  expectedFamily: "evidence-bundle",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEvidenceBundle = parseTextProtocolSchemaFamilyEnvelopeJson(evidenceBundleTransport);
if (!isTextProtocolEvidenceBundleV1(parsedEvidenceBundle)) {
  fail("Interop evidence-bundle transport must parse back into an evidence bundle.");
}
const evidenceBundleInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedEvidenceBundle);
if (evidenceBundleInspection.family !== "evidence-bundle" || !evidenceBundleInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve evidence-bundle metadata.", evidenceBundleInspection);
}

const lossyDocument = addTextDocSpanMapV1(
  addTextDocViewV1(
    document,
    {
      id: "normalized-analysis",
      kind: "normalized",
      parentViewId: "analysis",
      spanMapIds: ["span-map-analysis-normalized"],
      loss: [{ kind: "lossy-normalization", reason: "Interop fixture declares view normalization loss." }],
    },
    { revision: "2" },
  ),
  {
    id: "span-map-analysis-normalized",
    sourceViewId: "analysis",
    targetViewId: "normalized-analysis",
    lifecycle: { state: "active" },
    segments: [
      {
        source: { startCU: 0, endCU: 5 },
        target: { startCU: 0, endCU: 5 },
        kind: "normalized",
        reversible: false,
        loss: [{ kind: "lossy-normalization", reason: "Interop fixture declares segment normalization loss." }],
      },
    ],
  },
  { revision: "3" },
);
const mappingLossPayload = exportTextDocMappingLossReportPayloadV1(lossyDocument, {
  mappingId: "mapping:textprotocol-interop-loss",
});
if (!isTextDocMappingLossReportPayloadV1(mappingLossPayload) || mappingLossPayload.losses.length !== 2) {
  fail("Interop mapping-loss payload must satisfy textdoc runtime guard.", mappingLossPayload);
}
const mappingLossReport = {
  schemaId: textProtocolMappingLossReportSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.0.0",
  },
  payload: mappingLossPayload,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural mapping-loss interop smoke only."],
};
if (!isTextProtocolMappingLossReportV1(mappingLossReport)) {
  fail("Interop mapping-loss report must satisfy textprotocol structural guard.", mappingLossReport);
}
assertProtocolFamily(mappingLossReport, "mapping-loss-report", textdocPackageName);
const mappingLossTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(mappingLossReport, {
  expectedFamily: "mapping-loss-report",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedMappingLossReport = parseTextProtocolSchemaFamilyEnvelopeJson(mappingLossTransport);
if (!isTextProtocolMappingLossReportV1(parsedMappingLossReport)) {
  fail("Interop mapping-loss transport must parse back into a mapping-loss report.");
}
const mappingLossInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedMappingLossReport);
if (mappingLossInspection.family !== "mapping-loss-report" || !mappingLossInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve mapping-loss report metadata.", mappingLossInspection);
}

const corpusCollection = createTextCorpusCollection(
  [
    {
      id: "doc-a",
      document,
      viewId: "analysis",
      tokenLayerId: "tokens",
      metadata: { language: "en" },
    },
  ],
  { corpusId: "corpus:textprotocol-interop" },
);
const corpusFrequency = computeTextCorpusFrequencies(corpusCollection);
const corpusMetricPayload = exportTextCorpusMetricEnvelopePayloadV1(corpusFrequency, {
  metricSetId: "metrics:textprotocol-interop-frequency",
});
if (!isTextCorpusMetricEnvelopePayloadV1(corpusMetricPayload)) {
  fail("Interop corpus metric payload must satisfy textcorpus runtime guard.", corpusMetricPayload);
}
const corpusMetricEnvelope = {
  schemaId: textProtocolCorpusMetricEnvelopeSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textcorpusPackageName,
    version: "0.0.0",
  },
  payload: corpusMetricPayload,
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural corpus-metric interop smoke only."],
};
if (!isTextProtocolCorpusMetricEnvelopeV1(corpusMetricEnvelope)) {
  fail("Interop corpus metric envelope must satisfy textprotocol structural guard.", corpusMetricEnvelope);
}
assertProtocolFamily(corpusMetricEnvelope, "corpus-metric-envelope", textcorpusPackageName);
const corpusMetricTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(corpusMetricEnvelope, {
  expectedFamily: "corpus-metric-envelope",
  expectedProducerPackage: textcorpusPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedCorpusMetricEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(corpusMetricTransport);
if (!isTextProtocolCorpusMetricEnvelopeV1(parsedCorpusMetricEnvelope)) {
  fail("Interop corpus metric transport must parse back into a corpus metric envelope.");
}
const corpusMetricInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedCorpusMetricEnvelope);
if (corpusMetricInspection.family !== "corpus-metric-envelope" || !corpusMetricInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve corpus metric envelope metadata.", corpusMetricInspection);
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

const processorTrace = createTextPipelineProcessorTraceEnvelopeV1(pipelineRun.trace, "0.0.0", {
  provenance: {
    references: [{ kind: "fixture", id: "textprotocol-interop-smoke" }],
  },
  limitations: ["Structural processor-trace interop smoke only."],
});
if (!isTextPipelineProcessorTraceEnvelopeV1(processorTrace) || !isTextProtocolProcessorTraceV1(processorTrace)) {
  fail("Interop processor trace must satisfy textprotocol structural guard.", processorTrace);
}
assertProtocolFamily(processorTrace, "processor-trace", "@ismail-elkorchi/textpipeline");
const processorTraceTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(processorTrace, {
  expectedFamily: "processor-trace",
  expectedProducerPackage: "@ismail-elkorchi/textpipeline",
  requireProvenance: true,
  requireLimitations: true,
});
const parsedProcessorTrace = parseTextProtocolSchemaFamilyEnvelopeJson(processorTraceTransport);
if (!isTextProtocolProcessorTraceV1(parsedProcessorTrace)) {
  fail("Interop processor-trace transport must parse back into a processor trace.");
}
const processorTraceInspection = inspectTextProtocolSchemaFamilyEnvelope(parsedProcessorTrace);
if (processorTraceInspection.family !== "processor-trace" || !processorTraceInspection.compatibilityOk) {
  fail("Interop textlab inspection must preserve processor-trace metadata.", processorTraceInspection);
}

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
