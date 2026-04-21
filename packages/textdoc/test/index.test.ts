import {
  documentSchemaVersion,
  isTextDocDocumentV1,
  isTextDocSpanInRange,
  packageName,
  textDocDocumentPayloadKind,
  toTextDocDocumentV1,
  tokenSentenceAnnotationSchemaVersion,
  type TextDocDocumentV1,
  type TextDocTokenSentenceAnnotationSet,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textdoc";
const expectedPayloadKind: typeof textDocDocumentPayloadKind = "textdoc-document";

const issueNineAnnotationSet: TextDocTokenSentenceAnnotationSet = {
  schemaVersion: tokenSentenceAnnotationSchemaVersion,
  documentId: "tokenization-sbd:ascii-two-sentences",
  source: {
    id: "ascii-two-sentences",
    sha256: "cf65635c2ba9d5e488d6e718d0f5ca156a759bb14951fbaac37879529b4f0666",
  },
  unicodeVersion: "17.0.0",
  units: {
    text: "utf16-code-unit",
  },
  tokens: [
    {
      id: "token-1",
      kind: "uax29-word-boundary-token",
      startCU: 0,
      endCU: 5,
      text: "Hello",
    },
  ],
  sentences: [
    {
      id: "sentence-1",
      kind: "uax29-sentence",
      startCU: 0,
      endCU: 13,
      text: "Hello world. ",
    },
  ],
};

const convertedDocument = toTextDocDocumentV1(issueNineAnnotationSet);

const issueElevenDocument: TextDocDocumentV1 = {
  schemaVersion: documentSchemaVersion,
  documentId: "doc:annotation-model",
  revision: "2026-04-21",
  textLengthCU: 31,
  text: "New York hosts example corpora.",
  source: {
    id: "fixture:textdoc:annotation-model",
    sha256: "1111111111111111111111111111111111111111111111111111111111111111",
  },
  unicodeVersion: "17.0.0",
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
      id: "layer-corpus-feature",
      kind: "corpus-feature",
      viewId: "analysis-view",
      annotations: [
        {
          id: "corpus-1",
          kind: "corpus-feature",
          lifecycle: {
            state: "active",
          },
          targets: [{ kind: "document" }],
          featureName: "bm25-length-normalization",
          formula: "bm25",
          numericValue: 1.4,
        },
      ],
    },
  ],
};

const firstToken = issueNineAnnotationSet.tokens[0];
const convertedTokenLayer = convertedDocument.layers[0];

if (!firstToken || !isTextDocSpanInRange(firstToken, 26)) {
  throw new Error("token span should fit the source text");
}

if (isTextDocSpanInRange({ startCU: 4, endCU: 3 }, 26)) {
  throw new Error("reversed span should not fit the source text");
}

if (convertedDocument.schemaVersion !== documentSchemaVersion) {
  throw new Error("converted document should use the document schema version");
}

if (!convertedTokenLayer || convertedTokenLayer.kind !== "token") {
  throw new Error("token conversion should preserve the token layer");
}

if (!isTextDocDocumentV1(convertedDocument)) {
  throw new Error("converted token/sentence annotation set should satisfy the document model shape");
}

if (!isTextDocDocumentV1(issueElevenDocument)) {
  throw new Error("issue #11 document example should satisfy the document model shape");
}

void expectedPackageName;
void expectedPayloadKind;
