import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Ajv from "ajv";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");
const MANIFEST_SCHEMA_PATH = "schemas/textpack-manifest.schema.json";

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
	expect(
		!value.includes(".."),
		`${label} must not traverse outside the package.`,
	);
	expect(!value.includes("\\"), `${label} must use forward slashes.`);
	expect(
		!/^https?:\/\//u.test(value),
		`${label} must reference a local package artifact.`,
	);
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function assertRequiredScript(packageJson, scriptName, expectedValue) {
	expect(
		packageJson.scripts?.[scriptName] === expectedValue,
		`${packageJson.name} script ${scriptName} must be ${JSON.stringify(expectedValue)}.`,
	);
}

function assertPackScripts(packageJson) {
	assertRequiredScript(
		packageJson,
		"build",
		"node ../../tools/clean-build-output.mjs dist && tsc -p tsconfig.build.json",
	);
	assertRequiredScript(
		packageJson,
		"lint",
		"biome check src test README.md package.json tsconfig.json tsconfig.build.json --files-ignore-unknown=true",
	);
	assertRequiredScript(
		packageJson,
		"check:static",
		"tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters",
	);
	assertRequiredScript(packageJson, "check:pack", "npm pack --dry-run");
	assertRequiredScript(packageJson, "test", "npm run test:all");
	assertRequiredScript(packageJson, "prepack", "npm run build");
	expect(
		packageJson.scripts?.["test:all"]?.includes("npm run -s build"),
		`${packageJson.name} test:all must build.`,
	);
	expect(
		packageJson.scripts?.["test:all"]?.includes("node test/smoke.mjs"),
		`${packageJson.name} test:all must run the smoke test.`,
	);
	expect(
		packageJson.scripts?.["test:all"]?.includes("npm run -s check:pack"),
		`${packageJson.name} test:all must dry-run package publication.`,
	);
}

function assertDeepEqualJson(actual, expected, label) {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);
	expect(
		actualJson === expectedJson,
		`${label} must match pack.manifest.json.`,
	);
}

async function maybeImportBuiltPack(packDir) {
	const builtIndex = `packages/${packDir}/dist/index.js`;
	if (!(await fileExists(builtIndex))) return undefined;
	return import(pathToFileURL(path.join(ROOT, builtIndex)).href);
}

const schema = await readJson(MANIFEST_SCHEMA_PATH);
const ajv = new Ajv({ allErrors: true, strict: true });
const validateManifest = ajv.compile(schema);

const packageEntries = await readdir(PACKAGES_DIR, { withFileTypes: true });
const packDirs = packageEntries
	.filter((entry) => entry.isDirectory() && entry.name.startsWith("textpack-"))
	.map((entry) => entry.name)
	.sort();

expect(
	packDirs.length >= 10,
	"Final textpack reference package coverage is incomplete.",
);

for (const packDir of packDirs) {
	const packageJsonPath = `packages/${packDir}/package.json`;
	const manifestPath = `packages/${packDir}/pack.manifest.json`;
	const packageJson = await readJson(packageJsonPath);
	const manifest = await readJson(manifestPath);

	expect(
		packageJson.name === manifest.packageName,
		`${manifestPath} packageName must match package.json.`,
	);
	expect(
		packageJson.version === manifest.version,
		`${manifestPath} version must match package.json.`,
	);
	expect(
		packageJson.private !== true,
		`${packageJson.name} must be a public package candidate.`,
	);
	expect(
		Array.isArray(packageJson.files),
		`${packageJson.name} must declare publish files.`,
	);
	expect(
		packageJson.files.includes("dist"),
		`${packageJson.name} files must include dist.`,
	);
	expect(
		packageJson.files.includes("pack.manifest.json"),
		`${packageJson.name} files must include pack.manifest.json.`,
	);
	expect(
		packageJson.files.includes("resources"),
		`${packageJson.name} files must include resources.`,
	);
	expect(
		!packageJson.files.includes("test"),
		`${packageJson.name} files must not publish test.`,
	);
	expect(
		packageJson.exports?.["."]?.import === "./dist/index.js",
		`${packageJson.name} root import must use dist/index.js.`,
	);
	expect(
		packageJson.exports?.["."]?.types === "./dist/index.d.ts",
		`${packageJson.name} root types must use dist/index.d.ts.`,
	);
	expect(
		packageJson.exports?.["./pack.manifest.json"] === "./pack.manifest.json",
		`${packageJson.name} must export ./pack.manifest.json.`,
	);
	expect(
		packageJson.dependencies?.["@ismail-elkorchi/textpack"] === "0.1.0",
		`${packageJson.name} must depend on final textpack.`,
	);
	assertPackScripts(packageJson);

	expect(
		validateManifest(manifest),
		`${manifestPath} failed ${MANIFEST_SCHEMA_PATH}.`,
		validateManifest.errors,
	);
	const declaredKinds = new Set(manifest.kind);
	const actualKinds = new Set(
		manifest.resources.map((resource) => resource.kind),
	);
	expect(
		JSON.stringify(sorted(declaredKinds)) ===
			JSON.stringify(sorted(actualKinds)),
		`${manifestPath} kind must exactly match resource descriptor kinds.`,
	);

	const resourceIds = new Set();
	for (const resource of manifest.resources) {
		expect(
			!resourceIds.has(resource.id),
			`${manifestPath} duplicates resource id ${resource.id}.`,
		);
		resourceIds.add(resource.id);
		if (resource.path !== undefined) {
			assertPackageRelativePath(
				resource.path,
				`${manifest.packageName} resource path ${resource.path}`,
			);
			const relativePath = `packages/${packDir}/${resource.path}`;
			expect(
				await fileExists(relativePath),
				`${manifest.packageName} missing resource ${resource.path}.`,
			);
			const content = await readFile(path.join(ROOT, relativePath), "utf8");
			const nonEmptyLineCount = content
				.split(/\r?\n/u)
				.map((line) => line.trim())
				.filter((line) => line.length > 0).length;
			expect(
				nonEmptyLineCount > 0,
				`${manifest.packageName} resource ${resource.path} must not be empty.`,
			);
		}
	}

	const builtPack = await maybeImportBuiltPack(packDir);
	if (builtPack !== undefined) {
		expect(
			builtPack.manifest !== undefined,
			`${packageJson.name} must export manifest.`,
		);
		expect(
			builtPack.resources !== undefined,
			`${packageJson.name} must export resources.`,
		);
		expect(
			builtPack.default?.manifest === builtPack.manifest,
			`${packageJson.name} default manifest must reuse manifest export.`,
		);
		expect(
			builtPack.default?.resources === builtPack.resources,
			`${packageJson.name} default resources must reuse resources export.`,
		);
		assertDeepEqualJson(
			builtPack.manifest,
			manifest,
			`${packageJson.name} built manifest`,
		);
		const resourceKeys = Object.keys(builtPack.resources);
		expect(
			JSON.stringify(sorted(resourceKeys)) ===
				JSON.stringify(sorted(resourceIds)),
			`${packageJson.name} built resource map keys must match manifest resource ids.`,
		);
		for (const resourceId of resourceIds) {
			expect(
				builtPack.resources[resourceId] !== undefined,
				`${packageJson.name} built resources must include ${resourceId}.`,
			);
		}
	}
}

console.log(`Textpack package manifests OK (packages=${packDirs.length}).`);
