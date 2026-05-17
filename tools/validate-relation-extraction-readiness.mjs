import Ajv from "ajv";
import { readdir, readFile } from "node:fs/promises";
import {
  analyzeRelationExtraction,
  createRelationExtractionConformanceReport,
  createRelationExtractionResultEnvelope,
} from "../packages/textrules/src/index.ts";
import { isTextDocDocumentV1 } from "../packages/textdoc/src/index.ts";
import { isTextProtocolResultEnvelopeV1 } from "../packages/textprotocol/src/index.ts";
import { isTextConformanceReportV1 } from "../packages/textconformance/src/index.ts";

const ajv = new Ajv({ allErrors: true, strict: true });

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

const slicesSchemaPath = "schemas/relation-extraction-slices-v1.schema.json";
const expectedSchemaPath = "schemas/relation-extraction-expected-v1.schema.json";
const conformanceSchemaPath = "schemas/textconformance-report-v1.schema.json";
const slicesPath = "fixtures/relation-extraction/slices.json";
const reportPath = "fixtures/reports/nlp-relation-extraction/conformance-report.json";

const [slicesSchema, expectedSchema, conformanceSchema, slices, report] = await Promise.all([
  readJson(slicesSchemaPath),
  readJson(expectedSchemaPath),
  readJson(conformanceSchemaPath),
  readJson(slicesPath),
  readJson(reportPath),
]);

const validateSlices = ajv.compile(slicesSchema);
const validateExpected = ajv.compile(expectedSchema);
const validateReport = ajv.compile(conformanceSchema);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(validateReport(report), `${reportPath} failed ${conformanceSchemaPath}`, validateReport.errors);

expect(slices.supportStatus === "slice-proven", "Relation extraction support status must be slice-proven.");
expect(
  slices.expectedOutputStatus === "recorded",
  "Relation extraction feature gate requires recorded expected outputs.",
);
expect(
  slices.comparatorStatus === "claim-downgraded",
  "Relation extraction readiness must explicitly downgrade comparator-backed claims.",
);

const requiredLabels = ["employed-by", "located-in", "part-of", "no-relation"];
expect(
  requiredLabels.every((label) => slices.relationLabelPolicy.labels.includes(label)),
  "Relation extraction label policy is missing a required label.",
);

const requiredPhenomena = new Set([
  "intra-sentence-relation",
  "cross-sentence-evidence",
  "cooccurrence-control",
  "negated-relation",
  "non-english-latin-script",
  "non-latin-script",
  "right-to-left-script",
]);
const seenPhenomena = new Set();
const fixtureIds = new Set();
const fixturesById = new Map();
for (const fixture of slices.fixtures) {
  expect(!fixtureIds.has(fixture.id), `Duplicate relation extraction fixture id: ${fixture.id}`);
  fixtureIds.add(fixture.id);
  fixturesById.set(fixture.id, fixture);
  for (const phenomenon of fixture.phenomena) seenPhenomena.add(phenomenon);
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Relation extraction readiness is missing ${phenomenon}.`);
}

const negativeFailures = new Set(slices.negativeControls.map((entry) => entry.expectedFailure));
for (const required of ["cooccurrence-without-relation", "negated-relation"]) {
  expect(negativeFailures.has(required), `Relation extraction negative controls are missing ${required}.`);
}

function entitySpan(entity) {
  const target = entity.targets?.[0];
  expect(target?.kind === "span", `bad relation entity target for ${entity.id}`);
  return {
    startCU: target.startCU,
    endCU: target.endCU,
    text: entity.text,
  };
}

function projectRelations(document) {
  const entityLayer = document.layers.find((layer) => layer.id === "relation-arguments");
  const relationLayer = document.layers.find((layer) => layer.id === "relations");
  expect(entityLayer !== undefined, "relation extraction output must contain relation-arguments layer.");
  expect(relationLayer !== undefined, "relation extraction output must contain relations layer.");
  const entityById = new Map(entityLayer.annotations.map((annotation) => [annotation.id, annotation]));
  return relationLayer.annotations.map((relation) => ({
    id: relation.id,
    label: relation.relationType,
    arguments: relation.arguments.map((argument) => {
      const entity = entityById.get(argument.annotationId);
      expect(entity !== undefined, `${relation.id} references missing argument ${argument.annotationId}`);
      return {
        role: argument.role,
        target: entitySpan(entity),
      };
    }),
    evidence: relation.targets.map((target) => {
      expect(target.kind === "annotation", `${relation.id} evidence target must be an annotation ref.`);
      const evidence = entityById.get(target.annotationId);
      expect(evidence !== undefined, `${relation.id} references missing evidence ${target.annotationId}`);
      return entitySpan(evidence);
    }),
  }));
}

const expectedDir = "fixtures/relation-extraction/expected";
const expectedFiles = (await readdir(expectedDir)).filter((file) => file.endsWith(".json")).sort();
const expectedSliceIds = new Set();
for (const file of expectedFiles) {
  const dataPath = `${expectedDir}/${file}`;
  const expected = await readJson(dataPath);
  expect(validateExpected(expected), `${dataPath} failed ${expectedSchemaPath}`, validateExpected.errors);
  const fixture = fixturesById.get(expected.sliceId);
  expect(fixture !== undefined, `${dataPath} references unknown fixture ${expected.sliceId}`);
  expectedSliceIds.add(expected.sliceId);

  const result = analyzeRelationExtraction({
    documentId: `relation:${expected.sliceId}`,
    text: fixture.source.text,
    sourceId: expected.sliceId,
    languageHint: fixture.language,
  });
  expect(isTextDocDocumentV1(result.document), `${expected.sliceId} output failed textdoc runtime guard.`);
  expect(
    JSON.stringify(projectRelations(result.document)) === JSON.stringify(expected.relations),
    `${expected.sliceId} generated relations do not match expected output.`,
  );
  const envelope = createRelationExtractionResultEnvelope(result, {
    producerVersion: "0.0.0",
    referenceId: expected.sliceId,
  });
  expect(isTextProtocolResultEnvelopeV1(envelope), `${expected.sliceId} envelope failed runtime guard.`);
  const conformance = createRelationExtractionConformanceReport(envelope, {
    expectedArtifactPath: dataPath,
    matchesExpected: true,
  });
  expect(isTextConformanceReportV1(conformance), `${expected.sliceId} conformance report failed runtime guard.`);
}

for (const fixtureId of fixtureIds) {
  expect(expectedSliceIds.has(fixtureId), `Relation extraction expected outputs are missing ${fixtureId}.`);
}

const unsupported = analyzeRelationExtraction({
  documentId: "relation:unsupported-control",
  text: "Mira and Jana read the file.",
  sourceId: "unsupported-control",
  languageHint: "en",
});
expect(
  unsupported.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-relation-pattern"),
  "Unsupported relation input must emit an explicit diagnostic.",
);

const readinessDoc = await readText("docs/specs/relation-extraction-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Target representation",
  "## Relation label policy",
  "## Evidence-span policy",
  "## Allowed fixture policy",
  "## Input slices",
  "## Comparator and corpus freeze",
  "## Expected-output format",
  "## Verification",
]) {
  expect(readinessDoc.includes(heading), `relation-extraction-readiness.md missing heading: ${heading}`);
}

const researchLedger = await readText("docs/specs/nlp-relation-extraction-research-ledger.md");
for (const heading of [
  "## Scope",
  "## Primary sources",
  "## Comparator capability evidence",
  "## Comparator limitations",
  "## Readiness consequences",
]) {
  expect(researchLedger.includes(heading), `nlp-relation-extraction-research-ledger.md missing heading: ${heading}`);
}

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-relation-extraction");
expect(task?.status === "slice-proven", "Support status must mark nlp-relation-extraction as slice-proven.");

console.log(`Relation extraction feature artifacts OK (fixtures=${slices.fixtures.length}).`);
