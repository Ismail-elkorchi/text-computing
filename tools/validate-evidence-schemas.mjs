import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const RUN_SCHEMA_PATH = "schemas/evidence-run-v1.schema.json";
const VALID_RUN_PATH = "fixtures/evidence/valid/evidence-run-tokenization-sbd.v1.json";
const INVALID_RUN_PATH = "fixtures/evidence/invalid/evidence-run-missing-repo.v1.json";

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function fileExists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function assertRelativeRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

async function sha256(relativePath) {
  const data = await readFile(path.join(ROOT, relativePath));
  return createHash("sha256").update(data).digest("hex");
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validateRun = ajv.compile(await readJson(RUN_SCHEMA_PATH));

const validRun = await readJson(VALID_RUN_PATH);
expect(validateRun(validRun), `${VALID_RUN_PATH} failed ${RUN_SCHEMA_PATH}`, validateRun.errors);

for (const input of validRun.inputs) {
  assertRelativeRef(input.path, `${VALID_RUN_PATH} input.path`);
  expect(await fileExists(input.path), `${VALID_RUN_PATH} input path does not exist: ${input.path}`);
  const actualHash = await sha256(input.path);
  expect(
    actualHash === input.sha256,
    `${VALID_RUN_PATH} input hash mismatch for ${input.path}: ${actualHash} != ${input.sha256}`,
  );
}

for (const output of validRun.outputs) {
  if (output.path === undefined || output.sha256 === undefined) continue;
  assertRelativeRef(output.path, `${VALID_RUN_PATH} output.path`);
  expect(await fileExists(output.path), `${VALID_RUN_PATH} output path does not exist: ${output.path}`);
  const actualHash = await sha256(output.path);
  expect(
    actualHash === output.sha256,
    `${VALID_RUN_PATH} output hash mismatch for ${output.path}: ${actualHash} != ${output.sha256}`,
  );
}

for (const ref of validRun.conformanceReportRefs) {
  assertRelativeRef(ref, `${VALID_RUN_PATH} conformanceReportRefs`);
  expect(await fileExists(ref), `${VALID_RUN_PATH} conformance report ref does not exist: ${ref}`);
}

const invalidRun = await readJson(INVALID_RUN_PATH);
expect(!validateRun(invalidRun), `${INVALID_RUN_PATH} must fail ${RUN_SCHEMA_PATH}`);

console.log("Evidence run schema fixtures OK.");
