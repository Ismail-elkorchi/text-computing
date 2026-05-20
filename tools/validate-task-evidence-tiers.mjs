import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const POLICY_PATH = "fixtures/evidence/task-evidence-tier-policy.v1.json";
const POLICY_SCHEMA_PATH = "schemas/task-evidence-tier-policy-v1.schema.json";
const SUPPORT_STATUS_PATH = "docs/specs/support-status.v1.json";
const SCORECARD_PATH = "fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json";
const EXPECTED_TIER_ORDER = [
  "fixture-proven",
  "comparator-backed",
  "corpus-backed",
  "broad-multilingual",
  "release-stable",
];

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

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
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
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      output.push(key);
      collectStrings(entry, output);
    }
  }
  return output;
}

function assertPublicSurface(label, value) {
  for (const text of collectStrings(value)) {
    for (const pattern of PRIVATE_LEAK_PATTERNS) {
      expect(!pattern.test(text), `${label} contains private-only text: ${text}`);
    }
  }
}

function assertRepoRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

function allRefs(task) {
  return [
    ...task.fixtureSplits.development,
    ...task.fixtureSplits.validation,
    ...task.fixtureSplits.holdout,
    ...task.fixtureSplits.negativeControls,
    ...task.fixtureSplits.externalComparators,
    ...task.fixtureSplits.corpusEvidence,
    ...task.fixtureSplits.performanceEvidence,
    ...task.conformanceReportRefs,
  ];
}

const ajv = new Ajv({ allErrors: true, strict: true });
const [policySchema, policy, supportStatus, scorecard] = await Promise.all([
  readJson(POLICY_SCHEMA_PATH),
  readJson(POLICY_PATH),
  readJson(SUPPORT_STATUS_PATH),
  readJson(SCORECARD_PATH),
]);

const validatePolicy = ajv.compile(policySchema);
expect(validatePolicy(policy), `${POLICY_PATH} failed ${POLICY_SCHEMA_PATH}`, validatePolicy.errors);
assertPublicSurface(POLICY_PATH, policy);

expect(
  stableStringify(policy.tierOrder) === stableStringify(EXPECTED_TIER_ORDER),
  "task evidence tier order changed unexpectedly",
  { expected: EXPECTED_TIER_ORDER, actual: policy.tierOrder },
);
expect(
  stableStringify(policy.tierDefinitions.map((tier) => tier.id)) === stableStringify(EXPECTED_TIER_ORDER),
  "task evidence tier definitions must follow tierOrder",
);

const supportTasksById = new Map(supportStatus.tasks.map((task) => [task.id, task]));
const scorecardTasksById = new Map(scorecard.taskRows.map((task) => [task.taskId, task]));
const policyTasksById = new Map();

for (const task of policy.taskPolicies) {
  expect(!policyTasksById.has(task.taskId), `duplicate task evidence-tier policy: ${task.taskId}`);
  policyTasksById.set(task.taskId, task);

  const supportTask = supportTasksById.get(task.taskId);
  expect(supportTask !== undefined, `task policy is absent from support status: ${task.taskId}`);
  expect(task.supportStatus === supportTask.status, `${task.taskId} supportStatus mismatch`);
  expect(task.claimBoundary === supportTask.scope, `${task.taskId} claimBoundary must match support status scope`);
  expect(supportTask.evidenceTier === task.evidenceTier, `${task.taskId} evidenceTier mismatch with support status`);
  expect(
    stableStringify(supportTask.nextEvidenceTierBlockers) === stableStringify(task.nextTierBlockers),
    `${task.taskId} nextEvidenceTierBlockers mismatch with support status`,
  );

  const scorecardTask = scorecardTasksById.get(task.taskId);
  expect(scorecardTask !== undefined, `task policy is absent from scorecard: ${task.taskId}`);
  expect(scorecardTask.evidenceTier === task.evidenceTier, `${task.taskId} evidenceTier mismatch with scorecard`);
  expect(
    stableStringify(scorecardTask.fixtureSplitRefs) === stableStringify(task.fixtureSplits),
    `${task.taskId} fixtureSplitRefs mismatch with scorecard`,
  );
  expect(
    stableStringify(scorecardTask.nextEvidenceTierBlockers) === stableStringify(task.nextTierBlockers),
    `${task.taskId} nextEvidenceTierBlockers mismatch with scorecard`,
  );

  expect(task.fixtureSplits.development.length > 0, `${task.taskId} must name development fixtures`);
  expect(task.fixtureSplits.validation.length > 0, `${task.taskId} must name validation fixtures`);
  expect(task.fixtureSplits.negativeControls.length > 0, `${task.taskId} must name negative controls`);
  if (task.evidenceTier === "comparator-backed") {
    expect(task.fixtureSplits.externalComparators.length > 0, `${task.taskId} comparator-backed tier requires external comparator refs`);
  }
  if (["corpus-backed", "broad-multilingual", "release-stable"].includes(task.evidenceTier)) {
    expect(task.fixtureSplits.corpusEvidence.length > 0, `${task.taskId} ${task.evidenceTier} tier requires corpus evidence refs`);
  }
  if (["broad-multilingual", "release-stable"].includes(task.evidenceTier)) {
    expect(task.fixtureSplits.holdout.length > 0, `${task.taskId} ${task.evidenceTier} tier requires holdout refs`);
    expect(task.fixtureSplits.performanceEvidence.length > 0, `${task.taskId} ${task.evidenceTier} tier requires performance evidence refs`);
  }
  if (task.evidenceTier !== "release-stable") {
    expect(task.nextTierBlockers.length > 0, `${task.taskId} must record next-tier blockers`);
  }

  const developmentRefs = new Set(task.fixtureSplits.development);
  for (const holdoutRef of task.fixtureSplits.holdout) {
    expect(!developmentRefs.has(holdoutRef), `${task.taskId} holdout ref must not also be a development ref: ${holdoutRef}`);
  }

  for (const ref of allRefs(task)) {
    assertRepoRef(ref, `${task.taskId} task evidence-tier ref`);
    expect(await fileExists(ref), `${task.taskId} task evidence-tier ref does not exist: ${ref}`);
  }
}

const supportTaskIds = [...supportTasksById.keys()].sort();
const policyTaskIds = [...policyTasksById.keys()].sort();
expect(
  stableStringify(policyTaskIds) === stableStringify(supportTaskIds),
  "task evidence-tier policy must cover exactly the support-status tasks",
  { expected: supportTaskIds, actual: policyTaskIds },
);

console.log(`Task evidence tiers OK (tasks=${policyTaskIds.length}).`);
