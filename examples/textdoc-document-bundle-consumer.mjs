#!/usr/bin/env node
import {
  createTextDocDocumentFromTextSync,
  exportTextDocDocumentBundlePayloadV1,
  importTextDocDocumentBundlePayloadV1,
  isTextDocDocumentBundlePayloadV1,
  packageName as textdocPackageName,
} from "@ismail-elkorchi/textdoc";
import {
  isTextProtocolDocumentBundleV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolDocumentBundleSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const documents = [
  createTextDocDocumentFromTextSync("Document bundle one.", {
    documentId: "example:textdoc-document-bundle:one",
    sourceId: "example:textdoc-document-bundle:one",
  }).document,
  createTextDocDocumentFromTextSync("Document bundle two.", {
    documentId: "example:textdoc-document-bundle:two",
    sourceId: "example:textdoc-document-bundle:two",
    includeText: false,
  }).document,
];

const payload = exportTextDocDocumentBundlePayloadV1(documents);
if (!isTextDocDocumentBundlePayloadV1(payload)) {
  throw new Error("textdoc document bundle payload is invalid");
}

const envelope = {
  schemaId: textProtocolDocumentBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.1.0",
  },
  payload,
  provenance: {
    references: [{ kind: "example", id: "textdoc-document-bundle-consumer" }],
  },
  limitations: ["The example demonstrates local document-bundle exchange."],
};

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, {
  expectedFamily: "document-bundle",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport);
if (!isTextProtocolDocumentBundleV1(parsedEnvelope)) {
  throw new Error("textprotocol document bundle envelope did not round trip");
}

const imported = importTextDocDocumentBundlePayloadV1(parsedEnvelope.payload);
if (!imported.ok) {
  throw new Error("textdoc document bundle payload did not import");
}

console.log(JSON.stringify({
  exportedDocumentCount: payload.documents.length,
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  importedDocumentIds: imported.documents?.map((document) => document.documentId) ?? [],
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));
