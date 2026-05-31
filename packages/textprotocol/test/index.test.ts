import {
  canonicalizeTextProtocolJson,
  checkTextProtocolSchemaFamilyEnvelope,
  checkTextProtocolResultEnvelopeCompatibility,
  createTextProtocolProtocolErrorEnvelopeFromDiagnostics,
  createTextProtocolProtocolErrorPayloadFromDiagnostics,
  getTextProtocolPayloadKindDescriptor,
  getTextProtocolSchemaFamilyDescriptor,
  getTextProtocolSchemaFamilyDescriptorBySchemaId,
  isTextProtocolAnnotationBundleV1,
  isTextProtocolCorpusMetricEnvelopeV1,
  isTextProtocolDiagnostic,
  isTextProtocolDocumentBundleV1,
  isTextProtocolEvidenceBundleV1,
  isTextProtocolMappingLossReportV1,
  isTextProtocolPayloadKind,
  isTextProtocolProcessorTraceV1,
  isTextProtocolProtocolErrorV1,
  isTextProtocolResultEnvelopeJsonTransportV1,
  isTextProtocolResultEnvelopeV1,
  isTextProtocolResultEnvelopeForPayloadKind,
  isTextProtocolSchemaFamily,
  isTextProtocolSchemaFamilyEnvelopeJsonTransportV1,
  isTextProtocolSchemaId,
  negotiateTextProtocolResultEnvelopeVersion,
  packageName,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  parseTextProtocolResultEnvelopeJson,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolResultEnvelopeJson,
  textProtocolAnnotationBundleSchemaId,
  textProtocolCorpusMetricEnvelopeSchemaId,
  textProtocolDocumentBundleSchemaId,
  textProtocolEvidenceBundleSchemaId,
  textProtocolMappingLossReportSchemaId,
  textProtocolPayloadKindTextpipelineBatchRunReportV1,
  textProtocolPayloadKindTextdocDocumentV1,
  textProtocolPayloadKindTextpipelineTraceV1,
  textProtocolPayloadKindVerticalSliceResultV1,
  textProtocolProcessorTraceSchemaId,
  textProtocolProtocolErrorSchemaId,
  textProtocolResultEnvelopeJsonMediaType,
  textProtocolSchemaFamilyEnvelopeJsonMediaType,
  textProtocolSchemaFamilyRegistry,
  textProtocolSchemaVersion,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textprotocol";

const validEnvelope = {
  schemaId: resultEnvelopeSchemaId,
  schemaVersion: resultEnvelopeSchemaVersion,
  producer: {
    package: packageName,
    version: "0.0.0",
  },
  payloadKind: "textprotocol:test",
  payload: {
    ok: true,
  },
  scopeBoundary: "Runtime guard smoke payload only.",
  limitations: ["Payload kind is intentionally unregistered for generic guard coverage."],
  diagnostics: [
    {
      code: "textprotocol.test",
      severity: "info",
      message: "test diagnostic",
    },
  ],
};

if (!isTextProtocolResultEnvelopeV1(validEnvelope)) {
  throw new Error("valid result envelope should satisfy the runtime guard");
}

const registeredEnvelope = {
  ...validEnvelope,
  payloadKind: textProtocolPayloadKindTextdocDocumentV1,
  scopeBoundary: "Document payload guard smoke scope only.",
  limitations: ["Payload schema is validated by the owning package."],
};

if (!isTextProtocolPayloadKind(textProtocolPayloadKindTextpipelineTraceV1)) {
  throw new Error("registered payload kinds should satisfy the payload-kind guard");
}

if (
  getTextProtocolPayloadKindDescriptor(textProtocolPayloadKindTextpipelineBatchRunReportV1)
    ?.schemaId !==
  "https://github.com/Ismail-elkorchi/text-computing/schemas/textpipeline-batch-run-report-v1.schema.json"
) {
  throw new Error("batch report payload kind should expose its canonical schema");
}

if (isTextProtocolPayloadKind("textprotocol:test")) {
  throw new Error("unregistered payload kinds should not satisfy the payload-kind guard");
}

if (
  getTextProtocolPayloadKindDescriptor(textProtocolPayloadKindTextdocDocumentV1)?.ownerPackage !==
  "@ismail-elkorchi/textdoc"
) {
  throw new Error("payload-kind registry should expose owner package metadata");
}

const schemaIds = textProtocolSchemaFamilyRegistry.map((entry) => entry.schemaId);
if (new Set(schemaIds).size !== schemaIds.length) {
  throw new Error("schema-family registry should not contain duplicate schema ids");
}
if (!isTextProtocolSchemaFamily("document-bundle")) {
  throw new Error("document-bundle should satisfy the schema-family guard");
}
if (!isTextProtocolSchemaId(textProtocolDocumentBundleSchemaId)) {
  throw new Error("document-bundle schema id should satisfy the schema-id guard");
}
if (isTextProtocolSchemaId("urn:ismail-elkorchi:textprotocol:unknown:v1")) {
  throw new Error("unknown schema id should not satisfy the schema-id guard");
}
if (
  getTextProtocolSchemaFamilyDescriptor("processor-trace").schemaId !==
  textProtocolProcessorTraceSchemaId
) {
  throw new Error("schema-family descriptor lookup should expose processor-trace metadata");
}
if (
  getTextProtocolSchemaFamilyDescriptorBySchemaId(textProtocolEvidenceBundleSchemaId)?.family !==
  "evidence-bundle"
) {
  throw new Error("schema-id lookup should expose evidence-bundle metadata");
}

if (
  !isTextProtocolResultEnvelopeForPayloadKind(
    registeredEnvelope,
    textProtocolPayloadKindTextdocDocumentV1,
  )
) {
  throw new Error("typed payload-kind guard should accept matching registered envelopes");
}

if (
  isTextProtocolResultEnvelopeForPayloadKind(
    registeredEnvelope,
    textProtocolPayloadKindVerticalSliceResultV1,
  )
) {
  throw new Error("typed payload-kind guard should reject mismatched registered envelopes");
}

const compatibility = checkTextProtocolResultEnvelopeCompatibility(registeredEnvelope, {
  expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
  expectedProducerPackage: packageName,
  requireProvenance: false,
  requireScopeBoundary: true,
  requireLimitations: true,
});
if (!compatibility.ok || compatibility.diagnostics.length !== 0) {
  throw new Error("registered envelope should satisfy compatibility checks");
}

const incompatible = checkTextProtocolResultEnvelopeCompatibility(
  {
    ...registeredEnvelope,
    schemaId: "wrong",
    payloadKind: "unregistered",
    scopeBoundary: "",
    limitations: [""],
  },
  {
    expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
    expectedProducerPackage: "@ismail-elkorchi/other",
    requireProvenance: true,
    requireScopeBoundary: true,
    requireLimitations: true,
  },
);
const incompatibleCodes = incompatible.diagnostics.map((entry) => entry.code).sort();
for (const requiredCode of [
  "textprotocol.scope-boundary",
  "textprotocol.limitations",
  "textprotocol.payload-kind-expected",
  "textprotocol.payload-kind-unregistered",
  "textprotocol.producer-package",
  "textprotocol.provenance-missing",
  "textprotocol.schema-id",
]) {
  if (!incompatibleCodes.includes(requiredCode)) {
    throw new Error(`compatibility check should report ${requiredCode}`);
  }
}

if (!isTextProtocolDiagnostic(validEnvelope.diagnostics[0])) {
  throw new Error("valid diagnostic should satisfy the runtime guard");
}

const negotiation = negotiateTextProtocolResultEnvelopeVersion([99, 1]);
if (!negotiation.ok || negotiation.selectedVersion !== resultEnvelopeSchemaVersion) {
  throw new Error("version negotiation should select the supported result-envelope version");
}

const unsupportedNegotiation = negotiateTextProtocolResultEnvelopeVersion([99]);
if (
  unsupportedNegotiation.ok ||
  !unsupportedNegotiation.diagnostics.some((entry) => entry.code === "textprotocol.version-unsupported")
) {
  throw new Error("version negotiation should report unsupported version requests");
}

const emptyNegotiation = negotiateTextProtocolResultEnvelopeVersion([]);
if (
  emptyNegotiation.ok ||
  !emptyNegotiation.diagnostics.some((entry) => entry.code === "textprotocol.version-request-empty")
) {
  throw new Error("version negotiation should reject empty requests");
}

const transport = serializeTextProtocolResultEnvelopeJson(registeredEnvelope, {
  expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
  requireScopeBoundary: true,
  requireLimitations: true,
});
if (!isTextProtocolResultEnvelopeJsonTransportV1(transport)) {
  throw new Error("serialized transport wrapper should satisfy the runtime guard");
}
if (transport.mediaType !== textProtocolResultEnvelopeJsonMediaType) {
  throw new Error("serialized transport wrapper should declare the JSON media type");
}
const parsedEnvelope = parseTextProtocolResultEnvelopeJson(transport, {
  expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
  requireScopeBoundary: true,
  requireLimitations: true,
});
if (
  parsedEnvelope.payloadKind !== textProtocolPayloadKindTextdocDocumentV1 ||
  parsedEnvelope.producer.package !== packageName
) {
  throw new Error("JSON transport parse should preserve envelope payload kind and producer");
}
if (transport.body !== serializeTextProtocolResultEnvelopeJson(parsedEnvelope).body) {
  throw new Error("JSON transport serialization should be deterministic after parse");
}
if (
  canonicalizeTextProtocolJson({ b: 2, a: { z: true, y: "x" } }) !==
  '{"a":{"y":"x","z":true},"b":2}'
) {
  throw new Error("canonical JSON helper should sort object keys recursively");
}

try {
  serializeTextProtocolResultEnvelopeJson(
    {
      ...registeredEnvelope,
      payload: Number.NaN,
    },
    {
      expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
    },
  );
  throw new Error("JSON transport should reject non-finite numbers");
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
}

try {
  serializeTextProtocolResultEnvelopeJson(
    {
      ...registeredEnvelope,
      payload: {
        hidden: undefined,
      },
    },
    {
      expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
    },
  );
  throw new Error("JSON transport should reject undefined object properties");
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
}

try {
  parseTextProtocolResultEnvelopeJson({
    ...transport,
    mediaType: "application/json" as typeof textProtocolResultEnvelopeJsonMediaType,
  });
  throw new Error("JSON transport should reject unsupported media types");
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
}

if (
  isTextProtocolResultEnvelopeV1({
    ...validEnvelope,
    producer: {
      package: "",
      version: "0.0.0",
    },
  })
) {
  throw new Error("result envelope should reject empty producer package names");
}

if (
  isTextProtocolDiagnostic({
    code: "bad",
    severity: "fatal",
  })
) {
  throw new Error("diagnostic guard should reject unknown severities");
}

const commonFamilyEnvelopeFields = {
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: packageName,
    version: "0.0.0",
  },
  provenance: {
    source: {
      id: "fixture:textprotocol:test",
    },
  },
  limitations: ["Package-level structural guard smoke scope only."],
};

const documentBundle = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolDocumentBundleSchemaId,
  payload: {
    documents: [
      {
        documentId: "doc:1",
        revision: "rev:1",
        document: {
          schemaVersion: 1,
          documentId: "doc:1",
          revision: "rev:1",
        },
      },
    ],
  },
};
if (!isTextProtocolDocumentBundleV1(documentBundle)) {
  throw new Error("document-bundle guard should accept a grounded document bundle");
}

const annotationBundle = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolAnnotationBundleSchemaId,
  payload: {
    documentId: "doc:1",
    documentRevision: "rev:1",
    annotations: [
      {
        annotationId: "ann:1",
        layerId: "layer:token",
        kind: "token",
        target: {
          kind: "span",
          viewId: "view:1",
          startCU: 0,
          endCU: 4,
        },
        annotation: {
          text: "Test",
        },
      },
    ],
  },
};
if (!isTextProtocolAnnotationBundleV1(annotationBundle)) {
  throw new Error("annotation-bundle guard should accept grounded annotations");
}

const evidenceBundle = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolEvidenceBundleSchemaId,
  payload: {
    records: [
      {
        id: "evidence:1",
        kind: "fixture-verification",
        exactness: "E1",
        targets: [{ kind: "annotation", id: "ann:1" }],
        payload: { ok: true },
        provenance: { algorithm: "fixture" },
      },
    ],
  },
};
if (!isTextProtocolEvidenceBundleV1(evidenceBundle)) {
  throw new Error("evidence-bundle guard should accept exactness/provenance records");
}

const processorTrace = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolProcessorTraceSchemaId,
  payload: {
    documentId: "doc:1",
    finalRevision: "rev:2",
    entries: [
      {
        processorId: "processor:demo",
        version: "0.0.0",
        status: "applied",
        inputRevision: "rev:1",
        outputRevision: "rev:2",
        emittedViews: ["view:analysis"],
        emittedLayers: ["layer:token"],
      },
    ],
  },
};
if (!isTextProtocolProcessorTraceV1(processorTrace)) {
  throw new Error("processor-trace guard should accept lineage entries");
}

const corpusMetricEnvelope = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolCorpusMetricEnvelopeSchemaId,
  payload: {
    corpusId: "corpus:1",
    metricSetId: "metrics:1",
    metrics: [
      {
        metricId: "map",
        kind: "retrieval",
        value: 1,
        unit: "ratio",
        parameters: {
          k: 10,
          includeTies: true,
        },
      },
    ],
  },
};
if (!isTextProtocolCorpusMetricEnvelopeV1(corpusMetricEnvelope)) {
  throw new Error("corpus-metric guard should accept metric records");
}

const mappingLossReport = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolMappingLossReportSchemaId,
  payload: {
    mappingId: "mapping:1",
    source: { kind: "format", id: "source:1" },
    target: { kind: "protocol", id: "target:1" },
    losses: [
      {
        code: "textprotocol.loss.demo",
        severity: "warning",
        class: "feature-loss",
        reason: "Fixture omits source-only field.",
      },
    ],
  },
};
if (!isTextProtocolMappingLossReportV1(mappingLossReport)) {
  throw new Error("mapping-loss report guard should accept structural loss records");
}

const protocolError = {
  ...commonFamilyEnvelopeFields,
  schemaId: textProtocolProtocolErrorSchemaId,
  payload: {
    code: "textprotocol.invalid",
    severity: "error",
    message: "Invalid protocol payload.",
    schemaId: textProtocolDocumentBundleSchemaId,
    path: "/payload/documents/0",
    remediation: "Provide a document id and revision.",
  },
};
if (!isTextProtocolProtocolErrorV1(protocolError)) {
  throw new Error("protocol-error guard should accept machine-readable error payloads");
}

const familyCheck = checkTextProtocolSchemaFamilyEnvelope(documentBundle, {
  expectedFamily: "document-bundle",
  expectedProducerPackage: packageName,
  requireProvenance: true,
  requireLimitations: true,
});
if (!familyCheck.ok || familyCheck.family !== "document-bundle") {
  throw new Error("schema-family compatibility should accept a valid document bundle");
}

const invalidFamilyCheck = checkTextProtocolSchemaFamilyEnvelope(
  {
    ...documentBundle,
    schemaId: textProtocolAnnotationBundleSchemaId,
    payload: {
      annotations: [
        {
          annotationId: "ann:bad",
          layerId: "layer:token",
          kind: "token",
          target: {
            kind: "span",
            startCU: 10,
            endCU: 4,
          },
          annotation: {},
        },
      ],
    },
    limitations: [""],
  },
  {
    expectedFamily: "document-bundle",
    requireLimitations: true,
  },
);
const invalidFamilyCodes = invalidFamilyCheck.diagnostics.map((entry) => entry.code).sort();
for (const requiredCode of [
  "textprotocol.schema-family-expected",
  "textprotocol.schema-family-limitations",
  "textprotocol.schema-family-payload-shape",
]) {
  if (!invalidFamilyCodes.includes(requiredCode)) {
    throw new Error(`schema-family compatibility should report ${requiredCode}`);
  }
}

const diagnosticProtocolError = createTextProtocolProtocolErrorEnvelopeFromDiagnostics(
  invalidFamilyCheck.diagnostics,
  {
    producerPackage: packageName,
    producerVersion: "0.1.0",
    code: "textprotocol.schema-family.invalid",
    message: "Schema-family envelope failed compatibility checks.",
    schemaId: textProtocolAnnotationBundleSchemaId,
    path: "/",
    remediation: "Use the expected schema family and valid payload shape.",
    provenance: {
      references: [{ kind: "fixture", id: "textprotocol-protocol-error-diagnostics" }],
    },
    limitations: ["Fixture validates diagnostic conversion to protocol-error envelopes."],
  },
);
if (
  !isTextProtocolProtocolErrorV1(diagnosticProtocolError) ||
  diagnosticProtocolError.payload.severity !== "error" ||
  diagnosticProtocolError.payload.causes?.length !== invalidFamilyCheck.diagnostics.length
) {
  throw new Error("protocol-error diagnostics helper should produce a valid error envelope with causes");
}

const diagnosticProtocolErrorTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(
  diagnosticProtocolError,
  {
    expectedFamily: "protocol-error",
    expectedProducerPackage: packageName,
    requireProvenance: true,
    requireLimitations: true,
  },
);
if (!isTextProtocolProtocolErrorV1(parseTextProtocolSchemaFamilyEnvelopeJson(diagnosticProtocolErrorTransport))) {
  throw new Error("protocol-error diagnostics helper output should serialize through schema-family transport");
}

try {
  createTextProtocolProtocolErrorPayloadFromDiagnostics([]);
  throw new Error("protocol-error diagnostics helper should reject empty diagnostic lists");
} catch (error) {
  if (
    !(error instanceof TypeError) ||
    error.message !== "textprotocol protocol-error payload requires at least one diagnostic"
  ) {
    throw error;
  }
}

try {
  createTextProtocolProtocolErrorEnvelopeFromDiagnostics(invalidFamilyCheck.diagnostics, {
    producerPackage: "",
    producerVersion: "0.1.0",
  });
  throw new Error("protocol-error envelope helper should reject invalid producers");
} catch (error) {
  if (
    !(error instanceof TypeError) ||
    error.message !== "textprotocol protocol-error envelope could not be produced"
  ) {
    throw error;
  }
}

const documentBundleTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(documentBundle, {
  expectedFamily: "document-bundle",
  requireProvenance: true,
  requireLimitations: true,
});
if (!isTextProtocolSchemaFamilyEnvelopeJsonTransportV1(documentBundleTransport)) {
  throw new Error("schema-family JSON transport wrapper should satisfy the runtime guard");
}
if (
  documentBundleTransport.mediaType !== textProtocolSchemaFamilyEnvelopeJsonMediaType ||
  documentBundleTransport.family !== "document-bundle" ||
  documentBundleTransport.schemaId !== textProtocolDocumentBundleSchemaId
) {
  throw new Error("schema-family JSON transport should preserve media type, family, and schema id");
}
const parsedDocumentBundle = parseTextProtocolSchemaFamilyEnvelopeJson(documentBundleTransport, {
  requireProvenance: true,
  requireLimitations: true,
});
if (!isTextProtocolDocumentBundleV1(parsedDocumentBundle)) {
  throw new Error("schema-family JSON transport parse should preserve document bundle shape");
}
if (
  documentBundleTransport.body !==
  serializeTextProtocolSchemaFamilyEnvelopeJson(parsedDocumentBundle).body
) {
  throw new Error("schema-family JSON transport serialization should be deterministic after parse");
}

const protocolErrorTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(protocolError, {
  expectedFamily: "protocol-error",
});
if (
  parseTextProtocolSchemaFamilyEnvelopeJson(protocolErrorTransport).schemaId !==
  textProtocolProtocolErrorSchemaId
) {
  throw new Error("schema-family JSON transport should support protocol-error envelopes");
}

try {
  serializeTextProtocolSchemaFamilyEnvelopeJson(
    {
      ...documentBundle,
      payload: Number.NaN,
    },
    {
      expectedFamily: "document-bundle",
    },
  );
  throw new Error("schema-family JSON transport should reject non-finite payload values");
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
}

try {
  parseTextProtocolSchemaFamilyEnvelopeJson({
    ...documentBundleTransport,
    schemaId: textProtocolAnnotationBundleSchemaId,
  });
  throw new Error("schema-family JSON transport should reject wrapper/body schema mismatch");
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
}

try {
  parseTextProtocolSchemaFamilyEnvelopeJson({
    ...documentBundleTransport,
    body: JSON.stringify({
      ...documentBundle,
      payload: {
        documents: [
          {
            documentId: "doc:bad",
            document: {},
          },
        ],
      },
    }),
  });
  throw new Error("schema-family JSON transport should reject parsed invalid payloads");
} catch (error) {
  if (!(error instanceof TypeError)) throw error;
}

void expectedPackageName;
