#!/usr/bin/env node
import {
  addTextDocLayerV1,
  createTextDocDocumentFromTextSync,
  exportTextDocEvidenceBundlePayloadV1,
  isTextDocEvidenceBundlePayloadV1,
  packageName as textdocPackageName,
} from "@ismail-elkorchi/textdoc";
import {
  isTextProtocolEvidenceBundleV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolEvidenceBundleSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const baseDocument = createTextDocDocumentFromTextSync("Evidence bundle exchange.", {
  documentId: "example:textdoc-evidence-bundle",
  sourceId: "example:textdoc-evidence-bundle",
}).document;

const tokenAnnotation = baseDocument.layers
  .flatMap((layer) => layer.annotations)
  .find((annotation) => annotation.kind === "token");
if (tokenAnnotation === undefined) {
  throw new Error("example document should contain a token annotation");
}

const document = addTextDocLayerV1(
  baseDocument,
  {
    id: "evidence-decisions",
    kind: "extension",
    viewId: "source-view",
    annotations: [
      {
        id: "evidence-1",
        kind: "extension",
        extensionId: "urn:ismail-elkorchi:textdoc-extension:evidence-demo",
        extensionSchema: {
          schemaId: "urn:ismail-elkorchi:textdoc-extension:evidence-demo:v1",
          schemaVersion: "1",
        },
        lifecycle: { state: "active" },
        targets: [{ kind: "annotation", annotationId: tokenAnnotation.id }],
        provenance: {
          references: [{ kind: "example", id: "textdoc-evidence-bundle-consumer" }],
        },
        confidence: { value: 0.82, method: "example-rule" },
        ambiguitySet: { id: "ambiguity:evidence-1", role: "candidate", rank: 1 },
        loss: [
          {
            kind: "external-reference",
            reason: "Example evidence record omits external verifier output.",
            source: "example",
          },
        ],
        data: {
          label: "demo-evidence",
        },
      },
    ],
  },
  { revision: "evidence-bundle-v1" },
);

const payload = exportTextDocEvidenceBundlePayloadV1(document, {
  recordIdPrefix: "example:textdoc-evidence-bundle",
  supportByAnnotationId: {
    "evidence-1": [{ kind: "example-support", id: tokenAnnotation.id }],
  },
});
if (!isTextDocEvidenceBundlePayloadV1(payload)) {
  throw new Error("textdoc evidence-bundle payload is invalid");
}

const envelope = {
  schemaId: textProtocolEvidenceBundleSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.1.0",
  },
  payload,
  provenance: {
    references: [{ kind: "example", id: "textdoc-evidence-bundle-consumer" }],
  },
  limitations: ["The example demonstrates local evidence-bundle exchange."],
};

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, {
  expectedFamily: "evidence-bundle",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport);
if (!isTextProtocolEvidenceBundleV1(parsedEnvelope)) {
  throw new Error("textprotocol evidence-bundle envelope did not round trip");
}

const evidenceRecord = parsedEnvelope.payload.records.find((record) => record.id.endsWith(":evidence-decisions:evidence-1"));
if (evidenceRecord?.exactness !== "E2") {
  throw new Error("textdoc evidence-bundle record did not preserve expected exactness");
}

console.log(JSON.stringify({
  recordCount: payload.records.length,
  evidenceRecord: {
    id: evidenceRecord.id,
    exactness: evidenceRecord.exactness,
    support: evidenceRecord.support?.map((reference) => `${reference.kind}:${reference.id}`) ?? [],
    lossCodes: evidenceRecord.loss?.map((loss) => loss.code) ?? [],
  },
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));
