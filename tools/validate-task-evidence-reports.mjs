import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = "fixtures/reports/task-evidence-manifest.v1.json";
const MANIFEST_SCHEMA_PATH = "schemas/task-evidence-manifest-v1.schema.json";
const REPORT_SCHEMA_PATH = "schemas/textconformance-report-v1.schema.json";
const SUPPORT_STATUS_PATH = "docs/specs/support-status.v1.json";

const PRIVATE_LEAK_PATTERNS = [
  /\/home\//,
  new RegExp(["tse", "workbench"].join("-")),
  new RegExp(["projects", "text-computing", "private"].join("\\/")),
  /\braw prompt\b/i,
  /\bscratchpad\b/i,
];

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
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function collectStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, output);
    return output;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      output.push(key);
      collectStrings(entry, output);
    }
  }
  return output;
}

function assertPublicStringSurface(label, value) {
  for (const text of collectStrings(value)) {
    for (const pattern of PRIVATE_LEAK_PATTERNS) {
      expect(!pattern.test(text), `${label} contains private-only text: ${text}`);
    }
  }
}

function assertRelativeEvidenceRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

function summarizeChecks(checks) {
  const summary = { pass: 0, fail: 0, notRun: 0 };
  for (const check of checks) {
    if (check.status === "pass") summary.pass += 1;
    if (check.status === "fail") summary.fail += 1;
    if (check.status === "not-run") summary.notRun += 1;
  }
  return summary;
}

const ajv = new Ajv({ allErrors: true, strict: true });
const manifestSchema = await readJson(MANIFEST_SCHEMA_PATH);
const reportSchema = await readJson(REPORT_SCHEMA_PATH);
const validateManifest = ajv.compile(manifestSchema);
const validateReport = ajv.compile(reportSchema);

const manifest = await readJson(MANIFEST_PATH);
const supportStatus = await readJson(SUPPORT_STATUS_PATH);

expect(validateManifest(manifest), `${MANIFEST_PATH} failed ${MANIFEST_SCHEMA_PATH}`, validateManifest.errors);
assertPublicStringSurface(MANIFEST_PATH, manifest);

const sliceProvenTasks = supportStatus.tasks
  .filter((task) => task.status === "slice-proven")
  .map((task) => task.id)
  .sort();
const supportTasksById = new Map(supportStatus.tasks.map((task) => [task.id, task]));
const manifestTasksById = new Map();

for (const task of manifest.tasks) {
  expect(!manifestTasksById.has(task.taskId), `Duplicate task evidence entry: ${task.taskId}`);
  manifestTasksById.set(task.taskId, task);

  const supportTask = supportTasksById.get(task.taskId);
  expect(supportTask !== undefined, `Task evidence entry is not in support status: ${task.taskId}`);
  expect(
    supportTask.status === "slice-proven",
    `Task evidence entry must be limited to slice-proven tasks: ${task.taskId}`,
  );
  expect(
    task.supportStatus === supportTask.status,
    `Task evidence status mismatch for ${task.taskId}: ${task.supportStatus} != ${supportTask.status}`,
  );
  expect(
    supportTask.evidence.includes(task.reportPath),
    `Support status evidence for ${task.taskId} must cite ${task.reportPath}.`,
  );

  const manifestRefs = [...task.evidenceRefs, ...(task.comparatorRefs ?? []), task.reportPath];
  for (const ref of manifestRefs) {
    assertRelativeEvidenceRef(ref, `${task.taskId} manifest evidence ref`);
    expect(await fileExists(ref), `${task.taskId} manifest evidence ref does not exist: ${ref}`);
  }

  const report = await readJson(task.reportPath);
  expect(validateReport(report), `${task.reportPath} failed ${REPORT_SCHEMA_PATH}`, validateReport.errors);
  assertPublicStringSurface(task.reportPath, report);
  expect(report.reportId === `task-evidence:${task.taskId}`, `${task.reportPath} reportId must name its task.`);
  expect(report.subject.kind === "task", `${task.reportPath} subject.kind must be task.`);
  expect(report.subject.id === task.taskId, `${task.reportPath} subject.id must match manifest taskId.`);
  expect(report.summary.fail === 0, `${task.reportPath} must not persist failing checks.`);

  const actualSummary = summarizeChecks(report.checks);
  expect(
    JSON.stringify(report.summary) === JSON.stringify(actualSummary),
    `${task.reportPath} summary does not match checks.`,
    { expected: actualSummary, actual: report.summary },
  );

  for (const check of report.checks) {
    for (const ref of check.evidenceRefs ?? []) {
      assertRelativeEvidenceRef(ref, `${task.taskId} report evidence ref`);
      expect(await fileExists(ref), `${task.taskId} report evidence ref does not exist: ${ref}`);
    }
  }
}

const manifestTaskIds = [...manifestTasksById.keys()].sort();
expect(
  JSON.stringify(manifestTaskIds) === JSON.stringify(sliceProvenTasks),
  "Task evidence manifest must cover exactly the slice-proven support-status tasks.",
  { expected: sliceProvenTasks, actual: manifestTaskIds },
);

console.log(`Task evidence reports OK (tasks=${manifestTaskIds.length}).`);
