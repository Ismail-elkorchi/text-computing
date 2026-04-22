import type { TextDocDocumentV1, TextDocLayer } from "@ismail-elkorchi/textdoc";
import {
  buildTextCorpusFingerprintIndex,
  createTextCorpusCollection,
  isTextCorpusCollectionV1,
  isTextCorpusFingerprintIndex,
  packageName,
  sliceTextCorpusByMetadata,
  textCorpusCollectionSchemaVersion,
  type TextCorpusEntry,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textcorpus";
const expectedSchemaVersion: typeof textCorpusCollectionSchemaVersion = 1;

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

void expectedPackageName;
void expectedSchemaVersion;
