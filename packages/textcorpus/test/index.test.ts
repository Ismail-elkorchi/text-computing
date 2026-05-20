import type { TextDocDocumentV1, TextDocLayer } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusFingerprintIndex,
  buildTextCorpusRetrievalIndex,
  computeTextCorpusScoring,
  createTextCorpusCollection,
  evaluateTextCorpusRetrieval,
  isTextCorpusCollectionV1,
  isTextCorpusFingerprintIndex,
  isTextCorpusParsedQuery,
  isTextCorpusRetrievalEvaluationResultV1,
  isTextCorpusRetrievalIndexV1,
  isTextCorpusRetrievalQrelsV1,
  isTextCorpusRetrievalResultV1,
  isTextCorpusScoringResultV1,
  packageName,
  parseTextCorpusQuery,
  parseTextCorpusRetrievalIndex,
  searchTextCorpusRetrievalIndex,
  stringifyTextCorpusRetrievalIndex,
  sliceTextCorpusByMetadata,
  textCorpusBm25fFormula,
  textCorpusCollectionSchemaVersion,
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

if (scoringResult.documentOrder.join(",") !== "doc-a,doc-b,doc-c,doc-empty") {
  throw new Error("scoring output should preserve deterministic collection document order");
}

if (scoringResult.termOrder.join(",") !== "alpha,beta,delta,gamma") {
  throw new Error("scoring output should expose deterministic lexical term order");
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
