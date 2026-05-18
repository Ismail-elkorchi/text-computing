import Ajv from "ajv";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARTIFACT_PATH = "fixtures/package-release/foundation-release-candidates.v1.json";
const SCHEMA_PATH = "schemas/foundation-release-candidates-v1.schema.json";
const RELEASE_GATES_PATH = "fixtures/package-release/gates.v1.json";
const DOWNSTREAM_API_STABILITY_PATH = "fixtures/package-release/downstream-api-stability.v1.json";
const EXPECTED_PACKAGES = [
  "@ismail-elkorchi/textconformance",
  "@ismail-elkorchi/textdoc",
  "@ismail-elkorchi/textpack",
  "@ismail-elkorchi/textprotocol",
];

function fail(message, details) {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function expect(condition, message, details) {
  if (!condition) fail(message, details);
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

function assertRepoRelative(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

const [schema, artifact, releaseGates] = await Promise.all([
  readJson(SCHEMA_PATH),
  readJson(ARTIFACT_PATH),
  readJson(RELEASE_GATES_PATH),
]);

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
expect(validate(artifact), `${ARTIFACT_PATH} failed ${SCHEMA_PATH}`, validate.errors);

const packageNames = artifact.packages.map((entry) => entry.packageName).sort();
expect(
  JSON.stringify(packageNames) === JSON.stringify(EXPECTED_PACKAGES),
  "foundation release candidates must cover exactly the foundational package set.",
  packageNames,
);

const releaseGateByPackage = new Map(releaseGates.packages.map((entry) => [entry.packageName, entry]));
for (const entry of artifact.packages) {
  const packageJson = await readJson(`${entry.packageDir}/package.json`);
  const releaseGate = releaseGateByPackage.get(entry.packageName);

  expect(packageJson.name === entry.packageName, `${entry.packageDir}/package.json name mismatch.`);
  expect(packageJson.private === true, `${entry.packageName} must remain private for this gate.`);
  expect(packageJson.version === "0.0.0", `${entry.packageName} must remain version 0.0.0 for this gate.`);
  expect(packageJson.exports?.["."]?.import === "./dist/index.js", `${entry.packageName} must export dist/index.js.`);
  expect(packageJson.exports?.["."]?.types === "./dist/index.d.ts", `${entry.packageName} must export dist/index.d.ts.`);
  expect(packageJson.scripts?.prepack === "npm run build", `${entry.packageName} must build before pack.`);

  expect(releaseGate !== undefined, `${entry.packageName} missing from package release gates.`);
  expect(releaseGate.releaseTrack === "private-unreleased", `${entry.packageName} release gate must remain private-unreleased.`);
  expect(releaseGate.releaseReadiness === "blocked", `${entry.packageName} release gate must remain blocked.`);
  expect(entry.releaseBlockers.length > 0, `${entry.packageName} must list release blockers.`);
  expect(entry.requiredEvidenceRefs.includes(RELEASE_GATES_PATH), `${entry.packageName} must reference release gates.`);
  if (entry.candidateState === "candidate-ready") {
    expect(
      entry.requiredEvidenceRefs.includes(DOWNSTREAM_API_STABILITY_PATH),
      `${entry.packageName} candidate-ready state must reference downstream API stability evidence.`,
    );
    expect(
      !entry.releaseBlockers.some((blocker) => blocker.includes("Built-package API smoke evidence")),
      `${entry.packageName} candidate-ready state must not keep a built-package API smoke blocker.`,
    );
    expect(
      !entry.releaseBlockers.some((blocker) => blocker.includes("Downstream API stability evidence")),
      `${entry.packageName} candidate-ready state must not keep a downstream API stability blocker.`,
    );
  }

  for (const ref of entry.requiredEvidenceRefs) {
    assertRepoRelative(ref, `${entry.packageName} requiredEvidenceRefs`);
    expect(await fileExists(ref), `${entry.packageName} evidence ref does not exist: ${ref}`);
  }
}

const doc = await readFile(path.join(ROOT, "docs/specs/foundation-release-candidates.md"), "utf8");
for (const heading of ["## Boundary", "## Gate order", "## Verification"]) {
  expect(doc.includes(heading), `foundation-release-candidates.md is missing ${heading}`);
}

console.log(`Foundation release-candidate gates OK (packages=${artifact.packages.length}).`);
