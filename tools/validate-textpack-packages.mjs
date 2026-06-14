import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import Ajv from "ajv";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");
const TEXTPACKS_DIR = path.join(PACKAGES_DIR, "textpacks");
const MANIFEST_SCHEMA_PATH = "schemas/textpack-manifest.schema.json";
const SOURCE_POLICY_GENERATED_PATH =
	"tools/textpack-forge/source-policy.generated.json";
const COVERAGE_REPORT_SCHEMA_PATH =
	"schemas/textpack-coverage-report.schema.json";
const EVALUATION_RECORD_SCHEMA_PATH =
	"schemas/textpack-evaluation-record.schema.json";
const CANONICAL_RESOURCE_SCHEMA_PATHS = new Map([
	[
		"textdata.corpus.v1",
		"schemas/textpack-corpus-resource.schema.json",
	],
	[
		"textkb.knowledge-base.v1",
		"schemas/textpack-kb-resource.schema.json",
	],
	[
		"textlex.lexicon.v1",
		"schemas/textpack-lexicon-resource.schema.json",
	],
	[
		"textlex.morphology.v1",
		"schemas/textpack-morphology-resource.schema.json",
	],
	[
		"textnorm.profile.v1",
		"schemas/textpack-normalization-resource.schema.json",
	],
	[
		"textparallel.alignment.v1",
		"schemas/textpack-parallel-resource.schema.json",
	],
	[
		"textquality.profile.v1",
		"schemas/textpack-quality-profile-resource.schema.json",
	],
	[
		"textsearch.analyzer-profile.v1",
		"schemas/textpack-search-analyzer-resource.schema.json",
	],
	[
		"textdata.segmentation-profile.v1",
		"schemas/textpack-segmentation-resource.schema.json",
	],
	[
		"textdata.syntax.v1",
		"schemas/textpack-syntax-resource.schema.json",
	],
]);
const CANONICAL_RESOURCE_SCHEMA_IDS = new Set([
	...CANONICAL_RESOURCE_SCHEMA_PATHS.keys(),
	"textdata.corpus.rows.v1",
	"textdata.dataset.v1",
	"textdata.segmentation-table.v1",
	"textdata.syntax-table.v1",
	"textdata.syntax-profile.v1",
	"textfacts.language-registry.v1",
	"textfacts.locale-profile.v1",
	"textfacts.unicode-profile.v1",
	"textlex.abbreviation-table.v1",
	"textlex.lexicon.rows.v1",
	"textlex.morphology.rows.v1",
	"textlex.stoplist.v1",
	"textkb.knowledge-base.rows.v1",
	"textnorm.policy.v1",
	"textnorm.rules.v1",
	"textparallel.alignment.rows.v1",
	"textquality.evidence.v1",
	"textsearch.analyzer-table.v1",
	"textpack.raw-resource.v1",
]);
const GENERATED_PACKAGE_FILES = [
	".textpack-generated.json",
	"LICENSE.generated.md",
	"NOTICE.generated.md",
	"SOURCES.generated.json",
	"ATTRIBUTION.generated.md",
	"COVERAGE.generated.json",
	"EVALUATION.generated.json",
	"QUALITY.generated.json",
];
const SOURCE_SHAPED_TABLE_COLUMNS = new Set([
	"arwikiUrl",
	"atbseg",
	"atbtok",
	"bw",
	"d3seg",
	"d3tok",
	"diac",
	"enwikiUrl",
	"frwikiUrl",
	"lex",
	"propertyId",
	"relType",
	"sourceEntityId",
	"stemcat",
	"targetEntityId",
]);
const EXPECTED_LANGUAGE_COMPOSITE_SLOTS = [
	"foundation",
	"core",
	"normalization",
	"segmentation",
	"lexicon",
	"morphology",
	"syntax",
	"kb",
	"search",
	"corpus",
	"parallel",
	"quality",
];
const policyExpandedWrapperSourcePolicyClasses = new Set([
	"default-safe",
	"attribution",
	"share-alike",
]);
const EXPECTED_TEXTPACK_DIRS = [
	"packages/textpacks/textpack-ar",
	"packages/textpacks/textpack-ar-core",
	"packages/textpacks/textpack-ar-corpus",
	"packages/textpacks/textpack-ar-kb",
	"packages/textpacks/textpack-ar-lexicon",
	"packages/textpacks/textpack-ar-morphology",
	"packages/textpacks/textpack-ar-msa-morphology",
	"packages/textpacks/textpack-ar-normalization",
	"packages/textpacks/textpack-ar-parallel",
	"packages/textpacks/textpack-ar-quality",
	"packages/textpacks/textpack-ar-quality-sa",
	"packages/textpacks/textpack-ar-sa",
	"packages/textpacks/textpack-ar-search",
	"packages/textpacks/textpack-ar-segmentation",
	"packages/textpacks/textpack-ar-syntax",
	"packages/textpacks/textpack-ar-syntax-sa",
	"packages/textpacks/textpack-ar-syntax-ud-nyuad-sa",
	"packages/textpacks/textpack-cldr-core",
	"packages/textpacks/textpack-en",
	"packages/textpacks/textpack-en-core",
	"packages/textpacks/textpack-en-corpus",
	"packages/textpacks/textpack-en-inflection-scowl",
	"packages/textpacks/textpack-en-kb",
	"packages/textpacks/textpack-en-lexicon",
	"packages/textpacks/textpack-en-morphology",
	"packages/textpacks/textpack-en-normalization",
	"packages/textpacks/textpack-en-parallel",
	"packages/textpacks/textpack-en-quality",
	"packages/textpacks/textpack-en-search",
	"packages/textpacks/textpack-en-segmentation",
	"packages/textpacks/textpack-en-syntax",
	"packages/textpacks/textpack-en-syntax-ud-gumreddit",
	"packages/textpacks/textpack-en-wordlist-esdb",
	"packages/textpacks/textpack-foundation",
	"packages/textpacks/textpack-fr",
	"packages/textpacks/textpack-fr-core",
	"packages/textpacks/textpack-fr-corpus",
	"packages/textpacks/textpack-fr-kb",
	"packages/textpacks/textpack-fr-lexicon",
	"packages/textpacks/textpack-fr-lexicon-sa",
	"packages/textpacks/textpack-fr-lexique-sa",
	"packages/textpacks/textpack-fr-morphology",
	"packages/textpacks/textpack-fr-morphology-sa",
	"packages/textpacks/textpack-fr-normalization",
	"packages/textpacks/textpack-fr-parallel",
	"packages/textpacks/textpack-fr-quality",
	"packages/textpacks/textpack-fr-quality-sa",
	"packages/textpacks/textpack-fr-sa",
	"packages/textpacks/textpack-fr-search",
	"packages/textpacks/textpack-fr-search-sa",
	"packages/textpacks/textpack-fr-segmentation",
	"packages/textpacks/textpack-fr-syntax",
	"packages/textpacks/textpack-fr-syntax-sa",
	"packages/textpacks/textpack-fr-syntax-ud-gsd-sa",
	"packages/textpacks/textpack-fr-unimorph-sa",
	"packages/textpacks/textpack-language-registry",
	"packages/textpacks/textpack-unicode-17",
	"packages/textpacks/textpack-wikidata-ar",
	"packages/textpacks/textpack-wikidata-en",
	"packages/textpacks/textpack-wikidata-fr",
	"packages/textpacks/textpack-wordnet-ar",
	"packages/textpacks/textpack-wordnet-en",
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

function decodedResourceText(relativePath, encodedText) {
	if (!relativePath.endsWith(".gz.b64")) return encodedText;
	return gunzipSync(
		Buffer.from(encodedText.replace(/\s+/gu, ""), "base64"),
	).toString("utf8");
}

function tableHeaderColumns(text) {
	const firstLine = text
		.replace(/\r\n/gu, "\n")
		.replace(/\r/gu, "\n")
		.split("\n")[0];
	return firstLine === undefined || firstLine.length === 0
		? []
		: firstLine.split("\t");
}

function assertNeutralTableHeader(packageName, resource, text) {
	if (!String(resource.format ?? "").includes("tsv")) return;
	const sourceShapedColumns = tableHeaderColumns(text).filter((column) =>
		SOURCE_SHAPED_TABLE_COLUMNS.has(column),
	);
	expect(
		sourceShapedColumns.length === 0,
		`${packageName} resource ${resource.id} exposes source-shaped table columns under schema ${resource.schemaId}.`,
		{ columns: sourceShapedColumns },
	);
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFileBackedResourceValue(value) {
	return (
		isRecord(value) &&
		value.kind === "file-backed-resource" &&
		typeof value.packageName === "string" &&
		typeof value.packageRoot === "string" &&
		typeof value.path === "string" &&
		typeof value.checksum === "string"
	);
}

function sourceIdFromReportEntry(entry) {
	if (typeof entry === "string") return entry;
	if (!isRecord(entry)) return undefined;
	if (typeof entry.sourceId === "string") return entry.sourceId;
	if (typeof entry.id === "string") return entry.id;
	return undefined;
}

function generatedSourceIds(sourceReport) {
	const ids = new Set();
	for (const key of ["sourceIds", "sources", "packSources", "inputSources"]) {
		const entries = sourceReport[key];
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const sourceId = sourceIdFromReportEntry(entry);
			if (sourceId !== undefined) ids.add(sourceId);
		}
	}
	return ids;
}

function assertRequiredScript(packageJson, scriptName, expectedValue) {
	expect(
		packageJson.scripts?.[scriptName] === expectedValue,
		`${packageJson.name} script ${scriptName} must be ${JSON.stringify(expectedValue)}.`,
	);
}

function manifestLicenseUsesLocalRefs(manifest) {
	return /\bLicenseRef-/u.test(manifest.license ?? "");
}

function expectedPackageLicense(manifest) {
	return manifestLicenseUsesLocalRefs(manifest)
		? "SEE LICENSE IN LICENSE.generated.md"
		: manifest.license;
}

function assertPackScripts(packageJson) {
	assertRequiredScript(
		packageJson,
		"build",
		"node ../../../tools/clean-build-output.mjs dist && tsc -p tsconfig.build.json",
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

function isFeatureLanguageComposite(manifest) {
	const requiredComponents = (manifest.components ?? []).filter(
		(component) => component.role === "required",
	);
	if (manifest.resources.length !== 0) return false;
	if (requiredComponents.length < EXPECTED_LANGUAGE_COMPOSITE_SLOTS.length) {
		return false;
	}
	const slotNames = new Set(
		(manifest.capabilitySlots ?? []).map((slot) => slot.slot),
	);
	return EXPECTED_LANGUAGE_COMPOSITE_SLOTS.every((slot) => slotNames.has(slot));
}

async function maybeImportBuiltPack(packDir) {
	const builtIndex = `${packDir}/dist/index.js`;
	if (!(await fileExists(builtIndex))) return undefined;
	return import(pathToFileURL(path.join(ROOT, builtIndex)).href);
}

async function maybeImportTextpackRuntime() {
	const builtIndex = "packages/textpack/dist/index.js";
	if (!(await fileExists(builtIndex))) return undefined;
	return import(pathToFileURL(path.join(ROOT, builtIndex)).href);
}

async function collectTextpackPackageDirs() {
	const entries = await readdir(TEXTPACKS_DIR, { withFileTypes: true });
	return entries
		.filter(
			(entry) => entry.isDirectory() && entry.name.startsWith("textpack-"),
		)
		.map((entry) => `packages/textpacks/${entry.name}`)
		.sort((left, right) => left.localeCompare(right));
}

function assertFamilyCount(packageName, family, minimumCount, label) {
	expect(
		family.resources.length >= minimumCount,
		`${packageName} ${label} resources must expose at least ${minimumCount} canonical resources.`,
		{ actual: family.resources.map((resource) => resource.id) },
	);
}

const RESOURCE_GROUP_SCHEMA_IDS = {
	lexicon: new Set([
		"textlex.lexicon.v1",
		"textlex.lexicon.rows.v1",
		"textlex.stoplist.v1",
		"textlex.abbreviation-table.v1",
	]),
	segmentation: new Set([
		"textdata.segmentation-profile.v1",
		"textdata.segmentation-table.v1",
	]),
	normalization: new Set([
		"textnorm.profile.v1",
		"textnorm.rules.v1",
		"textnorm.policy.v1",
	]),
	morphology: new Set([
		"textlex.morphology.v1",
		"textlex.morphology.rows.v1",
	]),
	syntax: new Set([
		"textdata.syntax.v1",
		"textdata.syntax-table.v1",
		"textdata.dataset.v1",
		"textdata.syntax-profile.v1",
	]),
	search: new Set([
		"textsearch.analyzer-profile.v1",
		"textsearch.analyzer-table.v1",
	]),
	"knowledge-base": new Set([
		"textkb.knowledge-base.v1",
		"textkb.knowledge-base.rows.v1",
	]),
	corpus: new Set(["textdata.corpus.v1", "textdata.corpus.rows.v1"]),
	parallel: new Set([
		"textparallel.alignment.v1",
		"textparallel.alignment.rows.v1",
	]),
	quality: new Set(["textquality.profile.v1", "textquality.evidence.v1"]),
};

function payloadForResource(runtimePack, resource) {
	const value = runtimePack.resources[resource.id];
	if (isFileBackedResourceValue(value)) {
		return Object.freeze({ type: "raw", value });
	}
	const format = resource.format ?? "";
	if (typeof value === "string") {
		if (format.includes("tsv") || format.includes("tab-separated-values")) {
			return Object.freeze({ type: "table" });
		}
		if (format === "json" || format.endsWith("+json")) {
			return Object.freeze({ type: "json" });
		}
	}
	if (format === "json" || format.endsWith("+json")) {
		return Object.freeze({ type: "json" });
	}
	return Object.freeze({ type: "raw", value });
}

function resourceGroup(runtimePack, groupName) {
	const schemaIds = RESOURCE_GROUP_SCHEMA_IDS[groupName];
	expect(schemaIds !== undefined, `Unknown textpack resource group ${groupName}.`);
	const resources = runtimePack.manifest.resources
		.filter((resource) => schemaIds.has(resource.schemaId))
		.map((resource) =>
			Object.freeze({
				id: resource.id,
				descriptor: resource,
				payload: payloadForResource(runtimePack, resource),
			}),
		);
	return Object.freeze({ resources: Object.freeze(resources) });
}

function assertFirstPayload(packageName, family, payloadType, label) {
	const payload = family.resources[0]?.payload;
	if (payload?.type === "raw" && isFileBackedResourceValue(payload.value)) {
		return;
	}
	expect(
		payload?.type === payloadType,
		`${packageName} ${label} resources must expose ${payloadType} payloads.`,
		payload,
	);
}

function assertCompositeComponents(packageName, runtimePack, expectedComponents) {
	const requiredComponents = (runtimePack.manifest.components ?? []).filter(
		(component) => component.role === "required",
	);
	expect(
		runtimePack.manifest.resources.length === 0,
		`${packageName} composite must not expose direct resource payloads.`,
	);
	expect(
		JSON.stringify(requiredComponents.map((component) => component.packageName)) ===
			JSON.stringify(expectedComponents),
		`${packageName} composite must require the expected audited components.`,
		{
			actual: requiredComponents.map((component) => component.packageName),
			expected: expectedComponents,
		},
	);
}

function assertArtifactDescriptors(packageName, runtimePack, expectedCount) {
	const artifacts = runtimePack.manifest.artifacts ?? [];
	expect(
		artifacts.length === expectedCount,
		`${packageName} must expose ${expectedCount} artifact descriptors.`,
		{ actual: artifacts.length },
	);
	for (const artifact of artifacts) {
		expect(
			artifact.compression === "bzip2",
			`${packageName} artifact ${artifact.artifactId} must preserve upstream bzip2 compression.`,
		);
		expect(
			artifact.checksum.algorithm === "sha256",
			`${packageName} artifact ${artifact.artifactId} must declare a SHA-256 checksum.`,
		);
		expect(
			artifact.retrieval.kind === "https",
			`${packageName} artifact ${artifact.artifactId} must require explicit HTTPS retrieval.`,
		);
	}
}

function assertGeneratedTaskAdapters(packageName, runtimePack, runtime) {
	if (packageName === "@ismail-elkorchi/textpack-ar-core") {
		const localeProfiles = runtime.listResources(runtimePack, {
			kind: "locale-profile",
		});
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const quality = resourceGroup(runtimePack, "quality");
		expect(
			localeProfiles.length >= 3,
			`${packageName} core resources must expose language, orthography, and punctuation profiles.`,
		);
		assertFamilyCount(packageName, segmentation, 1, "segmentation");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, segmentation, "json", "segmentation");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-msa-morphology") {
		const morphology = resourceGroup(runtimePack, "morphology");
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, morphology, 4, "morphology");
		assertFamilyCount(packageName, segmentation, 1, "segmentation");
		assertFamilyCount(packageName, quality, 1, "quality");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, segmentation, "table", "segmentation");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-morphology") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-ar-msa-morphology",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-kb") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-wordnet-ar",
			"@ismail-elkorchi/textpack-wikidata-ar",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-lexicon") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-wordnet-ar",
			"@ismail-elkorchi/textpack-ar-msa-morphology",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-normalization") {
		const normalization = resourceGroup(runtimePack, "normalization");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, normalization, 3, "normalization");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, normalization, "table", "normalization");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-search") {
		const normalization = resourceGroup(runtimePack, "normalization");
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const morphology = resourceGroup(runtimePack, "morphology");
		const lexicon = resourceGroup(runtimePack, "lexicon");
		const search = resourceGroup(runtimePack, "search");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, normalization, 1, "normalization");
		assertFamilyCount(packageName, segmentation, 1, "segmentation");
		assertFamilyCount(packageName, morphology, 1, "morphology");
		assertFamilyCount(packageName, lexicon, 1, "lexicon");
		assertFamilyCount(packageName, search, 1, "search");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, search, "json", "search");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-quality") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-ar-quality-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-quality-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-ar-core",
			"@ismail-elkorchi/textpack-ar-normalization",
			"@ismail-elkorchi/textpack-ar-segmentation",
			"@ismail-elkorchi/textpack-ar-lexicon",
			"@ismail-elkorchi/textpack-ar-morphology",
			"@ismail-elkorchi/textpack-ar-syntax-sa",
			"@ismail-elkorchi/textpack-ar-search",
			"@ismail-elkorchi/textpack-ar-kb",
			"@ismail-elkorchi/textpack-ar-corpus",
			"@ismail-elkorchi/textpack-ar-parallel",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-foundation",
			"@ismail-elkorchi/textpack-ar-core",
			"@ismail-elkorchi/textpack-ar-normalization",
			"@ismail-elkorchi/textpack-ar-segmentation",
			"@ismail-elkorchi/textpack-ar-lexicon",
			"@ismail-elkorchi/textpack-ar-morphology",
			"@ismail-elkorchi/textpack-ar-syntax-sa",
			"@ismail-elkorchi/textpack-ar-kb",
			"@ismail-elkorchi/textpack-ar-search",
			"@ismail-elkorchi/textpack-ar-corpus",
			"@ismail-elkorchi/textpack-ar-parallel",
			"@ismail-elkorchi/textpack-ar-quality-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-segmentation") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-ar-msa-morphology",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-syntax") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-ar-syntax-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa") {
		const syntax = resourceGroup(runtimePack, "syntax");
		const morphology = resourceGroup(runtimePack, "morphology");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, syntax, 5, "syntax");
		assertFamilyCount(packageName, morphology, 1, "morphology");
		assertFamilyCount(packageName, quality, 1, "quality");
		assertFirstPayload(packageName, syntax, "table", "syntax");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-syntax-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-foundation",
			"@ismail-elkorchi/textpack-ar-core",
			"@ismail-elkorchi/textpack-ar-normalization",
			"@ismail-elkorchi/textpack-ar-segmentation",
			"@ismail-elkorchi/textpack-ar-lexicon",
			"@ismail-elkorchi/textpack-ar-morphology",
			"@ismail-elkorchi/textpack-ar-syntax",
			"@ismail-elkorchi/textpack-ar-kb",
			"@ismail-elkorchi/textpack-ar-search",
			"@ismail-elkorchi/textpack-ar-corpus",
			"@ismail-elkorchi/textpack-ar-parallel",
			"@ismail-elkorchi/textpack-ar-quality",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-syntax-ud-gumreddit") {
		const syntax = resourceGroup(runtimePack, "syntax");
		const morphology = resourceGroup(runtimePack, "morphology");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, syntax, 5, "syntax");
		assertFamilyCount(packageName, morphology, 1, "morphology");
		assertFamilyCount(packageName, quality, 1, "quality");
		assertFirstPayload(packageName, syntax, "table", "syntax");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-lexicon") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-en-wordlist-esdb",
			"@ismail-elkorchi/textpack-en-inflection-scowl",
			"@ismail-elkorchi/textpack-wordnet-en",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-morphology") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-en-inflection-scowl",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-quality") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-en-core",
			"@ismail-elkorchi/textpack-en-normalization",
			"@ismail-elkorchi/textpack-en-segmentation",
			"@ismail-elkorchi/textpack-en-wordlist-esdb",
			"@ismail-elkorchi/textpack-en-inflection-scowl",
			"@ismail-elkorchi/textpack-en-syntax-ud-gumreddit",
			"@ismail-elkorchi/textpack-wordnet-en",
			"@ismail-elkorchi/textpack-wikidata-en",
			"@ismail-elkorchi/textpack-en-corpus",
			"@ismail-elkorchi/textpack-en-parallel",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-foundation",
			"@ismail-elkorchi/textpack-en-core",
			"@ismail-elkorchi/textpack-en-normalization",
			"@ismail-elkorchi/textpack-en-segmentation",
			"@ismail-elkorchi/textpack-en-lexicon",
			"@ismail-elkorchi/textpack-en-morphology",
			"@ismail-elkorchi/textpack-en-syntax",
			"@ismail-elkorchi/textpack-en-kb",
			"@ismail-elkorchi/textpack-en-search",
			"@ismail-elkorchi/textpack-en-corpus",
			"@ismail-elkorchi/textpack-en-parallel",
			"@ismail-elkorchi/textpack-en-quality",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-search") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-en-wordlist-esdb",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-syntax") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-en-syntax-ud-gumreddit",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-kb") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-wordnet-en",
			"@ismail-elkorchi/textpack-wikidata-en",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-corpus") {
		const corpus = resourceGroup(runtimePack, "corpus");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, corpus, 1, "corpus");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, corpus, "table", "corpus");
		assertFirstPayload(packageName, quality, "json", "quality");
		assertArtifactDescriptors(packageName, runtimePack, 1);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-parallel") {
		const parallel = resourceGroup(runtimePack, "parallel");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, parallel, 8, "parallel");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, parallel, "table", "parallel");
		assertFirstPayload(packageName, quality, "json", "quality");
		assertArtifactDescriptors(packageName, runtimePack, 8);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-corpus") {
		const corpus = resourceGroup(runtimePack, "corpus");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, corpus, 1, "corpus");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, corpus, "table", "corpus");
		assertFirstPayload(packageName, quality, "json", "quality");
		assertArtifactDescriptors(packageName, runtimePack, 1);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-ar-parallel") {
		const parallel = resourceGroup(runtimePack, "parallel");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, parallel, 4, "parallel");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, parallel, "table", "parallel");
		assertFirstPayload(packageName, quality, "json", "quality");
		assertArtifactDescriptors(packageName, runtimePack, 4);
		return;
	}
	if (
		packageName === "@ismail-elkorchi/textpack-wikidata-ar" ||
		packageName === "@ismail-elkorchi/textpack-wikidata-en" ||
		packageName === "@ismail-elkorchi/textpack-wikidata-fr"
	) {
		const knowledge = resourceGroup(runtimePack, "knowledge-base");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, knowledge, 4, "knowledge-base");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, knowledge, "table", "knowledge-base");
		assertFirstPayload(packageName, quality, "json", "quality");
		expect(
			runtimePack.manifest.artifacts?.length === 1,
			`${packageName} must expose one explicit Wikidata artifact descriptor.`,
		);
		expect(
			runtimePack.manifest.artifacts?.[0]?.checksum.algorithm === "sha1",
			`${packageName} must preserve the upstream Wikidata SHA-1 checksum algorithm.`,
		);
		expect(
			runtimePack.manifest.artifacts?.[0]?.compression === "gzip",
			`${packageName} must preserve upstream Wikidata gzip compression.`,
		);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-core") {
		const localeProfiles = runtime.listResources(runtimePack, {
			kind: "locale-profile",
		});
		const abbreviations = runtime.listResources(runtimePack, {
			kind: "abbreviation-table",
		});
		const stoplists = runtime.listResources(runtimePack, { kind: "stoplist" });
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const quality = resourceGroup(runtimePack, "quality");
		expect(
			localeProfiles.length >= 3,
			`${packageName} core resources must expose language, orthography, and punctuation profiles.`,
		);
		expect(
			abbreviations.length >= 1,
			`${packageName} core resources must expose an abbreviation table.`,
		);
		expect(
			stoplists.length >= 1,
			`${packageName} core resources must expose a stoplist resource.`,
		);
		assertFamilyCount(packageName, segmentation, 1, "segmentation");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, segmentation, "json", "segmentation");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-normalization") {
		const normalization = resourceGroup(runtimePack, "normalization");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, normalization, 2, "normalization");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, normalization, "table", "normalization");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-segmentation") {
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, segmentation, 4, "segmentation");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, segmentation, "table", "segmentation");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-normalization") {
		const normalization = resourceGroup(runtimePack, "normalization");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, normalization, 2, "normalization");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, normalization, "table", "normalization");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-core") {
		const localeProfiles = runtime.listResources(runtimePack, {
			kind: "locale-profile",
		});
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const quality = resourceGroup(runtimePack, "quality");
		expect(
			localeProfiles.length >= 3,
			`${packageName} core resources must expose language, orthography, and punctuation profiles.`,
		);
		assertFamilyCount(packageName, segmentation, 1, "segmentation");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, segmentation, "json", "segmentation");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-segmentation") {
		const segmentation = resourceGroup(runtimePack, "segmentation");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, segmentation, 4, "segmentation");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, segmentation, "table", "segmentation");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-corpus") {
		const corpus = resourceGroup(runtimePack, "corpus");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, corpus, 1, "corpus");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, corpus, "table", "corpus");
		assertFirstPayload(packageName, quality, "json", "quality");
		assertArtifactDescriptors(packageName, runtimePack, 1);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-parallel") {
		const parallel = resourceGroup(runtimePack, "parallel");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, parallel, 4, "parallel");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, parallel, "table", "parallel");
		assertFirstPayload(packageName, quality, "json", "quality");
		assertArtifactDescriptors(packageName, runtimePack, 4);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-kb") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-wikidata-fr",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-lexicon-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-lexique-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-lexicon") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-lexicon-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-morphology-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-lexique-sa",
			"@ismail-elkorchi/textpack-fr-unimorph-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-morphology") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-morphology-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-quality") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-quality-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-quality-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-core",
			"@ismail-elkorchi/textpack-fr-normalization",
			"@ismail-elkorchi/textpack-fr-segmentation",
			"@ismail-elkorchi/textpack-fr-lexicon-sa",
			"@ismail-elkorchi/textpack-fr-morphology-sa",
			"@ismail-elkorchi/textpack-fr-syntax-sa",
			"@ismail-elkorchi/textpack-fr-search-sa",
			"@ismail-elkorchi/textpack-fr-kb",
			"@ismail-elkorchi/textpack-fr-corpus",
			"@ismail-elkorchi/textpack-fr-parallel",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-foundation",
			"@ismail-elkorchi/textpack-fr-core",
			"@ismail-elkorchi/textpack-fr-normalization",
			"@ismail-elkorchi/textpack-fr-segmentation",
			"@ismail-elkorchi/textpack-fr-lexicon-sa",
			"@ismail-elkorchi/textpack-fr-morphology-sa",
			"@ismail-elkorchi/textpack-fr-syntax-sa",
			"@ismail-elkorchi/textpack-fr-kb",
			"@ismail-elkorchi/textpack-fr-search-sa",
			"@ismail-elkorchi/textpack-fr-corpus",
			"@ismail-elkorchi/textpack-fr-parallel",
			"@ismail-elkorchi/textpack-fr-quality-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-search-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-lexique-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-search") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-search-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-syntax-sa") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-syntax") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-fr-syntax-sa",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr") {
		assertCompositeComponents(packageName, runtimePack, [
			"@ismail-elkorchi/textpack-foundation",
			"@ismail-elkorchi/textpack-fr-core",
			"@ismail-elkorchi/textpack-fr-normalization",
			"@ismail-elkorchi/textpack-fr-segmentation",
			"@ismail-elkorchi/textpack-fr-lexicon",
			"@ismail-elkorchi/textpack-fr-morphology",
			"@ismail-elkorchi/textpack-fr-syntax",
			"@ismail-elkorchi/textpack-fr-kb",
			"@ismail-elkorchi/textpack-fr-search",
			"@ismail-elkorchi/textpack-fr-corpus",
			"@ismail-elkorchi/textpack-fr-parallel",
			"@ismail-elkorchi/textpack-fr-quality",
		]);
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-lexique-sa") {
		const lexicon = resourceGroup(runtimePack, "lexicon");
		const morphology = resourceGroup(runtimePack, "morphology");
		const search = resourceGroup(runtimePack, "search");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, lexicon, 3, "lexicon");
		assertFamilyCount(packageName, morphology, 2, "morphology");
		assertFamilyCount(packageName, search, 1, "search");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, lexicon, "table", "lexicon");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, search, "json", "search");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa") {
		const syntax = resourceGroup(runtimePack, "syntax");
		const morphology = resourceGroup(runtimePack, "morphology");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, syntax, 5, "syntax");
		assertFamilyCount(packageName, morphology, 1, "morphology");
		assertFamilyCount(packageName, quality, 1, "quality");
		assertFirstPayload(packageName, syntax, "table", "syntax");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-fr-unimorph-sa") {
		const morphology = resourceGroup(runtimePack, "morphology");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, morphology, 6, "morphology");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-inflection-scowl") {
		const lexicon = resourceGroup(runtimePack, "lexicon");
		const morphology = resourceGroup(runtimePack, "morphology");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, lexicon, 1, "lexicon");
		assertFamilyCount(packageName, morphology, 5, "morphology");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, lexicon, "json", "lexicon");
		assertFirstPayload(packageName, morphology, "table", "morphology");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-en-wordlist-esdb") {
		const lexicon = resourceGroup(runtimePack, "lexicon");
		const search = resourceGroup(runtimePack, "search");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, lexicon, 3, "lexicon");
		assertFamilyCount(packageName, search, 1, "search");
		assertFamilyCount(packageName, quality, 2, "quality");
		assertFirstPayload(packageName, lexicon, "table", "lexicon");
		assertFirstPayload(packageName, search, "json", "search");
		assertFirstPayload(packageName, quality, "json", "quality");
		return;
	}
	if (packageName === "@ismail-elkorchi/textpack-wordnet-en") {
		const lexicon = resourceGroup(runtimePack, "lexicon");
		const knowledgeBase = resourceGroup(runtimePack, "knowledge-base");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, lexicon, 1, "lexicon");
		assertFamilyCount(packageName, knowledgeBase, 4, "knowledge-base");
		assertFamilyCount(packageName, quality, 1, "quality");
		assertFirstPayload(packageName, lexicon, "table", "lexicon");
		assertFirstPayload(packageName, knowledgeBase, "table", "knowledge-base");
		assertFirstPayload(packageName, quality, "json", "quality");
	}
	if (packageName === "@ismail-elkorchi/textpack-wordnet-ar") {
		const lexicon = resourceGroup(runtimePack, "lexicon");
		const knowledgeBase = resourceGroup(runtimePack, "knowledge-base");
		const quality = resourceGroup(runtimePack, "quality");
		assertFamilyCount(packageName, lexicon, 1, "lexicon");
		assertFamilyCount(packageName, knowledgeBase, 4, "knowledge-base");
		assertFamilyCount(packageName, quality, 1, "quality");
		assertFirstPayload(packageName, lexicon, "table", "lexicon");
		assertFirstPayload(packageName, knowledgeBase, "table", "knowledge-base");
		assertFirstPayload(packageName, quality, "json", "quality");
	}
}

const schema = await readJson(MANIFEST_SCHEMA_PATH);
const ajv = new Ajv({ allErrors: true, strict: true });
const canonicalAjv = new Ajv({ allErrors: true, strict: false });
const validateManifest = ajv.compile(schema);
const validateCoverageReport = ajv.compile(
	await readJson(COVERAGE_REPORT_SCHEMA_PATH),
);
const validateEvaluationRecord = ajv.compile(
	await readJson(EVALUATION_RECORD_SCHEMA_PATH),
);
const sourcePolicyReport = await readJson(SOURCE_POLICY_GENERATED_PATH);
const sourcePolicyById = new Map(
	sourcePolicyReport.sources.map((source) => [source.sourceId, source]),
);
const languagePolicyByTag = new Map(
	sourcePolicyReport.languages.map((language) => [
		language.languageTag,
		language,
	]),
);
const validateCanonicalResourceBySchemaId = new Map();
for (const [schemaId, schemaPath] of CANONICAL_RESOURCE_SCHEMA_PATHS) {
	validateCanonicalResourceBySchemaId.set(
		schemaId,
		canonicalAjv.compile(await readJson(schemaPath)),
	);
}

function hasAllowedPackageSuffix(packageName, suffixes) {
	return suffixes.some((suffix) => packageName.endsWith(suffix));
}

function sourcePolicyAllowsPackPublishability(policy, packageName) {
	if (
		policy.reviewState !== "approved" ||
		policy.policyClass === "blocked/review-only"
	) {
		return false;
	}
	if (
		policy.publishableByDefault === true &&
		["default-safe", "attribution"].includes(policy.policyClass)
	) {
		return true;
	}
	return (
		policy.policyClass === "share-alike" &&
		policy.defaultCompositeAllowed === false &&
		policy.requiredPackageNameSuffixes.length > 0 &&
		hasAllowedPackageSuffix(packageName, policy.requiredPackageNameSuffixes)
	);
}

function sourcePolicyAllowsPolicyExpandedWrapper(policy) {
	return (
		policy.reviewState === "approved" &&
		policyExpandedWrapperSourcePolicyClasses.has(policy.policyClass)
	);
}

function sourcePolicyAllowsGeneratedPublishability(
	policy,
	packageName,
	generatedMarker,
) {
	return (
		sourcePolicyAllowsPackPublishability(policy, packageName) ||
		(generatedMarker.policySurface === "policy-expanded-wrapper" &&
			sourcePolicyAllowsPolicyExpandedWrapper(policy))
	);
}

const packDirs = await collectTextpackPackageDirs();
const textpackRuntime = await maybeImportTextpackRuntime();

expect(
	JSON.stringify(packDirs) === JSON.stringify(EXPECTED_TEXTPACK_DIRS),
	"Generated textpack package graph does not match the active foundation graph.",
	{ expected: EXPECTED_TEXTPACK_DIRS, actual: packDirs },
);

let publishableCount = 0;

for (const packDir of packDirs) {
	const packageJsonPath = `${packDir}/package.json`;
	const manifestPath = `${packDir}/pack.manifest.json`;
	const packageJson = await readJson(packageJsonPath);
	const manifest = await readJson(manifestPath);
	const generatedMarker = await readJson(`${packDir}/.textpack-generated.json`);
	const sourceReport = await readJson(`${packDir}/SOURCES.generated.json`);
	const coverageReport = await readJson(`${packDir}/COVERAGE.generated.json`);
	const evaluationReport = await readJson(
		`${packDir}/EVALUATION.generated.json`,
	);

	expect(
		packageJson.name === manifest.packageName,
		`${manifestPath} packageName must match package.json.`,
	);
	expect(
		packageJson.version === manifest.version,
		`${manifestPath} version must match package.json.`,
	);
	expect(
		packageJson.license === expectedPackageLicense(manifest),
		`${packageJson.name} package.json license must follow generated license-field policy.`,
		{
			actual: packageJson.license,
			expected: expectedPackageLicense(manifest),
			manifestLicense: manifest.license,
		},
	);
	if (manifestLicenseUsesLocalRefs(manifest)) {
		expect(
			packageJson.files.includes("LICENSE.generated.md"),
			`${packageJson.name} LicenseRef packages must publish LICENSE.generated.md.`,
		);
		const licenseReport = await readFile(
			path.join(ROOT, `${packDir}/LICENSE.generated.md`),
			"utf8",
		);
		expect(
			licenseReport.includes(
				`Manifest license expression: \`${manifest.license}\``,
			),
			`${packageJson.name} LICENSE.generated.md must include the manifest license expression.`,
		);
	}
	expect(
		generatedMarker.packageName === packageJson.name,
		`${packageJson.name} generated marker packageName must match package.json.`,
	);
	expect(
		generatedMarker.publishable === true ||
			generatedMarker.publishable === false,
		`${packageJson.name} generated marker must declare publishable.`,
	);
	if (generatedMarker.publishable === true) {
		publishableCount += 1;
		expect(
			packageJson.private !== true,
			`${packageJson.name} publishable package must not be private.`,
		);
		expect(
			packageJson.publishConfig?.access === "public",
			`${packageJson.name} publishable package must declare public publishConfig access.`,
		);
	} else {
		expect(
			packageJson.private === true,
			`${packageJson.name} non-publishable generated package must be private.`,
		);
		expect(
			packageJson.publishConfig === undefined,
			`${packageJson.name} non-publishable generated package must not declare publishConfig.`,
		);
	}
	const packSourceIds = generatedSourceIds(sourceReport);
	expect(
		packSourceIds.size > 0,
		`${packageJson.name} SOURCES.generated.json must declare at least one source id.`,
	);
	for (const sourceId of packSourceIds) {
		const policy = sourcePolicyById.get(sourceId);
		expect(
			policy !== undefined,
			`${packageJson.name} references source ${sourceId} without generated source-policy evidence.`,
		);
		for (const languageTag of manifest.targets?.languages ?? []) {
			const languagePolicy = languagePolicyByTag.get(languageTag);
			if (languagePolicy === undefined) continue;
			const allowedSources = new Set([
				...languagePolicy.firstSources,
				...languagePolicy.secondWaveSources,
				...languagePolicy.isolatedSources,
			]);
			expect(
				allowedSources.has(sourceId),
				`${packageJson.name} targets ${languageTag}, but ${sourceId} is not declared in sources.md first, second-wave, or isolated lanes for that language.`,
			);
		}
		if (generatedMarker.publishable === true) {
			expect(
				sourcePolicyAllowsGeneratedPublishability(
					policy,
					packageJson.name,
					generatedMarker,
				),
				`${packageJson.name} is publishable but ${sourceId} is ${policy.policyClass}/${policy.reviewState} and is not allowed by the default or isolated public graph policy.`,
			);
		}
	}
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
	const requiredComponents = (manifest.components ?? []).filter(
		(component) => component.role === "required",
	);
	expect(
		typeof generatedMarker.packSpecPath === "string",
		`${packageJson.name} generated marker must record packSpecPath.`,
	);
	if (manifest.resources.length === 0) {
		expect(
			requiredComponents.length > 0,
			`${packageJson.name} may have no direct resources only when it is a recipe composite with required components.`,
		);
		expect(
			generatedMarker.packSpecPath.includes("/composites/"),
			`${packageJson.name} empty-resource package must be generated from a composite spec.`,
			{ packSpecPath: generatedMarker.packSpecPath },
		);
		expect(
			!packageJson.files.includes("resources"),
			`${packageJson.name} empty-resource composite must not publish a resources directory.`,
		);
		for (const component of requiredComponents) {
			expect(
				packageJson.dependencies?.[component.packageName] ===
					component.versionRange,
				`${packageJson.name} empty-resource composite must depend on required component ${component.packageName}.`,
			);
		}
		for (const slot of manifest.capabilitySlots) {
			expect(
				(slot.resourceIds ?? []).length === 0,
				`${packageJson.name} empty-resource composite slot ${slot.slot} must not reference direct resources.`,
			);
		}
	} else {
		expect(
			!packageJson.files.includes("resources"),
			`${packageJson.name} must list exact file-backed resources instead of publishing the whole resources directory.`,
		);
		for (const resourceFile of packageJson.files.filter((entry) =>
			entry.startsWith("resources/"),
		)) {
			assertPackageRelativePath(resourceFile, `${packageJson.name} files entry`);
			expect(
				await fileExists(`${packDir}/${resourceFile}`),
				`${packageJson.name} files entry ${resourceFile} must exist.`,
			);
		}
	}
	for (const generatedFile of GENERATED_PACKAGE_FILES) {
		expect(
			packageJson.files.includes(generatedFile),
			`${packageJson.name} files must include ${generatedFile}.`,
		);
		expect(
			await fileExists(`${packDir}/${generatedFile}`),
			`${packageJson.name} missing generated package file ${generatedFile}.`,
		);
	}
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
	expect(
		validateCoverageReport(coverageReport),
		`${packageJson.name} COVERAGE.generated.json failed ${COVERAGE_REPORT_SCHEMA_PATH}.`,
		validateCoverageReport.errors,
	);
	expect(
		evaluationReport.schemaVersion === "1" &&
			evaluationReport.generatedBy === "tools/textpack-forge" &&
			evaluationReport.packageName === packageJson.name &&
			Array.isArray(evaluationReport.records),
		`${packageJson.name} EVALUATION.generated.json must be a generated evaluation report.`,
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
			const relativePath = `${packDir}/${resource.path}`;
			expect(
				packageJson.files.includes(resource.path),
				`${manifest.packageName} package files must include manifest resource ${resource.path}.`,
			);
			expect(
				await fileExists(relativePath),
				`${manifest.packageName} missing resource ${resource.path}.`,
			);
			const encodedContent = await readFile(path.join(ROOT, relativePath), "utf8");
			const content = decodedResourceText(resource.path, encodedContent);
			const nonEmptyLineCount = content
				.split(/\r?\n/u)
				.map((line) => line.trim())
				.filter((line) => line.length > 0).length;
			expect(
				nonEmptyLineCount > 0,
				`${manifest.packageName} resource ${resource.path} must not be empty.`,
			);
			assertNeutralTableHeader(manifest.packageName, resource, content);
			expect(
				typeof resource.schemaId === "string" &&
					resource.schemaId.length > 0,
				`${manifest.packageName} resource ${resource.id} must declare schemaId.`,
			);
			expect(
				CANONICAL_RESOURCE_SCHEMA_IDS.has(resource.schemaId),
				`${manifest.packageName} resource ${resource.id} references unknown schemaId ${resource.schemaId}.`,
			);
			expect(
				!isRecord(resource.metadata) ||
					resource.metadata.canonicalSchema === undefined,
				`${manifest.packageName} resource ${resource.id} must use schemaId, not metadata.canonicalSchema.`,
			);
			const validateCanonicalResource =
				validateCanonicalResourceBySchemaId.get(resource.schemaId);
			if (validateCanonicalResource !== undefined) {
				expect(
					resource.format === "json",
					`${manifest.packageName} canonical resource ${resource.id} must use json format.`,
				);
				const resourceJson = JSON.parse(content);
				expect(
					validateCanonicalResource(resourceJson),
					`${manifest.packageName} resource ${resource.id} failed ${resource.schemaId}.`,
					validateCanonicalResource.errors,
				);
			}
		}
	}
	const evaluationRecordIds = new Set();
	for (const record of evaluationReport.records) {
		expect(
			validateEvaluationRecord(record),
			`${packageJson.name} evaluation record failed ${EVALUATION_RECORD_SCHEMA_PATH}.`,
			validateEvaluationRecord.errors,
		);
		expect(
			record.packageName === packageJson.name,
			`${packageJson.name} evaluation record ${record.recordId} packageName mismatch.`,
		);
		expect(
			!evaluationRecordIds.has(record.recordId),
			`${packageJson.name} duplicates evaluation record ${record.recordId}.`,
		);
		evaluationRecordIds.add(record.recordId);
		for (const resourceId of record.evidence.resourceIds) {
			expect(
				resourceIds.has(resourceId),
				`${packageJson.name} evaluation record ${record.recordId} references unknown resource ${resourceId}.`,
			);
		}
	}
	if (isFeatureLanguageComposite(manifest)) {
		const passingSlots = new Set(
			evaluationReport.records
				.filter((record) => record.result === "pass")
				.map((record) => record.capabilitySlot),
		);
		for (const slot of EXPECTED_LANGUAGE_COMPOSITE_SLOTS) {
			expect(
				passingSlots.has(slot),
				`${packageJson.name} feature language composite slot ${slot} must have passing generated evaluation evidence.`,
			);
		}
	}
	expect(
		JSON.stringify(sorted([...evaluationRecordIds])) ===
			JSON.stringify(sorted(coverageReport.evaluationRecordIds)),
		`${packageJson.name} coverage evaluationRecordIds must match EVALUATION.generated.json.`,
	);
	if (evaluationRecordIds.size === 0) {
		expect(
			coverageReport.coverageStatus === "declared-only",
			`${packageJson.name} coverageStatus must be declared-only without evaluation records.`,
		);
	} else {
		expect(
			coverageReport.coverageStatus === "evaluated",
			`${packageJson.name} coverageStatus must be evaluated when evaluation records exist.`,
		);
	}
	const artifactIds = new Set(
		(manifest.artifacts ?? []).map((artifact) => artifact.artifactId),
	);
	for (const slot of manifest.capabilitySlots) {
		for (const resourceId of slot.resourceIds ?? []) {
			expect(
				resourceIds.has(resourceId),
				`${manifestPath} capability slot ${slot.slot} references unknown resource ${resourceId}.`,
			);
		}
		for (const artifactId of slot.artifactIds ?? []) {
			expect(
				artifactIds.has(artifactId),
				`${manifestPath} capability slot ${slot.slot} references unknown artifact ${artifactId}.`,
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
		if (packageJson.name === "@ismail-elkorchi/textpack-en-lexicon") {
			expect(
				typeof builtPack.loadEnglishLexicon === "function",
				`${packageJson.name} must export loadEnglishLexicon.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-en") {
			expect(
				typeof builtPack.loadEnglish === "function",
				`${packageJson.name} must export loadEnglish.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-morphology") {
			expect(
				typeof builtPack.loadArabicMorphology === "function",
				`${packageJson.name} must export loadArabicMorphology.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-kb") {
			expect(
				typeof builtPack.loadArabicKnowledgeBase === "function",
				`${packageJson.name} must export loadArabicKnowledgeBase.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-lexicon") {
			expect(
				typeof builtPack.loadArabicLexicon === "function",
				`${packageJson.name} must export loadArabicLexicon.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-quality") {
			expect(
				typeof builtPack.loadArabicQuality === "function",
				`${packageJson.name} must export loadArabicQuality.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-quality-sa") {
			expect(
				typeof builtPack.loadArabicQualityShareAlike === "function",
				`${packageJson.name} must export loadArabicQualityShareAlike.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-syntax") {
			expect(
				typeof builtPack.loadArabicSyntax === "function",
				`${packageJson.name} must export loadArabicSyntax.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar") {
			expect(
				typeof builtPack.loadArabic === "function",
				`${packageJson.name} must export loadArabic.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-sa") {
			expect(
				typeof builtPack.loadArabicShareAlike === "function",
				`${packageJson.name} must export loadArabicShareAlike.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-ar-segmentation") {
			expect(
				typeof builtPack.loadArabicSegmentation === "function",
				`${packageJson.name} must export loadArabicSegmentation.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-en-morphology") {
			expect(
				typeof builtPack.loadEnglishMorphology === "function",
				`${packageJson.name} must export loadEnglishMorphology.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-en-quality") {
			expect(
				typeof builtPack.loadEnglishQuality === "function",
				`${packageJson.name} must export loadEnglishQuality.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-en-search") {
			expect(
				typeof builtPack.loadEnglishSearch === "function",
				`${packageJson.name} must export loadEnglishSearch.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-en-kb") {
			expect(
				typeof builtPack.loadEnglishKnowledgeBase === "function",
				`${packageJson.name} must export loadEnglishKnowledgeBase.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-en-syntax") {
			expect(
				typeof builtPack.loadEnglishSyntax === "function",
				`${packageJson.name} must export loadEnglishSyntax.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-kb") {
			expect(
				typeof builtPack.loadFrenchKnowledgeBase === "function",
				`${packageJson.name} must export loadFrenchKnowledgeBase.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-lexicon") {
			expect(
				typeof builtPack.loadFrenchLexicon === "function",
				`${packageJson.name} must export loadFrenchLexicon.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-morphology") {
			expect(
				typeof builtPack.loadFrenchMorphology === "function",
				`${packageJson.name} must export loadFrenchMorphology.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-quality") {
			expect(
				typeof builtPack.loadFrenchQuality === "function",
				`${packageJson.name} must export loadFrenchQuality.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-search") {
			expect(
				typeof builtPack.loadFrenchSearch === "function",
				`${packageJson.name} must export loadFrenchSearch.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-syntax") {
			expect(
				typeof builtPack.loadFrenchSyntax === "function",
				`${packageJson.name} must export loadFrenchSyntax.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr") {
			expect(
				typeof builtPack.loadFrench === "function",
				`${packageJson.name} must export loadFrench.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-quality-sa") {
			expect(
				typeof builtPack.loadFrenchQualityShareAlike === "function",
				`${packageJson.name} must export loadFrenchQualityShareAlike.`,
			);
		}
		if (packageJson.name === "@ismail-elkorchi/textpack-fr-sa") {
			expect(
				typeof builtPack.loadFrenchShareAlike === "function",
				`${packageJson.name} must export loadFrenchShareAlike.`,
			);
		}
		const builtResources = builtPack.resources;
		expect(
			isRecord(builtResources),
			`${packageJson.name} resources export must be a plain resource map.`,
		);
		const resourceKeys = Object.keys(builtResources);
		expect(
			JSON.stringify(sorted(resourceKeys)) ===
				JSON.stringify(sorted(resourceIds)),
			`${packageJson.name} built resource map keys must match manifest resource ids.`,
		);
		for (const resourceId of resourceIds) {
			const resource = manifest.resources.find(
				(candidate) => candidate.id === resourceId,
			);
			expect(
				builtResources[resourceId] !== undefined,
				`${packageJson.name} built resources must include ${resourceId}.`,
			);
			const resourceValue = builtResources[resourceId];
			expect(
				isFileBackedResourceValue(resourceValue),
				`${packageJson.name} built resource ${resourceId} must be file-backed.`,
				resourceValue,
			);
			expect(
				resourceValue.path === resource?.path,
				`${packageJson.name} built resource ${resourceId} path must match manifest.`,
				{ actual: resourceValue.path, expected: resource?.path },
			);
			expect(
				resourceValue.packageName === packageJson.name,
				`${packageJson.name} built resource ${resourceId} packageName must match package.json.`,
				{ actual: resourceValue.packageName, expected: packageJson.name },
			);
		}
		if (textpackRuntime !== undefined) {
			assertGeneratedTaskAdapters(
				packageJson.name,
				textpackRuntime.createPack(manifest, builtResources),
				textpackRuntime,
			);
		}
	}
}

console.log(
	`Textpack package manifests OK (packages=${packDirs.length}, publishable=${publishableCount}).`,
);
