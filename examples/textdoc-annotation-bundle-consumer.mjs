#!/usr/bin/env node
import {
  applyTextDocAnnotationBundlePayloadV1,
  createTextDocDocumentFromTextSync,
  exportTextDocAnnotationBundlePayloadV1,
  isTextDocAnnotationBundlePayloadV1,
  packageName as textdocPackageName,
} from "@ismail-elkorchi/textdoc";
import {
  isTextProtocolAnnotationBundleV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolAnnotationBundleSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const document = createTextDocDocumentFromTextSync("Annotation bundle exchange.", {
  documentId: "example:textdoc-annotation-bundle",
  sourceId: "example:textdoc-annotation-bundle",
}).document;

const payload = exportTextDocAnnotationBundlePayloadV1(document);
if (!isTextDocAnnotationBundlePayloadV1(payload)) {
  throw new Error("textdoc annotation bundle payload is invalid");
}

const envelope = {
  schemaId: textProtocolAnnotationBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.1.0",
  },
  payload,
  provenance: {
    references: [{ kind: "example", id: "textdoc-annotation-bundle-consumer" }],
  },
  limitations: ["The example demonstrates local annotation-bundle exchange."],
};

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, {
  expectedFamily: "annotation-bundle",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport);
if (!isTextProtocolAnnotationBundleV1(parsedEnvelope)) {
  throw new Error("textprotocol annotation bundle envelope did not round trip");
}

const skeletonDocument = {
  ...document,
  layers: document.layers.map((layer) => ({ ...layer, annotations: [] })),
};
const applied = applyTextDocAnnotationBundlePayloadV1(skeletonDocument, parsedEnvelope.payload);
if (!applied.ok) {
  throw new Error("textdoc annotation bundle payload did not apply");
}

console.log(JSON.stringify({
  exportedAnnotationCount: payload.annotations.length,
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  restoredLayerIds: applied.document?.layers.map((layer) => layer.id) ?? [],
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));
