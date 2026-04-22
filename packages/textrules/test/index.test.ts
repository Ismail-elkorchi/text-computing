import { isTextConformanceReportV1 } from "@ismail-elkorchi/textconformance";
import { isTextDocDocumentV1 } from "@ismail-elkorchi/textdoc";
import { isTextProtocolResultEnvelopeV1 } from "@ismail-elkorchi/textprotocol";
import {
  analyzePosMorphLemma,
  createPosMorphLemmaConformanceReport,
  createPosMorphLemmaResultEnvelope,
  createTextRulesLexiconResource,
  packageName,
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
