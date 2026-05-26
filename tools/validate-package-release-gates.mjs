import Ajv from "ajv";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GATES_PATH = "fixtures/package-release/gates.v1.json";
const SCHEMA_PATH = "schemas/package-release-gates-v1.schema.json";
const DOWNSTREAM_API_STABILITY_PATH = "fixtures/package-release/downstream-api-stability.v1.json";
const WORKSPACE_PACK_DRY_RUN_PATH = "tools/check-workspace-pack-dry-run.mjs";
const ALPHA_PHASE = "alpha-foundation-release-0.1";
const MATURITY_LEVELS = new Set(["alpha", "beta", "production-candidate", "non-blocking limitation"]);
const REQUIRED_GATES = [
  "metadata",
  "tests",
  "schemas",
  "package-quality",
  "security-review",
  "public-wording",
  "downstream-api-stability",
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

function assertRepoRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

async function workspacePackageNames() {
  return (await workspacePackageJsons()).map((packageJson) => packageJson.name).sort();
}

async function workspacePackageJsons() {
  const entries = await readdir(path.join(ROOT, "packages"), { withFileTypes: true });
  const packageJsons = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageJson = await readJson(`packages/${entry.name}/package.json`);
    packageJsons.push(packageJson);
  }
  return packageJsons.sort((left, right) => left.name.localeCompare(right.name));
}

async function workspaceDownstreamDependents() {
  const packageJsons = await workspacePackageJsons();
  const packageNames = new Set(packageJsons.map((packageJson) => packageJson.name));
  const downstreamByPackage = new Map([...packageNames].map((name) => [name, []]));
  for (const packageJson of packageJsons) {
    for (const dependencyName of Object.keys(packageJson.dependencies ?? {})) {
      if (!packageNames.has(dependencyName)) continue;
      downstreamByPackage.get(dependencyName)?.push(packageJson.name);
    }
  }
  for (const downstream of downstreamByPackage.values()) downstream.sort();
  return downstreamByPackage;
}

const ajv = new Ajv({ allErrors: true, strict: true });
const [schema, gates] = await Promise.all([
  readJson(SCHEMA_PATH),
  readJson(GATES_PATH),
]);
const validate = ajv.compile(schema);
expect(validate(gates), `${GATES_PATH} failed ${SCHEMA_PATH}`, validate.errors);

expect(
  JSON.stringify([...gates.requiredGates].sort()) === JSON.stringify([...REQUIRED_GATES].sort()),
  "Package release gates must define the canonical required gate set.",
);
expect(gates.phaseCompletionEvidence.phase === ALPHA_PHASE, "Package release gates must name the alpha foundation phase.");
for (const ref of gates.phaseCompletionEvidence.evidenceRefs) {
  assertRepoRef(ref, "phaseCompletionEvidence.evidenceRefs");
  expect(await fileExists(ref), `alpha phase evidence ref does not exist: ${ref}`);
}
expect(
  gates.phaseCompletionEvidence.commands.includes("npm run -s smoke:public-vertical-slice"),
  "Alpha phase evidence must include the public vertical-slice smoke command.",
);
expect(
  gates.phaseCompletionEvidence.scopeBoundary.includes("not broad task support"),
  "Alpha phase statement boundary must prevent broad task-support interpretation.",
);

const workspacePackageJsonsByName = new Map((await workspacePackageJsons()).map((packageJson) => [packageJson.name, packageJson]));
const downstreamByPackage = await workspaceDownstreamDependents();
const declaredNames = gates.packages.map((entry) => entry.packageName).sort();
expect(
  JSON.stringify(declaredNames) === JSON.stringify(await workspacePackageNames()),
  "Package release gates must cover exactly the workspace package set.",
);

const stageByPackage = new Map();
const seenStages = new Set();
for (const stage of gates.dependencyReleaseOrder) {
  expect(!seenStages.has(stage.stage), `Dependency release order stage ${stage.stage} is duplicated.`);
  seenStages.add(stage.stage);
  for (const ref of stage.requiredEvidenceRefs) {
    assertRepoRef(ref, `dependencyReleaseOrder stage ${stage.stage} requiredEvidenceRefs`);
    expect(await fileExists(ref), `dependency release order evidence ref does not exist: ${ref}`);
  }
  for (const packageName of stage.packages) {
    expect(!stageByPackage.has(packageName), `${packageName} appears in more than one dependency release stage.`);
    expect(workspacePackageJsonsByName.has(packageName), `${packageName} dependency release stage is not a workspace package.`);
    stageByPackage.set(packageName, stage.stage);
  }
}
expect(
  JSON.stringify([...stageByPackage.keys()].sort()) === JSON.stringify(declaredNames),
  "Dependency release order must cover exactly the workspace package set.",
);
expect(stageByPackage.get("@ismail-elkorchi/textfacts") === 0, "textfacts must remain the stage 0 published package anchor.");

for (const [packageName, packageJson] of workspacePackageJsonsByName) {
  const packageStage = stageByPackage.get(packageName);
  const internalDependencies = Object.keys(packageJson.dependencies ?? {}).filter((dependencyName) =>
    workspacePackageJsonsByName.has(dependencyName),
  );
  for (const dependencyName of internalDependencies) {
    expect(
      stageByPackage.get(dependencyName) < packageStage,
      `${packageName} release stage must be after dependency ${dependencyName}.`,
      { packageStage, dependencyStage: stageByPackage.get(dependencyName) },
    );
  }
}

for (const entry of gates.packages) {
  const packageDir = entry.packageName.split("/")[1];
  const packageJson = await readJson(`packages/${packageDir}/package.json`);
  expect(
    JSON.stringify([...entry.gates].sort()) === JSON.stringify([...REQUIRED_GATES].sort()),
    `${entry.packageName} must list every required release gate.`,
  );
  const expectedDownstream = downstreamByPackage.get(entry.packageName) ?? [];
  expect(
    JSON.stringify([...entry.downstreamApiStability.downstreamDependents].sort()) ===
      JSON.stringify(expectedDownstream),
    `${entry.packageName} downstream dependency graph mismatch.`,
    { expected: expectedDownstream, actual: entry.downstreamApiStability.downstreamDependents },
  );
  for (const ref of entry.downstreamApiStability.evidenceRefs) {
    assertRepoRef(ref, `${entry.packageName} downstreamApiStability.evidenceRefs`);
    expect(await fileExists(ref), `${entry.packageName} downstream API evidence ref does not exist: ${ref}`);
  }
  const blockerClassifications = entry.blockerClassifications ?? [];
  const classificationByBlocker = new Map(blockerClassifications.map((classification) => [classification.blocker, classification]));
  expect(
    classificationByBlocker.size === blockerClassifications.length,
    `${entry.packageName} blocker classifications must have unique blocker text.`,
  );
  for (const blocker of entry.releaseBlockers) {
    expect(classificationByBlocker.has(blocker), `${entry.packageName} release blocker is missing maturity classification: ${blocker}`);
  }
  for (const classification of blockerClassifications) {
    expect(MATURITY_LEVELS.has(classification.maturity), `${entry.packageName} blocker has invalid maturity: ${classification.maturity}`);
    expect(
      entry.releaseBlockers.includes(classification.blocker) || entry.limitations.includes(classification.blocker),
      `${entry.packageName} blocker classification must correspond to a current blocker or limitation: ${classification.blocker}`,
    );
    for (const ref of classification.evidenceRefs) {
      assertRepoRef(ref, `${entry.packageName} blockerClassifications.evidenceRefs`);
      expect(await fileExists(ref), `${entry.packageName} blocker classification evidence ref does not exist: ${ref}`);
    }
  }
  const alphaBlockers = blockerClassifications.filter((classification) => classification.maturity === "alpha");
  if (entry.releaseTrack === "private-unreleased") {
    expect(entry.releaseReadiness === "blocked", `${entry.packageName} private-unreleased package must be release-blocked.`);
    expect(entry.releaseBlockers.length >= 1, `${entry.packageName} private-unreleased package must list release blockers.`);
    expect(
      entry.downstreamApiStability.requiredBeforeRelease === true,
      `${entry.packageName} private-unreleased package must require downstream API stability before release.`,
    );
    expect(
      entry.downstreamApiStability.status === "blocked" || entry.downstreamApiStability.status === "validated",
      `${entry.packageName} private-unreleased package downstream API stability must be blocked or validated.`,
    );
    if (entry.downstreamApiStability.status === "blocked") {
      expect(
        entry.releaseBlockers.some((blocker) => blocker.includes("Downstream API stability evidence")),
        `${entry.packageName} private-unreleased package must include a downstream API stability release blocker while blocked.`,
      );
    } else {
      expect(
        entry.downstreamApiStability.evidenceRefs.includes(DOWNSTREAM_API_STABILITY_PATH),
        `${entry.packageName} validated downstream API stability must reference ${DOWNSTREAM_API_STABILITY_PATH}.`,
      );
      expect(
        !entry.releaseBlockers.some((blocker) => blocker.includes("Downstream API stability evidence")),
        `${entry.packageName} validated downstream API stability must not keep a downstream API stability release blocker.`,
      );
    }
    expect(packageJson.private === true, `${entry.packageName} must remain private while releaseTrack is private-unreleased.`);
    expect(packageJson.version === "0.0.0", `${entry.packageName} private-unreleased version must remain 0.0.0.`);
  } else {
    expect(
      entry.releaseTrack === "public-beta" || entry.releaseTrack === "public-alpha",
      `${entry.packageName} has unknown release track ${entry.releaseTrack}.`,
    );
    expect(entry.releaseReadiness === "publishable", `${entry.packageName} public package must be marked publishable.`);
    expect(entry.releaseBlockers.length === 0, `${entry.packageName} public package must not list current release blockers.`);
    expect(alphaBlockers.length === 0, `${entry.packageName} public package must not retain alpha blocker classifications.`);
    expect(
      entry.downstreamApiStability.requiredBeforeRelease === false ||
        entry.downstreamApiStability.status === "validated",
      `${entry.packageName} public package must either not require downstream API stability or have validated downstream API stability.`,
    );
    expect(
      entry.downstreamApiStability.status === "not-required" || entry.downstreamApiStability.status === "validated",
      `${entry.packageName} public package downstream API status must be not-required or validated.`,
    );
    expect(packageJson.private !== true, `${entry.packageName} public package must not be private.`);
    if (entry.releaseTrack === "public-alpha") {
      expect(packageJson.version !== "0.0.0", `${entry.packageName} public-alpha package must not remain version 0.0.0.`);
    }
  }
  for (const ref of entry.evidenceRefs) {
    assertRepoRef(ref, `${entry.packageName} evidenceRefs`);
    expect(await fileExists(ref), `${entry.packageName} evidence ref does not exist: ${ref}`);
  }
  if (entry.releaseTrack === "private-unreleased") {
    expect(
      entry.evidenceRefs.includes(WORKSPACE_PACK_DRY_RUN_PATH),
      `${entry.packageName} private-unreleased release gate must reference workspace pack dry-run evidence.`,
    );
  }
}

const doc = await readFile(path.join(ROOT, "docs/specs/package-release-gates.md"), "utf8");
for (const heading of ["## Why this document exists", "## Gate list", "## Current boundary", "## Verification"]) {
  expect(doc.includes(heading), `package-release-gates.md is missing ${heading}`);
}

console.log(`Package release gates OK (packages=${gates.packages.length}).`);
