import Ajv from "ajv";
import { readFile } from "node:fs/promises";
import {
  analyzeDependencyParser,
  createDependencyParserConformanceReport,
  createDependencyParserResultEnvelope,
} from "../packages/textrules/src/index.ts";
import { isTextDocDocumentV1 } from "../packages/textdoc/src/index.ts";
import { isTextProtocolResultEnvelopeV1 } from "../packages/textprotocol/src/index.ts";
import { isTextConformanceReportV1 } from "../packages/textconformance/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: false });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function sourceTextFromConllu(input) {
  const line = input
    .split("\n")
    .find((entry) => entry.startsWith("# text = "));
  expect(line !== undefined, "CoNLL-U fixture must contain a # text comment.");
  return line.slice("# text = ".length);
}

function dependencyProjection(document) {
  const dependencyLayer = document.layers.find((layer) => layer.kind === "dependency");
  expect(dependencyLayer !== undefined, `${document.documentId} must contain a dependency layer.`);
  return dependencyLayer.annotations.map((annotation) => ({
    dependent: annotation.source.conlluId,
    head: annotation.source.conlluHead,
    relation: annotation.relation,
  }));
}

const expectedSchema = await readJson("schemas/dependency-parser-expected-v1.schema.json");
const textdocSchema = await readJson("schemas/textdoc-document-v1.schema.json");
const envelopeSchema = await readJson("schemas/textprotocol-result-envelope-v1.schema.json");
const reportSchema = await readJson("schemas/textconformance-report-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
const validateTextdoc = ajv.compile(textdocSchema);
const validateEnvelope = ajv.compile(envelopeSchema);
const validateReport = ajv.compile(reportSchema);

const slices = await readJson("fixtures/dependency-parser/slices.json");
const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-dependency-parser");
expect(task?.status === "slice-proven", "Support status must mark nlp-dependency-parser as slice-proven after feature validation.");
expect(
  task.evidence.includes("fixtures/reports/nlp-dependency-parser/conformance-report.json"),
  "Support status evidence must cite the dependency-parser conformance report.",
);

for (const fixture of slices.fixtures) {
  const expected = await readJson(fixture.expectedPath);
  expect(validateExpected(expected), `${fixture.expectedPath} failed dependency expected schema`, validateExpected.errors);
  const sourceText = sourceTextFromConllu(await readText(fixture.sourceConlluPath));
  const result = analyzeDependencyParser({
    documentId: expected.documentId,
    text: sourceText,
    sourceId: fixture.id,
    languageHint: fixture.language,
  });

  expect(isTextDocDocumentV1(result.document), `${fixture.id} parser output failed textdoc runtime guard.`);
  expect(validateTextdoc(result.document), `${fixture.id} parser output failed textdoc schema`, validateTextdoc.errors);
  expect(result.diagnostics.length === 0, `${fixture.id} parser output must not emit diagnostics for frozen slices.`);
  expect(
    JSON.stringify(dependencyProjection(result.document)) === JSON.stringify(expected.arcs),
    `${fixture.id} parser output arcs do not match expected arcs.`,
    { expected: expected.arcs, actual: dependencyProjection(result.document) },
  );

  const envelope = createDependencyParserResultEnvelope(result, {
    producerVersion: "0.0.0",
    referenceId: fixture.id,
  });
  expect(isTextProtocolResultEnvelopeV1(envelope), `${fixture.id} envelope failed runtime guard.`);
  expect(validateEnvelope(envelope), `${fixture.id} envelope failed schema`, validateEnvelope.errors);

  const report = createDependencyParserConformanceReport(envelope, {
    expectedArtifactPath: fixture.expectedPath,
    matchesExpected: true,
  });
  expect(isTextConformanceReportV1(report), `${fixture.id} report failed runtime guard.`);
  expect(validateReport(report), `${fixture.id} report failed schema`, validateReport.errors);
  expect(report.summary.fail === 0, `${fixture.id} report must not contain failing checks.`);
}

const unsupported = analyzeDependencyParser({
  documentId: "dependency-parser:unsupported",
  text: "Unseen sentence.",
  sourceId: "unsupported",
  languageHint: "en",
});
expect(
  unsupported.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-dependency-pattern"),
  "Unsupported dependency parser input must emit a stable diagnostic.",
);

console.log(`Dependency parser feature artifacts OK (fixtures=${slices.fixtures.length}).`);
