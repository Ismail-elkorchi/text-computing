#!/usr/bin/env node
import { createTextDocDocumentFromTextSync } from "@ismail-elkorchi/textdoc";
import {
  analyzeCoreference,
  analyzeDependencyParser,
  analyzePosMorphLemma,
  analyzeRelationExtraction,
  analyzeRuleBackedNer,
  createCoreferenceConformanceReport,
  createCoreferenceResultEnvelope,
  createDependencyParserConformanceReport,
  createDependencyParserResultEnvelope,
  createPosMorphLemmaConformanceReport,
  createPosMorphLemmaResultEnvelope,
  createRelationExtractionConformanceReport,
  createRelationExtractionResultEnvelope,
  createRuleBackedNerConformanceReport,
  createRuleBackedNerResultEnvelope,
  createTextRulesCorpusEvaluationReport,
  createTextRulesEntityResource,
  isTextRulesConformanceReportV1,
  isTextRulesCorpusEvaluationReportV1,
} from "@ismail-elkorchi/textrules";

function requireReport(report) {
  if (!isTextRulesConformanceReportV1(report)) {
    throw new Error(`invalid textrules conformance report ${report?.reportId ?? "<unknown>"}`);
  }
  return report;
}

const producerVersion = "0.1.0";
const posResult = analyzePosMorphLemma(
  {
    documentId: "example:textrules-corpus-evaluation:pos",
    text: "The florped host signs.",
    sourceId: "example:textrules-corpus-evaluation:pos",
    languageHint: "en",
    phenomena: ["unknown-word"],
  },
  [],
);
const posReport = requireReport(createPosMorphLemmaConformanceReport(
  createPosMorphLemmaResultEnvelope(posResult, {
    producerVersion,
    referenceId: "example-pos",
  }),
  {
    expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#pos",
    matchesExpected: true,
  },
));

const entityResource = createTextRulesEntityResource(
  {
    packId: "example:textpack-ner",
    packageName: "@example/textpack-ner",
    version: "0.0.0",
    resourceId: "example-entities-en",
    lookupKey: "gazetteer.example.entities",
    language: "en",
    overlayPrecedence: 10,
  },
  {
    entries: [
      { id: "entity:mira", surface: "Mira", label: "PER" },
      { id: "entity:northwind", surface: "Northwind Labs", label: "ORG" },
      { id: "entity:boston", surface: "Boston", label: "LOC" },
    ],
  },
);
const nerDocument = createTextDocDocumentFromTextSync("Mira works for Northwind Labs in Boston.", {
  documentId: "example:textrules-corpus-evaluation:ner",
  sourceId: "example:textrules-corpus-evaluation:ner",
}).document;
const nerResult = analyzeRuleBackedNer(
  {
    document: nerDocument,
    languageHint: "en",
  },
  [entityResource],
);
const nerReport = requireReport(createRuleBackedNerConformanceReport(
  createRuleBackedNerResultEnvelope(nerResult, {
    producerVersion,
    referenceId: "example-ner",
  }),
  {
    expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#ner",
    matchesExpected: true,
  },
));

function relationReportFor(sliceId, text) {
  const result = analyzeRelationExtraction({
    documentId: `example:textrules-corpus-evaluation:relation:${sliceId}`,
    text,
    sourceId: `example-relation:${sliceId}`,
    languageHint: "en",
  });
  return requireReport(createRelationExtractionConformanceReport(
    createRelationExtractionResultEnvelope(result, {
      producerVersion,
      referenceId: sliceId,
    }),
    {
      expectedArtifactPath: `examples/textrules-corpus-evaluation-consumer.mjs#relation-${sliceId}`,
      matchesExpected: true,
    },
  ));
}

const relationReport = relationReportFor("employment", "Mira works for Northwind Labs in Boston.");
const relationNegativeControlReport = relationReportFor(
  "negative-control",
  "Mira visited Northwind Labs but does not work for it.",
);

const coreferenceResult = analyzeCoreference({
  documentId: "example:textrules-corpus-evaluation:coreference",
  text: "Mira checked the sensor because she calibrated it yesterday.",
  sourceId: "example-coreference",
  languageHint: "en",
});
const coreferenceReport = requireReport(createCoreferenceConformanceReport(
  createCoreferenceResultEnvelope(coreferenceResult, {
    producerVersion,
    referenceId: "example-coreference",
  }),
  {
    expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#coreference",
    matchesExpected: true,
  },
));

const dependencyResult = analyzeDependencyParser({
  documentId: "example:textrules-corpus-evaluation:dependency",
  text: "They buy books.",
  sourceId: "example-dependency",
  languageHint: "en",
});
const dependencyReport = requireReport(createDependencyParserConformanceReport(
  createDependencyParserResultEnvelope(dependencyResult, {
    producerVersion,
    referenceId: "example-dependency",
  }),
  {
    expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#dependency",
    matchesExpected: true,
  },
));

const corpusEvaluation = createTextRulesCorpusEvaluationReport({
  evaluationId: "example:textrules-corpus-evaluation",
  generatedAt: "2026-05-31T00:00:00.000Z",
  inputs: [
    {
      taskKind: "pos-morph-lemma",
      sliceId: "example-pos",
      role: "evaluation",
      report: posReport,
      expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#pos",
    },
    {
      taskKind: "rule-backed-ner",
      sliceId: "example-ner",
      role: "evaluation",
      report: nerReport,
      expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#ner",
    },
    {
      taskKind: "relation-extraction",
      sliceId: "example-employment",
      role: "evaluation",
      report: relationReport,
      expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#relation-employment",
    },
    {
      taskKind: "relation-extraction",
      sliceId: "example-negative-control",
      role: "negative-control",
      report: relationNegativeControlReport,
      expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#relation-negative-control",
    },
    {
      taskKind: "coreference",
      sliceId: "example-coreference",
      role: "holdout",
      report: coreferenceReport,
      expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#coreference",
    },
    {
      taskKind: "dependency-parser",
      sliceId: "example-dependency",
      role: "evaluation",
      report: dependencyReport,
      expectedArtifactPath: "examples/textrules-corpus-evaluation-consumer.mjs#dependency",
    },
  ],
  limitations: [
    "Example aggregation covers committed deterministic task reports; it is not an external corpus benchmark.",
  ],
});

if (!isTextRulesCorpusEvaluationReportV1(corpusEvaluation)) {
  throw new Error("invalid textrules corpus evaluation report");
}

console.log(JSON.stringify({
  evaluationId: corpusEvaluation.evaluationId,
  taskKinds: corpusEvaluation.taskKinds,
  sliceCount: corpusEvaluation.sliceCount,
  passCount: corpusEvaluation.passCount,
  failCount: corpusEvaluation.failCount,
  negativeControlCount: corpusEvaluation.negativeControlCount,
  taskSummaries: corpusEvaluation.taskSummaries,
}, null, 2));
