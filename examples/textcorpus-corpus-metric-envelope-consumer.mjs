#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  computeTextCorpusFrequencies,
  createTextCorpusCollection,
  exportTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusMetricEnvelopePayloadV1,
  packageName as textcorpusPackageName,
} from "@ismail-elkorchi/textcorpus";
import {
  isTextProtocolCorpusMetricEnvelopeV1,
  parseTextProtocolSchemaFamilyEnvelopeJson,
  serializeTextProtocolSchemaFamilyEnvelopeJson,
  textProtocolCorpusMetricEnvelopeSchemaId,
  textProtocolSchemaVersion,
} from "@ismail-elkorchi/textprotocol";
import { inspectTextProtocolSchemaFamilyEnvelope } from "@ismail-elkorchi/textlab";

function documentEntry(id, text, metadata) {
  const document = createTextDocDocumentFromTextSync(text, {
    documentId: `example:textcorpus-metric:${id}`,
    sourceId: `example:textcorpus-metric:${id}`,
  }).document;
  return {
    id,
    document,
    viewId: "tokenization-view",
    tokenLayerId: "tokens",
    metadata,
  };
}

const collection = createTextCorpusCollection(
  [
    documentEntry("doc-b", "metric exchange beta", { language: "en", genre: "note" }),
    documentEntry("doc-a", "metric exchange alpha", { language: "en", genre: "note" }),
  ],
  { corpusId: "example:textcorpus-metric-envelope" },
);
const frequencies = computeTextCorpusFrequencies(collection, {
  metadataFilters: { language: "en" },
});
const payload = exportTextCorpusMetricEnvelopePayloadV1(frequencies, {
  metricSetId: "example:textcorpus-frequency-metrics",
});

if (!isTextCorpusMetricEnvelopePayloadV1(payload)) {
  throw new Error("textcorpus corpus metric payload is invalid");
}

const envelope = {
  schemaId: textProtocolCorpusMetricEnvelopeSchemaId,
  schemaVersion: textProtocolSchemaVersion,
  producer: {
    package: textcorpusPackageName,
    version: "0.1.0",
  },
  payload,
  provenance: {
    references: [{ kind: "example", id: "textcorpus-corpus-metric-envelope-consumer" }],
  },
  limitations: ["The example demonstrates local corpus metric payload exchange."],
};

const transport = serializeTextProtocolSchemaFamilyEnvelopeJson(envelope, {
  expectedFamily: "corpus-metric-envelope",
  expectedProducerPackage: textcorpusPackageName,
  requireProvenance: true,
  requireLimitations: true,
});
const parsedEnvelope = parseTextProtocolSchemaFamilyEnvelopeJson(transport);
if (!isTextProtocolCorpusMetricEnvelopeV1(parsedEnvelope)) {
  throw new Error("textprotocol corpus metric envelope did not round trip");
}

console.log(JSON.stringify({
  metricSetId: payload.metricSetId,
  metricIds: payload.metrics.map((metric) => metric.metricId),
  transport: {
    mediaType: transport.mediaType,
    family: transport.family,
    bodyLength: transport.body.length,
  },
  inspection: inspectTextProtocolSchemaFamilyEnvelope(parsedEnvelope),
}, null, 2));
