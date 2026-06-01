import Ajv from "ajv";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  textPackResourceFamilies,
  validateTextPackManifestGovernance,
} from "../packages/textpack/src/index.ts";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");
const MANIFEST_SCHEMA_PATH = "schemas/textpack-manifest-v1.schema.json";

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

function assertPackageRelativePath(value, label) {
  expect(!path.isAbsolute(value), `${label} must be package-relative.`);
  expect(!value.includes(".."), `${label} must not traverse outside the package.`);
  expect(!value.includes("\\"), `${label} must use forward slashes.`);
  expect(!/^https?:\/\//u.test(value), `${label} must reference a local package artifact.`);
}

const schema = await readJson(MANIFEST_SCHEMA_PATH);
const ajv = new Ajv({ allErrors: true, strict: true });
const validateManifest = ajv.compile(schema);

const packageEntries = await readdir(PACKAGES_DIR, { withFileTypes: true });
const packDirs = packageEntries
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("textpack-"))
  .map((entry) => entry.name)
  .sort();

expect(packDirs.length >= 3, "At least three reference textpack-* packages must be present.");

for (const packDir of packDirs) {
  const packageJsonPath = `packages/${packDir}/package.json`;
  const manifestPath = `packages/${packDir}/pack.manifest.json`;
  const packageJson = await readJson(packageJsonPath);
  const manifest = await readJson(manifestPath);

  expect(packageJson.name === manifest.packageName, `${manifestPath} packageName must match package.json.`);
  expect(packageJson.version === manifest.version, `${manifestPath} version must match package.json.`);
  expect(packageJson.private !== true, `${packageJson.name} must be a public package candidate.`);
  expect(packageJson.files?.includes("pack.manifest.json"), `${packageJson.name} files must include pack.manifest.json.`);
  expect(packageJson.files?.includes("resources"), `${packageJson.name} files must include resources.`);
  expect(packageJson.files?.includes("test"), `${packageJson.name} files must include test.`);

  expect(validateManifest(manifest), `${manifestPath} failed ${MANIFEST_SCHEMA_PATH}.`, validateManifest.errors);
  const governance = validateTextPackManifestGovernance(manifest);
  expect(governance.ok, `${manifestPath} failed manifest governance.`, governance.diagnostics);

  expect(manifest.entrypoints.manifest === "./pack.manifest.json", `${manifestPath} must publish ./pack.manifest.json as its manifest entrypoint.`);
  for (const family of textPackResourceFamilies) {
    const resourcePaths = manifest.resources[family] ?? [];
    const providedIds = manifest.provides[family] ?? [];
    expect(resourcePaths.length > 0, `${manifestPath} must declare at least one ${family} resource.`);
    expect(providedIds.length === resourcePaths.length, `${manifestPath} ${family} resources/provides length mismatch.`);
  }
  for (const paths of Object.values(manifest.resources)) {
    for (const resourcePath of paths) {
      assertPackageRelativePath(resourcePath, `${manifest.packageName} resource path ${resourcePath}`);
      expect(await fileExists(`packages/${packDir}/${resourcePath}`), `${manifest.packageName} missing resource ${resourcePath}.`);
      const content = await readFile(path.join(ROOT, `packages/${packDir}/${resourcePath}`), "utf8");
      const nonEmptyLineCount = content
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0).length;
      expect(nonEmptyLineCount >= 2, `${manifest.packageName} resource ${resourcePath} must contain at least two non-empty entries.`);
    }
  }
  for (const refs of Object.values(manifest.tests)) {
    for (const testRef of refs) {
      assertPackageRelativePath(testRef, `${manifest.packageName} test ref ${testRef}`);
      expect(await fileExists(`packages/${packDir}/${testRef}`), `${manifest.packageName} missing test ${testRef}.`);
    }
  }
}

console.log(`Textpack package manifests OK (packages=${packDirs.length}).`);
