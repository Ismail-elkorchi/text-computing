import Ajv from "ajv";
import { readdir, readFile } from "node:fs/promises";

const artifactPairs = [
  {
    schemaPath: "schemas/tokenization-sbd-slices-v1.schema.json",
    dataPath: "fixtures/tokenization-sbd/slices.json",
  },
  {
    schemaPath: "schemas/tokenization-sbd-tool-versions-v1.schema.json",
    dataPath: "fixtures/tokenization-sbd/tool-versions.json",
  },
  {
    schemaPath: "schemas/tokenization-sbd-expected-v1.schema.json",
  },
];

const ajv = new Ajv({ allErrors: true, strict: true });

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

for (const pair of artifactPairs) {
  const schema = await readJson(pair.schemaPath);
  const validate = ajv.compile(schema);
  if (!pair.dataPath) continue;

  const data = await readJson(pair.dataPath);
  const valid = validate(data);
  if (!valid) {
    console.error(`${pair.dataPath} failed ${pair.schemaPath}`);
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(1);
  }
}

const slices = await readJson("fixtures/tokenization-sbd/slices.json");
const sliceIds = new Set();
for (const slice of slices.slices) {
  if (sliceIds.has(slice.id)) {
    console.error(`Duplicate tokenization/SBD slice id: ${slice.id}`);
    process.exit(1);
  }
  sliceIds.add(slice.id);
}

const toolVersions = await readJson("fixtures/tokenization-sbd/tool-versions.json");
const diagnosticToolKeys = new Set(
  toolVersions.diagnosticTools.map((tool) => `${tool.name}@${tool.version}`),
);
const comparisonSchema = await readJson("schemas/tokenization-sbd-comparison-v1.schema.json");
const validateComparison = ajv.compile(comparisonSchema);
const comparisonDir = "fixtures/tokenization-sbd/comparisons";
const comparisonFiles = (await readdir(comparisonDir))
  .filter((file) => file.endsWith(".json"))
  .sort();
if (comparisonFiles.length < 2) {
  console.error("Tokenization/SBD comparisons require at least two comparator output files.");
  process.exit(1);
}

let hasPythonOrJvmComparator = false;
let hasJavaScriptComparator = false;
for (const file of comparisonFiles) {
  const dataPath = `${comparisonDir}/${file}`;
  const data = await readJson(dataPath);
  if (!validateComparison(data)) {
    console.error(`${dataPath} failed schemas/tokenization-sbd-comparison-v1.schema.json`);
    console.error(JSON.stringify(validateComparison.errors, null, 2));
    process.exit(1);
  }
  const comparatorKey = `${data.comparator.name}@${data.comparator.version}`;
  if (!diagnosticToolKeys.has(comparatorKey)) {
    console.error(`${dataPath} comparator ${comparatorKey} is not listed in tool-versions.json`);
    process.exit(1);
  }
  if (data.comparator.model) {
    const modelKey = `${data.comparator.model.name}@${data.comparator.model.version}`;
    if (!diagnosticToolKeys.has(modelKey)) {
      console.error(`${dataPath} model ${modelKey} is not listed in tool-versions.json`);
      process.exit(1);
    }
  }

  const comparisonSliceIds = new Set(data.slices.map((slice) => slice.sliceId));
  for (const sliceId of sliceIds) {
    if (!comparisonSliceIds.has(sliceId)) {
      console.error(`${dataPath} does not include slice ${sliceId}`);
      process.exit(1);
    }
  }

  const runtime = data.comparator.runtime.toLowerCase();
  if (runtime.includes("python") || runtime.includes("jvm") || runtime.includes("java")) {
    hasPythonOrJvmComparator = true;
  }
  if (runtime.includes("node") || runtime.includes("javascript") || runtime.includes("js")) {
    hasJavaScriptComparator = true;
  }
}

if (!hasPythonOrJvmComparator || !hasJavaScriptComparator) {
  console.error(
    "Tokenization/SBD comparisons require at least one Python/JVM comparator and one JavaScript comparator.",
  );
  process.exit(1);
}

for (const packageUnderTest of toolVersions.packagesUnderTest) {
  const packageJson = await readJson(packageUnderTest.source);
  if (
    packageJson.name !== packageUnderTest.name ||
    packageJson.version !== packageUnderTest.version
  ) {
    console.error(
      `${packageUnderTest.source} does not match ${packageUnderTest.name}@${packageUnderTest.version}`,
    );
    process.exit(1);
  }
}

console.log("Tokenization/SBD readiness artifacts OK.");
