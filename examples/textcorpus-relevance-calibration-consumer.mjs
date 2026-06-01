#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusRetrievalIndex,
  calibrateTextCorpusRetrievalFieldWeightProfiles,
  createTextCorpusCollection,
  createTextCorpusRetrievalFieldWeightProfile,
  exportTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusRetrievalCalibrationReportV1,
  parseTextCorpusQuery,
  textCorpusBm25fFormula,
  textCorpusRetrievalQrelsSchemaVersion,
} from "@ismail-elkorchi/textcorpus";

function entry(id, text, metadata) {
  const document = createTextDocDocumentFromTextSync(text, {
    documentId: `example:textcorpus-calibration:${id}`,
    sourceId: `example:textcorpus-calibration:${id}`,
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
  { corpusId: "example:textcorpus-relevance-calibration" },
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

const titleBoost = createTextCorpusRetrievalFieldWeightProfile({
  profileId: "profile:title-boost",
  fields: {
    title: 3,
    body: 0.5,
  },
});
const zeroControl = createTextCorpusRetrievalFieldWeightProfile({
  profileId: "profile:zero-control",
  fields: {
    title: 0,
    body: 0,
  },
});

const report = calibrateTextCorpusRetrievalFieldWeightProfiles(
  index,
  queries,
  qrels,
  [titleBoost, zeroControl],
  {
    reportId: "example:textcorpus-relevance-calibration",
    optimizeMetric: "ndcgAtK",
    k: 3,
    relevantGradeThreshold: 1,
    tolerance: 1e-12,
    searchTopK: 3,
  },
);

if (!isTextCorpusRetrievalCalibrationReportV1(report)) {
  throw new Error("textcorpus relevance calibration report is invalid");
}

const metricPayload = exportTextCorpusMetricEnvelopePayloadV1(report, {
  metricSetId: "metrics:example-textcorpus-relevance-calibration",
});
if (!isTextCorpusMetricEnvelopePayloadV1(metricPayload)) {
  throw new Error("textcorpus relevance calibration metric payload is invalid");
}

console.log(JSON.stringify({
  reportId: report.reportId,
  optimizeMetric: report.optimizeMetric,
  selectedCandidateId: report.selectedCandidateId,
  candidates: report.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    rank: candidate.rank,
    metricScore: candidate.metricScore,
    withinToleranceOfSelected: candidate.withinToleranceOfSelected,
  })),
  metricCount: metricPayload.metrics.length,
}, null, 2));
