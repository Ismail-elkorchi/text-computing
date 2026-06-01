#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  computeTextCorpusFrequencies,
  createTextCorpusCollection,
  exportTextCorpusMetricEnvelopePayloadV1,
} from "@ismail-elkorchi/textcorpus";
import {
  inspectTextCorpusArtifact,
  renderTextCorpusArtifactInspection,
} from "@ismail-elkorchi/textlab";

function documentEntry(id, text, metadata) {
  const document = createTextDocDocumentFromTextSync(text, {
    documentId: `example:textlab-corpus-artifact:${id}`,
    sourceId: `example:textlab-corpus-artifact:${id}`,
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
    documentEntry("doc-b", "artifact inspection beta", { language: "en", genre: "note" }),
    documentEntry("doc-a", "artifact inspection alpha", { language: "en", genre: "note" }),
    documentEntry("doc-d", "artifact inspection delta", { language: "en", genre: "note" }),
    documentEntry("doc-c", "artifact inspection gamma", { language: "en", genre: "note" }),
  ],
  { corpusId: "example:textlab-corpus-artifact" },
);
const frequencies = computeTextCorpusFrequencies(collection, {
  metadataFilters: { language: "en" },
});
const metricPayload = exportTextCorpusMetricEnvelopePayloadV1(frequencies, {
  metricSetId: "example:textlab-corpus-artifact-metrics",
});

const artifactInspection = inspectTextCorpusArtifact(frequencies, { offset: 1, limit: 2 });
const metricInspection = inspectTextCorpusArtifact(metricPayload);
const rendered = renderTextCorpusArtifactInspection(artifactInspection);

console.log(JSON.stringify({
  artifactKind: artifactInspection.artifactKind,
  artifactRows: artifactInspection.rowCount,
  pageOffset: artifactInspection.pageOffset,
  pageLimit: artifactInspection.pageLimit,
  pageRows: artifactInspection.pageRowCount,
  hasNextPage: artifactInspection.hasNextPage,
  metricSetId: metricInspection.metricSetId,
  metricCount: metricInspection.metricCount,
  renderedIncludesKind: rendered.includes("Kind: frequency"),
  renderedIncludesPage: rendered.includes("Page rows: 2"),
}, null, 2));
