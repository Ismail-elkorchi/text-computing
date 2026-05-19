import {
  checkTextProtocolResultEnvelopeCompatibility,
  getTextProtocolPayloadKindDescriptor,
  isTextProtocolDiagnostic,
  isTextProtocolPayloadKind,
  isTextProtocolResultEnvelopeJsonTransportV1,
  isTextProtocolResultEnvelopeV1,
  isTextProtocolResultEnvelopeForPayloadKind,
  negotiateTextProtocolResultEnvelopeVersion,
  packageName,
  parseTextProtocolResultEnvelopeJson,
  resultEnvelopeSchemaId,
  resultEnvelopeSchemaVersion,
  serializeTextProtocolResultEnvelopeJson,
  textProtocolPayloadKindTextdocDocumentV1,
  textProtocolPayloadKindTextpipelineTraceV1,
  textProtocolPayloadKindVerticalSliceResultV1,
  textProtocolResultEnvelopeJsonMediaType,
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
  claimBoundary: "Runtime guard smoke payload only.",
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
  claimBoundary: "Document payload guard smoke scope only.",
  limitations: ["Payload schema is validated by the owning package."],
};

if (!isTextProtocolPayloadKind(textProtocolPayloadKindTextpipelineTraceV1)) {
  throw new Error("registered payload kinds should satisfy the payload-kind guard");
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
  requireClaimBoundary: true,
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
    claimBoundary: "",
    limitations: [""],
  },
  {
    expectedPayloadKind: textProtocolPayloadKindTextdocDocumentV1,
    expectedProducerPackage: "@ismail-elkorchi/other",
    requireProvenance: true,
    requireClaimBoundary: true,
    requireLimitations: true,
  },
);
const incompatibleCodes = incompatible.diagnostics.map((entry) => entry.code).sort();
for (const requiredCode of [
  "textprotocol.claim-boundary",
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
  requireClaimBoundary: true,
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
  requireClaimBoundary: true,
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

void expectedPackageName;
