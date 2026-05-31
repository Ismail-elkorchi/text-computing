#!/usr/bin/env node
import {
  checkTextProtocolSchemaFamilyEnvelope,
  createTextProtocolProtocolErrorEnvelopeFromDiagnostics,
  isTextProtocolProtocolErrorV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolAnnotationBundleSchemaId,
  textProtocolDocumentBundleSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const invalidEnvelope = {
  schemaId: textProtocolAnnotationBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: "@example/protocol-consumer",
    version: "1.0.0",
  },
  payload: {
    annotations: [
      {
        annotationId: "ann:bad",
        layerId: "tokens",
        kind: "token",
        target: { kind: "span", startCU: 10, endCU: 4 },
        annotation: {},
      },
    ],
  },
  limitations: [""],
};

const compatibility = checkTextProtocolSchemaFamilyEnvelope(invalidEnvelope, {
  expectedFamily: "document-bundle",
  requireLimitations: true,
});
if (compatibility.ok) {
  throw new Error("fixture envelope should fail compatibility checks");
}

const protocolError = createTextProtocolProtocolErrorEnvelopeFromDiagnostics(
  compatibility.diagnostics,
  {
    producerPackage: "@example/protocol-consumer",
    producerVersion: "1.0.0",
    code: "example.schema-family.invalid",
    message: "Example schema-family envelope failed compatibility checks.",
    schemaId: textProtocolDocumentBundleSchemaId,
    path: "/",
    remediation: "Use the expected schema family and a valid payload shape.",
    provenance: {
      references: [{ kind: "example", id: "textprotocol-protocol-error-diagnostics-consumer" }],
    },
    limitations: ["The example demonstrates diagnostic conversion to protocol-error exchange."],
  },
);
if (!isTextProtocolProtocolErrorV1(protocolError)) {
  throw new Error("protocol-error helper did not produce a valid envelope");
}

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(protocolError, {
  expectedFamily: "protocol-error",
  expectedProducerPackage: "@example/protocol-consumer",
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport);
if (!isTextProtocolProtocolErrorV1(parsedEnvelope)) {
  throw new Error("protocol-error diagnostics envelope did not round trip");
}

console.log(JSON.stringify({
  errorCode: parsedEnvelope.payload.code,
  causeCodes: parsedEnvelope.payload.causes?.map((cause) => cause.code) ?? [],
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));
