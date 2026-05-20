import { loadTextPackResources } from "@ismail-elkorchi/textpack";
import { isTextConformanceReportV1 } from "@ismail-elkorchi/textconformance";
import {
  isTextDocDocumentV1,
  type TextDocCoreferenceChainAnnotation,
  type TextDocCoreferenceMentionAnnotation,
  type TextDocDependencyAnnotation,
  type TextDocDocumentV1,
  type TextDocEntityAnnotation,
  type TextDocPosAnnotation,
  type TextDocRelationAnnotation,
} from "@ismail-elkorchi/textdoc";
import { isTextProtocolResultEnvelopeV1 } from "@ismail-elkorchi/textprotocol";
import {
  applyTextRulesCoreferenceRules,
  applyTextRulesDependencyRules,
  analyzePosMorphLemmaDocument,
  applyTextRulesRelationRules,
  analyzeCoreference,
  analyzeRelationExtraction,
  analyzeRuleBackedNer,
  analyzePosMorphLemma,
  analyzeDependencyParser,
  createCoreferenceConformanceReport,
  createCoreferenceResultEnvelope,
  createDependencyParserConformanceReport,
  createDependencyParserResultEnvelope,
  createRelationExtractionConformanceReport,
  createRelationExtractionResultEnvelope,
  createRuleBackedNerConformanceReport,
  createRuleBackedNerResultEnvelope,
  createTextRulesEntityResourcesFromLoadedPack,
  createTextRulesEntityResource,
  createPosMorphLemmaConformanceReport,
  createPosMorphLemmaResultEnvelope,
  createTextRulesLexiconResourcesFromLoadedPack,
  createTextRulesLexiconResource,
  matchTextDocTokenPattern,
  matchTextRulesTokenPattern,
  matchTextRulesTokenPatterns,
  packageName,
  rewriteTextRulesTokenTexts,
  textRulesTokenSpansFromTextDoc,
  tokenizeTextRulesFixtureText,
  tokenizeTextRulesText,
  type TextRulesEntityResourceData,
  type TextRulesLexiconResourceData,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textrules";

const primitiveTokens = tokenizeTextRulesFixtureText("New York courts sign.");
if (tokenizeTextRulesText("New York courts sign.").length !== primitiveTokens.length) {
  throw new Error("legacy raw-text tokenizer should remain a compatibility alias for fixture tokenization");
}
const placePattern = {
  ruleId: "primitive:place:new-york",
  atoms: [
    { kind: "literal", value: "new", capture: "city-prefix" },
    { kind: "literal", value: "york", capture: "city-suffix" },
  ],
} as const;

const placeMatches = matchTextRulesTokenPattern(primitiveTokens, placePattern);
if (
  placeMatches.length !== 1 ||
  placeMatches[0]?.text !== "New York" ||
  placeMatches[0].captures.map((capture) => capture.value).join(",") !== "New,York"
) {
  throw new Error("primitive token-pattern matching should preserve deterministic captures");
}

const primitiveMatches = matchTextRulesTokenPatterns(primitiveTokens, [
  {
    ruleId: "primitive:any-court",
    atoms: [
      { kind: "any", capture: "modifier" },
      { kind: "one-of", values: ["court", "courts"], capture: "head" },
    ],
  },
  placePattern,
]);
if (primitiveMatches.map((match) => match.ruleId).join(",") !==
  "primitive:place:new-york,primitive:any-court") {
  throw new Error("primitive matches should sort by start offset, length, and rule id");
}

const textdocPatternDocument: TextDocDocumentV1 = {
  schemaVersion: 1,
  documentId: "textrules:textdoc-token-pattern",
  revision: "fixture",
  textLengthCU: 21,
  text: "New York courts sign.",
  units: { text: "utf16-code-unit" },
  views: [
    { id: "source-view", kind: "raw" },
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
          source: { startCU: 0, endCU: 21 },
          target: { startCU: 0, endCU: 21 },
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
          id: "doc-token-1",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 3 }],
          text: "New",
        },
        {
          id: "doc-token-2",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 4, endCU: 8 }],
          text: "York",
        },
        {
          id: "doc-token-3",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 9, endCU: 15 }],
          text: "courts",
        },
        {
          id: "doc-token-4",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 16, endCU: 20 }],
          text: "sign",
        },
        {
          id: "doc-token-5",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 20, endCU: 21 }],
          text: ".",
        },
      ],
    },
  ],
};
if (textRulesTokenSpansFromTextDoc(textdocPatternDocument).map((token) => token.id).join(",") !==
  "doc-token-1,doc-token-2,doc-token-3,doc-token-4,doc-token-5") {
  throw new Error("textdoc token extraction should preserve deterministic token order");
}
const textdocPlaceMatches = matchTextDocTokenPattern({
  document: textdocPatternDocument,
  pattern: placePattern,
});
if (
  textdocPlaceMatches.length !== 1 ||
  textdocPlaceMatches[0]?.captures.map((capture) => capture.tokenId).join(",") !== "doc-token-1,doc-token-2"
) {
  throw new Error("textdoc token-pattern matching should consume existing token annotations");
}

const primitiveRewrite = rewriteTextRulesTokenTexts(primitiveTokens, [
  {
    ruleId: "primitive:rewrite:new-york",
    pattern: placePattern,
    replacement: ["NYC"],
  },
  {
    ruleId: "primitive:rewrite:courts",
    pattern: {
      ruleId: "primitive:match:courts",
      atoms: [{ kind: "literal", value: "courts" }],
    },
    replacement: ["court"],
  },
]);
if (primitiveRewrite.tokens.join(" ") !== "NYC court sign .") {
  throw new Error("primitive token rewrites should apply left-to-right without hidden state");
}

const primitiveDependencyTokens = tokenizeTextRulesText("Cats chase mice.");
const primitiveDependencySpecs = applyTextRulesDependencyRules(primitiveDependencyTokens, "en", [
  {
    ruleId: "test-dependency:transitive",
    language: "en",
    pattern: {
      ruleId: "test-dependency-pattern:transitive",
      atoms: [
        { kind: "literal", value: "Cats", capture: "subject" },
        { kind: "literal", value: "chase", capture: "root" },
        { kind: "literal", value: "mice", capture: "object" },
        { kind: "literal", value: ".", capture: "punct" },
      ],
    },
    nodes: [
      { id: "1", form: "Cats", targetCapture: "subject", head: "2", relation: "nsubj" },
      { id: "2", form: "chase", targetCapture: "root", head: "0", relation: "root" },
      { id: "3", form: "mice", targetCapture: "object", head: "2", relation: "obj" },
      { id: "4", form: ".", targetCapture: "punct", head: "2", relation: "punct" },
    ],
  },
]);
if (
  primitiveDependencySpecs.map((spec) => `${spec.id}:${spec.targetTokenId}:${spec.head}:${spec.relation}`).join(",") !==
  "1:token-1:2:nsubj,2:token-2:0:root,3:token-3:2:obj,4:token-4:2:punct"
) {
  throw new Error("dependency rules should map capture-backed node templates to token ids");
}

const primitiveRelationTokens = tokenizeTextRulesText("Alice knows Bob.");
const primitiveRelationSpecs = applyTextRulesRelationRules("Alice knows Bob.", primitiveRelationTokens, "en", [
  {
    ruleId: "test-relation:knows",
    language: "en",
    label: "employed-by",
    pattern: {
      ruleId: "test-relation-pattern:knows",
      atoms: [
        { kind: "literal", value: "Alice", capture: "left" },
        { kind: "literal", value: "knows", capture: "evidence" },
        { kind: "literal", value: "Bob", capture: "right" },
        { kind: "literal", value: "." },
      ],
    },
    arguments: [
      { role: "employee", captureNames: ["left"] },
      { role: "employer", captureNames: ["right"] },
    ],
    evidence: [{ captureNames: ["evidence"] }],
  },
]);
if (
  primitiveRelationSpecs.length !== 1 ||
  primitiveRelationSpecs[0]?.arguments.map((argument) => `${argument.role}:${argument.text}`).join(",") !== "employee:Alice,employer:Bob" ||
  primitiveRelationSpecs[0].evidence[0]?.text !== "knows"
) {
  throw new Error("relation rules should derive argument and evidence spans from captures");
}

const primitiveCoreferenceTokens = tokenizeTextRulesText("Alice said she left.");
const primitiveCoreferenceSpec = applyTextRulesCoreferenceRules("Alice said she left.", primitiveCoreferenceTokens, "en", [
  {
    ruleId: "test-coreference:pronoun",
    language: "en",
    pattern: {
      ruleId: "test-coreference-pattern:pronoun",
      atoms: [
        { kind: "literal", value: "Alice", capture: "name" },
        { kind: "literal", value: "said" },
        { kind: "literal", value: "she", capture: "pronoun" },
        { kind: "literal", value: "left" },
        { kind: "literal", value: "." },
      ],
    },
    mentions: [
      { id: "mention-1", kind: "proper", captureNames: ["name"] },
      { id: "mention-2", kind: "pronoun", captureNames: ["pronoun"] },
    ],
    chains: [{ id: "chain-1", mentionIds: ["mention-1", "mention-2"], representativeMentionId: "mention-1" }],
  },
]);
if (
  primitiveCoreferenceSpec.mentions.map((mention) => `${mention.id}:${mention.text}`).join(",") !==
    "mention-1:Alice,mention-2:she" ||
  primitiveCoreferenceSpec.chains[0]?.mentionIds.join(",") !== "mention-1,mention-2"
) {
  throw new Error("coreference rules should derive mention spans and chains from capture templates");
}

const textpackEnCoreManifest = {
  manifestVersion: "1.0.0",
  id: "pack:en-core",
  packageName: "@ismail-elkorchi/textpack-en-core",
  version: "0.1.0",
  kind: ["language"],
  targets: { languages: ["en"], scripts: ["Latn"] },
  engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
  externalData: { unicode: "17.0.0" },
  capabilities: { lexicons: true },
  resources: { lexicons: ["fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv"] },
  provides: { lexicons: ["lexicon-en-core"] },
  entrypoints: {
    manifest: "fixtures/textpack/manifests/textpack-en-core.json",
  },
  licenses: { code: ["MIT"], data: ["CC0-1.0"] },
  provenance: { sources: ["repo:fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv"], generated: false },
  tests: {
    smoke: ["fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv"],
    negative: ["negative:no-hidden-canonicalizer"],
    representative: ["lookup:lexicon:en"],
  },
  reviewState: "candidate",
  composition: { overlayPrecedence: 10 },
} as never;
const textpackEnLegalManifest = {
  manifestVersion: "1.0.0",
  id: "pack:en-legal",
  packageName: "@ismail-elkorchi/textpack-en-legal",
  version: "0.1.0",
  kind: ["language", "domain"],
  targets: { languages: ["en"], scripts: ["Latn"], domains: ["legal"], profiles: ["legal"] },
  engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
  externalData: { unicode: "17.0.0" },
  capabilities: { gazetteers: true },
  resources: { gazetteers: ["fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv"] },
  provides: { gazetteers: ["gazetteer-en-legal"] },
  entrypoints: {
    manifest: "fixtures/textpack/manifests/textpack-en-legal.json",
  },
  licenses: { code: ["MIT"], data: ["CC0-1.0"] },
  provenance: { sources: ["repo:fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv"], generated: false },
  tests: {
    smoke: ["fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv"],
    negative: ["negative:no-hidden-canonicalizer"],
    representative: ["lookup:gazetteer:en:legal"],
  },
  reviewState: "candidate",
  composition: { overlayPrecedence: 50 },
} as never;
const textpackContent = {
  "fixtures/textpack/resources/textpack-en-core/lexicon.en.simple.tsv":
    "host\tlemma=host\tpos=VERB\ncorpora\tlemma=corpus\tpos=NOUN\n",
  "fixtures/textpack/resources/textpack-en-legal/gazetteer.en.legal.tsv":
    "Supreme Court\tORG\nNew York\tGPE\n",
};

const loadedLexicon = loadTextPackResources(
  [textpackEnCoreManifest],
  { kind: "lexicon", language: "en" },
  textpackContent,
);
const loadedLexiconResources = createTextRulesLexiconResourcesFromLoadedPack(loadedLexicon.resources);
if (
  loadedLexicon.diagnostics.length !== 0 ||
  loadedLexiconResources.diagnostics.length !== 0 ||
  loadedLexiconResources.resources.length !== 1
) {
  throw new Error("loaded textpack lexicon resources should convert without diagnostics");
}

const loadedPosResult = analyzePosMorphLemma(
  {
    documentId: "resource-backed-pos-smoke",
    text: "corpora host",
    sourceId: "resource-backed-pos-smoke",
    sourceSha256: "sha256:resource-backed-pos-smoke",
    languageHint: "en",
  },
  loadedLexiconResources.resources,
);
const loadedPosTags = loadedPosResult.document.layers
  .filter((layer) => layer.kind === "pos")
  .flatMap((layer) => layer.annotations)
  .map((annotation) => (annotation as TextDocPosAnnotation).alternatives[0]?.value)
  .join(",");
if (loadedPosTags !== "NOUN,VERB") {
  throw new Error("resource-backed lexicon conversion should drive POS output");
}

const textdocPosInput: TextDocDocumentV1 = {
  schemaVersion: 1,
  documentId: "resource-backed-pos-textdoc-smoke",
  revision: "tokens-from-textdoc",
  textLengthCU: 12,
  text: "corpora host",
  source: { id: "resource-backed-pos-textdoc-smoke" },
  units: { text: "utf16-code-unit" },
  views: [
    { id: "source-view", kind: "raw" },
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
          source: { startCU: 0, endCU: 12 },
          target: { startCU: 0, endCU: 12 },
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
          id: "doc-token-1",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 7 }],
          text: "corpora",
        },
        {
          id: "doc-token-2",
          kind: "token",
          tokenKind: "lexical-token",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 8, endCU: 12 }],
          text: "host",
        },
      ],
    },
    {
      id: "sentences",
      kind: "sentence",
      viewId: "analysis-view",
      annotations: [
        {
          id: "sentence-1",
          kind: "sentence",
          sentenceKind: "uax29-sentence",
          lifecycle: { state: "active" },
          targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 12 }],
          text: "corpora host",
        },
      ],
    },
  ],
};
const textdocPosResult = analyzePosMorphLemmaDocument(
  {
    document: textdocPosInput,
    languageHint: "en",
  },
  loadedLexiconResources.resources,
);
const textdocPosTargets = textdocPosResult.document.layers
  .find((layer) => layer.id === "pos")
  ?.annotations.map((annotation) => annotation.targets[0])
  .map((target) => (target?.kind === "annotation" ? target.annotationId : ""))
  .join(",");
if (textdocPosTargets !== "doc-token-1,doc-token-2") {
  throw new Error("POS analysis over textdoc should target existing token annotations");
}

const loadedGazetteer = loadTextPackResources(
  [textpackEnLegalManifest],
  { kind: "gazetteer", language: "en", profile: "legal" },
  textpackContent,
);
const loadedEntityResources = createTextRulesEntityResourcesFromLoadedPack(loadedGazetteer.resources);
if (
  loadedGazetteer.diagnostics.length !== 0 ||
  loadedEntityResources.resources.length !== 1 ||
  loadedEntityResources.diagnostics.map((diagnostic) => diagnostic.code).join(",") !== "unsupported-entity-label"
) {
  throw new Error("loaded textpack gazetteer conversion should keep unsupported labels diagnostic");
}

const loadedNerDocument = analyzePosMorphLemma(
  {
    documentId: "resource-backed-ner-smoke",
    text: "The Supreme Court issued an order in New York.",
    sourceId: "resource-backed-ner-smoke",
    sourceSha256: "sha256:resource-backed-ner-smoke",
    languageHint: "en",
  },
  [],
).document;
const loadedNerResult = analyzeRuleBackedNer(
  {
    document: loadedNerDocument,
    languageHint: "en",
  },
  loadedEntityResources.resources,
);
const loadedEntityTexts = loadedNerResult.document.layers
  .filter((layer) => layer.kind === "entity")
  .flatMap((layer) => layer.annotations)
  .map((annotation) => (annotation as TextDocEntityAnnotation).text)
  .join(",");
if (loadedEntityTexts !== "Supreme Court") {
  throw new Error("resource-backed gazetteer conversion should drive NER output for supported labels");
}

const englishResourceData: TextRulesLexiconResourceData = {
  entries: [
    {
      surface: "the",
      analyses: [
        {
          ruleId: "lexicon:en:the:det",
          pos: "DET",
          lemma: "the",
          morphology: [
            { name: "Definite", value: "Def" },
            { name: "PronType", value: "Art" },
          ],
        },
      ],
    },
    {
      surface: "host",
      analyses: [
        {
          ruleId: "lexicon:en:host:noun",
          pos: "NOUN",
          lemma: "host",
          morphology: [{ name: "Number", value: "Sing" }],
        },
      ],
    },
    {
      surface: "signs",
      analyses: [
        {
          ruleId: "lexicon:en:signs:verb",
          pos: "VERB",
          lemma: "sign",
          morphology: [
            { name: "Number", value: "Sing" },
            { name: "Person", value: "3" },
            { name: "Tense", value: "Pres" },
            { name: "VerbForm", value: "Fin" },
          ],
        },
        {
          ruleId: "lexicon:en:signs:noun",
          pos: "NOUN",
          lemma: "sign",
          morphology: [{ name: "Number", value: "Plur" }],
        },
      ],
    },
  ],
};

const englishResource = createTextRulesLexiconResource(
  {
    packId: "pack:pos-en-core",
    packageName: "@ismail-elkorchi/textpack-pos-en-core",
    version: "0.1.0",
    resourceId: "lexicon-en-core",
    lookupKey: "lexicon-en-core",
    kind: "lexicon",
    family: "lexicons",
    path: "fixtures/pos-morph-lemma/resources/textpack-pos-core/en.lexicon.json",
    overlayPrecedence: 10,
    language: "en",
    license: {
      id: "license:data",
      spdx: "CC0-1.0",
    },
    provenance: {
      id: "provenance:manifest",
      sources: ["repo:fixtures/pos-morph-lemma/resources/textpack-pos-core/en.lexicon.json"],
      generated: false,
      createdBy: ["text-computing"],
    },
    licenseId: "license:data",
    provenanceId: "provenance:manifest",
    reviewState: "candidate",
  },
  englishResourceData,
);

const explicitFallbackResource = createTextRulesLexiconResource(
  {
    packId: "pack:pos-fallback",
    packageName: "@ismail-elkorchi/textpack-pos-fallback",
    version: "0.0.0",
    resourceId: "lexicon-en-fallback",
    lookupKey: "lexicon.pos.en.fallback",
    kind: "lexicon",
    family: "lexicons",
    path: "fixtures/pos-morph-lemma/resources/textpack-pos-core/en.lexicon.json",
    overlayPrecedence: 5,
    language: "en",
    license: {
      id: "license:data",
      spdx: "CC0-1.0",
    },
    provenance: {
      id: "provenance:manifest",
      sources: ["repo:fixtures/pos-morph-lemma/resources/textpack-pos-core/en.lexicon.json"],
      generated: false,
      createdBy: ["text-computing"],
    },
    licenseId: "license:data",
    provenanceId: "provenance:manifest",
    reviewState: "candidate",
  },
  {
    entries: [
      {
        surface: "florped",
        analyses: [
          {
            ruleId: "fallback:suffix-ed:adjective",
            pos: "ADJ",
            lemma: "florped",
            morphology: [{ name: "Degree", value: "Pos" }],
          },
          {
            ruleId: "fallback:suffix-ed:verb",
            pos: "VERB",
            lemma: "florp",
            morphology: [
              { name: "Tense", value: "Past" },
              { name: "VerbForm", value: "Part" },
            ],
          },
        ],
      },
    ],
  },
);
const explicitFallbackResult = analyzePosMorphLemmaDocument(
  {
    document: {
      schemaVersion: 1,
      documentId: "explicit-fallback-pos-smoke",
      revision: "tokens-from-textdoc",
      textLengthCU: 7,
      text: "florped",
      source: { id: "explicit-fallback-pos-smoke" },
      units: { text: "utf16-code-unit" },
      views: [
        { id: "source-view", kind: "raw" },
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
              source: { startCU: 0, endCU: 7 },
              target: { startCU: 0, endCU: 7 },
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
              id: "fallback-token-1",
              kind: "token",
              tokenKind: "lexical-token",
              lifecycle: { state: "active" },
              targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: 7 }],
              text: "florped",
            },
          ],
        },
      ],
    },
    languageHint: "en",
  },
  [explicitFallbackResource],
);
const explicitFallbackRefs = explicitFallbackResult.document.layers
  .find((layer) => layer.id === "pos")
  ?.annotations[0]?.provenance?.references?.map((reference) => `${reference.kind}:${reference.id}`)
  .join(",");
if (
  explicitFallbackRefs !==
  "textpack-resource:pack:pos-fallback:lexicon-en-fallback,textrules-rule:fallback:suffix-ed:adjective,textrules-rule:fallback:suffix-ed:verb"
) {
  throw new Error("fallback-style output should reference explicit resource and rule provenance");
}

const result = analyzePosMorphLemma(
  {
    documentId: "pos-morph-lemma:en-unknown-word",
    text: "The florped host signs.",
    sourceId: "en-unknown-word",
    sourceSha256: "5e75f59e2bfcc6e25f2276343795ed7c263bcb0e8ec05a0e010c0a38a13f4d60",
    languageHint: "en",
    phenomena: ["unknown-word"],
  },
  [englishResource],
);

if (!isTextDocDocumentV1(result.document)) {
  throw new Error("textrules POS/morph/lemma result should satisfy the textdoc document shape");
}

const posLayer = result.document.layers.find((layer) => layer.id === "pos");
if (!posLayer || posLayer.annotations.length !== 5) {
  throw new Error("POS layer should contain one annotation per lexical or punctuation token");
}

const florpedPos = posLayer.annotations.find((annotation) => annotation.id === "token-2:pos");
if (!florpedPos || florpedPos.kind !== "pos" || florpedPos.alternatives.length < 2) {
  throw new Error("unknown token should preserve multiple POS alternatives");
}

if (!result.diagnostics.some((diagnostic) => diagnostic.code === "unknown-word")) {
  throw new Error("unknown token should emit an explicit unknown-word diagnostic");
}

const punctuationPos = posLayer.annotations.find((annotation) => annotation.id === "token-5:pos");
if (!punctuationPos || punctuationPos.kind !== "pos" || punctuationPos.alternatives[0]?.value !== "PUNCT") {
  throw new Error("terminal punctuation should be tagged as PUNCT instead of falling back to X");
}

const envelope = createPosMorphLemmaResultEnvelope(result, {
  producerVersion: "0.0.0",
  referenceId: "en-unknown-word",
});
if (!isTextProtocolResultEnvelopeV1(envelope)) {
  throw new Error("textrules result envelope should satisfy the textprotocol contract");
}

const report = createPosMorphLemmaConformanceReport(envelope, {
  expectedArtifactPath: "fixtures/pos-morph-lemma/expected/en-unknown-word.json",
  matchesExpected: true,
});
if (!isTextConformanceReportV1(report)) {
  throw new Error("textrules conformance report should satisfy the textconformance contract");
}

void expectedPackageName;

const ruleBackedNerResourceBase = {
  packId: "pack:ner-core",
  packageName: "@ismail-elkorchi/textpack-ner-core",
  version: "0.0.0",
  resourceId: "gazetteer-ner-core",
  lookupKey: "gazetteer.ner.core",
  kind: "gazetteer" as const,
  family: "gazetteers" as const,
  path: "fixtures/rule-backed-ner/resources/textpack-ner-core/gazetteer.json",
  overlayPrecedence: 10,
  license: {
    id: "license:data",
    spdx: "CC0-1.0",
  },
  provenance: {
    id: "provenance:manifest",
    sources: ["repo:fixtures/rule-backed-ner/resources/textpack-ner-core/gazetteer.json"],
    generated: false,
    createdBy: ["text-computing"],
  },
  licenseId: "license:data",
  provenanceId: "provenance:manifest",
  reviewState: "candidate" as const,
};

const englishEntityResourceData: TextRulesEntityResourceData = {
  entries: [
    {
      id: "ner:en:ibm",
      surface: "International Business Machines",
      aliases: ["IBM"],
      label: "ORG",
      normalized: "International Business Machines",
    },
    {
      id: "ner:en:alice-smith",
      surface: "Alice Smith",
      label: "PER",
      normalized: "Alice Smith",
    },
    {
      id: "ner:en:uc-berkeley",
      surface: "University of California, Berkeley",
      label: "ORG",
      normalized: "University of California, Berkeley",
    },
    {
      id: "ner:en:berkeley",
      surface: "Berkeley",
      label: "LOC",
      normalized: "Berkeley",
    },
    {
      id: "ner:en:apple-org",
      surface: "Apple",
      label: "ORG",
      normalized: "Apple Inc.",
      caseFoldFallback: false,
    },
    {
      id: "ner:en:new-york",
      surface: "New York",
      label: "LOC",
      normalized: "New York",
    },
  ],
};

const spanishEntityResourceData: TextRulesEntityResourceData = {
  entries: [
    {
      id: "ner:es:onu",
      surface: "Organización de las Naciones Unidas",
      aliases: ["ONU"],
      label: "ORG",
      normalized: "Organización de las Naciones Unidas",
    },
    {
      id: "ner:es:madrid",
      surface: "Madrid",
      label: "LOC",
      normalized: "Madrid",
    },
  ],
};

const arabicEntityResourceData: TextRulesEntityResourceData = {
  entries: [
    {
      id: "ner:ar:ali",
      surface: "علي",
      label: "PER",
      normalized: "علي",
    },
    {
      id: "ner:ar:rabat",
      surface: "الرباط",
      label: "LOC",
      normalized: "الرباط",
    },
  ],
};

const entityResources = [
  createTextRulesEntityResource({ ...ruleBackedNerResourceBase, resourceId: "gazetteer-ner-en", language: "en" }, englishEntityResourceData),
  createTextRulesEntityResource({ ...ruleBackedNerResourceBase, resourceId: "gazetteer-ner-es", language: "es" }, spanishEntityResourceData),
  createTextRulesEntityResource({ ...ruleBackedNerResourceBase, resourceId: "gazetteer-ner-ar", language: "ar" }, arabicEntityResourceData),
];

const expectedRuleBackedNer = {
  "org-alias-ibm": {
    text: "International Business Machines (IBM) hired Alice Smith.",
    sha256: "fb127c9470f6a713c90570f09e81735f729375e8b6f9eecb939c42dde3066a4d",
    entities: [
      { label: "ORG", text: "International Business Machines", startCU: 0, endCU: 31 },
      { label: "ORG", text: "IBM", startCU: 33, endCU: 36 },
      { label: "PER", text: "Alice Smith", startCU: 44, endCU: 55 },
    ],
  },
  "nested-uc-berkeley": {
    text: "The University of California, Berkeley campus reopened.",
    sha256: "7aeef927b4179c7f84d6d2ef14b134c5c2faeb9b8e38b42aa1160336121f7321",
    entities: [
      { label: "ORG", text: "University of California, Berkeley", startCU: 4, endCU: 38 },
      { label: "LOC", text: "Berkeley", startCU: 30, endCU: 38 },
    ],
  },
  "capitalization-apple-false-match": {
    text: "apple growers protested outside Apple in New York.",
    sha256: "062d60907a05f40bf5f7aaa7463f2ff4fb24c8a14445c5b64e554b98c4fc9970",
    entities: [
      { label: "ORG", text: "Apple", startCU: 32, endCU: 37 },
      { label: "LOC", text: "New York", startCU: 41, endCU: 49 },
    ],
  },
  "org-alias-onu-madrid": {
    text: "La Organización de las Naciones Unidas (ONU) abrió una oficina en Madrid.",
    sha256: "599e9d6a299d9447d91e71c9df4becae62e21f9cae9717f501bfcd509e87a903",
    entities: [
      { label: "ORG", text: "Organización de las Naciones Unidas", startCU: 3, endCU: 38 },
      { label: "ORG", text: "ONU", startCU: 40, endCU: 43 },
      { label: "LOC", text: "Madrid", startCU: 66, endCU: 72 },
    ],
  },
  "person-location-ar-rabat": {
    text: "زار علي الرباط.",
    sha256: "180855a78c6e7a8445a77db52a18af1ffa3e299f342b0ba00ec116487e756188",
    entities: [
      { label: "PER", text: "علي", startCU: 4, endCU: 7 },
      { label: "LOC", text: "الرباط", startCU: 8, endCU: 14 },
    ],
  },
} as const;

type RuleBackedNerSliceId = keyof typeof expectedRuleBackedNer;

function tokenizeRuleBackedNerFixtureText(text: string): readonly {
  readonly id: string;
  readonly startCU: number;
  readonly endCU: number;
  readonly text: string;
}[] {
  const tokens: { id: string; startCU: number; endCU: number; text: string }[] = [];
  let cursor = 0;
  let tokenIndex = 1;
  const boundaryPunctuation = new Set([".", ",", "(", ")", "،"]);
  while (cursor < text.length) {
    const current = text[cursor];
    if (current === undefined) break;
    if (/\s/u.test(current)) {
      cursor += 1;
      continue;
    }
    if (boundaryPunctuation.has(current)) {
      tokens.push({
        id: `token-${tokenIndex}`,
        startCU: cursor,
        endCU: cursor + 1,
        text: current,
      });
      tokenIndex += 1;
      cursor += 1;
      continue;
    }
    const startCU = cursor;
    while (
      cursor < text.length &&
      !/\s/u.test(text[cursor] ?? "") &&
      !boundaryPunctuation.has(text[cursor] ?? "")
    ) {
      cursor += 1;
    }
    tokens.push({
      id: `token-${tokenIndex}`,
      startCU,
      endCU: cursor,
      text: text.slice(startCU, cursor),
    });
    tokenIndex += 1;
  }
  return tokens;
}

function createRuleBackedNerInputDocument(sliceId: RuleBackedNerSliceId): TextDocDocumentV1 {
  const expected = expectedRuleBackedNer[sliceId];
  const tokens = tokenizeRuleBackedNerFixtureText(expected.text);
  return {
    schemaVersion: 1,
    documentId: `rule-backed-ner:${sliceId}`,
    revision: "pre-ner",
    textLengthCU: expected.text.length,
    text: expected.text,
    source: {
      id: sliceId,
      sha256: expected.sha256,
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
        segments:
          expected.text.length === 0
            ? []
            : [
                {
                  source: { startCU: 0, endCU: expected.text.length },
                  target: { startCU: 0, endCU: expected.text.length },
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
        annotations: tokens.map((token) => ({
          id: token.id,
          kind: "token" as const,
          tokenKind: "lexical-token" as const,
          lifecycle: {
            state: "active" as const,
          },
          targets: [
            {
              kind: "span" as const,
              viewId: "analysis-view",
              startCU: token.startCU,
              endCU: token.endCU,
            },
          ],
          text: token.text,
        })),
      },
      {
        id: "sentences",
        kind: "sentence",
        viewId: "analysis-view",
        annotations: [
          {
            id: "sentence-1",
            kind: "sentence",
            sentenceKind: "uax29-sentence",
            lifecycle: {
              state: "active",
            },
            targets: [{ kind: "span", viewId: "analysis-view", startCU: 0, endCU: expected.text.length }],
            text: expected.text,
          },
        ],
      },
    ],
  };
}

function entityProjection(document: TextDocDocumentV1): readonly {
  readonly label: string;
  readonly text: string | undefined;
  readonly startCU: number;
  readonly endCU: number;
}[] {
  const entityLayer = document.layers.find((layer) => layer.kind === "entity");
  if (!entityLayer) return [];
  return entityLayer.annotations.map((annotation) => {
    const entity = annotation as TextDocEntityAnnotation;
    const target = entity.targets[0];
    if (!target || target.kind !== "span") {
      throw new Error(`entity annotation ${entity.id} should target a text span`);
    }
    return {
      label: entity.label,
      text: entity.text,
      startCU: target.startCU,
      endCU: target.endCU,
    };
  });
}

const nerSlices = [
  { id: "org-alias-ibm", languageHint: "en", allowSpanOverlap: false },
  { id: "nested-uc-berkeley", languageHint: "en", allowSpanOverlap: true },
  { id: "capitalization-apple-false-match", languageHint: "en", allowSpanOverlap: false },
  { id: "org-alias-onu-madrid", languageHint: "es", allowSpanOverlap: false },
  { id: "person-location-ar-rabat", languageHint: "ar", allowSpanOverlap: false },
] as const;

for (const slice of nerSlices) {
  const expectedOutput = expectedRuleBackedNer[slice.id];
  const nerResult = analyzeRuleBackedNer(
    {
      document: createRuleBackedNerInputDocument(slice.id),
      languageHint: slice.languageHint,
      allowSpanOverlap: slice.allowSpanOverlap,
    },
    entityResources,
  );

  if (!isTextDocDocumentV1(nerResult.document)) {
    throw new Error(`rule-backed NER result for ${slice.id} should satisfy textdoc`);
  }

  if (
    JSON.stringify(entityProjection(nerResult.document)) !==
    JSON.stringify(expectedOutput.entities)
  ) {
    throw new Error(`rule-backed NER entities for ${slice.id} should match the recorded expected output`);
  }

  const nerEnvelope = createRuleBackedNerResultEnvelope(nerResult, {
    producerVersion: "0.0.0",
    referenceId: slice.id,
  });
  if (!isTextProtocolResultEnvelopeV1(nerEnvelope)) {
    throw new Error(`rule-backed NER envelope for ${slice.id} should satisfy textprotocol`);
  }

  const nerReport = createRuleBackedNerConformanceReport(nerEnvelope, {
    expectedArtifactPath: `fixtures/rule-backed-ner/expected/${slice.id}.json`,
    matchesExpected: true,
  });
  if (!isTextConformanceReportV1(nerReport)) {
    throw new Error(`rule-backed NER report for ${slice.id} should satisfy textconformance`);
  }
}

const appleResult = analyzeRuleBackedNer(
  {
    document: createRuleBackedNerInputDocument("capitalization-apple-false-match"),
    languageHint: "en",
  },
  entityResources,
);

if (entityProjection(appleResult.document).some((entity) => entity.text === "apple")) {
  throw new Error("case-sensitive entity matching must not promote lowercase apple to ORG");
}

const flatNestedResult = analyzeRuleBackedNer(
  {
    document: createRuleBackedNerInputDocument("nested-uc-berkeley"),
    languageHint: "en",
    allowSpanOverlap: false,
  },
  entityResources,
);

if (!flatNestedResult.diagnostics.some((diagnostic) => diagnostic.code === "entity-overlap-suppressed")) {
  throw new Error("suppressed nested spans should emit an explicit overlap diagnostic");
}

const expectedRelationExtraction = {
  "en-employment": {
    text: "Mira works for Northwind Labs in Boston.",
    languageHint: "en",
    relations: [
      {
        id: "relation-1",
        label: "employed-by",
        arguments: [
          { role: "employee", target: { startCU: 0, endCU: 4, text: "Mira" } },
          { role: "employer", target: { startCU: 15, endCU: 29, text: "Northwind Labs" } },
        ],
        evidence: [{ startCU: 5, endCU: 14, text: "works for" }],
      },
      {
        id: "relation-2",
        label: "located-in",
        arguments: [
          { role: "entity", target: { startCU: 15, endCU: 29, text: "Northwind Labs" } },
          { role: "place", target: { startCU: 33, endCU: 39, text: "Boston" } },
        ],
        evidence: [{ startCU: 30, endCU: 32, text: "in" }],
      },
    ],
  },
  "en-cross-sentence": {
    text: "Northwind Labs opened a clinic. The Boston facility is part of the company.",
    languageHint: "en",
    relations: [
      {
        id: "relation-1",
        label: "part-of",
        arguments: [
          { role: "part", target: { startCU: 36, endCU: 51, text: "Boston facility" } },
          { role: "whole", target: { startCU: 0, endCU: 14, text: "Northwind Labs" } },
        ],
        evidence: [{ startCU: 55, endCU: 74, text: "part of the company" }],
      },
    ],
  },
  "es-location": {
    text: "El archivo central está en Sevilla.",
    languageHint: "es",
    relations: [
      {
        id: "relation-1",
        label: "located-in",
        arguments: [
          { role: "entity", target: { startCU: 3, endCU: 18, text: "archivo central" } },
          { role: "place", target: { startCU: 27, endCU: 34, text: "Sevilla" } },
        ],
        evidence: [{ startCU: 19, endCU: 26, text: "está en" }],
      },
    ],
  },
  "ar-location": {
    text: "يقع المتحف في الرباط.",
    languageHint: "ar",
    relations: [
      {
        id: "relation-1",
        label: "located-in",
        arguments: [
          { role: "entity", target: { startCU: 4, endCU: 10, text: "المتحف" } },
          { role: "place", target: { startCU: 14, endCU: 20, text: "الرباط" } },
        ],
        evidence: [{ startCU: 0, endCU: 13, text: "يقع المتحف في" }],
      },
    ],
  },
  "en-no-relation": {
    text: "Mira visited Northwind Labs but does not work for it.",
    languageHint: "en",
    relations: [],
  },
} as const;

type RelationExtractionSliceId = keyof typeof expectedRelationExtraction;

function relationExtractionProjection(document: TextDocDocumentV1) {
  const entityLayer = document.layers.find((layer) => layer.id === "relation-arguments");
  const relationLayer = document.layers.find((layer) => layer.id === "relations");
  if (!entityLayer || !relationLayer) throw new Error("relation extraction document is missing expected layers");
  const entityById = new Map(
    entityLayer.annotations.map((annotation) => [annotation.id, annotation as TextDocEntityAnnotation]),
  );
  return relationLayer.annotations.map((annotation) => {
    const relation = annotation as TextDocRelationAnnotation;
    return {
      id: relation.id,
      label: relation.relationType,
      arguments: relation.arguments.map((argument) => {
        const entity = entityById.get(argument.annotationId);
        if (!entity) throw new Error(`missing relation argument entity ${argument.annotationId}`);
        const target = entity.targets[0];
        if (!target || target.kind !== "span") throw new Error(`bad relation argument target ${entity.id}`);
        return {
          role: argument.role,
          target: {
            startCU: target.startCU,
            endCU: target.endCU,
            text: entity.text,
          },
        };
      }),
      evidence: relation.targets.map((target) => {
        if (target.kind !== "annotation") throw new Error(`bad relation evidence target ${relation.id}`);
        const evidence = entityById.get(target.annotationId);
        if (!evidence) throw new Error(`missing relation evidence entity ${target.annotationId}`);
        const evidenceTarget = evidence.targets[0];
        if (!evidenceTarget || evidenceTarget.kind !== "span") {
          throw new Error(`bad relation evidence span ${evidence.id}`);
        }
        return {
          startCU: evidenceTarget.startCU,
          endCU: evidenceTarget.endCU,
          text: evidence.text,
        };
      }),
    };
  });
}

for (const sliceId of Object.keys(expectedRelationExtraction) as RelationExtractionSliceId[]) {
  const expectedOutput = expectedRelationExtraction[sliceId];
  const relationResult = analyzeRelationExtraction({
    documentId: `relation:${sliceId}`,
    text: expectedOutput.text,
    sourceId: sliceId,
    languageHint: expectedOutput.languageHint,
  });

  if (!isTextDocDocumentV1(relationResult.document)) {
    throw new Error(`relation extraction result for ${sliceId} should satisfy textdoc`);
  }

  if (
    JSON.stringify(relationExtractionProjection(relationResult.document)) !==
    JSON.stringify(expectedOutput.relations)
  ) {
    throw new Error(`relation extraction output for ${sliceId} should match the recorded expected output`);
  }

  const relationEnvelope = createRelationExtractionResultEnvelope(relationResult, {
    producerVersion: "0.0.0",
    referenceId: sliceId,
  });
  if (!isTextProtocolResultEnvelopeV1(relationEnvelope)) {
    throw new Error(`relation extraction envelope for ${sliceId} should satisfy textprotocol`);
  }

  const relationReport = createRelationExtractionConformanceReport(relationEnvelope, {
    expectedArtifactPath: `fixtures/relation-extraction/expected/${sliceId}.json`,
    matchesExpected: true,
  });
  if (!isTextConformanceReportV1(relationReport)) {
    throw new Error(`relation extraction report for ${sliceId} should satisfy textconformance`);
  }
}

const unsupportedRelation = analyzeRelationExtraction({
  documentId: "relation:unsupported",
  text: "Mira and Jana read the file.",
  sourceId: "unsupported",
  languageHint: "en",
});

if (!unsupportedRelation.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-relation-pattern")) {
  throw new Error("unsupported relation text should emit an explicit diagnostic");
}

const expectedCoreference = {
  "en-pronoun": {
    text: "Mira checked the sensor because she calibrated it yesterday.",
    languageHint: "en",
    mentions: [
      { id: "mention-1", kind: "proper", target: { startCU: 0, endCU: 4, text: "Mira" } },
      { id: "mention-2", kind: "nominal", target: { startCU: 13, endCU: 23, text: "the sensor" } },
      { id: "mention-3", kind: "pronoun", target: { startCU: 32, endCU: 35, text: "she" } },
      { id: "mention-4", kind: "pronoun", target: { startCU: 47, endCU: 49, text: "it" } },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1", "mention-3"] },
      { id: "chain-2", mentionIds: ["mention-2", "mention-4"] },
    ],
  },
  "en-nominal": {
    text: "Northwind Labs released the report. The company archived the draft.",
    languageHint: "en",
    mentions: [
      { id: "mention-1", kind: "proper", target: { startCU: 0, endCU: 14, text: "Northwind Labs" } },
      { id: "mention-2", kind: "nominal", target: { startCU: 36, endCU: 47, text: "The company" } },
    ],
    chains: [{ id: "chain-1", mentionIds: ["mention-1", "mention-2"] }],
  },
  "es-pronoun": {
    text: "Lucía encontró el cuaderno y ella lo guardó.",
    languageHint: "es",
    mentions: [
      { id: "mention-1", kind: "proper", target: { startCU: 0, endCU: 5, text: "Lucía" } },
      { id: "mention-2", kind: "nominal", target: { startCU: 15, endCU: 26, text: "el cuaderno" } },
      { id: "mention-3", kind: "pronoun", target: { startCU: 29, endCU: 33, text: "ella" } },
      { id: "mention-4", kind: "pronoun", target: { startCU: 34, endCU: 36, text: "lo" } },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1", "mention-3"] },
      { id: "chain-2", mentionIds: ["mention-2", "mention-4"] },
    ],
  },
  "ar-pronoun": {
    text: "قرأت سلمى الرسالة ثم حفظتها.",
    languageHint: "ar",
    mentions: [
      { id: "mention-1", kind: "proper", target: { startCU: 5, endCU: 9, text: "سلمى" } },
      { id: "mention-2", kind: "nominal", target: { startCU: 10, endCU: 17, text: "الرسالة" } },
      { id: "mention-3", kind: "pronoun", target: { startCU: 25, endCU: 27, text: "ها" } },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1"], diagnostics: ["singleton-control"] },
      { id: "chain-2", mentionIds: ["mention-2", "mention-3"] },
    ],
  },
  "en-ambiguous": {
    text: "Mira called Jana after she reviewed the file.",
    languageHint: "en",
    mentions: [
      { id: "mention-1", kind: "proper", target: { startCU: 0, endCU: 4, text: "Mira" } },
      { id: "mention-2", kind: "proper", target: { startCU: 12, endCU: 16, text: "Jana" } },
      { id: "mention-3", kind: "pronoun", target: { startCU: 23, endCU: 26, text: "she" } },
      { id: "mention-4", kind: "singleton", target: { startCU: 36, endCU: 44, text: "the file" } },
    ],
    chains: [
      { id: "chain-1", mentionIds: ["mention-1"], diagnostics: ["candidate-antecedent-for:mention-3"] },
      { id: "chain-2", mentionIds: ["mention-2"], diagnostics: ["candidate-antecedent-for:mention-3"] },
      { id: "chain-3", mentionIds: ["mention-3"], diagnostics: ["ambiguous-antecedent"] },
      { id: "chain-4", mentionIds: ["mention-4"], diagnostics: ["singleton-control"] },
    ],
  },
} as const;

type CoreferenceSliceId = keyof typeof expectedCoreference;

function coreferenceProjection(document: TextDocDocumentV1) {
  const mentionLayer = document.layers.find((layer) => layer.id === "coreference-mentions");
  const chainLayer = document.layers.find((layer) => layer.id === "coreference-chains");
  if (!mentionLayer || !chainLayer) throw new Error("coreference document is missing expected layers");
  return {
    mentions: mentionLayer.annotations.map((annotation) => {
      const mention = annotation as TextDocCoreferenceMentionAnnotation;
      const target = mention.targets[0];
      if (!target || target.kind !== "span") throw new Error(`bad coreference mention target ${mention.id}`);
      return {
        id: mention.id,
        kind: mention.mentionType,
        target: {
          startCU: target.startCU,
          endCU: target.endCU,
          text: mention.text,
        },
      };
    }),
    chains: chainLayer.annotations.map((annotation) => {
      const chain = annotation as TextDocCoreferenceChainAnnotation;
      return {
        id: chain.id,
        mentionIds: chain.mentionIds,
        ...(chain.notes && chain.notes.length > 0 ? { diagnostics: chain.notes } : {}),
      };
    }),
  };
}

for (const sliceId of Object.keys(expectedCoreference) as CoreferenceSliceId[]) {
  const expectedOutput = expectedCoreference[sliceId];
  const coreferenceResult = analyzeCoreference({
    documentId: `coreference:${sliceId}`,
    text: expectedOutput.text,
    sourceId: sliceId,
    languageHint: expectedOutput.languageHint,
  });

  if (!isTextDocDocumentV1(coreferenceResult.document)) {
    throw new Error(`coreference result for ${sliceId} should satisfy textdoc`);
  }

  if (
    JSON.stringify(coreferenceProjection(coreferenceResult.document)) !==
    JSON.stringify({
      mentions: expectedOutput.mentions,
      chains: expectedOutput.chains,
    })
  ) {
    throw new Error(`coreference output for ${sliceId} should match the recorded expected output`);
  }

  const coreferenceEnvelope = createCoreferenceResultEnvelope(coreferenceResult, {
    producerVersion: "0.0.0",
    referenceId: sliceId,
  });
  if (!isTextProtocolResultEnvelopeV1(coreferenceEnvelope)) {
    throw new Error(`coreference envelope for ${sliceId} should satisfy textprotocol`);
  }

  const coreferenceReport = createCoreferenceConformanceReport(coreferenceEnvelope, {
    expectedArtifactPath: `fixtures/coreference/expected/${sliceId}.json`,
    matchesExpected: true,
  });
  if (!isTextConformanceReportV1(coreferenceReport)) {
    throw new Error(`coreference report for ${sliceId} should satisfy textconformance`);
  }
}

const unsupportedCoreference = analyzeCoreference({
  documentId: "coreference:unsupported",
  text: "The archive opened at noon.",
  sourceId: "unsupported",
  languageHint: "en",
});

if (!unsupportedCoreference.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-coreference-pattern")) {
  throw new Error("unsupported coreference text should emit an explicit diagnostic");
}

const ambiguousCoreference = analyzeCoreference({
  documentId: "coreference:ambiguous",
  text: expectedCoreference["en-ambiguous"].text,
  sourceId: "en-ambiguous",
  languageHint: "en",
});

if (!ambiguousCoreference.diagnostics.some((diagnostic) => diagnostic.code === "ambiguous-antecedent")) {
  throw new Error("ambiguous coreference slice should emit an explicit ambiguity diagnostic");
}

const expectedDependencyParser = {
  "en-basic": {
    text: "They buy books.",
    languageHint: "en",
    arcs: [
      { dependent: "1", head: "2", relation: "nsubj" },
      { dependent: "2", head: "0", relation: "root" },
      { dependent: "3", head: "2", relation: "obj" },
      { dependent: "4", head: "2", relation: "punct" },
    ],
  },
  "es-mwt": {
    text: "Vámonos al mar.",
    languageHint: "es",
    arcs: [
      { dependent: "1", head: "0", relation: "root" },
      { dependent: "2", head: "1", relation: "obj" },
      { dependent: "3", head: "5", relation: "case" },
      { dependent: "4", head: "5", relation: "det" },
      { dependent: "5", head: "1", relation: "obl" },
      { dependent: "6", head: "1", relation: "punct" },
    ],
  },
  "ar-nonlatin": {
    text: "كتب الطالب الدرس.",
    languageHint: "ar",
    arcs: [
      { dependent: "1", head: "0", relation: "root" },
      { dependent: "2", head: "1", relation: "nsubj" },
      { dependent: "3", head: "1", relation: "obj" },
      { dependent: "4", head: "1", relation: "punct" },
    ],
  },
} as const;

type DependencyParserSliceId = keyof typeof expectedDependencyParser;

function dependencyProjection(document: TextDocDocumentV1): readonly {
  readonly dependent: string;
  readonly head: string;
  readonly relation: string;
}[] {
  const dependencyLayer = document.layers.find((layer) => layer.kind === "dependency");
  if (!dependencyLayer) return [];
  return dependencyLayer.annotations.map((annotation) => {
    const dependency = annotation as TextDocDependencyAnnotation;
    return {
      dependent: dependency.source.conlluId,
      head: dependency.source.conlluHead,
      relation: dependency.relation,
    };
  });
}

for (const sliceId of Object.keys(expectedDependencyParser) as DependencyParserSliceId[]) {
  const expectedOutput = expectedDependencyParser[sliceId];
  const parserResult = analyzeDependencyParser({
    documentId: `dependency-parser:${sliceId}`,
    text: expectedOutput.text,
    sourceId: sliceId,
    languageHint: expectedOutput.languageHint,
  });

  if (!isTextDocDocumentV1(parserResult.document)) {
    throw new Error(`dependency parser result for ${sliceId} should satisfy textdoc`);
  }

  if (JSON.stringify(dependencyProjection(parserResult.document)) !== JSON.stringify(expectedOutput.arcs)) {
    throw new Error(`dependency parser arcs for ${sliceId} should match the recorded expected output`);
  }

  const parserEnvelope = createDependencyParserResultEnvelope(parserResult, {
    producerVersion: "0.0.0",
    referenceId: sliceId,
  });
  if (!isTextProtocolResultEnvelopeV1(parserEnvelope)) {
    throw new Error(`dependency parser envelope for ${sliceId} should satisfy textprotocol`);
  }

  const parserReport = createDependencyParserConformanceReport(parserEnvelope, {
    expectedArtifactPath: `fixtures/dependency-parser/expected/${sliceId}.json`,
    matchesExpected: true,
  });
  if (!isTextConformanceReportV1(parserReport)) {
    throw new Error(`dependency parser report for ${sliceId} should satisfy textconformance`);
  }
}

const unsupportedDependencyResult = analyzeDependencyParser({
  documentId: "dependency-parser:unsupported",
  text: "Unseen sentence.",
  sourceId: "unsupported",
  languageHint: "en",
});

if (
  !unsupportedDependencyResult.diagnostics.some(
    (diagnostic) => diagnostic.code === "unsupported-dependency-pattern",
  )
) {
  throw new Error("unsupported dependency parser input should emit a diagnostic");
}
