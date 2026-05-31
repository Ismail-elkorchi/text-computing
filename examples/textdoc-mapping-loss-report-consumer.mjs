#!/usr/bin/env node
import {
  addTextDocSpanMapV1,
  addTextDocViewV1,
  createTextDocDocumentFromTextSync,
  exportTextDocMappingLossReportPayloadV1,
  isTextDocMappingLossReportPayloadV1,
  packageName as textdocPackageName,
} from "@ismail-elkorchi/textdoc";
import {
  isTextProtocolMappingLossReportV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolMappingLossReportSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

const baseDocument = createTextDocDocumentFromTextSync("Mapping loss exchange.", {
  documentId: "example:textdoc-mapping-loss",
  sourceId: "example:textdoc-mapping-loss",
}).document;

const normalizedViewDocument = addTextDocViewV1(
  baseDocument,
  {
    id: "normalized-view",
    kind: "normalized",
    parentViewId: "source-view",
    spanMapIds: ["span-map-source-normalized"],
    loss: [
      {
        kind: "lossy-normalization",
        reason: "Example normalization declares possible offset loss.",
        source: "example",
      },
    ],
  },
  { revision: "mapping-loss-view-v1" },
);
const document = addTextDocSpanMapV1(
  normalizedViewDocument,
  {
    id: "span-map-source-normalized",
    sourceViewId: "source-view",
    targetViewId: "normalized-view",
    lifecycle: { state: "active" },
    segments: [
      {
        source: { startCU: 0, endCU: baseDocument.textLengthCU },
        target: { startCU: 0, endCU: baseDocument.textLengthCU },
        kind: "normalized",
        reversible: false,
        loss: [
          {
            kind: "lossy-normalization",
            reason: "Example segment preserves bounds while declaring non-reversible normalization.",
            source: "example",
          },
        ],
      },
    ],
    loss: [
      {
        kind: "truncated-context",
        reason: "Example report records that only local context is represented.",
        source: "example",
      },
    ],
  },
  { revision: "mapping-loss-map-v1" },
);

const payload = exportTextDocMappingLossReportPayloadV1(document, {
  mappingId: "example:textdoc-mapping-loss-report",
});
if (!isTextDocMappingLossReportPayloadV1(payload)) {
  throw new Error("textdoc mapping-loss report payload is invalid");
}

const envelope = {
  schemaId: textProtocolMappingLossReportSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textdocPackageName,
    version: "0.1.0",
  },
  payload,
  provenance: {
    references: [{ kind: "example", id: "textdoc-mapping-loss-report-consumer" }],
  },
  limitations: ["The example demonstrates local mapping-loss report exchange."],
};

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, {
  expectedFamily: "mapping-loss-report",
  expectedProducerPackage: textdocPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport);
if (!isTextProtocolMappingLossReportV1(parsedEnvelope)) {
  throw new Error("textprotocol mapping-loss report envelope did not round trip");
}

console.log(JSON.stringify({
  mappingId: payload.mappingId,
  lossCodes: payload.losses.map((loss) => loss.code),
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));
