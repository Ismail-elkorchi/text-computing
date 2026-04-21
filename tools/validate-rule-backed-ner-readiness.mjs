import Ajv from "ajv";
import { readFile } from "node:fs/promises";

const artifactPairs = [
  {
    schemaPath: "schemas/rule-backed-ner-slices-v1.schema.json",
    dataPath: "fixtures/rule-backed-ner/slices.json",
  },
  {
    schemaPath: "schemas/rule-backed-ner-tool-versions-v1.schema.json",
    dataPath: "fixtures/rule-backed-ner/tool-versions.json",
  },
];

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

for (const pair of artifactPairs) {
  const schema = await readJson(pair.schemaPath);
  const validate = ajv.compile(schema);
  const data = await readJson(pair.dataPath);
  if (!validate(data)) {
    console.error(`${pair.dataPath} failed ${pair.schemaPath}`);
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(1);
  }
}

const expectedSchema = await readJson("schemas/rule-backed-ner-expected-v1.schema.json");
ajv.addSchema(await readJson("schemas/textdoc-document-v1.schema.json"), "textdoc-document-v1.schema.json");
const validateExpected = ajv.compile(expectedSchema);
if (!validateExpected({ schemaVersion: 1, sliceId: "placeholder", source: { sliceId: "placeholder" }, document: {
  schemaVersion: 1,
  documentId: "placeholder",
  revision: "placeholder",
  textLengthCU: 0,
  units: { text: "utf16-code-unit" },
  views: [{ id: "source-view", kind: "source" }],
  layers: [{
    id: "entities",
    kind: "entity",
    viewId: "source-view",
    annotations: [{
      id: "entity-1",
      kind: "entity",
      lifecycle: { state: "active" },
      targets: [{ kind: "span", startCU: 0, endCU: 0 }],
      label: "ORG"
    }]
  }]
}})) {
  console.error("schemas/rule-backed-ner-expected-v1.schema.json does not accept a minimal textdoc document");
  console.error(JSON.stringify(validateExpected.errors, null, 2));
  process.exit(1);
}

const slices = await readJson("fixtures/rule-backed-ner/slices.json");
const sliceIds = new Set();
const coveredPhenomena = new Set();
for (const slice of slices.slices) {
  if (sliceIds.has(slice.id)) {
    console.error(`Duplicate rule-backed NER slice id: ${slice.id}`);
    process.exit(1);
  }
  sliceIds.add(slice.id);
  for (const phenomenon of slice.phenomena) {
    coveredPhenomena.add(phenomenon);
  }
}

for (const requiredPhenomenon of [
  "nested-span",
  "overlapping-span",
  "alias",
  "capitalization-ambiguity",
  "false-match",
]) {
  if (!coveredPhenomena.has(requiredPhenomenon)) {
    console.error(`Rule-backed NER readiness is missing phenomenon ${requiredPhenomenon}`);
    process.exit(1);
  }
}

const toolVersions = await readJson("fixtures/rule-backed-ner/tool-versions.json");
if (toolVersions.targetLabels.join(",") !== "PER,ORG,LOC") {
  console.error("Rule-backed NER targetLabels must be exactly PER, ORG, LOC");
  process.exit(1);
}

const hasPythonOrJvmComparator = toolVersions.comparators.some((tool) =>
  tool.runtime === "python" || tool.runtime === "jvm",
);
const hasJavaScriptComparator = toolVersions.comparators.some((tool) => tool.runtime === "javascript");
if (!hasPythonOrJvmComparator || !hasJavaScriptComparator) {
  console.error("Rule-backed NER readiness requires at least one Python/JVM comparator and one JavaScript comparator.");
  process.exit(1);
}

const readinessDoc = await readFile("docs/specs/rule-backed-ner-readiness.md", "utf8");
for (const heading of [
  "## Why this document exists",
  "## Label policy",
  "## Allowed fixture policy",
  "## Input slices",
  "## Expected-output format",
  "## Comparator freeze",
  "## Verification",
]) {
  if (!readinessDoc.includes(heading)) {
    console.error(`docs/specs/rule-backed-ner-readiness.md is missing heading: ${heading}`);
    process.exit(1);
  }
}

const researchLedger = await readFile("docs/specs/nlp-rule-backed-ner-research-ledger.md", "utf8");
for (const heading of [
  "## Scope",
  "## Primary sources",
  "## Comparator capability evidence",
  "## Readiness consequences",
]) {
  if (!researchLedger.includes(heading)) {
    console.error(`docs/specs/nlp-rule-backed-ner-research-ledger.md is missing heading: ${heading}`);
    process.exit(1);
  }
}

const outputDifferences = await readFile("docs/decisions/rule-backed-ner-output-differences.md", "utf8");
if (!outputDifferences.includes("## Documented non-failure differences")) {
  console.error("docs/decisions/rule-backed-ner-output-differences.md is missing documented differences.");
  process.exit(1);
}

console.log("Rule-backed NER readiness artifacts OK.");
