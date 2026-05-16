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

const slicesSchemaPath = "schemas/coreference-slices-v1.schema.json";
const expectedSchemaPath = "schemas/coreference-expected-v1.schema.json";
const conformanceSchemaPath = "schemas/textconformance-report-v1.schema.json";
const slicesPath = "fixtures/coreference/slices.json";
const reportPath = "fixtures/reports/nlp-coreference/conformance-report.json";

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

expect(slices.supportStatus === "readiness-only", "Coreference support status must stay readiness-only.");
expect(slices.expectedOutputStatus === "schema-defined", "Coreference readiness must not claim recorded expected outputs yet.");
expect(slices.comparatorStatus === "capability-recorded", "Coreference readiness must not claim executed comparator captures yet.");

const requiredMentionKinds = ["proper", "nominal", "pronoun", "singleton"];
expect(
  requiredMentionKinds.every((kind) => slices.chainPolicy.mentionKinds.includes(kind)),
  "Coreference chain policy is missing a required mention kind.",
);

const requiredPhenomena = new Set([
  "proper-mention",
  "nominal-mention",
  "pronoun-link",
  "singleton-control",
  "ambiguous-pronoun",
  "split-antecedent-control",
  "non-english-latin-script",
  "non-latin-script",
  "right-to-left-script",
]);
const seenPhenomena = new Set();
const fixtureIds = new Set();
for (const fixture of slices.fixtures) {
  expect(!fixtureIds.has(fixture.id), `Duplicate coreference fixture id: ${fixture.id}`);
  fixtureIds.add(fixture.id);
  for (const phenomenon of fixture.phenomena) seenPhenomena.add(phenomenon);
}
for (const phenomenon of requiredPhenomena) {
  expect(seenPhenomena.has(phenomenon), `Coreference readiness is missing ${phenomenon}.`);
}

const negativeFailures = new Set(slices.negativeControls.map((entry) => entry.expectedFailure));
for (const required of ["ambiguous-antecedent", "split-antecedent-unsupported"]) {
  expect(negativeFailures.has(required), `Coreference negative controls are missing ${required}.`);
}

const readinessDoc = await readText("docs/specs/coreference-readiness.md");
for (const heading of [
  "## Why this document exists",
  "## Target representation",
  "## Mention and chain policy",
  "## Ambiguity and loss policy",
  "## Allowed fixture policy",
  "## Input slices",
  "## Comparator and corpus freeze",
  "## Expected-output format",
  "## Verification",
]) {
  expect(readinessDoc.includes(heading), `coreference-readiness.md missing heading: ${heading}`);
}

const researchLedger = await readText("docs/specs/nlp-coreference-research-ledger.md");
for (const heading of [
  "## Scope",
  "## Primary sources",
  "## Comparator capability evidence",
  "## Comparator limitations",
  "## Readiness consequences",
]) {
  expect(researchLedger.includes(heading), `nlp-coreference-research-ledger.md missing heading: ${heading}`);
}

const supportStatus = await readJson("docs/specs/support-status.v1.json");
const task = supportStatus.tasks.find((entry) => entry.id === "nlp-coreference");
expect(task?.status === "readiness-only", "Support status must mark nlp-coreference as readiness-only.");

console.log(`Coreference readiness artifacts OK (fixtures=${slices.fixtures.length}).`);
