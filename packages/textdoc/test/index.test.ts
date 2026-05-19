import {
  documentSchemaVersion,
  exportTextDocDocumentV1ToConllu,
  importConlluToTextDocDocumentV1,
  isTextDocExtensionId,
  isTextDocDocumentV1,
  isTextDocSpanInRange,
  packageName,
  TextDocConlluError,
  textDocExtensionIdPattern,
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
const conlluFixture = [
  "# sent_id = textdoc-conllu-1",
  "# text = They buy books.",
  "1\tThey\tthey\tPRON\tPRP\tCase=Nom|Number=Plur\t2\tnsubj\t2:nsubj\t_",
  "2\tbuy\tbuy\tVERB\tVBP\tNumber=Plur|Person=3|Tense=Pres\t0\troot\t0:root\t_",
  "3\tbooks\tbook\tNOUN\tNNS\tNumber=Plur\t2\tobj\t2:obj\tSpaceAfter=No",
  "4\t.\t.\tPUNCT\t.\t_\t2\tpunct\t2:punct\t_",
].join("\n");
const conlluDocument = importConlluToTextDocDocumentV1(conlluFixture, {
  documentId: "textdoc:test:conllu",
  sourceId: "textdoc-conllu-smoke",
});
const graphFixtureDocument: TextDocDocumentV1 = {
  schemaVersion: documentSchemaVersion,
  documentId: "doc:graph-runtime",
  revision: "2026-05-16",
  textLengthCU: 5,
  text: "Alice",
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
      annotations: [
        {
          id: "token-1",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", startCU: 0, endCU: 5 }],
          text: "Alice",
        },
      ],
    },
    {
      id: "entities",
      kind: "entity",
      viewId: "analysis-view",
      annotations: [
        {
          id: "entity-1",
          kind: "entity",
          label: "PER",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", startCU: 0, endCU: 5 }],
          text: "Alice",
        },
      ],
    },
    {
      id: "relations",
      kind: "relation",
      viewId: "analysis-view",
      annotations: [
        {
          id: "relation-1",
          kind: "relation",
          relationType: "mentions",
          lifecycle: { state: "active" },
          targets: [
            { kind: "annotation", annotationId: "entity-1" },
            { kind: "annotation", annotationId: "token-1" },
          ],
          arguments: [
            { role: "entity", annotationId: "entity-1" },
            { role: "surface", annotationId: "token-1" },
          ],
          confidence: { value: 1, method: "fixture-rule" },
          ambiguitySet: { id: "ambiguity:relation-1", role: "selected", rank: 1 },
        },
      ],
    },
    {
      id: "coreference-mentions",
      kind: "coreference-mention",
      viewId: "analysis-view",
      annotations: [
        {
          id: "mention-1",
          kind: "coreference-mention",
          mentionType: "proper",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "entity-1" }],
          text: "Alice",
        },
      ],
    },
    {
      id: "coreference-chains",
      kind: "coreference-chain",
      viewId: "analysis-view",
      annotations: [
        {
          id: "chain-1",
          kind: "coreference-chain",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "mention-1" }],
          mentionIds: ["mention-1"],
          representativeMentionId: "mention-1",
          documentRefs: [
            {
              documentId: "doc:graph-runtime-source",
              role: "comparison-source",
              sha256: "0".repeat(64),
            },
          ],
        },
      ],
    },
    {
      id: "entity-links",
      kind: "entity-link",
      viewId: "analysis-view",
      annotations: [
        {
          id: "link-1",
          kind: "entity-link",
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "entity-1" }],
          nil: { reason: "fixture-no-kb" },
          loss: [
            {
              kind: "external-reference",
              reason: "Fixture omits external knowledge-base resolution.",
            },
          ],
        },
      ],
    },
  ],
};

const extensionFixtureDocument: TextDocDocumentV1 = {
  ...graphFixtureDocument,
  documentId: "doc:extension-runtime",
  layers: [
    ...graphFixtureDocument.layers,
    {
      id: "extensions",
      kind: "extension",
      viewId: "analysis-view",
      annotations: [
        {
          id: "extension-1",
          kind: "extension",
          extensionId: "urn:ismail-elkorchi:textdoc-extension:demo-note",
          extensionSchema: {
            schemaId: "urn:ismail-elkorchi:textdoc-extension:demo-note:v1",
            schemaVersion: "1",
          },
          lifecycle: { state: "active" },
          targets: [{ kind: "annotation", annotationId: "token-1" }],
          provenance: {
            references: [{ kind: "fixture-policy", id: "textdoc-extension-policy" }],
          },
          confidence: { value: 1, method: "fixture" },
          loss: [
            {
              kind: "external-reference",
              reason: "Extension payload is validated by its declaring package schema.",
            },
          ],
          ambiguitySet: { id: "ambiguity:extension-demo", role: "candidate", rank: 1 },
          documentRefs: [
            {
              documentId: "doc:extension-policy",
              role: "policy-reference",
              sha256: "a".repeat(64),
            },
          ],
          data: {
            label: "demo-note",
          },
        },
      ],
    },
  ],
};

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

if (!isTextDocDocumentV1(graphFixtureDocument)) {
  throw new Error("graph fixture should satisfy the document model runtime guard");
}

if (textDocExtensionIdPattern !== "^[a-z][a-z0-9+.-]*:[^\\s]+$") {
  throw new Error("extension id pattern should remain explicit and stable");
}

if (!isTextDocExtensionId("urn:ismail-elkorchi:textdoc-extension:demo-note")) {
  throw new Error("URI-like extension ids should satisfy the extension id guard");
}

if (isTextDocExtensionId("demo-note")) {
  throw new Error("extension ids should require an explicit scheme prefix");
}

if (!isTextDocDocumentV1(extensionFixtureDocument)) {
  throw new Error("extension annotations should satisfy the document model runtime guard");
}

function cloneExtensionFixture(): TextDocDocumentV1 {
  return structuredClone(extensionFixtureDocument);
}

function mutateExtensionAnnotation(
  document: TextDocDocumentV1,
  mutate: (annotation: Record<string, unknown>) => void,
): TextDocDocumentV1 {
  const annotation = document.layers
    .find((layer) => layer.id === "extensions")
    ?.annotations.find((entry) => entry.id === "extension-1") as
    | Record<string, unknown>
    | undefined;
  if (!annotation) throw new Error("extension fixture annotation should exist");
  mutate(annotation);
  return document;
}

const invalidExtensionCases: readonly [string, (annotation: Record<string, unknown>) => void][] = [
  ["extension id", (annotation) => { annotation.extensionId = "demo-note"; }],
  [
    "target",
    (annotation) => {
      annotation.targets = [{ kind: "annotation", annotationId: "" }];
    },
  ],
  [
    "lifecycle",
    (annotation) => {
      annotation.lifecycle = { state: "archived" };
    },
  ],
  [
    "provenance",
    (annotation) => {
      annotation.provenance = { references: [{ kind: "", id: "textdoc-extension-policy" }] };
    },
  ],
  [
    "confidence",
    (annotation) => {
      annotation.confidence = { value: -0.1, method: "fixture" };
    },
  ],
  [
    "loss",
    (annotation) => {
      annotation.loss = [{ kind: "unknown", reason: "invalid" }];
    },
  ],
  [
    "ambiguity set",
    (annotation) => {
      annotation.ambiguitySet = { id: "ambiguity:extension-demo", role: "maybe" };
    },
  ],
  [
    "external document reference",
    (annotation) => {
      annotation.documentRefs = [
        {
          documentId: "doc:extension-policy",
          role: "policy-reference",
          sha256: "not-a-sha",
        },
      ];
    },
  ],
];

for (const [field, mutate] of invalidExtensionCases) {
  if (isTextDocDocumentV1(mutateExtensionAnnotation(cloneExtensionFixture(), mutate))) {
    throw new Error(`extension annotation should reject invalid ${field}`);
  }
}

const invalidEvidenceDocument = structuredClone(graphFixtureDocument);
const invalidRelation = invalidEvidenceDocument.layers
  .find((layer) => layer.id === "relations")
  ?.annotations.find((annotation) => annotation.id === "relation-1");
if (invalidRelation) {
  (invalidRelation as { confidence?: { value: number; method: string } }).confidence = {
    value: 1.5,
    method: "invalid-fixture",
  };
}

if (isTextDocDocumentV1(invalidEvidenceDocument)) {
  throw new Error("document runtime guard should reject confidence values outside [0, 1]");
}

for (const requiredKind of ["relation", "coreference-mention", "coreference-chain", "entity-link"]) {
  if (!graphFixtureDocument.layers.some((layer) => layer.kind === requiredKind)) {
    throw new Error(`graph fixture should include ${requiredKind} layer`);
  }
}

if (!isTextDocDocumentV1(conlluDocument)) {
  throw new Error("CoNLL-U import should satisfy the document model shape");
}

if (exportTextDocDocumentV1ToConllu(conlluDocument) !== conlluFixture) {
  throw new Error("CoNLL-U export should preserve the fixture text");
}

if (!conlluDocument.layers.some((layer) => layer.kind === "dependency")) {
  throw new Error("CoNLL-U import should create a dependency layer");
}

let invalidConlluRejected = false;
try {
  importConlluToTextDocDocumentV1("1\tToo\tfew\tfields");
} catch (error) {
  invalidConlluRejected = error instanceof TextDocConlluError && error.code === "field-count";
}

if (!invalidConlluRejected) {
  throw new Error("CoNLL-U import should reject malformed rows with a stable code");
}

void expectedPackageName;
void expectedPayloadKind;
