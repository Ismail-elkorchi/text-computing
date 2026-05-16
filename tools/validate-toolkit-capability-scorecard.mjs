import { access, readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";

const ROOT = process.cwd();
const SCORECARD_PATH = "fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json";
const SCORECARD_SCHEMA_PATH = "schemas/toolkit-capability-scorecard-v1.schema.json";
const SUPPORT_STATUS_PATH = "docs/specs/support-status.v1.json";

const REQUIRED_AXES = [
  "task-coverage",
  "language-tier",
  "comparator-evidence",
  "corpus-evidence",
  "conformance",
  "api",
  "performance",
  "release-readiness",
  "security",
  "reproducibility",
];
const BLOCKED_PUBLIC_CLAIM_TERMS = [
  ["b", "est"].join(""),
  ["b", "etter"].join(""),
  ["sup", "erior"].join(""),
  ["world", "-", "class"].join(""),
  ["world", " ", "class"].join(""),
  ["state", "-", "of", "-", "the", "-", "art"].join(""),
  ["state", " ", "of", " ", "the", " ", "art"].join(""),
  ["sur", "pass"].join(""),
];

function expect(condition, message, details) {
  if (condition) return;
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

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

function assertRepositoryRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

function collectTextValues(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTextValues(item, output);
    return output;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectTextValues(item, output);
  }
  return output;
}

function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
  return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, "iu");
}

const [schema, scorecard, supportStatus] = await Promise.all([
  readJson(SCORECARD_SCHEMA_PATH),
  readJson(SCORECARD_PATH),
  readJson(SUPPORT_STATUS_PATH),
]);

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
expect(validate(scorecard), `${SCORECARD_PATH} failed ${SCORECARD_SCHEMA_PATH}`, validate.errors);

const supportGrades = new Set(scorecard.supportGradeOrder);
for (const required of ["scaffold", "readiness-only", "slice-proven", "beta", "production-candidate"]) {
  expect(supportGrades.has(required), `scorecard supportGradeOrder is missing ${required}`);
}

const languageTierIds = new Set(scorecard.languageTiers.map((tier) => tier.id));
expect(languageTierIds.size === scorecard.languageTiers.length, "language tier ids must be unique");

const axisIds = new Set(scorecard.axes.map((axis) => axis.id));
expect(axisIds.size === scorecard.axes.length, "scorecard axis ids must be unique");
for (const requiredAxis of REQUIRED_AXES) {
  expect(axisIds.has(requiredAxis), `scorecard missing required axis ${requiredAxis}`);
}

const blockedPatterns = BLOCKED_PUBLIC_CLAIM_TERMS.map((term) => [term, termPattern(term)]);
for (const text of collectTextValues(scorecard)) {
  for (const [term, pattern] of blockedPatterns) {
    expect(!pattern.test(text), `${SCORECARD_PATH} contains blocked public claim term "${term}" in: ${text}`);
  }
}

const supportPackages = new Map(supportStatus.packages.map((entry) => [entry.name, entry.status]));
const supportTasks = new Map(supportStatus.tasks.map((entry) => [entry.id, entry.status]));

expect(
  new Set(scorecard.packageRows.map((row) => row.packageName)).size === scorecard.packageRows.length,
  "scorecard package rows must be unique",
);
expect(
  new Set(scorecard.taskRows.map((row) => row.taskId)).size === scorecard.taskRows.length,
  "scorecard task rows must be unique",
);

for (const row of scorecard.packageRows) {
  expect(supportPackages.has(row.packageName), `scorecard package is absent from support status: ${row.packageName}`);
  expect(
    supportPackages.get(row.packageName) === row.supportStatus,
    `scorecard package status mismatch for ${row.packageName}: ${row.supportStatus} != ${supportPackages.get(row.packageName)}`,
  );
  for (const ref of row.evidenceRefs) {
    assertRepositoryRef(ref, `${row.packageName} evidenceRefs`);
    expect(await fileExists(ref), `${row.packageName} evidence ref does not exist: ${ref}`);
  }
}

for (const packageName of supportPackages.keys()) {
  expect(
    scorecard.packageRows.some((row) => row.packageName === packageName),
    `support-status package missing from scorecard: ${packageName}`,
  );
}

for (const row of scorecard.taskRows) {
  expect(supportTasks.has(row.taskId), `scorecard task is absent from support status: ${row.taskId}`);
  expect(
    supportTasks.get(row.taskId) === row.supportStatus,
    `scorecard task status mismatch for ${row.taskId}: ${row.supportStatus} != ${supportTasks.get(row.taskId)}`,
  );
  expect(languageTierIds.has(row.languageTier), `scorecard task ${row.taskId} has unknown language tier ${row.languageTier}`);
  for (const ref of row.evidenceRefs) {
    assertRepositoryRef(ref, `${row.taskId} evidenceRefs`);
    expect(await fileExists(ref), `${row.taskId} evidence ref does not exist: ${ref}`);
  }
}

for (const taskId of supportTasks.keys()) {
  expect(
    scorecard.taskRows.some((row) => row.taskId === taskId),
    `support-status task missing from scorecard: ${taskId}`,
  );
}

for (const axis of scorecard.axes) {
  for (const ref of axis.evidenceRequired) {
    if (!ref.includes("/") || ref.startsWith("npm run ") || ref === "package tests") continue;
    assertRepositoryRef(ref, `${axis.id} evidenceRequired`);
    expect(await fileExists(ref), `${axis.id} evidence ref does not exist: ${ref}`);
  }
}

for (const gate of scorecard.releaseGates) {
  for (const ref of gate.evidenceRequired) {
    if (!ref.includes("/") || ref.startsWith("npm run ") || ref === "package tests") continue;
    assertRepositoryRef(ref, `${gate.id} evidenceRequired`);
    expect(await fileExists(ref), `${gate.id} evidence ref does not exist: ${ref}`);
  }
}

console.log(
  `Toolkit capability scorecard OK (packages=${scorecard.packageRows.length} tasks=${scorecard.taskRows.length} axes=${scorecard.axes.length}).`,
);
