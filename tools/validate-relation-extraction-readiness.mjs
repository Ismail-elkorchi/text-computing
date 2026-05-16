import Ajv from "ajv";
import { readFile } from "node:fs/promises";

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
ajv.compile(expectedSchema);
const validateReport = ajv.compile(conformanceSchema);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(validateReport(report), `${reportPath} failed ${conformanceSchemaPath}`, validateReport.errors);

expect(slices.supportStatus === "readiness-only", "Relation extraction support status must stay readiness-only.");
expect(
  slices.expectedOutputStatus === "schema-defined",
  "Relation extraction readiness must not claim recorded expected outputs yet.",
);
expect(
  slices.comparatorStatus === "capability-recorded",
  "Relation extraction readiness must not claim executed comparator captures yet.",
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
for (const fixture of slices.fixtures) {
  expect(!fixtureIds.has(fixture.id), `Duplicate relation extraction fixture id: ${fixture.id}`);
  fixtureIds.add(fixture.id);
  for (const phenomenon of fixture.phenomena) seenPhenomena.add(phenomenon);
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Relation extraction readiness is missing ${phenomenon}.`);
}

const negativeFailures = new Set(slices.negativeControls.map((entry) => entry.expectedFailure));
for (const required of ["cooccurrence-without-relation", "negated-relation"]) {
  expect(negativeFailures.has(required), `Relation extraction negative controls are missing ${required}.`);
}

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
expect(task?.status === "readiness-only", "Support status must mark nlp-relation-extraction as readiness-only.");

console.log(`Relation extraction readiness artifacts OK (fixtures=${slices.fixtures.length}).`);
