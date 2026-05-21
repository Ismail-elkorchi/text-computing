import {
  createTextDocDocumentFromText,
  createTextDocDocumentFromTextSync,
  createTextDocDocumentsFromTexts,
  createTextDocDocumentsFromTextsSync,
  addTextDocLayerV1,
  addTextDocSpanMapV1,
  addTextDocViewV1,
  applyTextDocAnnotationBundlePayloadV1,
  documentSchemaVersion,
  exportTextDocAnnotationBundlePayloadV1,
  exportTextDocDocumentV1ToConllu,
  importConlluToTextDocDocumentV1,
  isTextDocAnnotationBundlePayloadV1,
  isTextDocExtensionId,
  isTextDocDocumentV1,
  isTextDocSpanInRange,
  packageName,
  queryTextDocAnnotations,
  retractTextDocAnnotationV1,
  supersedeTextDocAnnotationV1,
  TextDocConlluError,
  TextDocRevisionError,
  textDocExtensionIdPattern,
  textDocDocumentPayloadKind,
  toTextDocDocumentV1,
  tokenSentenceAnnotationSchemaVersion,
  validateTextDocDocumentV1,
  type TextDocDocumentV1,
  type TextDocTokenSentenceAnnotationSet,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textdoc";
const expectedPayloadKind: typeof textDocDocumentPayloadKind = "textdoc-document-v1";

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
const rawText = "Hello world. Bye.";
const rawTextDocumentResult = createTextDocDocumentFromTextSync(rawText, {
  documentId: "doc:raw-text-sync",
  sourceId: "source:raw-text-sync",
  sourceSha256: "0".repeat(64),
});
const rawTextDocument = rawTextDocumentResult.document;
const asyncRawTextDocumentResult = await createTextDocDocumentFromText(rawText, {
  documentId: "doc:raw-text-async",
  sourceId: "source:raw-text-async",
});
const malformedRawTextDocumentResult = createTextDocDocumentFromTextSync("bad \uD800 text", {
  documentId: "doc:raw-text-malformed",
});
const batchRawTextDocuments = createTextDocDocumentsFromTextsSync([
  {
    documentId: "doc:raw-text-batch-1",
    text: "One.",
  },
  {
    documentId: "doc:raw-text-batch-2",
    text: "Two.",
    includeText: false,
  },
]);
const asyncBatchRawTextDocuments = await createTextDocDocumentsFromTexts([
  {
    documentId: "doc:raw-text-async-batch-1",
    text: "Three.",
  },
]);
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
      segments: [
        {
          source: { startCU: 0, endCU: 5 },
          target: { startCU: 0, endCU: 5 },
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
      annotations: [
        {
          id: "token-1",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 5 }],
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
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 5 }],
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
          provenance: {
            references: [{ kind: "fixture", id: "graph-runtime" }],
          },
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
      segments: [
        {
          source: { startCU: 0, endCU: 31 },
          target: { startCU: 0, endCU: 31 },
          kind: "unchanged",
          reversible: true,
        },
      ],
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

if (!isTextDocDocumentV1(rawTextDocument)) {
  throw new Error("raw-text sync document should satisfy the document model shape");
}

if (!validateTextDocDocumentV1(rawTextDocument).ok) {
  throw new Error("raw-text sync document should pass reference validation");
}

if (rawTextDocument.text !== rawText || rawTextDocument.textLengthCU !== rawText.length) {
  throw new Error("raw-text sync document should preserve source text and UTF-16 length");
}

if (rawTextDocument.source?.sha256 !== "0".repeat(64)) {
  throw new Error("raw-text sync document should preserve caller-provided source digest");
}

const rawTokenLayer = rawTextDocument.layers.find((layer) => layer.kind === "token");
const rawSentenceLayer = rawTextDocument.layers.find((layer) => layer.kind === "sentence");
if (
  rawTokenLayer === undefined ||
  rawTokenLayer.annotations.map((annotation) => ("text" in annotation ? annotation.text : undefined)).join("|") !==
    "Hello| |world|.| |Bye|."
) {
  throw new Error("raw-text sync document should expose textfacts UAX #29 word-boundary tokens");
}

if (
  rawSentenceLayer === undefined ||
  rawSentenceLayer.annotations.map((annotation) => ("text" in annotation ? annotation.text : undefined)).join("|") !==
    "Hello world. |Bye."
) {
  throw new Error("raw-text sync document should expose textfacts UAX #29 sentences");
}

if (!isTextDocDocumentV1(asyncRawTextDocumentResult.document)) {
  throw new Error("raw-text async document should satisfy the document model shape");
}

if (!/^[a-f0-9]{64}$/u.test(asyncRawTextDocumentResult.document.source?.sha256 ?? "")) {
  throw new Error("raw-text async document should compute a source SHA-256 digest");
}

if (
  malformedRawTextDocumentResult.diagnostics.length !== 1 ||
  malformedRawTextDocumentResult.diagnostics[0]?.code !== "textdoc.raw-text.lone-surrogate"
) {
  throw new Error("raw-text malformed input should return a lone-surrogate diagnostic");
}

if (
  batchRawTextDocuments.length !== 2 ||
  batchRawTextDocuments[0]?.document.documentId !== "doc:raw-text-batch-1" ||
  batchRawTextDocuments[1]?.document.text !== undefined ||
  asyncBatchRawTextDocuments.length !== 1 ||
  asyncBatchRawTextDocuments[0]?.document.documentId !== "doc:raw-text-async-batch-1"
) {
  throw new Error("raw-text batch helpers should produce deterministic document results");
}

if (!isTextDocDocumentV1(issueElevenDocument)) {
  throw new Error("issue #11 document example should satisfy the document model shape");
}

if (!isTextDocDocumentV1(graphFixtureDocument)) {
  throw new Error("graph fixture should satisfy the document model runtime guard");
}

const graphValidation = validateTextDocDocumentV1(graphFixtureDocument);
if (!graphValidation.ok || graphValidation.diagnostics.length !== 0) {
  throw new Error("graph fixture should satisfy package-level reference validation");
}

const annotationBundlePayload = exportTextDocAnnotationBundlePayloadV1(graphFixtureDocument);
if (!isTextDocAnnotationBundlePayloadV1(annotationBundlePayload)) {
  throw new Error("exportTextDocAnnotationBundlePayloadV1 should produce a runtime-valid payload");
}

const graphAnnotationCount = graphFixtureDocument.layers.reduce(
  (count, layer) => count + layer.annotations.length,
  0,
);
if (
  annotationBundlePayload.documentId !== graphFixtureDocument.documentId ||
  annotationBundlePayload.documentRevision !== graphFixtureDocument.revision ||
  annotationBundlePayload.annotations.length !== graphAnnotationCount
) {
  throw new Error("annotation bundle payload should preserve document identity and annotation count");
}

const graphSkeletonDocument: TextDocDocumentV1 = {
  ...graphFixtureDocument,
  layers: graphFixtureDocument.layers.map((layer) => ({ ...layer, annotations: [] })),
};
const annotationBundleRoundTrip = applyTextDocAnnotationBundlePayloadV1(
  graphSkeletonDocument,
  annotationBundlePayload,
);
if (
  !annotationBundleRoundTrip.ok ||
  JSON.stringify(annotationBundleRoundTrip.document?.layers) !== JSON.stringify(graphFixtureDocument.layers)
) {
  throw new Error("annotation bundle payload should restore layer and annotation order without loss");
}

const firstBundleAnnotation = annotationBundlePayload.annotations[0];
if (firstBundleAnnotation === undefined) {
  throw new Error("annotation bundle payload should include at least one annotation");
}

const duplicateAnnotationBundle = {
  ...annotationBundlePayload,
  annotations: [...annotationBundlePayload.annotations, firstBundleAnnotation],
};
if (
  !applyTextDocAnnotationBundlePayloadV1(graphSkeletonDocument, duplicateAnnotationBundle)
    .diagnostics.some((entry) => entry.code === "textdoc.annotation-bundle.annotation-duplicate")
) {
  throw new Error("annotation bundle import should reject duplicate annotation ids");
}

const targetMismatchBundle = {
  ...annotationBundlePayload,
  annotations: [
    {
      ...firstBundleAnnotation,
      target: { kind: "document" as const },
    },
    ...annotationBundlePayload.annotations.slice(1),
  ],
};
if (
  !applyTextDocAnnotationBundlePayloadV1(graphSkeletonDocument, targetMismatchBundle)
    .diagnostics.some((entry) => entry.code === "textdoc.annotation-bundle.target-mismatch")
) {
  throw new Error("annotation bundle import should reject representative target drift");
}

const tokenQuery = queryTextDocAnnotations(graphFixtureDocument, {
  kind: "token",
  spanOverlap: { viewId: "analysis-view", startCU: 0, endCU: 1 },
});
if (tokenQuery.length !== 1 || tokenQuery[0]?.annotation.id !== "token-1") {
  throw new Error("queryTextDocAnnotations should return deterministic token span matches");
}

const shuffledQueryDocument: TextDocDocumentV1 = {
  ...graphFixtureDocument,
  layers: [...graphFixtureDocument.layers].reverse(),
};
const stableQueryIds = queryTextDocAnnotations(shuffledQueryDocument).map((entry) => entry.annotation.id);
if (stableQueryIds[0] !== "chain-1" || stableQueryIds.at(-1) !== "token-1") {
  throw new Error("queryTextDocAnnotations should sort results deterministically");
}

const retractedDocument = retractTextDocAnnotationV1(
  graphFixtureDocument,
  "entity-1",
  "fixture retraction",
  { expectedRevision: graphFixtureDocument.revision, revision: "2026-05-16+1" },
);
if (
  retractedDocument.revision !== "2026-05-16+1" ||
  queryTextDocAnnotations(retractedDocument, { kind: "entity" }).length !== 0 ||
  queryTextDocAnnotations(retractedDocument, {
    kind: "entity",
    lifecycleStates: ["retracted"],
  })[0]?.annotation.id !== "entity-1"
) {
  throw new Error("retractTextDocAnnotationV1 should update revision and hide retracted annotations by default");
}

let staleRevisionRejected = false;
try {
  addTextDocLayerV1(
    graphFixtureDocument,
    {
      id: "unused-layer",
      kind: "extension",
      viewId: "analysis-view",
      annotations: [],
    },
    { expectedRevision: "stale" },
  );
} catch (error) {
  staleRevisionRejected =
    error instanceof TextDocRevisionError &&
    error.code === "textdoc.revision.expected-mismatch";
}
if (!staleRevisionRejected) {
  throw new Error("revision-visible operations should reject stale expected revisions");
}

const supersededDocument = supersedeTextDocAnnotationV1(
  graphFixtureDocument,
  "tokens",
  "token-1",
  {
    id: "token-1-replacement",
    kind: "token",
    tokenKind: "lexical-token",
    lifecycle: { state: "active" },
    targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 5 }],
    text: "Alice",
  },
  "fixture replacement",
  { revision: "2026-05-16+1" },
);
const supersededValidation = validateTextDocDocumentV1(supersededDocument);
if (!supersededValidation.ok) {
  throw new Error("supersedeTextDocAnnotationV1 should preserve lifecycle link integrity");
}

const normalizedViewDocument = addTextDocSpanMapV1(
  addTextDocViewV1(
    graphFixtureDocument,
    {
      id: "normalized-view",
      kind: "normalized",
      parentViewId: "source-view",
      spanMapIds: ["span-map-source-normalized"],
      loss: [
        {
          kind: "lossy-normalization",
          reason: "fixture normalization map is identity for runtime validation",
          source: "fixture",
        },
      ],
    },
    { revision: "2026-05-16+1" },
  ),
  {
    id: "span-map-source-normalized",
    sourceViewId: "source-view",
    targetViewId: "normalized-view",
    lifecycle: { state: "active" },
    segments: [
      {
        source: { startCU: 0, endCU: 5 },
        target: { startCU: 0, endCU: 5 },
        kind: "unchanged",
        reversible: true,
      },
    ],
  },
  { expectedRevision: "2026-05-16+1", revision: "2026-05-16+2" },
);
if (!validateTextDocDocumentV1(normalizedViewDocument).ok) {
  throw new Error("view and span-map operations should create a valid derived-view document");
}

const invalidatedSpanMapDocument = structuredClone(graphFixtureDocument);
const firstSpanMap = invalidatedSpanMapDocument.spanMaps?.[0];
if (firstSpanMap === undefined) {
  throw new Error("graph fixture should contain a span map");
}
(firstSpanMap as { lifecycle: typeof firstSpanMap.lifecycle }).lifecycle = {
  state: "invalidated",
  reason: "fixture invalidation",
};
const invalidatedSpanMapResult = validateTextDocDocumentV1(invalidatedSpanMapDocument);
if (
  invalidatedSpanMapResult.ok ||
  !invalidatedSpanMapResult.diagnostics.some(
    (entry) => entry.code === "textdoc.span-target-inactive-span-map",
  )
) {
  throw new Error("document validation should reject active annotations on invalidated span maps");
}

const parentCycleDocument = structuredClone(graphFixtureDocument);
(parentCycleDocument.views[0] as { parentViewId?: string }).parentViewId = "analysis-view";
const parentCycleResult = validateTextDocDocumentV1(parentCycleDocument);
if (
  parentCycleResult.ok ||
  !parentCycleResult.diagnostics.some((entry) => entry.code === "textdoc.view-parent-cycle")
) {
  throw new Error("document validation should reject parent-view cycles");
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

if (!validateTextDocDocumentV1(conlluDocument).ok) {
  throw new Error("CoNLL-U import should satisfy package-level reference validation");
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

const invalidLayerViewDocument = structuredClone(graphFixtureDocument);
const firstInvalidLayerViewLayer = invalidLayerViewDocument.layers[0];
if (firstInvalidLayerViewLayer === undefined) {
  throw new Error("graph fixture should contain a layer for invalid layer view test");
}
(invalidLayerViewDocument as { layers: TextDocDocumentV1["layers"] }).layers = [
  {
    ...firstInvalidLayerViewLayer,
    viewId: "missing-view",
  },
  ...invalidLayerViewDocument.layers.slice(1),
];
const invalidLayerViewResult = validateTextDocDocumentV1(invalidLayerViewDocument);
if (
  invalidLayerViewResult.ok ||
  !invalidLayerViewResult.diagnostics.some((entry) => entry.code === "textdoc.layer-view-missing")
) {
  throw new Error("document validation should reject missing layer view references");
}

const invalidAnnotationTargetDocument = structuredClone(graphFixtureDocument);
const invalidRelationLayer = invalidAnnotationTargetDocument.layers.find((layer) => layer.id === "relations");
const invalidRelationAnnotation = invalidRelationLayer?.annotations[0];
if (invalidRelationAnnotation?.kind !== "relation") {
  throw new Error("relation fixture should exist for invalid-reference test");
}
(invalidRelationAnnotation as { targets: typeof invalidRelationAnnotation.targets }).targets = [
  { kind: "annotation", annotationId: "missing-entity" },
];
const invalidAnnotationTargetResult = validateTextDocDocumentV1(invalidAnnotationTargetDocument);
if (
  invalidAnnotationTargetResult.ok ||
  !invalidAnnotationTargetResult.diagnostics.some((entry) => entry.code === "textdoc.annotation-target-missing")
) {
  throw new Error("document validation should reject missing annotation targets");
}

const invalidRelationArgumentDocument = structuredClone(graphFixtureDocument);
const missingArgumentRelation = invalidRelationArgumentDocument.layers
  .find((layer) => layer.id === "relations")
  ?.annotations.find((annotation) => annotation.id === "relation-1");
if (missingArgumentRelation?.kind !== "relation") {
  throw new Error("relation fixture should exist for missing argument test");
}
(missingArgumentRelation as { arguments: typeof missingArgumentRelation.arguments }).arguments = [
  { role: "entity", annotationId: "missing-argument" },
  { role: "surface", annotationId: "token-1" },
];
const invalidRelationArgumentResult = validateTextDocDocumentV1(invalidRelationArgumentDocument);
if (
  invalidRelationArgumentResult.ok ||
  !invalidRelationArgumentResult.diagnostics.some((entry) => entry.code === "textdoc.relation-argument-missing")
) {
  throw new Error("document validation should reject missing relation argument annotations");
}

const duplicateAnnotationDocument = structuredClone(graphFixtureDocument);
const duplicateEntityLayer = duplicateAnnotationDocument.layers.find((layer) => layer.id === "entities");
if (!duplicateEntityLayer) throw new Error("entity layer should exist for duplicate test");
const firstDuplicateAnnotation = duplicateEntityLayer.annotations[0];
if (firstDuplicateAnnotation === undefined) {
  throw new Error("entity layer should contain an annotation for duplicate test");
}
(duplicateEntityLayer as { annotations: typeof duplicateEntityLayer.annotations }).annotations = [
  ...duplicateEntityLayer.annotations,
  firstDuplicateAnnotation,
];
const duplicateAnnotationResult = validateTextDocDocumentV1(duplicateAnnotationDocument);
if (
  duplicateAnnotationResult.ok ||
  !duplicateAnnotationResult.diagnostics.some((entry) => entry.code === "textdoc.annotation-duplicate")
) {
  throw new Error("document validation should reject duplicate annotation ids");
}

const invalidLifecycleDocument = structuredClone(graphFixtureDocument);
const selfSupersedingRelation = invalidLifecycleDocument.layers
  .find((layer) => layer.id === "relations")
  ?.annotations.find((annotation) => annotation.id === "relation-1");
if (selfSupersedingRelation === undefined) {
  throw new Error("relation fixture should exist for lifecycle self-reference test");
}
(selfSupersedingRelation as { lifecycle: typeof selfSupersedingRelation.lifecycle }).lifecycle = {
  state: "active",
  supersedes: ["relation-1"],
};
const invalidLifecycleResult = validateTextDocDocumentV1(invalidLifecycleDocument);
if (
  invalidLifecycleResult.ok ||
  !invalidLifecycleResult.diagnostics.some((entry) => entry.code === "textdoc.lifecycle-self-reference")
) {
  throw new Error("document validation should reject lifecycle self references");
}

const invalidRelationSelfArgumentDocument = structuredClone(graphFixtureDocument);
const selfArgumentRelation = invalidRelationSelfArgumentDocument.layers
  .find((layer) => layer.id === "relations")
  ?.annotations.find((annotation) => annotation.id === "relation-1");
if (selfArgumentRelation?.kind !== "relation") {
  throw new Error("relation fixture should exist for self-argument test");
}
(selfArgumentRelation as { arguments: typeof selfArgumentRelation.arguments }).arguments = [
  { role: "self", annotationId: "relation-1" },
  { role: "surface", annotationId: "token-1" },
];
const invalidRelationSelfArgumentResult = validateTextDocDocumentV1(invalidRelationSelfArgumentDocument);
if (
  invalidRelationSelfArgumentResult.ok ||
  !invalidRelationSelfArgumentResult.diagnostics.some((entry) => entry.code === "textdoc.relation-argument-self")
) {
  throw new Error("document validation should reject relation self arguments");
}

const duplicateMentionDocument = structuredClone(graphFixtureDocument);
const duplicateMentionChain = duplicateMentionDocument.layers
  .find((layer) => layer.id === "coreference-chains")
  ?.annotations.find((annotation) => annotation.id === "chain-1");
if (duplicateMentionChain?.kind !== "coreference-chain") {
  throw new Error("coreference chain fixture should exist for duplicate mention test");
}
(duplicateMentionChain as { mentionIds: typeof duplicateMentionChain.mentionIds }).mentionIds = [
  "mention-1",
  "mention-1",
];
const duplicateMentionResult = validateTextDocDocumentV1(duplicateMentionDocument);
if (
  duplicateMentionResult.ok ||
  !duplicateMentionResult.diagnostics.some((entry) => entry.code === "textdoc.coreference-mention-duplicate")
) {
  throw new Error("document validation should reject duplicate coreference mentions");
}

const representativeOutsideChainDocument = structuredClone(graphFixtureDocument);
const representativeOutsideChain = representativeOutsideChainDocument.layers
  .find((layer) => layer.id === "coreference-chains")
  ?.annotations.find((annotation) => annotation.id === "chain-1");
if (representativeOutsideChain?.kind !== "coreference-chain") {
  throw new Error("coreference chain fixture should exist for representative membership test");
}
(representativeOutsideChain as { representativeMentionId: string }).representativeMentionId = "entity-1";
const representativeOutsideChainResult = validateTextDocDocumentV1(representativeOutsideChainDocument);
if (
  representativeOutsideChainResult.ok ||
  !representativeOutsideChainResult.diagnostics.some(
    (entry) => entry.code === "textdoc.coreference-representative-outside-chain",
  ) ||
  !representativeOutsideChainResult.diagnostics.some(
    (entry) => entry.code === "textdoc.coreference-representative-kind",
  )
) {
  throw new Error("document validation should reject invalid coreference representatives");
}

function firstDependencyAnnotation(document: TextDocDocumentV1) {
  const annotation = document.layers
    .find((layer) => layer.kind === "dependency")
    ?.annotations.find((entry) => entry.kind === "dependency");
  if (annotation?.kind !== "dependency") {
    throw new Error("CoNLL-U fixture should contain a dependency annotation");
  }
  return annotation;
}

function firstDependencyNodeAnnotation(document: TextDocDocumentV1, annotationId: string) {
  const annotation = document.layers
    .find((layer) => layer.kind === "dependency-node")
    ?.annotations.find((entry) => entry.id === annotationId);
  if (annotation?.kind !== "dependency-node") {
    throw new Error(`CoNLL-U fixture should contain dependency node ${annotationId}`);
  }
  return annotation;
}

const dependencySelfLoopDocument = structuredClone(conlluDocument);
const selfLoopDependency = firstDependencyAnnotation(dependencySelfLoopDocument);
(selfLoopDependency as { headNodeId: string }).headNodeId = selfLoopDependency.dependentNodeId;
const dependencySelfLoopResult = validateTextDocDocumentV1(dependencySelfLoopDocument);
if (
  dependencySelfLoopResult.ok ||
  !dependencySelfLoopResult.diagnostics.some((entry) => entry.code === "textdoc.dependency-self-loop")
) {
  throw new Error("document validation should reject dependency self loops");
}

const dependencyKindDocument = structuredClone(conlluDocument);
const kindMismatchDependency = firstDependencyAnnotation(dependencyKindDocument);
(kindMismatchDependency as { dependentNodeId: string }).dependentNodeId = "textdoc-conllu-1:sentence";
const dependencyKindResult = validateTextDocDocumentV1(dependencyKindDocument);
if (
  dependencyKindResult.ok ||
  !dependencyKindResult.diagnostics.some((entry) => entry.code === "textdoc.dependency-dependent-kind")
) {
  throw new Error("document validation should reject non-node dependency references");
}

const dependencySourceSentenceDocument = structuredClone(conlluDocument);
const sourceMismatchDependency = firstDependencyAnnotation(dependencySourceSentenceDocument);
(sourceMismatchDependency as { source: typeof sourceMismatchDependency.source }).source = {
  ...sourceMismatchDependency.source,
  sentenceId: "other-sentence",
};
const dependencySourceSentenceResult = validateTextDocDocumentV1(dependencySourceSentenceDocument);
if (
  dependencySourceSentenceResult.ok ||
  !dependencySourceSentenceResult.diagnostics.some(
    (entry) => entry.code === "textdoc.dependency-source-sentence-mismatch",
  )
) {
  throw new Error("document validation should reject dependency source sentence mismatches");
}

const dependencyHeadSentenceDocument = structuredClone(conlluDocument);
const headSentenceMismatchDependency = firstDependencyAnnotation(dependencyHeadSentenceDocument);
if (headSentenceMismatchDependency.headNodeId === null) {
  throw new Error("CoNLL-U fixture should include a non-root dependency for head sentence test");
}
const headSentenceMismatchNode = firstDependencyNodeAnnotation(
  dependencyHeadSentenceDocument,
  headSentenceMismatchDependency.headNodeId,
);
(headSentenceMismatchNode as { sentenceId: string }).sentenceId = "other-sentence";
const dependencyHeadSentenceResult = validateTextDocDocumentV1(dependencyHeadSentenceDocument);
if (
  dependencyHeadSentenceResult.ok ||
  !dependencyHeadSentenceResult.diagnostics.some(
    (entry) => entry.code === "textdoc.dependency-head-sentence-mismatch",
  )
) {
  throw new Error("document validation should reject cross-sentence dependency heads");
}

void expectedPackageName;
void expectedPayloadKind;
