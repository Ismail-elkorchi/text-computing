import type { TextDocDocumentV1, TextDocLayer } from "@ismail-elkorchi/textdoc";
import {
  calibrateTextCorpusRetrievalFieldWeightProfiles,
  buildTextCorpusFingerprintIndex,
  buildTextCorpusRetrievalIndex,
  computeTextCorpusCollocates,
  computeTextCorpusConcordance,
  computeTextCorpusCooccurrences,
  computeTextCorpusFrequencies,
  computeTextCorpusNgrams,
  computeTextCorpusPairwiseRelations,
  computeTextCorpusScoring,
  createTextCorpusCitationWindows,
  createTextCorpusCollection,
  createTextCorpusRetrievalFieldWeightProfile,
  createTextCorpusRetrievalIndexArtifact,
  createTextCorpusRetrievalCalibrationReport,
  evaluateTextCorpusRetrieval,
  exportTextCorpusMetricEnvelopePayloadV1,
  groundTextCorpusQuote,
  isTextCorpusCollocateResultV1,
  isTextCorpusCitationWindowSetV1,
  isTextCorpusCollectionV1,
  isTextCorpusConcordanceResultV1,
  isTextCorpusCooccurrenceResultV1,
  isTextCorpusFingerprintIndex,
  isTextCorpusFrequencyResultV1,
  isTextCorpusMetricEnvelopePayloadV1,
  isTextCorpusNgramResultV1,
  isTextCorpusPairwiseRelationResultV1,
  isTextCorpusParsedQuery,
  isTextCorpusQuoteGroundingResultV1,
  isTextCorpusRetrievalCalibrationReportV1,
  isTextCorpusRetrievalEvaluationResultV1,
  isTextCorpusRetrievalFieldWeightProfileV1,
  isTextCorpusRetrievalIndexArtifactV1,
  isTextCorpusRetrievalIndexStorageRefV1,
  isTextCorpusRetrievalIndexV1,
  isTextCorpusRetrievalQrelsV1,
  isTextCorpusRetrievalResultV1,
  isTextCorpusScoringResultV1,
  iterateTextCorpusRetrievalResults,
  createTextCorpusRetrievalIndexFileSystemKey,
  loadTextCorpusRetrievalIndexArtifactFromFileSystem,
  loadTextCorpusRetrievalIndexArtifactFromStore,
  packageName,
  parseTextCorpusArtifact,
  parseTextCorpusQuery,
  parseTextCorpusRetrievalIndexArtifact,
  parseTextCorpusRetrievalIndex,
  resolveTextCorpusRetrievalIndexFileSystemPath,
  saveTextCorpusRetrievalIndexArtifactToFileSystem,
  saveTextCorpusRetrievalIndexArtifactToStore,
  searchTextCorpusRetrievalIndex,
  stringifyTextCorpusArtifact,
  stringifyTextCorpusRetrievalIndexArtifact,
  stringifyTextCorpusRetrievalIndex,
  sliceTextCorpusByMetadata,
  textCorpusBm25fFormula,
  textCorpusCollectionSchemaVersion,
  textCorpusRetrievalCalibrationSchemaVersion,
  textCorpusRetrievalEvaluationSchemaVersion,
  textCorpusRetrievalQrelsSchemaVersion,
  textCorpusRetrievalSchemaVersion,
  textCorpusScoringSchemaVersion,
  type TextCorpusEntry,
  type TextCorpusRetrievalQrelsV1,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textcorpus";
const expectedSchemaVersion: typeof textCorpusCollectionSchemaVersion = 1;
const expectedScoringSchemaVersion: typeof textCorpusScoringSchemaVersion = 1;
const expectedRetrievalSchemaVersion: typeof textCorpusRetrievalSchemaVersion = 1;
const expectedRetrievalQrelsSchemaVersion: typeof textCorpusRetrievalQrelsSchemaVersion = 1;
const expectedRetrievalEvaluationSchemaVersion: typeof textCorpusRetrievalEvaluationSchemaVersion = 1;
const expectedRetrievalCalibrationSchemaVersion: typeof textCorpusRetrievalCalibrationSchemaVersion = 1;

function createDocument(
  documentId: string,
  revision: string,
  text: string,
  tokenTexts: readonly string[],
): TextDocDocumentV1 {
  let cursor = 0;
  const annotations: Array<TextDocLayer["annotations"][number]> = [];

  for (const [index, tokenText] of tokenTexts.entries()) {
    const startCU = text.indexOf(tokenText, cursor);
    if (startCU === -1) {
      throw new Error(`token ${tokenText} not found in ${documentId}`);
    }
    const endCU = startCU + tokenText.length;
    cursor = endCU;
    annotations.push({
      id: `token-${index + 1}`,
      kind: "token",
      tokenKind: "lexical-token",
      lifecycle: {
        state: "active",
      },
      targets: [
        {
          kind: "span",
          viewId: "analysis-view",
          startCU,
          endCU,
        },
      ],
      text: tokenText,
    });
  }

  return {
    schemaVersion: 1,
    documentId,
    revision,
    textLengthCU: text.length,
    text,
    units: {
      text: "utf16-code-unit",
    },
    views: [
      {
        id: "source-view",
        kind: "raw",
      },
      {
        id: "analysis-view",
        kind: "task",
        parentViewId: "source-view",
        spanMapIds: ["span-map-source-analysis"],
      },
    ],
    spanMaps: [
      {
        id: "span-map-source-analysis",
        sourceViewId: "source-view",
        targetViewId: "analysis-view",
        lifecycle: { state: "active" },
        segments:
          text.length === 0
            ? []
            : [
                {
                  source: { startCU: 0, endCU: text.length },
                  target: { startCU: 0, endCU: text.length },
                  kind: "unchanged",
                  reversible: true,
                },
              ],
      },
    ],
    layers: [
      {
        id: "tokens",
        kind: "token",
        viewId: "analysis-view",
        annotations,
      },
    ],
  };
}

const alphaEntry: TextCorpusEntry = {
  id: "doc-a",
  document: createDocument("doc:a", "r1", "alpha beta gamma", ["alpha", "beta", "gamma"]),
  viewId: "analysis-view",
  tokenLayerId: "tokens",
  metadata: {
    language: "en",
    genre: "news",
  },
};

const betaEntry: TextCorpusEntry = {
  id: "doc-b",
  document: createDocument("doc:b", "r1", "alpha beta delta", ["alpha", "beta", "delta"]),
  viewId: "analysis-view",
  tokenLayerId: "tokens",
  metadata: {
    language: "en",
    genre: "fiction",
  },
};

const gammaEntry: TextCorpusEntry = {
  id: "doc-c",
  document: createDocument("doc:c", "r1", "bonjour corpus monde", ["bonjour", "corpus", "monde"]),
  viewId: "analysis-view",
  tokenLayerId: "tokens",
  metadata: {
    language: "fr",
    genre: "news",
  },
};

const collection = createTextCorpusCollection([gammaEntry, alphaEntry, betaEntry], {
  corpusId: "corpus:foundation",
});

if (collection.schemaVersion !== textCorpusCollectionSchemaVersion) {
  throw new Error("textcorpus collection should use the collection schema version");
}

if (!isTextCorpusCollectionV1(collection)) {
  throw new Error("textcorpus collection should satisfy the runtime contract");
}

if (collection.entries.map((entry) => entry.id).join(",") !== "doc-a,doc-b,doc-c") {
  throw new Error("textcorpus collection entries should be deterministically sorted by id");
}

let duplicateDocumentRejected = false;
try {
  createTextCorpusCollection(
    [
      alphaEntry,
      {
        ...betaEntry,
        id: "doc-z",
        document: {
          ...betaEntry.document,
          documentId: alphaEntry.document.documentId,
        },
      },
    ],
    { corpusId: "corpus:duplicate-doc" },
  );
} catch (error) {
  duplicateDocumentRejected =
    error instanceof Error && error.message === `duplicate textcorpus documentId: ${alphaEntry.document.documentId}`;
}

if (!duplicateDocumentRejected) {
  throw new Error("textcorpus should reject duplicate document ids");
}

let missingViewRejected = false;
try {
  createTextCorpusCollection(
    [
      {
        ...alphaEntry,
        viewId: "missing-view",
      },
    ],
    { corpusId: "corpus:missing-view" },
  );
} catch (error) {
  missingViewRejected =
    error instanceof Error && error.message === "entry doc-a references missing view missing-view";
}

if (!missingViewRejected) {
  throw new Error("textcorpus should reject entries that reference missing views");
}

let missingLayerRejected = false;
try {
  createTextCorpusCollection(
    [
      {
        ...alphaEntry,
        tokenLayerId: "missing-layer",
      },
    ],
    { corpusId: "corpus:missing-layer" },
  );
} catch (error) {
  missingLayerRejected =
    error instanceof Error &&
    error.message ===
      "entry doc-a references missing token layer missing-layer in view analysis-view";
}

if (!missingLayerRejected) {
  throw new Error("textcorpus should reject entries that reference missing token layers");
}

const slicedCollection = sliceTextCorpusByMetadata(collection, {
  language: "en",
  genre: ["news", "reportage"],
});

if (slicedCollection.entries.map((entry) => entry.id).join(",") !== "doc-a") {
  throw new Error("metadata slicing should preserve deterministic filtered ordering");
}

const concordance = computeTextCorpusConcordance(collection, {
  query: "beta",
  window: 1,
  metadataFilters: { language: "en" },
});

if (!isTextCorpusConcordanceResultV1(concordance)) {
  throw new Error("concordance output should satisfy the runtime contract");
}

if (
  concordance.evidenceClass !== "E2" ||
  concordance.selection.corpusId !== "corpus:foundation" ||
  concordance.selection.documentOrder.join(",") !== "doc-a,doc-b" ||
  concordance.selection.tokenCount !== 6 ||
  concordance.rows.map((row) => `${row.docId}:${row.tokenIndex}:${row.left.join(" ")}|${row.match}|${row.right.join(" ")}`).join(",") !==
    "doc-a:1:alpha|beta|gamma,doc-b:1:alpha|beta|delta"
) {
  throw new Error("concordance should expose exact-token KWIC rows with selection provenance");
}

const frequency = computeTextCorpusFrequencies(collection, { metadataFilters: { language: "en" } });

if (!isTextCorpusFrequencyResultV1(frequency)) {
  throw new Error("frequency output should satisfy the runtime contract");
}

if (
  frequency.rows.map((row) => `${row.term}:${row.count}:${row.documentFrequency}`).join(",") !==
  "alpha:2:2,beta:2:2,delta:1:1,gamma:1:1"
) {
  throw new Error("frequency output should expose deterministic raw and document-frequency counts");
}

const frequencyMetricPayload = exportTextCorpusMetricEnvelopePayloadV1(frequency, {
  metricSetId: "metrics:frequency-en",
});
if (!isTextCorpusMetricEnvelopePayloadV1(frequencyMetricPayload)) {
  throw new Error("frequency metric payload should satisfy the corpus metric payload contract");
}
if (
  frequencyMetricPayload.metrics.map((entry) => `${entry.metricId}:${entry.kind}:${entry.value}`).join(",") !==
  "selection.document-count:selection:2,selection.token-count:selection:6,frequency.term-count:frequency:4,frequency.total-token-count:frequency:6"
) {
  throw new Error("frequency metric payload should expose selection and frequency metrics deterministically");
}

const ngrams = computeTextCorpusNgrams(collection, { n: 2, metadataFilters: { language: "en" } });

if (!isTextCorpusNgramResultV1(ngrams)) {
  throw new Error("n-gram output should satisfy the runtime contract");
}

if (
  ngrams.rows.map((row) => `${row.ngram.join(" ")}:${row.count}:${row.documentFrequency}`).join(",") !==
  "alpha beta:2:2,beta delta:1:1,beta gamma:1:1"
) {
  throw new Error("n-gram output should expose deterministic exact-token n-grams");
}

const cooccurrences = computeTextCorpusCooccurrences(collection, {
  window: 1,
  metadataFilters: { language: "en" },
});

if (!isTextCorpusCooccurrenceResultV1(cooccurrences)) {
  throw new Error("co-occurrence output should satisfy the runtime contract");
}

if (
  cooccurrences.rows.map((row) => `${row.term}:${row.coTerm}:${row.count}`).join(",") !==
  "alpha:beta:2,beta:delta:1,beta:gamma:1"
) {
  throw new Error("co-occurrence output should count deterministic unordered token windows");
}

const collocates = computeTextCorpusCollocates(collection, {
  term: "beta",
  window: 1,
  metadataFilters: { language: "en" },
});

if (!isTextCorpusCollocateResultV1(collocates)) {
  throw new Error("collocate output should satisfy the runtime contract");
}

if (
  collocates.rows.map((row) => `${row.term}:${row.coTerm}:${row.count}`).join(",") !==
  "beta:alpha:2,beta:delta:1,beta:gamma:1"
) {
  throw new Error("collocate output should expose rows for one query term");
}

const relationCorpus = createTextCorpusCollection(
  [
    alphaEntry,
    betaEntry,
    {
      ...alphaEntry,
      id: "doc-a-copy",
      document: createDocument("doc:a-copy", "r1", "alpha beta gamma", ["alpha", "beta", "gamma"]),
    },
  ],
  { corpusId: "corpus:relations" },
);
const pairwiseRelations = computeTextCorpusPairwiseRelations(relationCorpus, {
  shingleSize: 2,
  windowSize: 1,
  nearDuplicateThreshold: 0.3,
});

if (!isTextCorpusPairwiseRelationResultV1(pairwiseRelations)) {
  throw new Error("pairwise relation output should satisfy the runtime contract");
}

if (
  pairwiseRelations.rows
    .map((row) => `${row.leftDocId}/${row.rightDocId}:${row.relation}:${row.jaccard}`)
    .join(",") !== "doc-a/doc-a-copy:exact-duplicate:1,doc-a/doc-b:near-duplicate:0.3333333333333333,doc-a-copy/doc-b:near-duplicate:0.3333333333333333"
) {
  throw new Error("pairwise relation output should expose deterministic reuse relations");
}

const serializedFrequency = stringifyTextCorpusArtifact(frequency);
if (JSON.stringify(parseTextCorpusArtifact(serializedFrequency)) !== JSON.stringify(frequency)) {
  throw new Error("generic corpus artifact persistence should round-trip frequency output deterministically");
}

let invalidArtifactRejected = false;
try {
  parseTextCorpusArtifact("{\"schemaVersion\":1,\"corpusId\":\"bad\"}");
} catch (error) {
  invalidArtifactRejected =
    error instanceof TypeError &&
    error.message === "textcorpus artifact JSON must satisfy a known TextCorpus artifact contract";
}

if (!invalidArtifactRejected) {
  throw new Error("generic corpus artifact parser should reject unknown persisted artifacts");
}

let mismatchedArtifactRejected = false;
try {
  stringifyTextCorpusArtifact({
    ...frequency,
    selection: { ...frequency.selection, corpusId: "corpus:mismatch" },
  });
} catch (error) {
  mismatchedArtifactRejected =
    error instanceof TypeError &&
    error.message === "textcorpus artifact must satisfy a known TextCorpus artifact contract";
}

if (!mismatchedArtifactRejected) {
  throw new Error("generic corpus artifact persistence should reject mismatched selection provenance");
}

let emptyConcordanceQueryRejected = false;
try {
  computeTextCorpusConcordance(collection, { query: "", window: 1 });
} catch (error) {
  emptyConcordanceQueryRejected =
    error instanceof TypeError && error.message === "textcorpus concordance query must be a non-empty string";
}

if (!emptyConcordanceQueryRejected) {
  throw new Error("concordance should reject empty query terms");
}

let invalidNgramRejected = false;
try {
  computeTextCorpusNgrams(collection, { n: 0 });
} catch (error) {
  invalidNgramRejected =
    error instanceof TypeError && error.message === "textcorpus n-gram size must be a positive integer";
}

if (!invalidNgramRejected) {
  throw new Error("n-gram computation should reject non-positive n");
}

const fingerprintIndex = buildTextCorpusFingerprintIndex(collection, {
  shingleSize: 2,
  windowSize: 2,
  hashAlgorithm: "fnv1a64-utf16le",
});

if (!isTextCorpusFingerprintIndex(fingerprintIndex)) {
  throw new Error("textcorpus fingerprint index should satisfy the runtime contract");
}

const repeatedFingerprintIndex = buildTextCorpusFingerprintIndex(collection, {
  shingleSize: 2,
  windowSize: 2,
  hashAlgorithm: "fnv1a64-utf16le",
});

if (JSON.stringify(fingerprintIndex) !== JSON.stringify(repeatedFingerprintIndex)) {
  throw new Error("fingerprint index should be deterministic for identical inputs");
}

const sharedDocIds = Object.values(fingerprintIndex.index).find(
  (docIds) => Array.isArray(docIds) && docIds.join(",") === "doc-a,doc-b",
);

if (!sharedDocIds) {
  throw new Error("fingerprint index should record shared shingles across documents");
}

const emptyEntry: TextCorpusEntry = {
  id: "doc-empty",
  document: createDocument("doc:empty", "r1", "", []),
  viewId: "analysis-view",
  tokenLayerId: "tokens",
  metadata: {
    language: "en",
    genre: "empty-control",
  },
};

const scoringAlphaEntry: TextCorpusEntry = {
  ...alphaEntry,
  document: createDocument("doc:score-a", "r1", "alpha beta beta", ["alpha", "beta", "beta"]),
};

const scoringBetaEntry: TextCorpusEntry = {
  ...betaEntry,
  document: createDocument("doc:score-b", "r1", "alpha gamma", ["alpha", "gamma"]),
};

const scoringDeltaEntry: TextCorpusEntry = {
  id: "doc-c",
  document: createDocument("doc:score-c", "r1", "delta", ["delta"]),
  viewId: "analysis-view",
  tokenLayerId: "tokens",
  metadata: {
    language: "en",
    genre: "note",
  },
};

const scoringCollection = createTextCorpusCollection([scoringAlphaEntry, scoringBetaEntry, scoringDeltaEntry, emptyEntry], {
  corpusId: "corpus-tfidf-bm25-smoke",
});

const scoringResult = computeTextCorpusScoring(scoringCollection, {
  tolerance: 1e-12,
  tfidfFormulas: ["tfidf.sklearn-smooth-raw", "tfidf.sklearn-smooth-l2"],
  bm25Formulas: ["bm25.okapi.k1-1.5.b-0.75", "bm25.okapi.k1-1.2.b-0.75"],
  queries: [
    { id: "alpha-beta", tokens: ["alpha", "beta"] },
    { id: "delta", tokens: ["delta"] },
    { id: "missing", tokens: ["missing"] },
  ],
});

if (scoringResult.schemaVersion !== textCorpusScoringSchemaVersion) {
  throw new Error("textcorpus scoring result should use the scoring schema version");
}

if (!isTextCorpusScoringResultV1(scoringResult)) {
  throw new Error("textcorpus scoring result should satisfy the runtime contract");
}

if (
  scoringResult.evidenceClass !== "E2" ||
  scoringResult.selection.documentOrder.join(",") !== "doc-a,doc-b,doc-c,doc-empty" ||
  scoringResult.selection.tokenCount !== 6
) {
  throw new Error("textcorpus scoring result should disclose E2 selection provenance");
}

if (scoringResult.documentOrder.join(",") !== "doc-a,doc-b,doc-c,doc-empty") {
  throw new Error("scoring output should preserve deterministic collection document order");
}

if (scoringResult.termOrder.join(",") !== "alpha,beta,delta,gamma") {
  throw new Error("scoring output should expose deterministic lexical term order");
}

if (!scoringResult.formulaSet.includes("tfidf.sklearn-smooth-l2")) {
  throw new Error("scoring output should disclose requested TF-IDF formula variants");
}

if (!scoringResult.formulaSet.includes("bm25.okapi.k1-1.2.b-0.75")) {
  throw new Error("scoring output should disclose requested BM25 formula variants");
}

function expectNear(actual: number | undefined, expected: number, message: string): void {
  if (actual === undefined || Math.abs(actual - expected) > scoringResult.tolerance) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function documentScores(documentId: string) {
  const document = scoringResult.documents.find((entry) => entry.id === documentId);
  if (!document) throw new Error(`missing scoring document ${documentId}`);
  return document;
}

function termValue(values: readonly { readonly term: string; readonly value: number }[], term: string): number | undefined {
  return values.find((entry) => entry.term === term)?.value;
}

expectNear(termValue(documentScores("doc-a").tf, "beta"), 2, "doc-a beta raw tf");
expectNear(
  termValue(documentScores("doc-a").tfidf, "alpha"),
  1.5108256237659907,
  "doc-a alpha smooth tf-idf",
);
expectNear(
  termValue(documentScores("doc-a").tfidf, "beta"),
  3.83258146374831,
  "doc-a beta smooth tf-idf",
);
expectNear(
  termValue(documentScores("doc-b").tfidf, "gamma"),
  1.916290731874155,
  "doc-b gamma smooth tf-idf",
);

const docATfidfL2 = documentScores("doc-a").tfidfVariants?.find(
  (entry) => entry.formula === "tfidf.sklearn-smooth-l2",
)?.values;
expectNear(termValue(docATfidfL2 ?? [], "beta"), 0.9303238670444788, "doc-a beta l2-normalized smooth tf-idf");

if (documentScores("doc-empty").length !== 0 || documentScores("doc-empty").tf.length !== 0) {
  throw new Error("empty document should remain present with zero term values");
}

function queryScores(queryId: string) {
  const query = scoringResult.queries.find((entry) => entry.id === queryId);
  if (!query) throw new Error(`missing scoring query ${queryId}`);
  return query.bm25;
}

function queryScore(queryId: string, docId: string): number | undefined {
  return queryScores(queryId).find((entry) => entry.docId === docId)?.score;
}

expectNear(queryScore("alpha-beta", "doc-a"), 0.9159976869050851, "alpha-beta BM25 doc-a");
expectNear(queryScore("alpha-beta", "doc-b"), 0, "alpha-beta BM25 doc-b");
expectNear(queryScore("delta", "doc-c"), 0.9968210122202397, "delta BM25 doc-c");
const alphaBetaBm25K1_1_2 = queryScores("alpha-beta")
  .at(0);
const alphaBetaVariantScore = scoringResult.queries
  .find((entry) => entry.id === "alpha-beta")
  ?.bm25Variants?.find((entry) => entry.formula === "bm25.okapi.k1-1.2.b-0.75")
  ?.scores.find((entry) => entry.docId === "doc-a")?.score;
if (alphaBetaBm25K1_1_2?.docId !== "doc-a") {
  throw new Error("canonical BM25 ordering should remain document-order stable");
}
expectNear(alphaBetaVariantScore, 0.9092952648057798, "alpha-beta BM25 k1=1.2 doc-a");
for (const score of queryScores("missing")) {
  expectNear(score.score, 0, `missing query score for ${score.docId}`);
}

const repeatedScoringResult = computeTextCorpusScoring(scoringCollection, {
  tolerance: 1e-12,
  queries: [{ id: "alpha-beta", tokens: ["alpha", "beta"] }],
});
const repeatedScoringResultAgain = computeTextCorpusScoring(scoringCollection, {
  tolerance: 1e-12,
  queries: [{ id: "alpha-beta", tokens: ["alpha", "beta"] }],
});

if (JSON.stringify(repeatedScoringResult) !== JSON.stringify(repeatedScoringResultAgain)) {
  throw new Error("corpus scoring should be deterministic for identical inputs");
}

let duplicateQueryRejected = false;
try {
  computeTextCorpusScoring(scoringCollection, {
    queries: [
      { id: "alpha-beta", tokens: ["alpha"] },
      { id: "alpha-beta", tokens: ["beta"] },
    ],
  });
} catch (error) {
  duplicateQueryRejected =
    error instanceof Error && error.message === "duplicate textcorpus query id: alpha-beta";
}

if (!duplicateQueryRejected) {
  throw new Error("textcorpus scoring should reject duplicate query ids");
}

const retrievalIndex = buildTextCorpusRetrievalIndex(scoringCollection);

if (retrievalIndex.schemaVersion !== textCorpusRetrievalSchemaVersion) {
  throw new Error("retrieval index should use the retrieval schema version");
}

if (!isTextCorpusRetrievalIndexV1(retrievalIndex)) {
  throw new Error("retrieval index should satisfy the runtime contract");
}

if (
  retrievalIndex.evidenceClass !== "E2" ||
  retrievalIndex.selection.documentOrder.join(",") !== "doc-a,doc-b,doc-c,doc-empty" ||
  retrievalIndex.selection.tokenCount !== 6
) {
  throw new Error("retrieval index should disclose E2 selection provenance");
}

if (retrievalIndex.termOrder.join(",") !== "alpha,beta,delta,gamma") {
  throw new Error("retrieval index should preserve deterministic term ordering");
}

const parsedQuery = parseTextCorpusQuery("Alpha beta", { id: "alpha-beta" });
if (!isTextCorpusParsedQuery(parsedQuery) || parsedQuery.tokens.join(",") !== "alpha,beta") {
  throw new Error("query parser should normalize query text to lower-case lexical tokens");
}

const retrievalResult = searchTextCorpusRetrievalIndex(
  retrievalIndex,
  [
    parsedQuery,
    parseTextCorpusQuery("delta", { id: "delta" }),
    parseTextCorpusQuery("missing", { id: "missing" }),
  ],
  { topK: 3, snippetWindow: 1 },
);

if (retrievalResult.schemaVersion !== textCorpusRetrievalSchemaVersion) {
  throw new Error("retrieval result should use the retrieval schema version");
}

if (!isTextCorpusRetrievalResultV1(retrievalResult)) {
  throw new Error("retrieval result should satisfy the runtime contract");
}

if (
  retrievalResult.evidenceClass !== "E2" ||
  retrievalResult.selection.documentOrder.join(",") !== retrievalIndex.selection.documentOrder.join(",")
) {
  throw new Error("retrieval result should preserve index selection provenance");
}

function retrievalHits(queryId: string) {
  const queryResult = retrievalResult.results.find((entry) => entry.query.id === queryId);
  if (!queryResult) throw new Error(`missing retrieval query ${queryId}`);
  return queryResult.hits;
}

const alphaBetaHits = retrievalHits("alpha-beta");
if (alphaBetaHits.map((hit) => hit.docId).join(",") !== "doc-a") {
  throw new Error("alpha-beta retrieval should return only positive-score hits");
}
expectNear(alphaBetaHits[0]?.score, 0.9159976869050851, "alpha-beta retrieval doc-a");
if (alphaBetaHits[0]?.snippet?.text !== "alpha beta beta") {
  throw new Error("retrieval snippet should expose the local token window");
}
const betaExplain = alphaBetaHits[0]?.explain.find((entry) => entry.term === "beta");
expectNear(betaExplain?.contribution, 0.9159976869050851, "alpha-beta beta contribution");

const deltaHits = retrievalHits("delta");
if (deltaHits.map((hit) => hit.docId).join(",") !== "doc-c") {
  throw new Error("delta retrieval should return doc-c");
}
expectNear(deltaHits[0]?.score, 0.9968210122202397, "delta retrieval doc-c");

if (retrievalHits("missing").length !== 0) {
  throw new Error("missing query should return no positive-score hits");
}

const repeatedRetrieval = searchTextCorpusRetrievalIndex(retrievalIndex, [parsedQuery], { topK: 3 });
const repeatedRetrievalAgain = searchTextCorpusRetrievalIndex(retrievalIndex, [parsedQuery], { topK: 3 });
if (JSON.stringify(repeatedRetrieval) !== JSON.stringify(repeatedRetrievalAgain)) {
  throw new Error("retrieval output should be deterministic for identical inputs");
}

const serializedRetrievalIndex = stringifyTextCorpusRetrievalIndex(retrievalIndex);
const parsedRetrievalIndex = parseTextCorpusRetrievalIndex(serializedRetrievalIndex);
if (JSON.stringify(parsedRetrievalIndex) !== JSON.stringify(retrievalIndex)) {
  throw new Error("retrieval index persistence should round-trip deterministically");
}

let invalidRetrievalIndexRejected = false;
try {
  parseTextCorpusRetrievalIndex("{\"schemaVersion\":1,\"corpusId\":\"bad\"}");
} catch (error) {
  invalidRetrievalIndexRejected =
    error instanceof TypeError &&
    error.message === "textcorpus retrieval index JSON must satisfy TextCorpusRetrievalIndexV1";
}

if (!invalidRetrievalIndexRejected) {
  throw new Error("retrieval index parser should reject invalid persisted JSON");
}

const fieldedQuery = parseTextCorpusQuery("+beta genre:news -delta", {
  id: "news-beta-without-delta",
});

if (
  fieldedQuery.clauses
    .map((clause) => `${clause.operator}:${clause.field ?? "_"}:${clause.term}`)
    .join(",") !== "must:_:beta,should:genre:news,must-not:_:delta"
) {
  throw new Error("query parser should expose deterministic fielded/operator clauses");
}

const fieldedRetrieval = searchTextCorpusRetrievalIndex(retrievalIndex, [fieldedQuery], {
  topK: 3,
  snippetWindow: 1,
});

const fieldedHits = fieldedRetrieval.results[0]?.hits ?? [];
if (fieldedHits.map((hit) => hit.docId).join(",") !== "doc-a") {
  throw new Error("fielded retrieval should combine required, field, and prohibited clauses");
}

const fieldOnlyRetrieval = searchTextCorpusRetrievalIndex(
  retrievalIndex,
  [parseTextCorpusQuery("genre:note", { id: "genre-note" })],
  { includeZeroScores: true },
);

if (fieldOnlyRetrieval.results[0]?.hits.map((hit) => hit.docId).join(",") !== "doc-c") {
  throw new Error("field-only retrieval should support metadata filters with explicit zero-score inclusion");
}

const fieldedScoringCollection = createTextCorpusCollection(
  [
    {
      ...scoringAlphaEntry,
      metadata: {
        language: "en",
        genre: "news",
        title: "Alpha report",
      },
    },
    {
      ...scoringBetaEntry,
      metadata: {
        language: "en",
        genre: "news",
        title: "Gamma bulletin",
      },
    },
    {
      ...scoringDeltaEntry,
      metadata: {
        language: "en",
        genre: "note",
        title: "Delta note",
      },
    },
    emptyEntry,
  ],
  { corpusId: "corpus-retrieval-fielded-smoke" },
);

const fieldedIndex = buildTextCorpusRetrievalIndex(fieldedScoringCollection, {
  formula: textCorpusBm25fFormula,
  fields: [
    { id: "title", source: "metadata", weight: 2, b: 0.25 },
    { id: "body", source: "tokens", weight: 1, b: 0.75 },
  ],
});

if (!isTextCorpusRetrievalIndexV1(fieldedIndex)) {
  throw new Error("fielded retrieval index should satisfy the runtime contract");
}

if (
  fieldedIndex.formula !== textCorpusBm25fFormula ||
  fieldedIndex.fieldOrder?.join(",") !== "title,body" ||
  fieldedIndex.termOrder.join(",") !== "alpha,beta,bulletin,delta,gamma,note,report"
) {
  throw new Error("fielded retrieval index should expose deterministic field and term ordering");
}

const fieldedSerialized = stringifyTextCorpusRetrievalIndex(fieldedIndex);
const fieldedParsed = parseTextCorpusRetrievalIndex(fieldedSerialized);
if (JSON.stringify(fieldedParsed) !== JSON.stringify(fieldedIndex)) {
  throw new Error("fielded retrieval index persistence should round-trip deterministically");
}

const bm25fResult = searchTextCorpusRetrievalIndex(
  fieldedIndex,
  [
    parseTextCorpusQuery("title:alpha +beta genre:news", { id: "fielded-title-alpha-beta" }),
    parseTextCorpusQuery("title:delta genre:note", { id: "fielded-delta-note" }),
    parseTextCorpusQuery("+beta title:gamma", { id: "negative-field-control" }),
  ],
  { topK: 3, snippetWindow: 1 },
);

if (!isTextCorpusRetrievalResultV1(bm25fResult)) {
  throw new Error("fielded retrieval result should satisfy the runtime contract");
}

const fieldedQrels: TextCorpusRetrievalQrelsV1 = {
  schemaVersion: textCorpusRetrievalQrelsSchemaVersion,
  taskId: "nlp-retrieval",
  corpusId: "corpus-retrieval-fielded-smoke",
  judgments: [
    {
      queryId: "fielded-title-alpha-beta",
      ratings: [
        { docId: "doc-a", grade: 2 },
        { docId: "doc-b", grade: 0 },
      ],
    },
    {
      queryId: "fielded-delta-note",
      ratings: [
        { docId: "doc-c", grade: 2 },
        { docId: "doc-a", grade: 0 },
      ],
    },
    {
      queryId: "negative-field-control",
      ratings: [
        { docId: "doc-a", grade: 0 },
        { docId: "doc-b", grade: 0 },
      ],
    },
  ],
};

if (!isTextCorpusRetrievalQrelsV1(fieldedQrels)) {
  throw new Error("retrieval qrels should satisfy the runtime contract");
}

const fieldedEvaluation = evaluateTextCorpusRetrieval(bm25fResult, fieldedQrels, {
  k: 3,
  relevantGradeThreshold: 1,
  tolerance: 1e-12,
});

if (fieldedEvaluation.schemaVersion !== textCorpusRetrievalEvaluationSchemaVersion) {
  throw new Error("retrieval evaluation should use the evaluation schema version");
}

if (!isTextCorpusRetrievalEvaluationResultV1(fieldedEvaluation)) {
  throw new Error("retrieval evaluation should satisfy the runtime contract");
}

if (
  fieldedEvaluation.evidenceClass !== "E2" ||
  fieldedEvaluation.selection.documentOrder.join(",") !== bm25fResult.selection.documentOrder.join(",")
) {
  throw new Error("retrieval evaluation should preserve retrieval selection provenance");
}

expectNear(fieldedEvaluation.summary.precisionAtK, 2 / 9, "fielded qrels macro precision@3");
expectNear(fieldedEvaluation.summary.recallAtK, 2 / 3, "fielded qrels macro recall@3");
expectNear(fieldedEvaluation.summary.mrr, 2 / 3, "fielded qrels macro MRR");
expectNear(fieldedEvaluation.summary.ndcgAtK, 2 / 3, "fielded qrels macro nDCG@3");

const negativeEvaluation = fieldedEvaluation.queries.find((entry) => entry.queryId === "negative-field-control");
if (
  !negativeEvaluation ||
  negativeEvaluation.retrieved.length !== 0 ||
  negativeEvaluation.relevant.length !== 0 ||
  negativeEvaluation.ndcgAtK !== 0
) {
  throw new Error("retrieval qrels evaluation should preserve zero-relevance negative controls");
}

const evaluationMetricPayload = exportTextCorpusMetricEnvelopePayloadV1(fieldedEvaluation, {
  metricSetId: "metrics:fielded-evaluation",
});
if (
  !isTextCorpusMetricEnvelopePayloadV1(evaluationMetricPayload) ||
  evaluationMetricPayload.metrics.find((entry) => entry.metricId === "retrieval-evaluation.ndcg-at-k")?.value !==
    2 / 3
) {
  throw new Error("retrieval evaluation metric payload should expose summary metrics");
}

let duplicateQrelsDocRejected = false;
try {
  evaluateTextCorpusRetrieval(bm25fResult, {
    ...fieldedQrels,
    judgments: [
      {
        queryId: "duplicate-doc",
        ratings: [
          { docId: "doc-a", grade: 1 },
          { docId: "doc-a", grade: 0 },
        ],
      },
    ],
  });
} catch (error) {
  duplicateQrelsDocRejected =
    error instanceof Error && error.message === "duplicate textcorpus qrels doc id: duplicate-doc/doc-a";
}

if (!duplicateQrelsDocRejected) {
  throw new Error("retrieval qrels evaluation should reject duplicate doc ids per query");
}

let qrelsCorpusMismatchRejected = false;
try {
  evaluateTextCorpusRetrieval(bm25fResult, {
    ...fieldedQrels,
    corpusId: "corpus:other",
  });
} catch (error) {
  qrelsCorpusMismatchRejected =
    error instanceof Error &&
    error.message ===
      "textcorpus retrieval qrels corpus mismatch: corpus:other != corpus-retrieval-fielded-smoke";
}

if (!qrelsCorpusMismatchRejected) {
  throw new Error("retrieval qrels evaluation should reject corpus mismatches");
}

const fieldedTitleAlphaHits =
  bm25fResult.results.find((entry) => entry.query.id === "fielded-title-alpha-beta")?.hits ?? [];
if (fieldedTitleAlphaHits.map((hit) => hit.docId).join(",") !== "doc-a") {
  throw new Error("fielded title/body retrieval should return doc-a");
}
const titleAlphaExplain = fieldedTitleAlphaHits[0]?.explain.find(
  (entry) => entry.term === "alpha" && entry.field === "title",
);
if (
  titleAlphaExplain?.fieldContributions?.[0]?.field !== "title" ||
  titleAlphaExplain.fieldContributions[0].weight !== 2
) {
  throw new Error("fielded BM25F explain output should record title field contribution");
}
expectNear(titleAlphaExplain?.contribution, 1.1297304805162718, "fielded title alpha contribution");
const fieldedBetaExplain = fieldedTitleAlphaHits[0]?.explain.find(
  (entry) => entry.term === "beta" && entry.field === undefined,
);
expectNear(fieldedBetaExplain?.contribution, 0.9092952648057796, "fielded beta body contribution");
expectNear(fieldedTitleAlphaHits[0]?.score, 2.0390257453220513, "fielded title/body score");

const titleBoostProfile = createTextCorpusRetrievalFieldWeightProfile({
  profileId: "profile:title-boost",
  fields: {
    title: 3,
    body: 0.5,
  },
});
if (
  !isTextCorpusRetrievalFieldWeightProfileV1(titleBoostProfile) ||
  titleBoostProfile.fields.map((field) => `${field.field}:${field.weight}`).join(",") !== "body:0.5,title:3"
) {
  throw new Error("retrieval field weight profile should normalize and sort field weights");
}
const boostedFieldedResult = searchTextCorpusRetrievalIndex(
  fieldedIndex,
  [parseTextCorpusQuery("title:alpha +beta genre:news", { id: "fielded-title-alpha-beta-boosted" })],
  {
    topK: 3,
    snippetWindow: 1,
    fieldWeightProfile: titleBoostProfile,
  },
);
const boostedHit = boostedFieldedResult.results[0]?.hits[0];
const boostedTitleExplain = boostedHit?.explain.find(
  (entry) => entry.term === "alpha" && entry.field === "title",
);
if (
  boostedFieldedResult.fieldWeightProfile?.profileId !== "profile:title-boost" ||
  boostedTitleExplain?.fieldContributions?.[0]?.baseWeight !== 2 ||
  boostedTitleExplain.fieldContributions[0].queryWeight !== 3 ||
  boostedTitleExplain.fieldContributions[0].weight !== 6 ||
  (boostedHit?.score ?? 0) <= (fieldedTitleAlphaHits[0]?.score ?? 0)
) {
  throw new Error("retrieval field weight profiles should alter BM25F scores with disclosed weights");
}

const bodyOnlyFieldedResult = searchTextCorpusRetrievalIndex(
  fieldedIndex,
  [parseTextCorpusQuery("title:alpha +beta genre:news", { id: "fielded-title-alpha-beta-body-only" })],
  {
    topK: 3,
    snippetWindow: 1,
    fieldWeights: {
      title: 0,
      body: 1,
    },
  },
);
const bodyOnlyTitleExplain = bodyOnlyFieldedResult.results[0]?.hits[0]?.explain.find(
  (entry) => entry.term === "alpha" && entry.field === "title",
);
if (
  bodyOnlyFieldedResult.fieldWeightProfile?.profileId !== "inline" ||
  bodyOnlyTitleExplain?.contribution !== 0 ||
  bodyOnlyTitleExplain.fieldContributions?.[0]?.queryWeight !== 0
) {
  throw new Error("inline retrieval field weights should support zero-weight field controls");
}

let unknownFieldWeightRejected = false;
try {
  searchTextCorpusRetrievalIndex(fieldedIndex, [parseTextCorpusQuery("alpha", { id: "unknown-field-weight" })], {
    fieldWeights: {
      unknown: 1,
    },
  });
} catch (error) {
  unknownFieldWeightRejected =
    error instanceof Error &&
    error.message === "textcorpus retrieval field weight references unknown field: unknown";
}
if (!unknownFieldWeightRejected) {
  throw new Error("retrieval field weights should reject unknown fields");
}

let nonBm25fFieldWeightRejected = false;
try {
  searchTextCorpusRetrievalIndex(retrievalIndex, [parseTextCorpusQuery("alpha", { id: "non-bm25f-weight" })], {
    fieldWeights: {
      title: 1,
    },
  });
} catch (error) {
  nonBm25fFieldWeightRejected =
    error instanceof TypeError &&
    error.message === "textcorpus retrieval field weights require a BM25F retrieval index";
}
if (!nonBm25fFieldWeightRejected) {
  throw new Error("retrieval field weights should require BM25F retrieval indexes");
}

const zeroWeightProfile = createTextCorpusRetrievalFieldWeightProfile({
  profileId: "profile:zero",
  fields: {
    title: 0,
    body: 0,
  },
});
const calibrationReport = calibrateTextCorpusRetrievalFieldWeightProfiles(
  fieldedIndex,
  bm25fResult.results.map((entry) => entry.query),
  fieldedQrels,
  [titleBoostProfile, zeroWeightProfile],
  {
    reportId: "calibration:fielded-profiles",
    optimizeMetric: "ndcgAtK",
    baselineCandidateId: "baseline",
    k: 3,
    relevantGradeThreshold: 1,
    tolerance: 1e-12,
    searchTopK: 3,
    snippetWindow: 1,
  },
);
if (calibrationReport.schemaVersion !== textCorpusRetrievalCalibrationSchemaVersion) {
  throw new Error("retrieval calibration should use the calibration schema version");
}
if (
  !isTextCorpusRetrievalCalibrationReportV1(calibrationReport) ||
  calibrationReport.selectedCandidateId !== "baseline" ||
  calibrationReport.candidateOrder.join(",") !== "baseline,profile:title-boost,profile:zero" ||
  calibrationReport.candidates.length !== 3
) {
  throw new Error("retrieval calibration should rank deterministic profile candidates");
}
const zeroCalibrationCandidate = calibrationReport.candidates.find((entry) => entry.candidateId === "profile:zero");
if (
  !zeroCalibrationCandidate ||
  zeroCalibrationCandidate.metricScore !== 0 ||
  zeroCalibrationCandidate.withinToleranceOfSelected ||
  zeroCalibrationCandidate.deltasFromBaseline.ndcgAtK >= 0
) {
  throw new Error("retrieval calibration should expose degraded zero-weight profile metrics");
}
const calibrationMetricPayload = exportTextCorpusMetricEnvelopePayloadV1(calibrationReport, {
  metricSetId: "metrics:fielded-calibration",
});
if (
  !isTextCorpusMetricEnvelopePayloadV1(calibrationMetricPayload) ||
  calibrationMetricPayload.metrics.find((entry) => entry.metricId === "retrieval-calibration.candidate-count")?.value !==
    3
) {
  throw new Error("retrieval calibration metric payload should expose profile comparison metrics");
}
const parsedCalibrationReport = parseTextCorpusArtifact(stringifyTextCorpusArtifact(calibrationReport));
if (!isTextCorpusRetrievalCalibrationReportV1(parsedCalibrationReport)) {
  throw new Error("retrieval calibration should round-trip through generic artifact JSON");
}
const singleCandidateCalibrationReport = createTextCorpusRetrievalCalibrationReport(
  [{ candidateId: "only", evaluation: fieldedEvaluation }],
  { reportId: "calibration:single", baselineCandidateId: "only" },
);
if (
  !isTextCorpusRetrievalCalibrationReportV1(singleCandidateCalibrationReport) ||
  singleCandidateCalibrationReport.selectedCandidateId !== "only"
) {
  throw new Error("retrieval calibration constructor should accept caller-provided evaluation candidates");
}
let duplicateCalibrationCandidateRejected = false;
try {
  createTextCorpusRetrievalCalibrationReport([
    { candidateId: "duplicate", evaluation: fieldedEvaluation },
    { candidateId: "duplicate", evaluation: fieldedEvaluation },
  ]);
} catch (error) {
  duplicateCalibrationCandidateRejected =
    error instanceof Error && error.message === "duplicate textcorpus retrieval calibration candidate id";
}
if (!duplicateCalibrationCandidateRejected) {
  throw new Error("retrieval calibration should reject duplicate candidate ids");
}
let nonBm25fCalibrationRejected = false;
try {
  calibrateTextCorpusRetrievalFieldWeightProfiles(
    retrievalIndex,
    bm25fResult.results.map((entry) => entry.query),
    fieldedQrels,
    [titleBoostProfile],
  );
} catch (error) {
  nonBm25fCalibrationRejected =
    error instanceof TypeError &&
    error.message === "textcorpus retrieval field-weight calibration requires a BM25F retrieval index";
}
if (!nonBm25fCalibrationRejected) {
  throw new Error("retrieval calibration should require BM25F indexes for field-weight profiles");
}

const fieldedDeltaHits =
  bm25fResult.results.find((entry) => entry.query.id === "fielded-delta-note")?.hits ?? [];
if (fieldedDeltaHits.map((hit) => hit.docId).join(",") !== "doc-c") {
  throw new Error("fielded retrieval should combine indexed title fields and metadata filters");
}

const negativeFieldHits =
  bm25fResult.results.find((entry) => entry.query.id === "negative-field-control")?.hits ?? [];
if (negativeFieldHits.length !== 0) {
  throw new Error("fielded retrieval should reject incompatible required body/title clauses");
}

const booleanPhraseQuery = parseTextCorpusQuery('("alpha beta" OR title:"gamma bulletin") AND -delta', {
  id: "boolean-phrase",
});
if (
  booleanPhraseQuery.syntax !== "boolean" ||
  booleanPhraseQuery.tokens.join(",") !== "alpha,beta,gamma,bulletin,delta" ||
  booleanPhraseQuery.clauses.filter((clause) => clause.kind === "phrase").length !== 2
) {
  throw new Error("retrieval parser should expose boolean phrase clauses deterministically");
}
const booleanPhraseResult = searchTextCorpusRetrievalIndex(fieldedIndex, [booleanPhraseQuery], {
  topK: 3,
  snippetWindow: 1,
});
if (booleanPhraseResult.results[0]?.hits.map((hit) => hit.docId).join(",") !== "doc-b,doc-a") {
  throw new Error("boolean phrase retrieval should evaluate phrase, field, OR, AND, and NOT semantics");
}

const proximityQuery = parseTextCorpusQuery('"alpha beta"~1', { id: "proximity-alpha-beta" });
if (proximityQuery.clauses[0]?.kind !== "proximity" || proximityQuery.clauses[0].proximity !== 1) {
  throw new Error("retrieval parser should preserve proximity phrase metadata");
}
const proximityResult = searchTextCorpusRetrievalIndex(fieldedIndex, [proximityQuery], {
  topK: 3,
  snippetWindow: 0,
});
if (proximityResult.results[0]?.hits.map((hit) => hit.docId).join(",") !== "doc-a") {
  throw new Error("proximity retrieval should match ordered terms within the declared distance");
}

let invalidQueryRejected = false;
try {
  parseTextCorpusQuery('"alpha beta', { id: "invalid-query" });
} catch (error) {
  invalidQueryRejected =
    error instanceof SyntaxError &&
    error.message === "textcorpus query syntax error: unclosed quoted phrase";
}
if (!invalidQueryRejected) {
  throw new Error("retrieval parser should reject unclosed quoted phrases");
}

const streamedFielded = [...iterateTextCorpusRetrievalResults(fieldedIndex, bm25fResult.results.map((entry) => entry.query), {
  topK: 3,
  snippetWindow: 1,
})];
if (JSON.stringify(streamedFielded) !== JSON.stringify(bm25fResult.results)) {
  throw new Error("streaming retrieval should produce the same query results as batch retrieval");
}

const stoppedStream = iterateTextCorpusRetrievalResults(fieldedIndex, bm25fResult.results.map((entry) => entry.query), {
  topK: 3,
  snippetWindow: 1,
});
const firstStreamed = stoppedStream.next();
if (firstStreamed.done || firstStreamed.value.query.id !== "fielded-title-alpha-beta") {
  throw new Error("streaming retrieval should allow deterministic early consumption");
}

const artifact = createTextCorpusRetrievalIndexArtifact(fieldedIndex);
if (!isTextCorpusRetrievalIndexArtifactV1(artifact)) {
  throw new Error("retrieval index artifact should satisfy checksum and shape contracts");
}
const artifactSerialized = stringifyTextCorpusRetrievalIndexArtifact(artifact);
const artifactParsed = parseTextCorpusRetrievalIndexArtifact(artifactSerialized);
if (JSON.stringify(artifactParsed) !== JSON.stringify(artifact)) {
  throw new Error("retrieval index artifact should round-trip deterministically");
}
const tamperedArtifact = JSON.parse(artifactSerialized);
tamperedArtifact.index.documentOrder = [...tamperedArtifact.index.documentOrder].reverse();
if (isTextCorpusRetrievalIndexArtifactV1(tamperedArtifact)) {
  throw new Error("retrieval index artifact should reject checksum drift");
}
const storedIndexArtifacts = new Map<string, string>();
const storageRef = await saveTextCorpusRetrievalIndexArtifactToStore(artifact, {
  key: "memory://textcorpus/fielded-index.json",
  writeText(key, text) {
    storedIndexArtifacts.set(key, text);
  },
});
if (
  !isTextCorpusRetrievalIndexStorageRefV1(storageRef) ||
  storageRef.checksum.value !== artifact.checksum.value ||
  storageRef.byteLength !== new TextEncoder().encode(artifactSerialized).length ||
  storageRef.documentCount !== artifact.index.documentOrder.length ||
  storageRef.termCount !== artifact.index.termOrder.length ||
  storageRef.fieldCount !== (artifact.index.fieldOrder?.length ?? 0)
) {
  throw new Error("retrieval index storage ref should summarize persisted artifact identity");
}
const storageRefParsed = parseTextCorpusArtifact(stringifyTextCorpusArtifact(storageRef));
if (JSON.stringify(storageRefParsed) !== JSON.stringify(storageRef)) {
  throw new Error("retrieval index storage ref should round-trip through generic artifact JSON helpers");
}
const storageMetricPayload = exportTextCorpusMetricEnvelopePayloadV1(storageRef, {
  metricSetId: "metrics:retrieval-index-storage-ref",
});
if (
  !isTextCorpusMetricEnvelopePayloadV1(storageMetricPayload) ||
  !storageMetricPayload.metrics.some((metric) => metric.metricId === "retrieval-index-storage-ref.byte-length")
) {
  throw new Error("retrieval index storage ref should export metric-envelope payloads");
}
const loadedArtifact = await loadTextCorpusRetrievalIndexArtifactFromStore(storageRef, {
  readText(key) {
    return storedIndexArtifacts.get(key) ?? "";
  },
});
if (JSON.stringify(loadedArtifact) !== JSON.stringify(artifact)) {
  throw new Error("retrieval index storage adapter should load the stored artifact");
}
const fileSystemKey = createTextCorpusRetrievalIndexFileSystemKey(artifact);
if (
  fileSystemKey !==
  `retrieval-indexes/corpus-retrieval-fielded-smoke/${textCorpusBm25fFormula}/${artifact.checksum.value}.json`
) {
  throw new Error("retrieval index filesystem key should be deterministic and corpus/formula scoped");
}
const resolvedFileSystemPath = resolveTextCorpusRetrievalIndexFileSystemPath("/tmp/textcorpus", fileSystemKey);
if (resolvedFileSystemPath !== `/tmp/textcorpus/${fileSystemKey}`) {
  throw new Error("retrieval index filesystem path resolver should combine root and safe relative key");
}
const fileSystemWrites = new Map<string, string>();
const fileSystemStorageRef = await saveTextCorpusRetrievalIndexArtifactToFileSystem(artifact, {
  root: "/tmp/textcorpus",
  writeText(path, text) {
    fileSystemWrites.set(path, text);
  },
});
if (
  !isTextCorpusRetrievalIndexStorageRefV1(fileSystemStorageRef) ||
  fileSystemStorageRef.key !== fileSystemKey ||
  fileSystemWrites.get(resolvedFileSystemPath) !== artifactSerialized
) {
  throw new Error("retrieval index filesystem adapter should persist using package-owned keys");
}
const loadedFileSystemArtifact = await loadTextCorpusRetrievalIndexArtifactFromFileSystem(fileSystemStorageRef, {
  root: "/tmp/textcorpus",
  readText(path) {
    return fileSystemWrites.get(path) ?? "";
  },
});
if (JSON.stringify(loadedFileSystemArtifact) !== JSON.stringify(artifact)) {
  throw new Error("retrieval index filesystem adapter should load package-owned persisted artifacts");
}
const customFileSystemRef = await saveTextCorpusRetrievalIndexArtifactToFileSystem(artifact, {
  root: "memory-root",
  key: "indexes/custom-fielded.json",
  resolvePath(root, key) {
    return `${root}::${key}`;
  },
  writeText(path, text) {
    fileSystemWrites.set(path, text);
  },
});
if (
  customFileSystemRef.key !== "indexes/custom-fielded.json" ||
  fileSystemWrites.get("memory-root::indexes/custom-fielded.json") !== artifactSerialized
) {
  throw new Error("retrieval index filesystem adapter should allow safe caller-selected keys");
}
let unsafeFileSystemKeyRejected = false;
try {
  await saveTextCorpusRetrievalIndexArtifactToFileSystem(artifact, {
    root: "/tmp/textcorpus",
    key: "../escape.json",
    writeText() {
      throw new Error("unsafe filesystem key should not be written");
    },
  });
} catch (error) {
  unsafeFileSystemKeyRejected =
    error instanceof TypeError &&
    error.message === "textcorpus retrieval index filesystem key must be a safe relative path";
}
if (!unsafeFileSystemKeyRejected) {
  throw new Error("retrieval index filesystem adapter should reject path traversal keys");
}
let byteLengthMismatchRejected = false;
try {
  await loadTextCorpusRetrievalIndexArtifactFromStore(
    { ...storageRef, byteLength: storageRef.byteLength + 1 },
    {
      readText(key) {
        return storedIndexArtifacts.get(key) ?? "";
      },
    },
  );
} catch (error) {
  byteLengthMismatchRejected =
    error instanceof TypeError && error.message.includes("byteLength");
}
if (!byteLengthMismatchRejected) {
  throw new Error("retrieval index storage loader should reject byteLength drift");
}
let checksumMismatchRejected = false;
try {
  await loadTextCorpusRetrievalIndexArtifactFromStore(
    { ...storageRef, checksum: { algorithm: "fnv1a64-utf8", value: "0000000000000000" } },
    {
      readText(key) {
        return storedIndexArtifacts.get(key) ?? "";
      },
    },
  );
} catch (error) {
  checksumMismatchRejected =
    error instanceof TypeError && error.message.includes("checksum");
}
if (!checksumMismatchRejected) {
  throw new Error("retrieval index storage loader should reject checksum drift");
}

const citationWindows = createTextCorpusCitationWindows(fieldedScoringCollection, bm25fResult, {
  tokenWindow: 0,
});
if (!isTextCorpusCitationWindowSetV1(citationWindows)) {
  throw new Error("citation windows should satisfy the runtime contract");
}
const docACitation = citationWindows.windows.find(
  (entry) => entry.queryId === "fielded-title-alpha-beta" && entry.docId === "doc-a",
);
if (
  docACitation?.text !== "alpha beta beta" ||
  docACitation.textPolicy !== "source-span" ||
  docACitation.tokenStart !== 0 ||
  docACitation.tokenEnd !== 3
) {
  throw new Error("citation windows should ground retrieval hits to textdoc token spans");
}

const groundedQuote = groundTextCorpusQuote(fieldedScoringCollection, {
  docId: "doc-a",
  quoteTokens: ["beta"],
});
if (
  !isTextCorpusQuoteGroundingResultV1(groundedQuote) ||
  groundedQuote.status !== "ambiguous" ||
  groundedQuote.matches.length !== 2
) {
  throw new Error("quote grounding should preserve ambiguity for repeated token sequences");
}
const missingQuote = groundTextCorpusQuote(fieldedScoringCollection, {
  docId: "doc-a",
  quoteTokens: ["missing"],
});
if (missingQuote.status !== "not-found" || missingQuote.matches.length !== 0) {
  throw new Error("quote grounding should expose not-found controls");
}

const metricPayloads = [
  concordance,
  frequency,
  ngrams,
  cooccurrences,
  collocates,
  pairwiseRelations,
  scoringResult,
  retrievalIndex,
  artifact,
  retrievalResult,
  fieldedEvaluation,
  calibrationReport,
  citationWindows,
  groundedQuote,
].map((corpusArtifact) => exportTextCorpusMetricEnvelopePayloadV1(corpusArtifact));

if (!metricPayloads.every((payload) => isTextCorpusMetricEnvelopePayloadV1(payload))) {
  throw new Error("metric payload export should cover all declared textcorpus artifact families");
}

const metricSetIds = metricPayloads.map((payload) => payload.metricSetId).join(",");
if (
  metricSetIds !==
  "textcorpus.concordance:corpus:foundation:beta,textcorpus.frequency:corpus:foundation,textcorpus.ngram:corpus:foundation:n-2,textcorpus.cooccurrence:corpus:foundation:w-1,textcorpus.collocate:corpus:foundation:beta:w-1,textcorpus.pairwise:corpus:relations,textcorpus.scoring:corpus-tfidf-bm25-smoke,textcorpus.retrieval-index:corpus-tfidf-bm25-smoke:bm25.okapi.k1-1.5.b-0.75,textcorpus.retrieval-index:corpus-retrieval-fielded-smoke:bm25f.k1-1.2.b-0.75.fielded,textcorpus.retrieval-result:corpus-tfidf-bm25-smoke:bm25.okapi.k1-1.5.b-0.75,textcorpus.retrieval-evaluation:corpus-retrieval-fielded-smoke:bm25f.k1-1.2.b-0.75.fielded:k-3,textcorpus.retrieval-calibration:corpus-retrieval-fielded-smoke:bm25f.k1-1.2.b-0.75.fielded:k-3:ndcgAtK,textcorpus.citation-windows:corpus-retrieval-fielded-smoke,textcorpus.quote-grounding:corpus-retrieval-fielded-smoke:doc-a"
) {
  throw new Error(`metric payload export should use deterministic default metric set ids: ${metricSetIds}`);
}

let invalidMetricArtifactRejected = false;
try {
  exportTextCorpusMetricEnvelopePayloadV1({ corpusId: "bad" } as never);
} catch (error) {
  invalidMetricArtifactRejected =
    error instanceof TypeError &&
    error.message === "textcorpus metric envelope payload requires a known TextCorpus artifact";
}
if (!invalidMetricArtifactRejected) {
  throw new Error("metric payload export should reject unknown artifacts");
}

let emptyMetricSetRejected = false;
try {
  exportTextCorpusMetricEnvelopePayloadV1(frequency, { metricSetId: "" });
} catch (error) {
  emptyMetricSetRejected =
    error instanceof TypeError && error.message === "textcorpus metricSetId must be a non-empty string";
}
if (!emptyMetricSetRejected) {
  throw new Error("metric payload export should reject empty metric set ids");
}

let duplicateFieldRejected = false;
try {
  buildTextCorpusRetrievalIndex(fieldedScoringCollection, {
    formula: textCorpusBm25fFormula,
    fields: [
      { id: "title", source: "metadata" },
      { id: "title", source: "tokens" },
    ],
  });
} catch (error) {
  duplicateFieldRejected =
    error instanceof Error && error.message === "duplicate textcorpus retrieval field id: title";
}

if (!duplicateFieldRejected) {
  throw new Error("fielded retrieval should reject duplicate field ids");
}

const largeEntries = Array.from({ length: 128 }, (_, index): TextCorpusEntry => {
  const id = `large-${String(index).padStart(3, "0")}`;
  const hasTarget = index % 17 === 0;
  const tokens = hasTarget ? ["target", "common", `term-${index}`] : ["common", `term-${index}`];
  return {
    id,
    document: createDocument(`doc:${id}`, "r1", tokens.join(" "), tokens),
    viewId: "analysis-view",
    tokenLayerId: "tokens",
    metadata: {
      language: "en",
      group: index % 2 === 0 ? "even" : "odd",
    },
  };
});

const largeCollection = createTextCorpusCollection(largeEntries, {
  corpusId: "corpus-retrieval-large-signal",
});
const largeIndex = buildTextCorpusRetrievalIndex(largeCollection);
const largeResult = searchTextCorpusRetrievalIndex(
  largeIndex,
  [parseTextCorpusQuery("+target group:even", { id: "target-even" })],
  { topK: 4, snippetWindow: 1 },
);

if (largeIndex.documentOrder.length !== 128 || largeIndex.termOrder.length !== 130) {
  throw new Error("large retrieval fixture should preserve all documents and deterministic terms");
}

if (largeResult.results[0]?.hits.map((hit) => hit.docId).join(",") !== "large-000,large-034,large-068,large-102") {
  throw new Error("large retrieval fixture should preserve deterministic topK ordering under filters");
}

const largeFieldedIndex = buildTextCorpusRetrievalIndex(largeCollection, {
  formula: textCorpusBm25fFormula,
  fields: [
    { id: "body", source: "tokens", weight: 1, b: 0.75 },
    { id: "group", source: "metadata", weight: 0.25, b: 0 },
  ],
});
const largeFieldedResult = searchTextCorpusRetrievalIndex(
  largeFieldedIndex,
  [parseTextCorpusQuery("+target group:even", { id: "target-even-fielded" })],
  { topK: 4, snippetWindow: 1 },
);
if (
  largeFieldedResult.results[0]?.hits.map((hit) => hit.docId).join(",") !==
  "large-000,large-034,large-068,large-102"
) {
  throw new Error("large fielded retrieval fixture should preserve deterministic topK ordering");
}

void expectedPackageName;
void expectedSchemaVersion;
void expectedScoringSchemaVersion;
void expectedRetrievalSchemaVersion;
void expectedRetrievalQrelsSchemaVersion;
void expectedRetrievalEvaluationSchemaVersion;
void expectedRetrievalCalibrationSchemaVersion;
