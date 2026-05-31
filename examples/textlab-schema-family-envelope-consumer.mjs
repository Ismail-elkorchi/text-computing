#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolDocumentBundleSchemaId,
  textProtocolProtocolErrorSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const document = createTextDocDocumentFromTextSync("Schema-family inspection example.", {
  documentId: "example:textlab-schema-family-envelope",
  sourceId: "example:textlab-schema-family-envelope",
}).document;

const common = {
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: "@example/textlab-consumer",
    version: "1.0.0",
  },
  provenance: {
    references: [{ kind: "example", id: "textlab-schema-family-envelope-consumer" }],
  },
  limitations: ["The example demonstrates local schema-family envelope inspection."],
};

const documentBundle = {
  ...common,
  schemaId: textProtocolDocumentBundleSchemaId,
  payload: {
    documents: [
      {
        documentId: document.documentId,
        revision: document.revision,
        document,
      },
    ],
  },
};

const protocolError = {
  ...common,
  schemaId: textProtocolProtocolErrorSchemaId,
  payload: {
    code: "example.invalid-document-bundle",
    severity: "error",
    message: "Example protocol error payload.",
    schemaId: textProtocolDocumentBundleSchemaId,
    path: "/payload/documents/0",
    remediation: "Provide a valid document bundle entry.",
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

const documentInspection = inspectTextProtocolSchemaFamilyEnvelope(
  parseTextProtocolSchemaFamilyEnvelopeJson(documentTransport),
);
const errorInspection = inspectTextProtocolSchemaFamilyEnvelope(
  parseTextProtocolSchemaFamilyEnvelopeJson(errorTransport),
);

console.log(JSON.stringify({
  documentInspection,
  errorInspection,
}, null, 2));
