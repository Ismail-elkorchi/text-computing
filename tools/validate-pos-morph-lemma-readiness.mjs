import Ajv from "ajv";
import { readdir, readFile } from "node:fs/promises";

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
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

const slicesSchemaPath = "schemas/pos-morph-lemma-slices-v1.schema.json";
const toolVersionsSchemaPath = "schemas/pos-morph-lemma-tool-versions-v1.schema.json";
const expectedSchemaPath = "schemas/pos-morph-lemma-expected-v1.schema.json";
const comparisonSchemaPath = "schemas/pos-morph-lemma-comparison-v1.schema.json";
const textdocSchemaPath = "schemas/textdoc-document-v1.schema.json";

const slicesSchema = await readJson(slicesSchemaPath);
const toolVersionsSchema = await readJson(toolVersionsSchemaPath);
const expectedSchema = await readJson(expectedSchemaPath);
const comparisonSchema = await readJson(comparisonSchemaPath);
const textdocSchema = await readJson(textdocSchemaPath);

const validateSlices = ajv.compile(slicesSchema);
const validateToolVersions = ajv.compile(toolVersionsSchema);
const validateComparison = ajv.compile(comparisonSchema);
ajv.addSchema(textdocSchema, textdocSchema.$id);
ajv.compile(expectedSchema);

const slicesPath = "fixtures/pos-morph-lemma/slices.json";
const toolVersionsPath = "fixtures/pos-morph-lemma/tool-versions.json";

const slices = await readJson(slicesPath);
const toolVersions = await readJson(toolVersionsPath);

expect(validateSlices(slices), `${slicesPath} failed ${slicesSchemaPath}`, validateSlices.errors);
expect(
  validateToolVersions(toolVersions),
  `${toolVersionsPath} failed ${toolVersionsSchemaPath}`,
  validateToolVersions.errors,
);

const requiredPhenomena = new Set([
  "unknown-word",
  "multiword-token",
  "clitic",
  "historical-spelling",
  "code-switching",
]);
const seenPhenomena = new Set();
const sliceIds = new Set();
for (const slice of slices.slices) {
  expect(!sliceIds.has(slice.id), `Duplicate POS/morph/lemma slice id ${slice.id}.`);
  sliceIds.add(slice.id);
  for (const phenomenon of slice.phenomena) {
    seenPhenomena.add(phenomenon);
  }
}
for (const phenomenon of requiredPhenomena) {
  expect(
    seenPhenomena.has(phenomenon),
    `POS/morph/lemma readiness is missing required phenomenon coverage for ${phenomenon}.`,
  );
}

const runtimes = new Set(toolVersions.comparators.map((entry) => entry.runtime));
expect(
  runtimes.has("javascript"),
  "POS/morph/lemma readiness requires at least one frozen JavaScript comparator.",
);
expect(
  runtimes.has("python") || runtimes.has("jvm"),
  "POS/morph/lemma readiness requires at least one frozen Python or JVM comparator.",
);

const comparisonDir = "fixtures/pos-morph-lemma/comparisons";
const comparisonFiles = (await readdir(comparisonDir)).filter((file) => file.endsWith(".json")).sort();
expect(comparisonFiles.length >= 1, "POS/morph/lemma readiness requires at least one comparator capture.");

let executedCaptureCount = 0;
for (const file of comparisonFiles) {
  const path = `${comparisonDir}/${file}`;
  const comparison = await readJson(path);
  expect(validateComparison(comparison), `${path} failed ${comparisonSchemaPath}`, validateComparison.errors);
  const comparator = toolVersions.comparators.find(
    (entry) => entry.name === comparison.comparator.name && entry.version === comparison.comparator.version,
  );
  expect(comparator !== undefined, `${path} comparator is not listed in tool-versions.json.`);
  if (comparator?.capturePath !== undefined) {
    expect(comparator.capturePath === path, `${path} must match capturePath in tool-versions.json.`);
  }
  expect(comparator?.executionStatus === "executed", `${path} must correspond to an executed comparator.`);
  executedCaptureCount += 1;
  const sliceIdsInCapture = new Set(comparison.slices.map((slice) => slice.sliceId));
  for (const sliceId of sliceIds) {
    expect(sliceIdsInCapture.has(sliceId), `${path} is missing slice ${sliceId}.`);
  }
}

expect(executedCaptureCount >= 1, "POS/morph/lemma readiness requires at least one executed comparator capture.");

const readinessDoc = await readText("docs/specs/pos-morph-lemma-readiness.md");
const researchLedger = await readText("docs/specs/nlp-pos-morph-lemma-research-ledger.md");
const differencesDoc = await readText("docs/decisions/pos-morph-lemma-output-differences.md");

expect(
  readinessDoc.includes("## Tag mapping policy"),
  "POS/morph/lemma readiness doc must define a tag mapping policy section.",
);
expect(
  readinessDoc.includes("## Expected-output format"),
  "POS/morph/lemma readiness doc must define an expected-output format section.",
);
expect(
  researchLedger.includes("## Primary sources"),
  "POS/morph/lemma research ledger must list primary sources.",
);
expect(
  differencesDoc.includes("## Documented non-failure differences"),
  "POS/morph/lemma output-differences doc must record non-failure differences.",
);

console.log("POS/morph/lemma readiness artifacts OK.");
