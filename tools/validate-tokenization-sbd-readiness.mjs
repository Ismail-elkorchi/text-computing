import Ajv from "ajv";
import { readFile } from "node:fs/promises";

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
