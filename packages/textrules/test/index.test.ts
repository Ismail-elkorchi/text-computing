import { isTextConformanceReportV1 } from "@ismail-elkorchi/textconformance";
import {
  isTextDocDocumentV1,
  type TextDocDependencyAnnotation,
  type TextDocDocumentV1,
  type TextDocEntityAnnotation,
  type TextDocRelationAnnotation,
} from "@ismail-elkorchi/textdoc";
import { isTextProtocolResultEnvelopeV1 } from "@ismail-elkorchi/textprotocol";
import {
  analyzeRelationExtraction,
  analyzeRuleBackedNer,
  analyzePosMorphLemma,
  analyzeDependencyParser,
  createDependencyParserConformanceReport,
  createDependencyParserResultEnvelope,
  createRelationExtractionConformanceReport,
  createRelationExtractionResultEnvelope,
  createRuleBackedNerConformanceReport,
  createRuleBackedNerResultEnvelope,
  createTextRulesEntityResource,
  createPosMorphLemmaConformanceReport,
  createPosMorphLemmaResultEnvelope,
  createTextRulesLexiconResource,
  matchTextRulesTokenPattern,
  matchTextRulesTokenPatterns,
  packageName,
  rewriteTextRulesTokenTexts,
  tokenizeTextRulesText,
  type TextRulesEntityResourceData,
  type TextRulesLexiconResourceData,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textrules";

const primitiveTokens = tokenizeTextRulesText("New York courts sign.");
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
    packId: "pack:pos-core",
    packageName: "@ismail-elkorchi/textpack-pos-core",
    version: "0.0.0",
    resourceId: "lexicon-en-core",
    lookupKey: "lexicon.pos.en.core",
    kind: "lexicon",
    path: "fixtures/pos-morph-lemma/resources/textpack-pos-core/en.lexicon.json",
    overlayPrecedence: 10,
    language: "en",
    license: {
      id: "license-cc0",
      spdx: "CC0-1.0",
      attribution: "Prepared for repository fixtures.",
    },
    provenance: {
      id: "prov-hand-curated",
      origin: "repository-fixture",
      version: "2026-04-21",
      createdBy: "text-computing",
    },
  },
  englishResourceData,
);

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
  path: "fixtures/rule-backed-ner/resources/textpack-ner-core/gazetteer.json",
  overlayPrecedence: 10,
  license: {
    id: "license-cc0",
    spdx: "CC0-1.0",
    attribution: "Prepared for repository fixtures.",
  },
  provenance: {
    id: "prov-hand-curated",
    origin: "repository-fixture",
    version: "2026-04-23",
    createdBy: "text-computing",
  },
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

function createRuleBackedNerInputDocument(sliceId: RuleBackedNerSliceId): TextDocDocumentV1 {
  const expected = expectedRuleBackedNer[sliceId];
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
            lifecycle: {
              state: "active",
            },
            targets: [{ kind: "span", startCU: 0, endCU: expected.text.length }],
            text: expected.text,
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
            lifecycle: {
              state: "active",
            },
            targets: [{ kind: "span", startCU: 0, endCU: expected.text.length }],
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
