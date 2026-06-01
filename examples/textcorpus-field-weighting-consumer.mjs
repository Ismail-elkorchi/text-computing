#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusRetrievalIndex,
  createTextCorpusCollection,
  createTextCorpusRetrievalFieldWeightProfile,
  isTextCorpusRetrievalFieldWeightProfileV1,
  isTextCorpusRetrievalResultV1,
  parseTextCorpusQuery,
  searchTextCorpusRetrievalIndex,
  textCorpusBm25fFormula,
} from "@ismail-elkorchi/textcorpus";

function entry(id, text, metadata) {
  const document = createTextDocDocumentFromTextSync(text, {
    documentId: `example:textcorpus-field-weighting:${id}`,
    sourceId: `example:textcorpus-field-weighting:${id}`,
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
    entry("doc-b", "alpha beta gamma", { genre: "news", title: "Gamma bulletin" }),
    entry("doc-c", "delta note", { genre: "note", title: "Delta note" }),
  ],
  { corpusId: "example:textcorpus-field-weighting" },
);

const index = buildTextCorpusRetrievalIndex(collection, {
  formula: textCorpusBm25fFormula,
  fields: [
    { id: "title", source: "metadata", weight: 2, b: 0.25 },
    { id: "body", source: "tokens", weight: 1, b: 0.75 },
  ],
});

const query = parseTextCorpusQuery("title:alpha +beta genre:news", {
  id: "example:title-alpha-beta",
});
const baseline = searchTextCorpusRetrievalIndex(index, [query], {
  topK: 3,
  snippetWindow: 1,
});

const profile = createTextCorpusRetrievalFieldWeightProfile({
  profileId: "example:title-boost",
  fields: {
    title: 3,
    body: 0.5,
  },
});
if (!isTextCorpusRetrievalFieldWeightProfileV1(profile)) {
  throw new Error("textcorpus retrieval field weight profile is invalid");
}

const boosted = searchTextCorpusRetrievalIndex(index, [query], {
  topK: 3,
  snippetWindow: 1,
  fieldWeightProfile: profile,
});
if (!isTextCorpusRetrievalResultV1(boosted)) {
  throw new Error("textcorpus weighted retrieval result is invalid");
}

const baselineHit = baseline.results[0]?.hits[0];
const boostedHit = boosted.results[0]?.hits[0];
const boostedTitleExplain = boostedHit?.explain.find(
  (entry) => entry.term === "alpha" && entry.field === "title",
);

console.log(JSON.stringify({
  profile: boosted.fieldWeightProfile,
  baselineTopHit: baselineHit?.docId ?? null,
  baselineScore: baselineHit?.score ?? null,
  boostedTopHit: boostedHit?.docId ?? null,
  boostedScore: boostedHit?.score ?? null,
  titleWeight: boostedTitleExplain?.fieldContributions?.[0]?.weight ?? null,
  titleQueryWeight: boostedTitleExplain?.fieldContributions?.[0]?.queryWeight ?? null,
}, null, 2));
