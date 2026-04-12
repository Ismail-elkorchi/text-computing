import {
  isTextDocSpanInRange,
  packageName,
  tokenSentenceAnnotationSchemaVersion,
  type TextDocTokenSentenceAnnotationSet,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textdoc";

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

const firstToken = issueNineAnnotationSet.tokens[0];

if (!firstToken || !isTextDocSpanInRange(firstToken, 26)) {
  throw new Error("token span should fit the source text");
}

if (isTextDocSpanInRange({ startCU: 4, endCU: 3 }, 26)) {
  throw new Error("reversed span should not fit the source text");
}

void expectedPackageName;
void issueNineAnnotationSet;
