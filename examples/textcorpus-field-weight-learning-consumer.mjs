#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusRetrievalIndex,
  createTextCorpusCollection,
  exportTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusRetrievalCalibrationReportV1,
  learnTextCorpusRetrievalFieldWeightProfile,
  parseTextCorpusQuery,
  textCorpusBm25fFormula,
  textCorpusRetrievalQrelsSchemaVersion,
} from "@ismail-elkorchi/textcorpus";

function entry(id, text, metadata) {
  const document = createTextDocDocumentFromTextSync(text, {
    documentId: `example:textcorpus-field-weight-learning:${id}`,
    sourceId: `example:textcorpus-field-weight-learning:${id}`,
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
    entry("doc-a", "alpha beta beta", { genre: "news", title: "Alpha report" }),
    entry("doc-b", "alpha gamma", { genre: "news", title: "Gamma bulletin" }),
    entry("doc-c", "delta", { genre: "note", title: "Delta note" }),
  ],
  { corpusId: "example:textcorpus-field-weight-learning" },
);

const index = buildTextCorpusRetrievalIndex(collection, {
  formula: textCorpusBm25fFormula,
  fields: [
    { id: "title", source: "metadata", weight: 2, b: 0.25 },
    { id: "body", source: "tokens", weight: 1, b: 0.75 },
  ],
});

const queries = [
  parseTextCorpusQuery("title:alpha +beta genre:news", { id: "title-alpha-beta" }),
  parseTextCorpusQuery("title:delta genre:note", { id: "delta-note" }),
];

const qrels = {
  schemaVersion: textCorpusRetrievalQrelsSchemaVersion,
  taskId: "nlp-retrieval",
  corpusId: collection.corpusId,
  judgments: [
    {
      queryId: "title-alpha-beta",
      ratings: [
        { docId: "doc-a", grade: 2 },
        { docId: "doc-b", grade: 0 },
      ],
    },
    {
      queryId: "delta-note",
      ratings: [
        { docId: "doc-c", grade: 2 },
        { docId: "doc-a", grade: 0 },
      ],
    },
  ],
};

const report = learnTextCorpusRetrievalFieldWeightProfile(index, queries, qrels, {
  reportId: "example:textcorpus-field-weight-learning",
  profileIdPrefix: "learned:example",
  searchSpace: [
    { field: "title", weights: [0, 1, 2] },
    { field: "body", weights: [0, 1] },
  ],
  includeBaseline: false,
  optimizeMetric: "ndcgAtK",
  k: 3,
  relevantGradeThreshold: 1,
  tolerance: 1e-12,
  searchTopK: 3,
  maxCandidateCount: 6,
});

if (!isTextCorpusRetrievalCalibrationReportV1(report)) {
  throw new Error("textcorpus field-weight learning report is invalid");
}

const metricPayload = exportTextCorpusMetricEnvelopePayloadV1(report, {
  metricSetId: "metrics:example-textcorpus-field-weight-learning",
});
if (!isTextCorpusMetricEnvelopePayloadV1(metricPayload)) {
  throw new Error("textcorpus field-weight learning metric payload is invalid");
}

const selectedCandidate = report.candidates.find((candidate) => candidate.selected);
console.log(JSON.stringify({
  reportId: report.reportId,
  optimizeMetric: report.optimizeMetric,
  selectedCandidateId: report.selectedCandidateId,
  candidateCount: report.candidates.length,
  selectedFields: selectedCandidate?.fieldWeightProfile?.fields ?? [],
  selectedMetricScore: selectedCandidate?.metricScore ?? 0,
  metricCount: metricPayload.metrics.length,
}, null, 2));
