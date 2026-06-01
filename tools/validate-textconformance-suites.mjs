import Ajv from "ajv";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG_PATH = "fixtures/conformance/package-suites.v1.json";
const SUITE_SCHEMA_PATH = "schemas/textconformance-suite-v1.schema.json";
const CORE_PACKAGES = [
  "@ismail-elkorchi/textfacts",
  "@ismail-elkorchi/textdoc",
  "@ismail-elkorchi/textpack",
  "@ismail-elkorchi/textrules",
  "@ismail-elkorchi/textpipeline",
  "@ismail-elkorchi/textcorpus",
  "@ismail-elkorchi/textprotocol",
  "@ismail-elkorchi/textconformance",
  "@ismail-elkorchi/textlab",
];
const PRIVATE_LEAK_PATTERNS = [
  /\/home\//,
  /(?:^|\/)projects\/[^/]+\/private(?:\/|$)/i,
  /(?:^|\/)private\/(?:research|scratch|tmp|prompts)(?:\/|$)/i,
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

function assertRepoRef(ref, label) {
  expect(!path.isAbsolute(ref), `${label} must be repository-relative: ${ref}`);
  expect(!ref.includes(".."), `${label} must not traverse outside the repository: ${ref}`);
  expect(!ref.includes("\\"), `${label} must use forward slashes: ${ref}`);
  expect(!/^https?:\/\//.test(ref), `${label} must reference a committed repository artifact: ${ref}`);
}

async function workspacePackageVersions() {
  const versions = new Map();
  const entries = await readdir(path.join(ROOT, "packages"), { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageJson = await readJson(`packages/${entry.name}/package.json`);
    versions.set(packageJson.name, packageJson.version);
  }
  return versions;
}

function traceabilityRepoRefs(traceability) {
  return [
    ...traceability.requirementRefs,
    ...traceability.apiRefs,
    ...traceability.inputRefs,
    ...(traceability.reportRefs ?? []).filter((ref) => ref.includes("/")),
  ];
}

const [catalog, suiteSchema, packageVersions] = await Promise.all([
  readJson(CATALOG_PATH),
  readJson(SUITE_SCHEMA_PATH),
  workspacePackageVersions(),
]);
const ajv = new Ajv({ allErrors: true, strict: true });
const validateSuite = ajv.compile(suiteSchema);

expect(catalog.schemaVersion === 1, `${CATALOG_PATH} schemaVersion must be 1.`);
expect(Array.isArray(catalog.suites), `${CATALOG_PATH} suites must be an array.`);
assertPublicStringSurface(CATALOG_PATH, catalog);

const seenSuiteIds = new Set();
const seenPackages = new Set();
for (const suite of catalog.suites) {
  expect(validateSuite(suite), `${suite.suiteId ?? "unknown suite"} failed ${SUITE_SCHEMA_PATH}`, validateSuite.errors);
  expect(!seenSuiteIds.has(suite.suiteId), `Duplicate conformance suite id: ${suite.suiteId}`);
  seenSuiteIds.add(suite.suiteId);
  expect(CORE_PACKAGES.includes(suite.subject.id), `Suite subject is not a core package: ${suite.subject.id}`);
  seenPackages.add(suite.subject.id);
  expect(
    packageVersions.get(suite.subject.id) === suite.subject.version,
    `${suite.subject.id} suite version must match package.json.`,
  );

  const roles = new Set(suite.fixtures.map((fixture) => fixture.role));
  expect(roles.has("validation"), `${suite.suiteId} must declare at least one executable validation fixture.`);
  expect(
    suite.fixtures.some((fixture) => fixture.role !== "development"),
    `${suite.suiteId} must not rely only on development fixtures.`,
  );
  for (const fixture of suite.fixtures) {
    assertRepoRef(fixture.ref, `${suite.suiteId} fixture ref`);
    expect(await fileExists(fixture.ref), `${suite.suiteId} fixture ref does not exist: ${fixture.ref}`);
  }

  const oracleIds = new Set(suite.oracles.map((oracle) => oracle.oracleId));
  expect(oracleIds.size === suite.oracles.length, `${suite.suiteId} oracle ids must be unique.`);
  for (const oracle of suite.oracles) {
    if (oracle.ref !== undefined) {
      assertRepoRef(oracle.ref, `${suite.suiteId} oracle ref`);
      expect(await fileExists(oracle.ref), `${suite.suiteId} oracle ref does not exist: ${oracle.ref}`);
    }
  }

  expect(Array.isArray(suite.targets), `${suite.suiteId} must declare executable suite targets.`);
  const targetIds = new Set(suite.targets.map((target) => target.targetId));
  expect(targetIds.size === suite.targets.length, `${suite.suiteId} target ids must be unique.`);
  const targetKinds = new Set(suite.targets.map((target) => target.kind));
  for (const kind of ["package-fixture", "external-consumer-project", "generated-package-artifact"]) {
    expect(targetKinds.has(kind), `${suite.suiteId} must declare a ${kind} target.`);
  }
  for (const target of suite.targets) {
    assertRepoRef(target.ref, `${suite.suiteId} target ref`);
    if (target.kind === "generated-package-artifact") {
      expect(
        target.ref.startsWith("packages/") && target.ref.includes("/dist/"),
        `${suite.suiteId} generated target must reference a package dist artifact: ${target.ref}`,
      );
    } else {
      expect(await fileExists(target.ref), `${suite.suiteId} target ref does not exist: ${target.ref}`);
    }
  }

  const checkIds = new Set();
  for (const check of suite.checks) {
    expect(!checkIds.has(check.checkId), `${suite.suiteId} duplicate check id: ${check.checkId}`);
    checkIds.add(check.checkId);
    expect(oracleIds.has(check.oracleId), `${suite.suiteId} check references unknown oracle: ${check.oracleId}`);
    for (const ref of check.evidenceRefs ?? []) {
      assertRepoRef(ref, `${suite.suiteId} check evidence ref`);
      expect(await fileExists(ref), `${suite.suiteId} check evidence ref does not exist: ${ref}`);
    }
    expect(check.traceability !== undefined, `${suite.suiteId} check ${check.checkId} must include traceability.`);
    for (const ref of traceabilityRepoRefs(check.traceability)) {
      assertRepoRef(ref, `${suite.suiteId} check traceability ref`);
      expect(await fileExists(ref), `${suite.suiteId} check traceability ref does not exist: ${ref}`);
    }
  }
}

expect(
  JSON.stringify([...seenPackages].sort()) === JSON.stringify([...CORE_PACKAGES].sort()),
  "Conformance suite catalog must cover exactly the nine core packages.",
  { expected: CORE_PACKAGES, actual: [...seenPackages].sort() },
);

console.log(`Textconformance suite catalog OK (suites=${catalog.suites.length}).`);
