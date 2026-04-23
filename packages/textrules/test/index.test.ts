import { isTextConformanceReportV1 } from "@ismail-elkorchi/textconformance";
import { isTextDocDocumentV1, type TextDocDocumentV1, type TextDocEntityAnnotation } from "@ismail-elkorchi/textdoc";
import { isTextProtocolResultEnvelopeV1 } from "@ismail-elkorchi/textprotocol";
import {
  analyzeRuleBackedNer,
  analyzePosMorphLemma,
  createRuleBackedNerConformanceReport,
  createRuleBackedNerResultEnvelope,
  createTextRulesEntityResource,
  createPosMorphLemmaConformanceReport,
  createPosMorphLemmaResultEnvelope,
  createTextRulesLexiconResource,
  packageName,
  type TextRulesEntityResourceData,
  type TextRulesLexiconResourceData,
} from "../src/index.ts";

const expectedPackageName: typeof packageName = "@ismail-elkorchi/textrules";

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
