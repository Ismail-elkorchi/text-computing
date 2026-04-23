import type { TextDocDocumentV1, TextDocLayer } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusFingerprintIndex,
  computeTextCorpusScoring,
  createTextCorpusCollection,
  isTextCorpusCollectionV1,
  isTextCorpusFingerprintIndex,
  isTextCorpusScoringResultV1,
  packageName,
  sliceTextCorpusByMetadata,
  textCorpusCollectionSchemaVersion,
  textCorpusScoringSchemaVersion,
  type TextCorpusEntry,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textcorpus";
const expectedSchemaVersion: typeof textCorpusCollectionSchemaVersion = 1;
const expectedScoringSchemaVersion: typeof textCorpusScoringSchemaVersion = 1;

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
        kind: "source",
      },
      {
        id: "analysis-view",
        kind: "analysis",
        derivedFrom: ["source-view"],
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

void expectedPackageName;
void expectedSchemaVersion;
void expectedScoringSchemaVersion;
