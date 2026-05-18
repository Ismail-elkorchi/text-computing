import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const GATES_PATH = "fixtures/performance/gates.v1.json";
const SCHEMA_PATH = "schemas/performance-gates-v1.schema.json";
const REQUIRED_DIMENSIONS = [
  "throughput",
  "memory",
  "streaming",
  "large-corpus",
  "regression-threshold",
];
const REQUIRED_PACKAGES = [
  "@ismail-elkorchi/textdoc",
  "@ismail-elkorchi/textpipeline",
  "@ismail-elkorchi/textcorpus",
  "@ismail-elkorchi/textpack",
  "@ismail-elkorchi/textconformance",
  "@ismail-elkorchi/textrules",
  "@ismail-elkorchi/textlab",
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(relativePath, "utf8"));
}

async function fileExists(relativePath) {
  try {
    await access(relativePath);
    return true;
  } catch {
    return false;
  }
}

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function assertRepoRef(ref, label) {
  if (path.isAbsolute(ref) || ref.includes("..") || ref.includes("\\") || /^https?:\/\//.test(ref)) {
    fail(`${label} must be a repository-relative artifact ref: ${ref}`);
  }
}

const ajv = new Ajv({ allErrors: true, strict: true });
const schema = await readJson(SCHEMA_PATH);
const gates = await readJson(GATES_PATH);
const validate = ajv.compile(schema);

if (!validate(gates)) {
  fail(`${GATES_PATH} failed ${SCHEMA_PATH}`, validate.errors);
}

const dimensions = new Set();
const packages = new Set();
const gateIds = new Set();
for (const gate of gates.gates) {
  if (gateIds.has(gate.id)) fail(`Duplicate performance gate id: ${gate.id}`);
  gateIds.add(gate.id);
  packages.add(gate.packageName);
  for (const dimension of gate.dimensions) dimensions.add(dimension);
  if (!gate.dimensions.includes("regression-threshold")) {
    fail(`${gate.id} must include a regression-threshold dimension.`);
  }
  for (const ref of gate.evidenceRefs) {
    assertRepoRef(ref, `${gate.id} evidenceRefs`);
    if (!(await fileExists(ref))) fail(`${gate.id} evidence ref does not exist: ${ref}`);
  }
}

for (const dimension of REQUIRED_DIMENSIONS) {
  if (!dimensions.has(dimension)) fail(`Performance gates are missing dimension ${dimension}.`);
}

for (const packageName of REQUIRED_PACKAGES) {
  if (!packages.has(packageName)) fail(`Performance gates are missing package ${packageName}.`);
}

const doc = await readFile("docs/specs/performance-gates.md", "utf8");
for (const heading of [
  "## Why this document exists",
  "## Gate dimensions",
  "## Current boundary",
  "## Verification",
]) {
  if (!doc.includes(heading)) fail(`performance-gates.md is missing ${heading}`);
}

console.log(`Performance gates OK (gates=${gates.gates.length}).`);
