#!/usr/bin/env node
import {
  isTextProtocolDocumentBundleV1,
  isTextProtocolProtocolErrorV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolDocumentBundleSchemaId,
  textProtocolProtocolErrorSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";

const common = {
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: "@example/textprotocol-consumer",
    version: "1.0.0",
  },
  provenance: {
    references: [{ kind: "example", id: "textprotocol-schema-family-transport-consumer" }],
  },
  limitations: ["Example payloads demonstrate local deterministic schema-family transport."],
};

const documentBundle = {
  ...common,
  schemaId: textProtocolDocumentBundleSchemaId,
  payload: {
    documents: [
      {
        documentId: "example:protocol-document",
        revision: "r1",
        document: {
          schemaVersion: 1,
          documentId: "example:protocol-document",
          revision: "r1",
          text: "Protocol example.",
        },
      },
    ],
  },
};

const protocolError = {
  ...common,
  schemaId: textProtocolProtocolErrorSchemaId,
  payload: {
    code: "example.invalid-input",
    severity: "error",
    message: "Example invalid input.",
    schemaId: textProtocolDocumentBundleSchemaId,
    path: "/payload/documents/0",
    remediation: "Provide a document id and revision.",
  },
};

const documentTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(documentBundle, {
  expectedFamily: "document-bundle",
  requireProvenance: true,
  requireLimitations: true,
});
const errorTransport = serializeTextProtocolSchemaFamilyEnvelopeJson(protocolError, {
  expectedFamily: "protocol-error",
  requireProvenance: true,
  requireLimitations: true,
});

const parsedDocumentBundle = parseTextProtocolSchemaFamilyEnvelopeJson(documentTransport);
const parsedProtocolError = parseTextProtocolSchemaFamilyEnvelopeJson(errorTransport);

if (!isTextProtocolDocumentBundleV1(parsedDocumentBundle)) {
  throw new Error("document bundle transport did not round trip");
}
if (!isTextProtocolProtocolErrorV1(parsedProtocolError)) {
  throw new Error("protocol error transport did not round trip");
}

console.log(JSON.stringify({
  documentTransport: {
    mediaType: documentTransport.mediaType,
    family: documentTransport.family,
    schemaId: documentTransport.schemaId,
    bodyLength: documentTransport.body.length,
  },
  errorTransport: {
    mediaType: errorTransport.mediaType,
    family: errorTransport.family,
    schemaId: errorTransport.schemaId,
    bodyLength: errorTransport.body.length,
  },
  parsed: {
    documentCount: parsedDocumentBundle.payload.documents.length,
    errorCode: parsedProtocolError.payload.code,
  },
}, null, 2));
