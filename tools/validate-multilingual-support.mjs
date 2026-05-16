import Ajv from "ajv";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const MATRIX_PATH = "fixtures/multilingual-support/tier-matrix.v1.json";
const SCHEMA_PATH = "schemas/multilingual-support-tiers-v1.schema.json";
const REQUIRED_TIERS = [
  "unicode-invariant",
  "fixture-proven",
  "resource-backed",
  "comparator-backed",
  "corpus-backed",
];
const REQUIRED_SCRIPTS = [
  "Devanagari",
  "Cyrillic",
  "Hebrew",
  "Ethiopic",
  "Greek",
  "Armenian",
  "Georgian",
  "Tamil",
  "Han",
  "Thai",
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(await readJson(SCHEMA_PATH));
const matrix = await readJson(MATRIX_PATH);

if (!validate(matrix)) {
  fail(`${MATRIX_PATH} failed ${SCHEMA_PATH}`, validate.errors);
}

const tierNames = matrix.tiers.map((tier) => tier.name).sort();
const requiredTierNames = [...REQUIRED_TIERS].sort();
if (JSON.stringify(tierNames) !== JSON.stringify(requiredTierNames)) {
  fail("Multilingual support matrix must define exactly the canonical tier names.", {
    expected: requiredTierNames,
    actual: tierNames,
  });
}

if (
  matrix.externalReference.name !== "Universal Dependencies" ||
  matrix.externalReference.version !== "2.18" ||
  matrix.externalReference.treebanks < 353 ||
  matrix.externalReference.languages < 193
) {
  fail("Multilingual support matrix must anchor expansion against the current UD 2.18 breadth reference.");
}

for (const tier of matrix.tiers) {
  if (tier.status === "present" && tier.evidenceRefs.length < 1) {
    fail(`${tier.name} is present but has no evidence references.`);
  }
  if (
    tier.name !== "unicode-invariant" &&
    tier.claimBoundary.toLowerCase().includes("all languages")
  ) {
    fail(`${tier.name} claimBoundary must not claim all-language support.`);
  }
  for (const ref of tier.evidenceRefs) {
    if (!(await fileExists(ref))) {
      fail(`${tier.name} evidence reference does not exist: ${ref}`);
    }
  }
}

const scripts = new Set(matrix.scriptFixtures.map((fixture) => fixture.script));
for (const script of REQUIRED_SCRIPTS) {
  if (!scripts.has(script)) {
    fail(`Multilingual support matrix is missing readiness-only script fixture for ${script}.`);
  }
}

const fixtureIds = new Set();
for (const fixture of matrix.scriptFixtures) {
  if (fixtureIds.has(fixture.id)) {
    fail(`Duplicate multilingual script fixture id: ${fixture.id}`);
  }
  fixtureIds.add(fixture.id);
  if (!(await fileExists(fixture.inputPath))) {
    fail(`Multilingual script fixture input is missing: ${fixture.inputPath}`);
  }
  const text = await readFile(fixture.inputPath, "utf8");
  if (text.trim().length === 0) {
    fail(`Multilingual script fixture input is empty: ${fixture.inputPath}`);
  }
  const actualHash = await sha256(fixture.inputPath);
  if (actualHash !== fixture.sha256) {
    fail(`${fixture.inputPath} sha256 mismatch.`, {
      expected: fixture.sha256,
      actual: actualHash,
    });
  }
  if (fixture.supportTier === "readiness-only" && fixture.evidenceRefs.length > 0) {
    fail(`${fixture.id} is readiness-only but lists behavior evidence refs.`);
  }
  for (const ref of fixture.evidenceRefs) {
    if (!(await fileExists(ref))) {
      fail(`${fixture.id} evidence reference does not exist: ${ref}`);
    }
  }
}

const doc = await readFile("docs/specs/multilingual-support-tiers.md", "utf8");
for (const heading of [
  "## Why this document exists",
  "## Tier definitions",
  "## Current support matrix",
  "## Script fixture expansion",
  "## Interpretation rules",
]) {
  if (!doc.includes(heading)) {
    fail(`multilingual-support-tiers.md is missing ${heading}`);
  }
}

console.log("Multilingual support tiers OK.");
