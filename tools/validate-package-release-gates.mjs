import Ajv from "ajv";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GATES_PATH = "fixtures/package-release/gates.v1.json";
const SCHEMA_PATH = "schemas/package-release-gates-v1.schema.json";
const SUPPORT_STATUS_PATH = "docs/specs/support-status.v1.json";
const REQUIRED_GATES = [
  "metadata",
  "tests",
  "schemas",
  "package-quality",
  "security-review",
  "claim-hygiene",
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
  const entries = await readdir(path.join(ROOT, "packages"), { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageJson = await readJson(`packages/${entry.name}/package.json`);
    names.push(packageJson.name);
  }
  return names.sort();
}

async function workspaceDownstreamDependents() {
  const entries = await readdir(path.join(ROOT, "packages"), { withFileTypes: true });
  const packageJsons = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    packageJsons.push(await readJson(`packages/${entry.name}/package.json`));
  }
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
const [schema, gates, supportStatus] = await Promise.all([
  readJson(SCHEMA_PATH),
  readJson(GATES_PATH),
  readJson(SUPPORT_STATUS_PATH),
]);
const validate = ajv.compile(schema);
expect(validate(gates), `${GATES_PATH} failed ${SCHEMA_PATH}`, validate.errors);

expect(
  JSON.stringify([...gates.requiredGates].sort()) === JSON.stringify([...REQUIRED_GATES].sort()),
  "Package release gates must define the canonical required gate set.",
);

const supportByPackage = new Map(supportStatus.packages.map((entry) => [entry.name, entry]));
const downstreamByPackage = await workspaceDownstreamDependents();
const declaredNames = gates.packages.map((entry) => entry.packageName).sort();
expect(
  JSON.stringify(declaredNames) === JSON.stringify(await workspacePackageNames()),
  "Package release gates must cover exactly the workspace package set.",
);

for (const entry of gates.packages) {
  const packageDir = entry.packageName.split("/")[1];
  const packageJson = await readJson(`packages/${packageDir}/package.json`);
  const support = supportByPackage.get(entry.packageName);
  expect(support !== undefined, `${entry.packageName} missing from support status.`);
  expect(entry.supportStatus === support.status, `${entry.packageName} support status mismatch.`);
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
  if (entry.releaseTrack === "private-unreleased") {
    expect(entry.releaseReadiness === "blocked", `${entry.packageName} private-unreleased package must be release-blocked.`);
    expect(entry.releaseBlockers.length >= 1, `${entry.packageName} private-unreleased package must list release blockers.`);
    expect(
      entry.downstreamApiStability.requiredBeforeRelease === true,
      `${entry.packageName} private-unreleased package must require downstream API stability before release.`,
    );
    expect(
      entry.downstreamApiStability.status === "blocked",
      `${entry.packageName} private-unreleased package must have blocked downstream API stability.`,
    );
    expect(
      entry.releaseBlockers.some((blocker) => blocker.includes("Downstream API stability evidence")),
      `${entry.packageName} private-unreleased package must include a downstream API stability release blocker.`,
    );
    expect(packageJson.private === true, `${entry.packageName} must remain private while releaseTrack is private-unreleased.`);
    expect(packageJson.version === "0.0.0", `${entry.packageName} private-unreleased version must remain 0.0.0.`);
    expect(
      support.limitations.some((item) => item.includes("Package remains private until broader release gates pass")),
      `${entry.packageName} support status must state the package remains private.`,
    );
  } else {
    expect(entry.releaseTrack === "public-beta", `${entry.packageName} has unknown release track ${entry.releaseTrack}.`);
    expect(entry.releaseReadiness === "publishable", `${entry.packageName} public-beta package must be marked publishable.`);
    expect(entry.releaseBlockers.length === 0, `${entry.packageName} public-beta package must not list release blockers.`);
    expect(
      entry.downstreamApiStability.requiredBeforeRelease === false,
      `${entry.packageName} public-beta package must not require this non-textfacts downstream gate.`,
    );
    expect(
      entry.downstreamApiStability.status === "not-required" || entry.downstreamApiStability.status === "proven",
      `${entry.packageName} public-beta downstream API status must be not-required or proven.`,
    );
    expect(packageJson.private !== true, `${entry.packageName} public-beta package must not be private.`);
    expect(support.status === "beta", `${entry.packageName} public-beta package must be beta in support status.`);
  }
  for (const ref of entry.evidenceRefs) {
    assertRepoRef(ref, `${entry.packageName} evidenceRefs`);
    expect(await fileExists(ref), `${entry.packageName} evidence ref does not exist: ${ref}`);
  }
}

const doc = await readFile(path.join(ROOT, "docs/specs/package-release-gates.md"), "utf8");
for (const heading of ["## Why this document exists", "## Gate list", "## Current boundary", "## Verification"]) {
  expect(doc.includes(heading), `package-release-gates.md is missing ${heading}`);
}

console.log(`Package release gates OK (packages=${gates.packages.length}).`);
