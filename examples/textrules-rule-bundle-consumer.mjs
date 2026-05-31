#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  compileTextRulesRuleBundle,
  runTextRules,
} from "@ismail-elkorchi/textrules";

const created = createTextDocDocumentFromTextSync("New York courts sign.", {
  documentId: "example:textrules-rule-bundle-consumer",
  sourceId: "example:textrules-rule-bundle-consumer",
});

const newYorkPattern = {
  ruleId: "example.pattern.new-york",
  atoms: [
    { kind: "literal", value: "New", capture: "city-prefix" },
    { kind: "any", capture: "separator" },
    { kind: "literal", value: "York", capture: "city-suffix" },
  ],
};

const compiled = compileTextRulesRuleBundle({
  schemaVersion: 1,
  id: "example-general-rules",
  namespace: "example",
  conflictPolicy: "emit-all",
  resources: ["example:lexicon", "example:transducer"],
  rules: [
    {
      id: "example.place.new-york",
      kind: "span-pattern",
      namespace: "example",
      priority: 100,
      when: { pattern: newYorkPattern },
      emit: { extensionId: "example:Place", data: { label: "PLACE" } },
    },
    {
      id: "example.lexicon.courts",
      kind: "lexicon",
      namespace: "example",
      priority: 90,
      resources: ["example:lexicon"],
      emit: { extensionId: "example:LexiconHit", data: { source: "example:lexicon" } },
    },
    {
      id: "example.validation.courts",
      kind: "validation",
      namespace: "example",
      priority: 80,
      diagnostic: true,
      when: {
        pattern: {
          ruleId: "example.pattern.courts",
          atoms: [{ kind: "literal", value: "courts" }],
        },
      },
      emit: {
        diagnosticCode: "example-courts-token",
        diagnosticSeverity: "warning",
      },
    },
    {
      id: "example.transducer.sign",
      kind: "transducer",
      namespace: "example",
      priority: 70,
      resources: ["example:transducer"],
      when: { surfaceIn: ["sign"] },
      emit: {
        extensionId: "example:TransducerAnalysis",
        transducerAnalyses: [
          { analysis: "NOUN", lemma: "sign", features: [{ name: "Number", value: "Sing" }] },
          { analysis: "VERB", lemma: "sign", features: [{ name: "VerbForm", value: "Inf" }] },
        ],
      },
    },
    {
      id: "example.annotation.tokens",
      kind: "annotation-pattern",
      namespace: "example",
      priority: 60,
      when: { annotationKind: "token" },
      emit: { extensionId: "example:TokenSeen" },
    },
    {
      id: "example.rewrite.new-york",
      kind: "rewrite",
      namespace: "example",
      priority: 50,
      when: { pattern: newYorkPattern },
      rewrite: {
        targetViewId: "normalized-view",
        replacement: ["NYC"],
        reversible: false,
        loss: [{ kind: "lossy-normalization", reason: "abbreviation loses expanded form" }],
      },
    },
  ],
});

const result = runTextRules(
  created.document,
  compiled,
  [
    { id: "example:lexicon", entries: ["courts"] },
    { id: "example:transducer", entries: ["sign"] },
  ],
);

console.log(JSON.stringify({
  documentId: result.document.documentId,
  compiledId: compiled.compiledId,
  annotations: result.annotations.map((annotation) => ({
    id: annotation.id,
    extensionId: annotation.extensionId,
    target: annotation.targets[0],
    provenance: annotation.provenance,
    ambiguitySet: annotation.ambiguitySet,
    data: annotation.data,
  })),
  diagnostics: result.diagnostics,
  rewrites: result.rewrites,
  views: result.document.views.map((view) => view.id),
  spanMaps: result.document.spanMaps?.map((spanMap) => ({
    id: spanMap.id,
    sourceViewId: spanMap.sourceViewId,
    targetViewId: spanMap.targetViewId,
    lifecycle: spanMap.lifecycle,
    segments: spanMap.segments,
  })) ?? [],
}, null, 2));
