#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	access,
	mkdir,
	readFile,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const LOCK_PATH = "tools/textpack-forge/forge.lock.json";
const DEFAULT_PACK_SPEC_PATH =
	"tools/textpack-forge/packs/foundation-packs.pack.json";
const INVENTORY_JSON_PATH = "docs/textpacks/generated-inventory.json";
const INVENTORY_MD_PATH = "docs/textpacks/generated-inventory.md";
const SOURCE_POLICY_JSON_PATH =
	"tools/textpack-forge/source-policy.generated.json";
const SOURCE_READINESS_MD_PATH = "docs/textpacks/source-readiness.generated.md";
const LANGUAGE_COMPOSITE_READINESS_JSON_PATH =
	"docs/textpacks/language-composite-readiness.generated.json";
const LANGUAGE_COMPOSITE_READINESS_MD_PATH =
	"docs/textpacks/language-composite-readiness.generated.md";
const SIZE_REPORT_PATH = "tools/textpack-forge/reports/size-report.json";
const SNAPSHOT_DATA_DIR = "tools/textpack-forge/snapshots/data";
const GENERATED_BY = "tools/textpack-forge";
const BUILD_COMMAND = "node tools/textpack-forge/cli.mjs build";
const GZIP_BASE64_RESOURCE_SUFFIX = ".gz.b64";
const PACKAGE_REPORT_FILES = [
	"LICENSE.generated.md",
	"NOTICE.generated.md",
	"SOURCES.generated.json",
	"ATTRIBUTION.generated.md",
	"COVERAGE.generated.json",
	"EVALUATION.generated.json",
	"QUALITY.generated.json",
];
const SUPPORTED_GENERATED_SOURCE_FILES = new Set([
	"src/index.ts",
	"src/manifest.ts",
	"src/resources.ts",
]);
const PACKAGE_SCRIPTS = {
	build:
		"node ../../../tools/clean-build-output.mjs dist && tsc -p tsconfig.build.json",
	lint: "biome check src test README.md package.json tsconfig.json tsconfig.build.json --files-ignore-unknown=true",
	"check:static":
		"tsc -p tsconfig.build.json --noEmit --noUnusedLocals --noUnusedParameters",
	"check:pack": "npm pack --dry-run",
	test: "npm run test:all",
	prepack: "npm run build",
};

const supportLevels = [
	"registered",
	"unicode-covered",
	"profiled",
	"task-supported",
];
const sourcePolicyClasses = [
	"default-safe",
	"attribution",
	"share-alike",
	"copyleft",
	"noncommercial/research",
	"local-only",
	"blocked/review-only",
];
const defaultCompositeSourcePolicyClasses = new Set([
	"default-safe",
	"attribution",
]);
const publishableSourcePolicyClasses = new Set(["default-safe", "attribution"]);
const isolatedPublishableSourcePolicyClasses = new Set(["share-alike"]);
const policyExpandedWrapperSourcePolicyClasses = new Set([
	"default-safe",
	"attribution",
	"share-alike",
]);
const compositePolicySurfaces = new Set([
	"default",
	"policy-expanded-wrapper",
]);
const componentLicensePolicyClasses = {
	default: new Set(["default-safe"]),
	"allow-attribution": new Set(["default-safe", "attribution"]),
	"allow-share-alike": new Set(["default-safe", "attribution", "share-alike"]),
	"allow-copyleft": new Set(["default-safe", "attribution", "copyleft"]),
	"local-only": new Set([
		"default-safe",
		"attribution",
		"share-alike",
		"copyleft",
		"local-only",
		"noncommercial/research",
	]),
};
const requiredSourcePolicyLanguageTags = [
	"ar",
	"de",
	"en",
	"es",
	"fr",
	"grc",
	"it",
	"la",
];
const developerFacingLanguageTags = ["en", "ar", "fr"];
const foundationSourceIds = new Set([
	"source:iana:language-subtag-registry",
	"source:unicode:cldr-core",
	"source:unicode:ucd",
]);
const foundationOnlyAllowedSlots = new Set([
	"core",
	"foundation",
	"language-registry",
	"locale-profile",
	"unicode-profile",
]);
const languageCompositeRequiredSlots = [
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
const languageReadinessSlotAliases = {
	foundation: ["language-registry", "locale-profile", "unicode-profile"],
	core: ["core", "language-core"],
	normalization: ["normalization"],
	segmentation: ["segmentation"],
	lexicon: ["lexicon", "lexical-semantics"],
	morphology: ["morphology", "tagging"],
	syntax: ["syntax", "tagging"],
	kb: ["kb", "lexical-semantics", "entity-linking"],
	search: ["search"],
	corpus: ["corpus"],
	parallel: ["parallel"],
	quality: ["quality"],
};
const languageReadinessSourceRequirements = {
	en: {
		lexicon: [
			{
				label: "ESDB exact audited English wordlist source",
				anySourceIds: ["source:esdb:wordlist-diff-en-default-2026-02-25"],
			},
			{
				label: "SCOWLv2 exact audited English inflection inventory source",
				anySourceIds: ["source:scowl:v2-rel-2026-02-25"],
			},
			{
				label: "Open English WordNet lexical-semantic source",
				anySourceIds: ["source:wordnet:open-english-2025"],
			},
		],
		morphology: [
			{
				label: "SCOWLv2 exact audited default-safe English lookup morphology source",
				anySourceIds: ["source:scowl:v2-rel-2026-02-25"],
			},
		],
		syntax: [
			{
				label: "audited exact UD English treebank source boundary",
				anySourceIds: ["source:ud:english-gumreddit-r2.18"],
			},
		],
		kb: [
			{
				label: "Open English WordNet lexical-semantic source",
				anySourceIds: ["source:wordnet:open-english-2025"],
			},
			{
				label: "Wikidata main structured data for entity labels, aliases, and KB links",
				anySourceIds: ["source:wikidata:main"],
			},
		],
		search: [
			{
				label: "ESDB exact audited English search-profile source",
				anySourceIds: ["source:esdb:wordlist-diff-en-default-2026-02-25"],
			},
		],
		corpus: [
			{
				label: "Tatoeba exact audited English corpus artifact source",
				anySourceIds: ["source:tatoeba:weekly-2026-06-06"],
			},
		],
		parallel: [
			{
				label: "Tatoeba exact audited English parallel artifact source",
				anySourceIds: ["source:tatoeba:weekly-2026-06-06"],
			},
		],
		quality: [
			{
				label: "English quality evidence must cover the audited lexicon/search source",
				anySourceIds: ["source:esdb:wordlist-diff-en-default-2026-02-25"],
			},
			{
				label: "English quality evidence must cover the audited morphology source",
				anySourceIds: ["source:scowl:v2-rel-2026-02-25"],
			},
			{
				label: "English quality evidence must cover the audited syntax source",
				anySourceIds: ["source:ud:english-gumreddit-r2.18"],
			},
			{
				label: "English quality evidence must cover the audited KB source",
				anySourceIds: ["source:wordnet:open-english-2025"],
			},
			{
				label: "English quality evidence must cover the audited entity source",
				anySourceIds: ["source:wikidata:main"],
			},
			{
				label: "English quality evidence must cover the audited corpus and parallel source",
				anySourceIds: ["source:tatoeba:weekly-2026-06-06"],
			},
		],
	},
	ar: {
		lexicon: [
			{
				label: "Arabic WordNet exact audited lexical-semantic source",
				anySourceIds: ["source:wordnet:arabic-v4.1.0"],
			},
			{
				label: "CAMeL Morph exact audited Arabic MSA lexicon inventory source",
				anySourceIds: ["source:camel:morph-msa-lrec-coling-2024"],
			},
		],
		segmentation: [
			{
				label: "CAMeL Morph exact audited Arabic segmentation source",
				anySourceIds: ["source:camel:morph-msa-lrec-coling-2024"],
			},
		],
		morphology: [
			{
				label: "CAMeL Morph exact audited Arabic morphology source",
				anySourceIds: ["source:camel:morph-msa-lrec-coling-2024"],
			},
		],
		syntax: [
			{
				label: "audited exact UD Arabic treebank source boundary; audited PADT, PUD, and NYUAD rows are isolated or blocked and do not unlock default Arabic syntax",
				anySourceIds: [
					"source:ud:arabic-padt-r2.18",
					"source:ud:arabic-pud-r2.18",
					"source:ud:arabic-nyuad-r2.18",
				],
			},
		],
		kb: [
			{
				label: "Arabic WordNet exact audited lexical-semantic source",
				anySourceIds: ["source:wordnet:arabic-v4.1.0"],
			},
			{
				label: "Wikidata main structured data for Arabic entity labels, aliases, and KB links",
				anySourceIds: ["source:wikidata:main"],
			},
		],
		search: [
			{
				label: "CAMeL Morph exact audited Arabic MSA analyzer source",
				anySourceIds: ["source:camel:morph-msa-lrec-coling-2024"],
			},
			{
				label: "Arabic WordNet exact audited search expansion source",
				anySourceIds: ["source:wordnet:arabic-v4.1.0"],
			},
		],
		corpus: [
			{
				label: "Tatoeba exact audited Arabic corpus artifact source",
				anySourceIds: ["source:tatoeba:weekly-arabic-2026-06-06"],
			},
		],
		parallel: [
			{
				label: "Tatoeba exact audited Arabic parallel artifact source",
				anySourceIds: ["source:tatoeba:weekly-arabic-2026-06-06"],
			},
		],
		quality: [
			{
				label: "Arabic quality evidence must wait for an audited exact Arabic syntax source boundary",
				anySourceIds: [
					"source:ud:arabic-padt-r2.18",
					"source:ud:arabic-pud-r2.18",
					"source:ud:arabic-nyuad-r2.18",
				],
			},
		],
	},
	fr: {
		lexicon: [
			{
				label: "audited exact French lexical source boundary; Morphalou and Lefff are isolated copyleft sources, and Lexique 3.83 is share-alike isolated",
				anySourceIds: [
					"source:fr:morphalou",
					"source:fr:lefff",
					"source:fr:lexique-383",
					"source:fr:lexique",
				],
			},
		],
		morphology: [
			{
				label: "audited exact French morphology source boundary; UniMorph French and Lexique 3.83 are share-alike isolated, while Morphalou and Lefff are copyleft isolated",
				anySourceIds: [
					"source:unimorph:french-master-f672f8c",
					"source:fr:morphalou",
					"source:fr:lefff",
					"source:fr:lexique-383",
					"source:fr:lexique",
				],
			},
		],
		syntax: [
			{
				label: "audited exact UD French treebank source boundary; audited ALTS, FQB, GSD, ParisStories, PoitevinDIVITAL, Rhapsodie, Spoken, PUD, Sequoia, and ParTUT rows are isolated or blocked and do not unlock default French syntax",
				anySourceIds: [
					"source:ud:french-alts-r2.18",
					"source:ud:french-fqb-r2.18",
					"source:ud:french-gsd-r2.18",
					"source:ud:french-sequoia-r2.18",
					"source:ud:french-parisstories-r2.18",
					"source:ud:french-rhapsodie-r2.18",
					"source:ud:french-spoken-r2.18",
					"source:ud:french-partut-r2.18",
					"source:ud:french-poitevindivital-r2.18",
					"source:ud:french-pud-r2.18",
				],
			},
		],
		kb: [
			{
				label: "Wikidata main structured data for French entity labels, aliases, and KB links",
				anySourceIds: ["source:wikidata:main"],
			},
		],
		search: [
			{
				label: "audited exact French search source boundary; Unicode/CLDR alone is not enough for full French search readiness",
				anySourceIds: [
					"source:fr:lexique-383",
					"source:fr:lexique",
					"source:fr:morphalou",
					"source:fr:lefff",
					"source:unimorph:french-master-f672f8c",
				],
			},
		],
		quality: [
			{
				label: "French quality evidence must wait for audited French lexicon source coverage",
				anySourceIds: [
					"source:fr:morphalou",
					"source:fr:lefff",
					"source:fr:lexique-383",
					"source:fr:lexique",
				],
			},
			{
				label: "French quality evidence must wait for audited French morphology source coverage",
				anySourceIds: [
					"source:unimorph:french-master-f672f8c",
					"source:fr:morphalou",
					"source:fr:lefff",
					"source:fr:lexique-383",
					"source:fr:lexique",
				],
			},
			{
				label: "French quality evidence must wait for audited French syntax source coverage",
				anySourceIds: [
					"source:ud:french-alts-r2.18",
					"source:ud:french-fqb-r2.18",
					"source:ud:french-gsd-r2.18",
					"source:ud:french-sequoia-r2.18",
					"source:ud:french-parisstories-r2.18",
					"source:ud:french-rhapsodie-r2.18",
					"source:ud:french-spoken-r2.18",
					"source:ud:french-partut-r2.18",
					"source:ud:french-poitevindivital-r2.18",
					"source:ud:french-pud-r2.18",
				],
			},
		],
	},
};

function fail(message, details) {
	console.error(message);
	if (details !== undefined) console.error(details);
	process.exit(1);
}

function expect(condition, message, details) {
	if (!condition) fail(message, details);
}

function sha256(text) {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function sha256Bytes(bytes) {
	return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function readText(relative) {
	return readFile(path.join(ROOT, relative), "utf8");
}

async function readJson(relative) {
	return JSON.parse(await readText(relative));
}

async function writeJson(relative, value) {
	await writeGenerated(relative, jsonFile(value));
}

async function fileExists(relative) {
	try {
		await access(path.join(ROOT, relative));
		return true;
	} catch {
		return false;
	}
}

function assertRelativePath(value, label) {
	expect(typeof value === "string" && value.length > 0, `${label} is empty.`);
	expect(!path.isAbsolute(value), `${label} must be relative.`);
	expect(!value.includes(".."), `${label} must not traverse upward.`);
	expect(!value.includes("\\"), `${label} must use forward slashes.`);
}

function snapshotDataPath(value, label) {
	assertRelativePath(value, label);
	expect(
		value.startsWith(`${SNAPSHOT_DATA_DIR}/`),
		`${label} must live under ${SNAPSHOT_DATA_DIR}/.`,
	);
	const absolute = path.resolve(ROOT, value);
	const snapshotRoot = path.resolve(ROOT, SNAPSHOT_DATA_DIR);
	const relative = path.relative(snapshotRoot, absolute);
	expect(
		relative.length > 0 &&
			!relative.startsWith("..") &&
			!path.isAbsolute(relative),
		`${label} must resolve inside ${SNAPSHOT_DATA_DIR}/.`,
	);
	return absolute;
}

function splitSourceUrl(sourceUrl) {
	const index = sourceUrl.indexOf("#");
	if (index === -1) {
		return { url: sourceUrl, fragment: undefined };
	}
	return {
		url: sourceUrl.slice(0, index),
		fragment: sourceUrl.slice(index + 1),
	};
}

function sourceDownloadUrl(sourceUrl) {
	const { url, fragment } = splitSourceUrl(sourceUrl);
	const parsedUrl = new URL(url);
	expect(parsedUrl.protocol === "https:", `Source URL ${url} must use HTTPS.`);
	if (fragment === undefined || fragment.length === 0) return url;
	fail(`Unsupported snapshot sourceUrl fragment ${sourceUrl}.`);
}

function runCommand(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "ignore", "pipe"],
		});
		const stderr = [];
		child.stderr.on("data", (chunk) => {
			stderr.push(Buffer.from(chunk));
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new Error(
					`${command} exited with ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`,
				),
			);
		});
	});
}

async function acquireSourceUrl(sourceUrl, outputPath) {
	const url = sourceDownloadUrl(sourceUrl);
	await runCommand("curl", [
		"--fail",
		"--location",
		"--proto",
		"=https",
		"--silent",
		"--show-error",
		"--output",
		outputPath,
		url,
	]);
}

function cloneJson(value) {
	return JSON.parse(JSON.stringify(value));
}

function jsonFile(value) {
	return `${JSON.stringify(value, null, "\t")}\n`;
}

function stableJson(value) {
	return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function sortJson(value) {
	if (Array.isArray(value)) return value.map((entry) => sortJson(entry));
	if (value === null || typeof value !== "object") return value;
	const output = {};
	for (const key of Object.keys(value).sort()) {
		output[key] = sortJson(value[key]);
	}
	return output;
}

function sizeClass(byteLength) {
	if (byteLength <= 500 * 1024) return "tiny";
	if (byteLength <= 5 * 1024 * 1024) return "small";
	if (byteLength <= 50 * 1024 * 1024) return "medium";
	if (byteLength <= 500 * 1024 * 1024) return "large";
	return "huge";
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

function snapshotAggregateChecksum(files) {
	const entries = files
		.map((file) => ({
			path: file.path,
			checksum: file.checksum,
			byteLength: file.byteLength,
		}))
		.sort((left, right) => left.path.localeCompare(right.path));
	return sha256(JSON.stringify(entries));
}

function generatedHeader() {
	return "// Generated by tools/textpack-forge. Do not edit.\n\n";
}

function isCompositePack(pack) {
	return (
		pack.packClass === "foundation-composite" ||
		pack.packClass === "language-component-composite" ||
		pack.packClass === "language-composite"
	);
}

function validatePackSpec(packSpec, resourceSpecById) {
	for (const key of [
		"packageName",
		"packageDir",
		"packClass",
		"supportLevel",
	]) {
		expect(
			typeof packSpec[key] === "string" && packSpec[key].length > 0,
			`Pack spec is missing ${key}.`,
		);
	}
	expect(
		!isCompositePack(packSpec),
		`${packSpec.packageName} recipe composites must be declared in tools/textpack-forge/composites, not in pack catalogs.`,
	);
	assertRelativePath(packSpec.packageDir, `${packSpec.packageName} packageDir`);
	expect(
		typeof packSpec.description === "string" && packSpec.description.length > 0,
		`${packSpec.packageName} description is required.`,
	);
	expect(
		packSpec.generatedPackageFiles === true,
		`${packSpec.packageName} packs must generate package files.`,
	);
	expect(
		Array.isArray(packSpec.resourceSpecIds) &&
			packSpec.resourceSpecIds.length > 0,
		`${packSpec.packageName} packs must declare resourceSpecIds.`,
	);
	expect(
		Array.isArray(packSpec.manifest?.resources) &&
			packSpec.manifest.resources.length > 0,
		`${packSpec.packageName} concrete pack specs must declare at least one resource. Use a composite spec for resource-less recipe packs.`,
	);
	for (const resourceSpecId of packSpec.resourceSpecIds) {
		const resourceSpec = resourceSpecById.get(resourceSpecId);
		expect(
			resourceSpec !== undefined,
			`${packSpec.packageName} references unknown resource spec ${resourceSpecId}.`,
		);
		expect(
			resourceSpec.packageName === packSpec.packageName,
			`${packSpec.packageName} resource spec ${resourceSpecId} packageName mismatch.`,
		);
	}
	expect(
		Array.isArray(packSpec.generatedSourceFiles),
		`${packSpec.packageName} generatedSourceFiles must be an array.`,
	);
	for (const generatedSourceFile of packSpec.generatedSourceFiles) {
		expect(
			SUPPORTED_GENERATED_SOURCE_FILES.has(generatedSourceFile),
			`${packSpec.packageName} declares unsupported generated source file ${generatedSourceFile}.`,
		);
	}
	expect(
		packSpec.generatedSourceFiles.includes("src/manifest.ts"),
		`${packSpec.packageName} must generate src/manifest.ts.`,
	);
	expect(
		packSpec.generatedSourceFiles.includes("src/resources.ts"),
		`${packSpec.packageName} must generate src/resources.ts.`,
	);
	expect(
		packSpec.manifest !== undefined &&
			typeof packSpec.manifest === "object" &&
			!Array.isArray(packSpec.manifest),
		`${packSpec.packageName} must declare a manifest.`,
	);
	expect(
		packSpec.manifest.generated === undefined,
		`${packSpec.packageName} manifest.generated is forge-owned and must not be declared in the pack spec.`,
	);
	expect(
		packSpec.manifest.gapNotes === undefined,
		`${packSpec.packageName} manifest.gapNotes are forge-owned and must not be declared in the pack spec.`,
	);
}

function validateResourceSpec(resourceSpec) {
	for (const key of [
		"resourceSpecId",
		"packageName",
		"pipelineId",
		"pipelineVersion",
		"sourceIds",
		"snapshotIds",
		"inputFiles",
		"outputs",
	]) {
		expect(resourceSpec[key] !== undefined, `Resource spec is missing ${key}.`);
	}
	expect(
		resourceSpec.schemaVersion === "1",
		`${resourceSpec.resourceSpecId} schemaVersion must be 1.`,
	);
	expect(
		Array.isArray(resourceSpec.inputFiles) &&
			resourceSpec.inputFiles.length > 0,
		`${resourceSpec.resourceSpecId} inputFiles must be a non-empty array.`,
	);
	expect(
		Array.isArray(resourceSpec.outputs) && resourceSpec.outputs.length > 0,
		`${resourceSpec.resourceSpecId} outputs must be a non-empty array.`,
	);
	for (const inputFile of resourceSpec.inputFiles) {
		assertRelativePath(
			inputFile.path,
			`${resourceSpec.resourceSpecId} input file path`,
		);
		expect(
			typeof inputFile.checksum === "string" &&
				inputFile.checksum.startsWith("sha256:"),
			`${resourceSpec.resourceSpecId} input ${inputFile.path} must declare a sha256 checksum.`,
		);
	}
	for (const output of resourceSpec.outputs) {
		assertRelativePath(
			output.path,
			`${resourceSpec.resourceSpecId} output path`,
		);
		expect(
			output.path.startsWith("resources/"),
			`${resourceSpec.resourceSpecId} output ${output.path} must live under resources/.`,
		);
	}
}

function validateSourceCatalog(sources) {
	const sourceById = new Map();
	for (const source of sources) {
		expect(
			source.schemaVersion === "1",
			`${source.sourceId} schemaVersion must be 1.`,
		);
		assertStringArray(
			source.licenseEvidence,
			`${source.sourceId} licenseEvidence`,
			{
				minItems: 1,
			},
		);
		for (const evidenceUrl of source.licenseEvidence) {
			expect(
				evidenceUrl.startsWith("https://"),
				`${source.sourceId} licenseEvidence must use HTTPS URLs.`,
			);
		}
		expect(
			!sourceById.has(source.sourceId),
			`Duplicate source id ${source.sourceId}.`,
		);
		expect(
			source.reviewState !== "blocked",
			`${source.sourceId} is blocked and cannot be used by generated packs.`,
		);
		expect(
			source.redistributionPolicy !== "blocked",
			`${source.sourceId} has blocked redistribution policy.`,
		);
		sourceById.set(source.sourceId, source);
	}
	return sourceById;
}

function assertStringArray(value, label, { minItems = 0 } = {}) {
	expect(Array.isArray(value), `${label} must be an array.`);
	expect(
		value.length >= minItems,
		`${label} must contain at least ${minItems} items.`,
	);
	for (const item of value) {
		expect(
			typeof item === "string" && item.length > 0,
			`${label} must contain only non-empty strings.`,
		);
	}
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
		publishableSourcePolicyClasses.has(policy.policyClass)
	) {
		return true;
	}
	return (
		isolatedPublishableSourcePolicyClasses.has(policy.policyClass) &&
		policy.defaultCompositeAllowed === false &&
		policy.requiredPackageNameSuffixes.length > 0 &&
		hasAllowedPackageSuffix(packageName, policy.requiredPackageNameSuffixes)
	);
}

function sourcePolicyAllowsCompositeReference(policy, packageName) {
	if (policy.defaultCompositeAllowed === true) {
		return true;
	}
	return (
		policy.requiredPackageNameSuffixes.length > 0 &&
		hasAllowedPackageSuffix(packageName, policy.requiredPackageNameSuffixes)
	);
}

function policySurfaceFor(pack) {
	return pack.policySurface ?? "default";
}

function isPolicyExpandedWrapper(pack) {
	return policySurfaceFor(pack) === "policy-expanded-wrapper";
}

function sourcePolicyAllowsPolicyExpandedWrapper(policy) {
	return (
		policy.reviewState === "approved" &&
		policyExpandedWrapperSourcePolicyClasses.has(policy.policyClass)
	);
}

function sourcePolicyAllowsPackagePublishability(policy, pack) {
	return (
		sourcePolicyAllowsPackPublishability(policy, pack.packageName) ||
		(isPolicyExpandedWrapper(pack) &&
			sourcePolicyAllowsPolicyExpandedWrapper(policy))
	);
}

function sourcePolicyAllowsDirectCompositeSource(policy, pack) {
	return (
		sourcePolicyAllowsCompositeReference(policy, pack.packageName) ||
		(isPolicyExpandedWrapper(pack) &&
			sourcePolicyAllowsPolicyExpandedWrapper(policy))
	);
}

function sourcePolicyAllowsRequiredComponentReference(
	policy,
	composite,
	componentPack,
) {
	if (sourcePolicyAllowsCompositeReference(policy, composite.packageName)) {
		return true;
	}
	if (
		!isPolicyExpandedWrapper(composite) ||
		!sourcePolicyAllowsPolicyExpandedWrapper(policy)
	) {
		return false;
	}
	return (
		policy.requiredPackageNameSuffixes.length === 0 ||
		hasAllowedPackageSuffix(
			componentPack.packageName,
			policy.requiredPackageNameSuffixes,
		) ||
		isPolicyExpandedWrapper(componentPack)
	);
}

function validatePolicyClassDefinition(definition, expectedClass) {
	expect(
		definition !== undefined,
		`Source policy is missing license class ${expectedClass}.`,
	);
	expect(
		definition.class === expectedClass,
		`Source policy license class order mismatch for ${expectedClass}.`,
	);
	expect(
		definition.defaultCompositeAllowed ===
			defaultCompositeSourcePolicyClasses.has(expectedClass),
		`${expectedClass} defaultCompositeAllowed does not match forge policy.`,
	);
	expect(
		definition.publishableByDefault ===
			publishableSourcePolicyClasses.has(expectedClass),
		`${expectedClass} publishableByDefault does not match forge policy.`,
	);
	assertStringArray(
		definition.packageNameSuffixes,
		`${expectedClass} packageNameSuffixes`,
	);
}

function validateSourcePolicySpec(policySpec) {
	expect(
		policySpec.schemaVersion === "1",
		`${policySpec.policyId ?? "source policy"} schemaVersion must be 1.`,
	);
	expect(
		typeof policySpec.policyId === "string" && policySpec.policyId.length > 0,
		"Source policy spec must declare policyId.",
	);
	expect(
		typeof policySpec.generatedFrom === "string" &&
			policySpec.generatedFrom.length > 0,
		`${policySpec.policyId} generatedFrom is required.`,
	);
	assertStringArray(
		policySpec.licenseClasses?.map((entry) => entry.class),
		`${policySpec.policyId} licenseClasses`,
		{ minItems: sourcePolicyClasses.length },
	);
	const classByName = new Map(
		policySpec.licenseClasses.map((entry) => [entry.class, entry]),
	);
	for (const policyClass of sourcePolicyClasses) {
		validatePolicyClassDefinition(classByName.get(policyClass), policyClass);
	}
	const sourceById = new Map();
	for (const source of policySpec.sources ?? []) {
		expect(
			typeof source.sourceId === "string" && source.sourceId.length > 0,
			`${policySpec.policyId} has a source without sourceId.`,
		);
		expect(
			!sourceById.has(source.sourceId),
			`Duplicate source policy entry ${source.sourceId}.`,
		);
		expect(
			sourcePolicyClasses.includes(source.policyClass),
			`${source.sourceId} has unknown policyClass ${source.policyClass}.`,
		);
		const classDefinition = classByName.get(source.policyClass);
		expect(
			classDefinition !== undefined,
			`${source.sourceId} policyClass ${source.policyClass} has no class definition.`,
		);
		expect(
			["approved", "pending", "blocked"].includes(source.reviewState),
			`${source.sourceId} has invalid reviewState ${source.reviewState}.`,
		);
		expect(
			typeof source.defaultCompositeAllowed === "boolean",
			`${source.sourceId} defaultCompositeAllowed must be boolean.`,
		);
		expect(
			typeof source.publishableByDefault === "boolean",
			`${source.sourceId} publishableByDefault must be boolean.`,
		);
		assertStringArray(
			source.requiredPackageNameSuffixes,
			`${source.sourceId} requiredPackageNameSuffixes`,
		);
		assertStringArray(source.languages, `${source.sourceId} languages`);
		assertStringArray(
			source.capabilitySlots,
			`${source.sourceId} capabilitySlots`,
		);
		expect(
			["first", "second", "isolated", "review"].includes(source.priority),
			`${source.sourceId} has invalid priority ${source.priority}.`,
		);
		if (["isolated", "review"].includes(source.priority)) {
			expect(
				source.defaultCompositeAllowed === false,
				`${source.sourceId} has ${source.priority} priority and cannot be default-composite allowed.`,
			);
			expect(
				source.publishableByDefault === false,
				`${source.sourceId} has ${source.priority} priority and cannot be publishable by default.`,
			);
		}
		for (const suffix of source.requiredPackageNameSuffixes) {
			expect(
				classDefinition.packageNameSuffixes.includes(suffix),
				`${source.sourceId} suffix ${suffix} is not allowed by ${source.policyClass}.`,
			);
		}
		expect(
			!source.publishableByDefault ||
				(source.reviewState === "approved" &&
					publishableSourcePolicyClasses.has(source.policyClass)),
			`${source.sourceId} cannot be publishable by default without approved default-safe or attribution policy.`,
		);
		expect(
			!source.defaultCompositeAllowed ||
				defaultCompositeSourcePolicyClasses.has(source.policyClass),
			`${source.sourceId} cannot be default-composite allowed with ${source.policyClass}.`,
		);
		if (
			[
				"share-alike",
				"copyleft",
				"noncommercial/research",
				"local-only",
			].includes(source.policyClass)
		) {
			expect(
				source.requiredPackageNameSuffixes.length > 0,
				`${source.sourceId} ${source.policyClass} policy must require a package name suffix.`,
			);
		}
		if (source.policyClass === "blocked/review-only") {
			expect(
				source.requiredPackageNameSuffixes.length === 0,
				`${source.sourceId} blocked/review-only policy must not declare package suffixes because it cannot generate packages.`,
			);
		}
		sourceById.set(source.sourceId, source);
	}
	expect(sourceById.size > 0, `${policySpec.policyId} must declare sources.`);
	const languageByTag = new Map();
	for (const language of policySpec.languages ?? []) {
		expect(
			typeof language.languageTag === "string" &&
				language.languageTag.length > 0,
			`${policySpec.policyId} has a language without languageTag.`,
		);
		expect(
			!languageByTag.has(language.languageTag),
			`Duplicate source policy language ${language.languageTag}.`,
		);
		for (const bucket of [
			"firstSources",
			"secondWaveSources",
			"isolatedSources",
		]) {
			assertStringArray(language[bucket], `${language.languageTag} ${bucket}`);
			for (const sourceId of language[bucket]) {
				expect(
					sourceById.has(sourceId),
					`${language.languageTag} ${bucket} references unknown source ${sourceId}.`,
				);
				if (bucket === "isolatedSources") {
					const source = sourceById.get(sourceId);
					expect(
						source.defaultCompositeAllowed === false,
						`${language.languageTag} isolated source ${sourceId} must not be default-composite allowed.`,
					);
					expect(
						source.publishableByDefault === false,
						`${language.languageTag} isolated source ${sourceId} must not be publishable by default.`,
					);
				}
			}
		}
		languageByTag.set(language.languageTag, language);
	}
	for (const languageTag of requiredSourcePolicyLanguageTags) {
		expect(
			languageByTag.has(languageTag),
			`Source policy must declare language priority record ${languageTag}.`,
		);
	}
	return { classByName, sourceById, languageByTag };
}

function collectSourcePolicies(policySpecs) {
	const sourcePolicyById = new Map();
	const languagePolicyByTag = new Map();
	const licenseClassByName = new Map();
	for (const policySpec of policySpecs) {
		const validated = validateSourcePolicySpec(policySpec);
		for (const [policyClass, definition] of validated.classByName) {
			const existing = licenseClassByName.get(policyClass);
			if (existing === undefined) {
				licenseClassByName.set(policyClass, definition);
				continue;
			}
			expect(
				JSON.stringify(sortJson(existing)) ===
					JSON.stringify(sortJson(definition)),
				`Conflicting source policy license class ${policyClass}.`,
			);
		}
		for (const [sourceId, policy] of validated.sourceById) {
			expect(
				!sourcePolicyById.has(sourceId),
				`Duplicate source policy entry ${sourceId}.`,
			);
			sourcePolicyById.set(sourceId, policy);
		}
		for (const [languageTag, language] of validated.languageByTag) {
			expect(
				!languagePolicyByTag.has(languageTag),
				`Duplicate source policy language ${languageTag}.`,
			);
			languagePolicyByTag.set(languageTag, language);
		}
	}
	expect(
		sourcePolicyById.size > 0,
		"Forge lock must declare at least one source policy spec.",
	);
	return {
		licenseClassByName,
		sourcePolicyById,
		languagePolicyByTag,
		sourcePolicies: sorted([...sourcePolicyById.keys()]).map((sourceId) =>
			sourcePolicyById.get(sourceId),
		),
		languagePolicies: sorted([...languagePolicyByTag.keys()]).map(
			(languageTag) => languagePolicyByTag.get(languageTag),
		),
	};
}

function validateActiveSourcePolicies(context) {
	for (const source of context.sources) {
		const policy = context.sourcePolicyById.get(source.sourceId);
		expect(
			policy !== undefined,
			`${source.sourceId} is active but has no source policy entry.`,
		);
		expect(
			policy.family === source.family,
			`${source.sourceId} active family ${source.family} conflicts with policy family ${policy.family}.`,
		);
		expect(
			policy.licenseExpression === source.licenseExpression,
			`${source.sourceId} active license ${source.licenseExpression} conflicts with policy license ${policy.licenseExpression}.`,
		);
		expect(
			policy.redistributionPolicy === source.redistributionPolicy,
			`${source.sourceId} active redistributionPolicy ${source.redistributionPolicy} conflicts with policy redistributionPolicy ${policy.redistributionPolicy}.`,
		);
		expect(
			policy.reviewState === source.reviewState,
			`${source.sourceId} active reviewState ${source.reviewState} conflicts with policy reviewState ${policy.reviewState}.`,
		);
		expect(
			policy.reviewState !== "blocked",
			`${source.sourceId} is active but blocked by source policy.`,
		);
		expect(
			policy.policyClass !== "blocked/review-only",
			`${source.sourceId} has policy ${policy.policyClass} and cannot be an active generated source.`,
		);
	}
}

function validatePackageSourcePolicy(pack, context) {
	for (const languageTag of pack.targets?.languages ?? []) {
		const languagePolicy = context.languagePolicyByTag.get(languageTag);
		expect(
			languagePolicy !== undefined,
			`${pack.packageName} targets ${languageTag}, but no source priority record exists for that language.`,
		);
		const allowedSourceIds = new Set([
			...languagePolicy.firstSources,
			...languagePolicy.secondWaveSources,
			...languagePolicy.isolatedSources,
		]);
		for (const sourceId of pack.sourceIds) {
			const policy = context.sourcePolicyById.get(sourceId);
			expect(
				policy !== undefined,
				`${pack.packageName} references source ${sourceId} without source policy entry.`,
			);
			expect(
				(policy.languages ?? []).includes("*") ||
					(policy.languages ?? []).includes(languageTag),
				`${pack.packageName} targets ${languageTag}, but ${sourceId} is scoped to ${(policy.languages ?? []).join(", ")}.`,
			);
			expect(
				allowedSourceIds.has(sourceId),
				`${pack.packageName} targets ${languageTag}, but ${sourceId} is not declared in that language's first, second-wave, or isolated source priority lists.`,
			);
		}
	}
	for (const sourceId of pack.sourceIds) {
		const policy = context.sourcePolicyById.get(sourceId);
		expect(
			policy !== undefined,
			`${pack.packageName} references source ${sourceId} without source policy entry.`,
		);
		if (policy.policyClass === "blocked/review-only") {
			fail(
				`${pack.packageName} cannot generate from blocked/review-only source ${sourceId}.`,
			);
		}
		if (policy.requiredPackageNameSuffixes.length > 0) {
			expect(
				hasAllowedPackageSuffix(
					pack.packageName,
					policy.requiredPackageNameSuffixes,
				) || isPolicyExpandedWrapper(pack),
				`${pack.packageName} uses ${sourceId} but does not end with one of ${policy.requiredPackageNameSuffixes.join(", ")}.`,
			);
		}
		if (pack.publishable === true) {
			expect(
				sourcePolicyAllowsPackagePublishability(policy, pack),
				`${pack.packageName} requested publishability but ${sourceId} policy is ${policy.policyClass}/${policy.reviewState}.`,
			);
		}
		expect(
			!isCompositePack(pack) ||
				sourcePolicyAllowsDirectCompositeSource(policy, pack),
			`${pack.packageName} directly declares non-default source ${sourceId}.`,
		);
	}
}

function validateCompositeComponentSourcePolicies(
	composite,
	packageByName,
	context,
) {
	for (const component of composite.components ?? []) {
		const componentPack = packageByName.get(component.packageName);
		expect(
			componentPack !== undefined,
			`${composite.packageName} references unknown component ${component.packageName}.`,
		);
		const allowedClasses =
			componentLicensePolicyClasses[component.licensePolicy];
		expect(
			allowedClasses !== undefined,
			`${composite.packageName} component ${component.packageName} has unknown licensePolicy ${component.licensePolicy}.`,
		);
		for (const sourceId of componentPack.sourceIds) {
			const policy = context.sourcePolicyById.get(sourceId);
			expect(
				policy !== undefined,
				`${componentPack.packageName} source ${sourceId} has no source policy entry.`,
			);
			if (component.role === "required") {
				expect(
					sourcePolicyAllowsRequiredComponentReference(
						policy,
						composite,
						componentPack,
					),
					`${composite.packageName} requires ${componentPack.packageName}, but ${sourceId} is not allowed in default composites and ${composite.packageName} does not declare a required policy suffix.`,
				);
			}
			expect(
				allowedClasses.has(policy.policyClass),
				`${composite.packageName} component ${component.packageName} uses ${sourceId} policy ${policy.policyClass}, but component licensePolicy is ${component.licensePolicy}.`,
			);
		}
		if (composite.publishable === true && component.role === "required") {
			expect(
				componentPack.publishable === true,
				`${composite.packageName} cannot be publishable while required component ${component.packageName} is not publishable.`,
			);
		}
	}
}

function validateSnapshotCatalog(snapshots, sourceById) {
	const snapshotById = new Map();
	for (const snapshot of snapshots) {
		expect(
			snapshot.schemaVersion === "1",
			`${snapshot.snapshotId} schemaVersion must be 1.`,
		);
		expect(
			!snapshotById.has(snapshot.snapshotId),
			`Duplicate snapshot id ${snapshot.snapshotId}.`,
		);
		expect(
			sourceById.has(snapshot.sourceId),
			`${snapshot.snapshotId} references unknown source ${snapshot.sourceId}.`,
		);
		snapshotById.set(snapshot.snapshotId, snapshot);
	}
	return snapshotById;
}

function validateResourceSourceGraph(resourceSpec, sourceById, snapshotById) {
	for (const sourceId of resourceSpec.sourceIds) {
		expect(
			sourceById.has(sourceId),
			`${resourceSpec.resourceSpecId} references unknown source ${sourceId}.`,
		);
	}
	for (const snapshotId of resourceSpec.snapshotIds) {
		const snapshot = snapshotById.get(snapshotId);
		expect(
			snapshot !== undefined,
			`${resourceSpec.resourceSpecId} references unknown snapshot ${snapshotId}.`,
		);
		expect(
			resourceSpec.sourceIds.includes(snapshot.sourceId),
			`${resourceSpec.resourceSpecId} snapshot ${snapshotId} comes from undeclared source ${snapshot.sourceId}.`,
		);
	}
	for (const inputFile of resourceSpec.inputFiles) {
		expect(
			resourceSpec.snapshotIds.includes(inputFile.snapshotId),
			`${resourceSpec.resourceSpecId} input ${inputFile.path} uses undeclared snapshot ${inputFile.snapshotId}.`,
		);
		const snapshot = snapshotById.get(inputFile.snapshotId);
		expect(
			snapshot !== undefined,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} references unknown snapshot ${inputFile.snapshotId}.`,
		);
		const snapshotFile = snapshot.files?.find(
			(candidate) => candidate.path === inputFile.path,
		);
		expect(
			snapshotFile !== undefined,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} is not declared by snapshot ${inputFile.snapshotId}.`,
		);
		expect(
			snapshotFile.checksum === inputFile.checksum,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} checksum does not match snapshot descriptor.`,
			`expected ${snapshotFile.checksum}\nactual   ${inputFile.checksum}`,
		);
	}
}

function validateCompositeSpec(spec, knownPackageNames) {
	for (const key of [
		"packageName",
		"packageDir",
		"name",
		"description",
		"version",
		"packClass",
		"supportLevel",
		"loader",
		"targets",
		"components",
		"capabilitySlots",
		"license",
		"citations",
	]) {
		expect(spec[key] !== undefined, `Composite spec is missing ${key}.`);
	}
	expect(
		spec.mode === "source-backed",
		`${spec.packageName} composite mode ${spec.mode} is unsupported.`,
	);
	expect(
		isCompositePack(spec),
		`${spec.packageName} packClass must be foundation-composite, language-component-composite, or language-composite.`,
	);
	expect(
		compositePolicySurfaces.has(spec.policySurface ?? "default"),
		`${spec.packageName} policySurface must be default or policy-expanded-wrapper.`,
	);
	assertRelativePath(spec.packageDir, `${spec.packageName} packageDir`);
	expect(
		typeof spec.loader.functionName === "string" &&
			spec.loader.functionName.length > 0,
		`${spec.packageName} loader.functionName must be a non-empty string.`,
	);
	expect(
		typeof spec.loader.languageName === "string" &&
			spec.loader.languageName.length > 0,
		`${spec.packageName} loader.languageName must be a non-empty string.`,
	);
	expect(
		Array.isArray(spec.components) && spec.components.length > 0,
		`${spec.packageName} must declare at least one component.`,
	);
	const requiredComponents = spec.components.filter(
		(component) => component.role === "required",
	);
	expect(
		requiredComponents.length > 0,
		`${spec.packageName} must declare at least one required component.`,
	);
	for (const component of spec.components) {
		expect(
			knownPackageNames.has(component.packageName),
			`${spec.packageName} references unknown component ${component.packageName}.`,
		);
	}
	expect(
		Array.isArray(spec.sourceIds) && spec.sourceIds.length > 0,
		`${spec.packageName} source-backed composite must declare sourceIds.`,
	);
	expect(
		Array.isArray(spec.snapshotIds) && spec.snapshotIds.length > 0,
		`${spec.packageName} source-backed composite must declare snapshotIds.`,
	);
}

function generatedGapNotes(manifest, generatedKind, mode = "source-backed") {
	return manifest.capabilitySlots
		.filter((slot) =>
			["unsupported", "planned", "artifact-backed", "not-applicable"].includes(
				slot.status,
			),
		)
		.map((slot) => ({
			id: `gap:${manifest.id}:${slot.slot}`,
			slot: slot.slot,
			status:
				slot.status === "unsupported"
					? "unsupported"
					: slot.status === "artifact-backed"
						? "artifact-backed"
						: slot.status === "not-applicable"
							? "not-applicable"
							: "planned",
			message: `${slot.slot} is ${slot.status} in this ${mode} ${generatedKind}.`,
		}));
}

function manifestFor(packSpec, context) {
	const manifest = cloneJson(packSpec.manifest);
	const gapNotes = generatedGapNotes(
		manifest,
		"concrete pack",
		packSpec.generationMode ?? "source-backed",
	);
	if (gapNotes.length > 0) manifest.gapNotes = gapNotes;
	manifest.generated = {
		forgeVersion: context.forgeVersion,
		lockfileChecksum: context.lockfileChecksum,
		generatedAt: context.generatedAt,
		generatorCommand: BUILD_COMMAND,
	};
	return manifest;
}

function compositeManifestFor(spec, context) {
	const manifest = {
		schemaVersion: "1",
		id: `pack:${spec.packageName.replace("@ismail-elkorchi/textpack-", "")}`,
		name: spec.name,
		version: spec.version,
		packageName: spec.packageName,
		targets: spec.targets,
		engines: {
			"@ismail-elkorchi/textpack": "^0.1.0",
		},
		resources: [],
		components: spec.components,
		capabilitySlots: spec.capabilitySlots,
		license: spec.license,
		citations: spec.citations,
	};
	const gapNotes = generatedGapNotes(
		manifest,
		"recipe composite pack",
		spec.mode,
	);
	if (gapNotes.length > 0) manifest.gapNotes = gapNotes;
	manifest.generated = {
		forgeVersion: context.forgeVersion,
		lockfileChecksum: context.lockfileChecksum,
		generatedAt: context.generatedAt,
		generatorCommand: BUILD_COMMAND,
	};
	return manifest;
}

function tsvCell(value) {
	return String(value ?? "")
		.replace(/\r?\n/gu, " ")
		.replace(/\t/gu, " ")
		.trim();
}

function tsvFile(header, rows) {
	return `${[header, ...rows]
		.map((row) => row.map((cell) => tsvCell(cell)).join("\t"))
		.join("\n")}\n`;
}

function outputFor(resourceSpec, resourceId, text) {
	const output = resourceSpec.outputs.find(
		(candidate) => candidate.resourceId === resourceId,
	);
	expect(
		output !== undefined,
		`${resourceSpec.resourceSpecId} does not declare output ${resourceId}.`,
	);
	return {
		id: output.resourceId,
		kind: output.kind,
		path: output.path,
		text,
	};
}

function parseIanaRegistry(text) {
	const blocks = text.split(/\n%%\n/u);
	const fileDateMatch = blocks[0].match(/^File-Date:\s*(.+)$/mu);
	const records = [];
	for (const block of blocks.slice(1)) {
		const fields = new Map();
		let currentKey;
		for (const line of block.split(/\r?\n/u)) {
			if (line.trim().length === 0) continue;
			if (/^\s/u.test(line) && currentKey !== undefined) {
				const values = fields.get(currentKey);
				values[values.length - 1] = `${values.at(-1)} ${line.trim()}`;
				continue;
			}
			const match = line.match(/^([^:]+):\s*(.*)$/u);
			if (match === null) continue;
			currentKey = match[1];
			const values = fields.get(currentKey) ?? [];
			values.push(match[2]);
			fields.set(currentKey, values);
		}
		if (!fields.has("Type")) continue;
		const value = (key) => (fields.get(key) ?? []).join(" | ");
		records.push({
			type: value("Type"),
			subtag: value("Subtag"),
			tag: value("Tag"),
			description: value("Description"),
			added: value("Added"),
			deprecated: value("Deprecated"),
			preferredValue: value("Preferred-Value"),
			suppressScript: value("Suppress-Script"),
			macrolanguage: value("Macrolanguage"),
			scope: value("Scope"),
			prefix: value("Prefix"),
		});
	}
	const typeOrder = new Map(
		[
			"language",
			"extlang",
			"script",
			"region",
			"variant",
			"grandfathered",
			"redundant",
		].map((type, index) => [type, index]),
	);
	records.sort((left, right) => {
		const typeDelta =
			(typeOrder.get(left.type) ?? 99) - (typeOrder.get(right.type) ?? 99);
		if (typeDelta !== 0) return typeDelta;
		return (left.subtag || left.tag).localeCompare(right.subtag || right.tag);
	});
	return {
		fileDate: fileDateMatch?.[1] ?? "unknown",
		records,
	};
}

function transformIanaLanguageRegistry(resourceSpec, inputs) {
	const input = inputs.get("language-subtag-registry.txt");
	expect(
		input !== undefined,
		`${resourceSpec.resourceSpecId} missing IANA input.`,
	);
	const registry = parseIanaRegistry(input);
	const rows = registry.records.map((record) => [
		record.type,
		record.subtag,
		record.tag,
		record.preferredValue,
		record.suppressScript,
		record.macrolanguage,
		record.scope,
		record.deprecated,
		record.added,
		record.prefix,
		record.description,
	]);
	const countsByType = {};
	for (const record of registry.records) {
		countsByType[record.type] = (countsByType[record.type] ?? 0) + 1;
	}
	const deprecatedRecordCount = registry.records.filter(
		(record) => record.deprecated.length > 0,
	).length;
	const summary = {
		schemaVersion: "1",
		source: "IANA Language Subtag Registry",
		fileDate: registry.fileDate,
		recordCount: registry.records.length,
		deprecatedRecordCount,
		countsByType: sortJson(countsByType),
	};
	return [
		outputFor(
			resourceSpec,
			"bcp47-language-subtags",
			tsvFile(
				[
					"type",
					"subtag",
					"tag",
					"preferredValue",
					"suppressScript",
					"macrolanguage",
					"scope",
					"deprecated",
					"added",
					"prefix",
					"description",
				],
				rows,
			),
		),
		outputFor(
			resourceSpec,
			"bcp47-language-registry-summary",
			stableJson(summary),
		),
	];
}

function stripUnicodeDataLine(line) {
	const hashIndex = line.indexOf("#");
	const body = hashIndex === -1 ? line : line.slice(0, hashIndex);
	const comment = hashIndex === -1 ? "" : line.slice(hashIndex + 1).trim();
	return { body: body.trim(), comment };
}

function parseCodePointRange(range) {
	const [start, end = start] = range.split("..");
	return {
		start,
		end,
		startValue: Number.parseInt(start, 16),
		endValue: Number.parseInt(end, 16),
	};
}

function parseUnicodeRangeFile(text) {
	const rows = [];
	for (const line of text.split(/\r?\n/u)) {
		const { body, comment } = stripUnicodeDataLine(line);
		if (body.length === 0) continue;
		const [rangeText, value] = body.split(";").map((part) => part.trim());
		if (rangeText === undefined || value === undefined) continue;
		const range = parseCodePointRange(rangeText);
		rows.push({ ...range, value, comment });
	}
	rows.sort((left, right) => left.startValue - right.startValue);
	return rows;
}

function parsePropertyValueAliases(text) {
	const rows = [];
	for (const line of text.split(/\r?\n/u)) {
		const { body } = stripUnicodeDataLine(line);
		if (body.length === 0) continue;
		const fields = body.split(";").map((field) => field.trim());
		if (fields.length < 3) continue;
		const [property, alias, longName, ...otherAliases] = fields;
		rows.push({
			property,
			alias,
			longName,
			otherAliases: otherAliases.join(" "),
		});
	}
	rows.sort((left, right) => {
		const propertyDelta = left.property.localeCompare(right.property);
		if (propertyDelta !== 0) return propertyDelta;
		return left.alias.localeCompare(right.alias);
	});
	return rows;
}

function transformUnicode17Core(resourceSpec, inputs) {
	const blocksText = inputs.get("Blocks.txt");
	const aliasesText = inputs.get("PropertyValueAliases.txt");
	const scriptsText = inputs.get("Scripts.txt");
	expect(
		blocksText !== undefined,
		`${resourceSpec.resourceSpecId} missing Blocks.txt.`,
	);
	expect(
		aliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing PropertyValueAliases.txt.`,
	);
	expect(
		scriptsText !== undefined,
		`${resourceSpec.resourceSpecId} missing Scripts.txt.`,
	);
	const blocks = parseUnicodeRangeFile(blocksText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const aliases = parsePropertyValueAliases(aliasesText);
	const summary = {
		schemaVersion: "1",
		source: "Unicode Character Database",
		version: "17.0.0",
		blockRangeCount: blocks.length,
		scriptRangeCount: scripts.length,
		propertyValueAliasCount: aliases.length,
	};
	return [
		outputFor(
			resourceSpec,
			"unicode-17-blocks",
			tsvFile(
				["start", "end", "block", "comment"],
				blocks.map((row) => [row.start, row.end, row.value, row.comment]),
			),
		),
		outputFor(
			resourceSpec,
			"unicode-17-property-value-aliases",
			tsvFile(
				["property", "alias", "longName", "otherAliases"],
				aliases.map((row) => [
					row.property,
					row.alias,
					row.longName,
					row.otherAliases,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"unicode-17-scripts",
			tsvFile(
				["start", "end", "script", "comment"],
				scripts.map((row) => [row.start, row.end, row.value, row.comment]),
			),
		),
		outputFor(resourceSpec, "unicode-17-core-summary", stableJson(summary)),
	];
}

function transformCldrCoreFoundation(resourceSpec, inputs) {
	const aliasesText = inputs.get("aliases.json");
	const likelySubtagsText = inputs.get("likelySubtags.json");
	const scriptDataText = inputs.get("scriptData.json");
	expect(
		aliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing aliases.json.`,
	);
	expect(
		likelySubtagsText !== undefined,
		`${resourceSpec.resourceSpecId} missing likelySubtags.json.`,
	);
	expect(
		scriptDataText !== undefined,
		`${resourceSpec.resourceSpecId} missing scriptData.json.`,
	);
	const aliases = JSON.parse(aliasesText);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const scriptData = JSON.parse(scriptDataText);
	const likely = Object.entries(likelySubtags.supplemental.likelySubtags)
		.map(([source, target]) => [source, target])
		.sort((left, right) => left[0].localeCompare(right[0]));
	const aliasRows = [];
	for (const [kind, entries] of Object.entries(
		aliases.supplemental.metadata.alias,
	)) {
		for (const [code, alias] of Object.entries(entries)) {
			aliasRows.push([
				kind.replace(/Alias$/u, ""),
				code,
				alias._replacement ?? "",
				alias._reason ?? "",
			]);
		}
	}
	aliasRows.sort((left, right) => {
		const kindDelta = left[0].localeCompare(right[0]);
		if (kindDelta !== 0) return kindDelta;
		return left[1].localeCompare(right[1]);
	});
	const scriptRows = [];
	for (const [variantKind, scripts] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		for (const [script, detail] of Object.entries(scripts)) {
			scriptRows.push([variantKind, script, (detail._base ?? []).join(" ")]);
		}
	}
	scriptRows.sort((left, right) => {
		const kindDelta = left[0].localeCompare(right[0]);
		if (kindDelta !== 0) return kindDelta;
		return left[1].localeCompare(right[1]);
	});
	const summary = {
		schemaVersion: "1",
		source: "Unicode CLDR Core",
		cldrVersion: likelySubtags.supplemental.version._cldrVersion,
		unicodeVersion: likelySubtags.supplemental.version._unicodeVersion,
		likelySubtagCount: likely.length,
		aliasCount: aliasRows.length,
		scriptVariantCount: scriptRows.length,
	};
	return [
		outputFor(
			resourceSpec,
			"cldr-48-likely-subtags",
			tsvFile(["source", "target"], likely),
		),
		outputFor(
			resourceSpec,
			"cldr-48-locale-aliases",
			tsvFile(["kind", "code", "replacement", "reason"], aliasRows),
		),
		outputFor(
			resourceSpec,
			"cldr-48-script-data",
			tsvFile(["variantKind", "script", "baseScripts"], scriptRows),
		),
		outputFor(resourceSpec, "cldr-48-core-summary", stableJson(summary)),
	];
}

const englishCoreFunctionWordPos = new Set(["c", "d", "pn", "pp", "s"]);

function transformEnglishCoreProfile(resourceSpec, inputs) {
	const ianaText = requiredInput(
		inputs,
		"language-subtag-registry.txt",
		resourceSpec,
	);
	const generalCategoryText = requiredInput(
		inputs,
		"DerivedGeneralCategory.txt",
		resourceSpec,
	);
	const scriptsText = requiredInput(inputs, "Scripts.txt", resourceSpec);
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const scriptDataText = requiredInput(inputs, "scriptData.json", resourceSpec);
	const enUsWordlistText = requiredInput(inputs, "en_US.txt", resourceSpec);
	const scowlText = requiredInput(inputs, "scowl.txt", resourceSpec);

	const registry = parseIanaRegistry(ianaText);
	const englishRecord = registry.records.find(
		(record) => record.type === "language" && record.subtag === "en",
	);
	expect(
		englishRecord !== undefined,
		`${resourceSpec.resourceSpecId} expected IANA language subtag en.`,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.en;
	expect(
		likelySubtag === "en-Latn-US",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag en -> en-Latn-US.`,
		likelySubtag,
	);
	const scriptData = JSON.parse(scriptDataText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const generalCategories = parseUnicodeRangeFile(generalCategoryText);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const enUsWordlist = parseWordlist(enUsWordlistText);
	const latinScriptRanges = scripts.filter((row) => row.value === "Latin");
	const punctuationRows = generalCategories.filter((row) =>
		row.value.startsWith("P"),
	);
	const scriptVariantRows = [];
	for (const [variantKind, scriptEntries] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		if (Object.hasOwn(scriptEntries, "Latn")) {
			scriptVariantRows.push({
				variantKind,
				baseScripts: (scriptEntries.Latn._base ?? []).join(" "),
			});
		}
	}
	scriptVariantRows.sort((left, right) =>
		left.variantKind.localeCompare(right.variantKind),
	);

	const abbreviationRows = [];
	const functionWordRows = [];
	let sourceLineNumber = 0;
	let scowlRecordsRejected = 0;
	for (const line of scowlText.split(/\r?\n/u)) {
		sourceLineNumber += 1;
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
		const record = splitScowlLine(trimmed);
		if (record === undefined) {
			scowlRecordsRejected += 1;
			continue;
		}
		const { size, tags } = parseScowlInfo(record.scowlInfo);
		const parsedLemma = parseScowlLemmaInfo(record.lemmaInfo, "");
		if (parsedLemma.lemma.length === 0 || size.length === 0) {
			scowlRecordsRejected += 1;
			continue;
		}
		const numericSize = Number.parseInt(size, 10);
		const row = [
			parsedLemma.lemma,
			size,
			tags,
			parsedLemma.partOfSpeech,
			parsedLemma.posClass,
			sourceLineNumber,
			record.scowlInfo,
		];
		if (
			parsedLemma.partOfSpeech === "abbr" ||
			parsedLemma.posClass.split(/[/?]/u).includes("abbr")
		) {
			abbreviationRows.push(row);
		}
		if (
			englishCoreFunctionWordPos.has(parsedLemma.partOfSpeech) &&
			Number.isFinite(numericSize) &&
			numericSize <= 60
		) {
			functionWordRows.push(row);
		}
	}
	abbreviationRows.sort((left, right) => {
		const lemmaDelta = String(left[0]).localeCompare(String(right[0]));
		if (lemmaDelta !== 0) return lemmaDelta;
		return Number(left[5]) - Number(right[5]);
	});
	functionWordRows.sort((left, right) => {
		const lemmaDelta = String(left[0]).localeCompare(String(right[0]));
		if (lemmaDelta !== 0) return lemmaDelta;
		return Number(left[5]) - Number(right[5]);
	});

	const languageProfile = {
		schemaVersion: "1",
		kind: "language-core-profile",
		profileId: "en-modern-typed-core",
		languageTag: "en",
		languageName: englishRecord.description,
		script: "Latn",
		defaultRegion: "US",
		likelySubtag,
		iana: {
			fileDate: registry.fileDate,
			added: englishRecord.added,
			suppressScript: englishRecord.suppressScript,
			scope: englishRecord.scope,
		},
		orthography: {
			defaultScript: "Latn",
			latinScriptRangeCount: latinScriptRanges.length,
			scriptVariants: scriptVariantRows,
			regionalWordlist: {
				profileId: "en_US",
				wordCount: enUsWordlist.words.length,
			},
		},
		coreResources: {
			orthographyResourceId: "en-core-orthography",
			punctuationResourceId: "en-core-punctuation",
			abbreviationResourceId: "en-core-abbreviations",
			functionWordResourceId: "en-core-function-words",
			basicSegmentationResourceId: "en-core-basic-segmentation",
		},
		sourceIds: resourceSpec.sourceIds,
	};
	const basicSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "en-core-uax29-basic-segmentation",
		languageTag: "en",
		script: "Latn",
		granularity: "word",
		schemes: [
			{
				schemeId: "uax29-grapheme",
				description: "Unicode UAX #29 grapheme break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-word",
				description: "Unicode UAX #29 word break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-sentence",
				description: "Unicode UAX #29 sentence break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
		],
		rules: [
			{
				ruleId: "en-core-uax29-baseline",
				operation: "label",
				priority: 10,
				pattern: "UAX29:grapheme-word-sentence",
				label: "basic-boundary-profile",
				conditions: {
					sourceIds: [
						"source:unicode:ucd",
						"source:unicode:cldr-core",
					],
					likelySubtag,
					graphemeRangeCount: graphemeRows.length,
					wordRangeCount: wordRows.length,
					sentenceRangeCount: sentenceRows.length,
				},
			},
		],
		dictionaryRefs: [],
	};
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "en",
		script: "Latn",
		likelySubtag,
		ianaFileDate: registry.fileDate,
		ianaSuppressScript: englishRecord.suppressScript,
		latinScriptRangeCount: latinScriptRanges.length,
		punctuationRangeCount: punctuationRows.length,
		abbreviationCount: abbreviationRows.length,
		functionWordCount: functionWordRows.length,
		enUsWordCount: enUsWordlist.words.length,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		scriptVariantCount: scriptVariantRows.length,
		recordsAccepted:
			latinScriptRanges.length +
			punctuationRows.length +
			abbreviationRows.length +
			functionWordRows.length,
		recordsRejected: scowlRecordsRejected + enUsWordlist.rejected,
		warnings: [
			"SCOWLv2 abbreviation rows are source POS records, not a sentence-boundary disambiguation model.",
			"Function-word rows are SCOWLv2 closed-class POS records with SCOWL size <= 60; they are stoplist candidates, not a corpus-frequency stopword model.",
			"Basic segmentation is a Unicode UAX #29 baseline; richer English segmentation remains in textpack-en-segmentation.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-core-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-core-source-scope",
				task: "core.profile",
				severity: "info",
				message:
					"English core resources are generated from IANA, Unicode, CLDR, ESDB, and SCOWLv2 snapshots with scope-limited core profile claims.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "latin-script-range-count",
				name: "latinScriptRangeCount",
				value: quality.latinScriptRangeCount,
				unit: "ranges",
			},
			{
				metricId: "punctuation-range-count",
				name: "punctuationRangeCount",
				value: quality.punctuationRangeCount,
				unit: "ranges",
			},
			{
				metricId: "abbreviation-count",
				name: "abbreviationCount",
				value: quality.abbreviationCount,
				unit: "rows",
			},
			{
				metricId: "function-word-count",
				name: "functionWordCount",
				value: quality.functionWordCount,
				unit: "rows",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-core-language-profile",
			stableJson(languageProfile),
		),
		outputFor(
			resourceSpec,
			"en-core-orthography",
			tsvFile(
				["start", "end", "script", "comment"],
				latinScriptRanges.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"en-core-punctuation",
			tsvFile(
				["start", "end", "generalCategory", "comment"],
				punctuationRows.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"en-core-abbreviations",
			tsvFile(
				[
					"entry",
					"scowlSize",
					"tags",
					"partOfSpeech",
					"posClass",
					"sourceLineNumber",
					"scowlInfo",
				],
				abbreviationRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-core-function-words",
			tsvFile(
				[
					"entry",
					"scowlSize",
					"tags",
					"partOfSpeech",
					"posClass",
					"sourceLineNumber",
					"scowlInfo",
				],
				functionWordRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-core-basic-segmentation",
			stableJson(basicSegmentation),
		),
		outputFor(resourceSpec, "en-core-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"en-core-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformFrenchCoreProfile(resourceSpec, inputs) {
	const ianaText = requiredInput(
		inputs,
		"language-subtag-registry.txt",
		resourceSpec,
	);
	const generalCategoryText = requiredInput(
		inputs,
		"DerivedGeneralCategory.txt",
		resourceSpec,
	);
	const scriptsText = requiredInput(inputs, "Scripts.txt", resourceSpec);
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const scriptDataText = requiredInput(inputs, "scriptData.json", resourceSpec);

	const registry = parseIanaRegistry(ianaText);
	const frenchRecord = registry.records.find(
		(record) => record.type === "language" && record.subtag === "fr",
	);
	expect(
		frenchRecord !== undefined,
		`${resourceSpec.resourceSpecId} expected IANA language subtag fr.`,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.fr;
	expect(
		likelySubtag === "fr-Latn-FR",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag fr -> fr-Latn-FR.`,
		likelySubtag,
	);
	const scriptData = JSON.parse(scriptDataText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const generalCategories = parseUnicodeRangeFile(generalCategoryText);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const latinScriptRanges = scripts.filter((row) => row.value === "Latin");
	const punctuationRows = generalCategories.filter((row) =>
		row.value.startsWith("P"),
	);
	const scriptVariantRows = [];
	for (const [variantKind, scriptEntries] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		if (Object.hasOwn(scriptEntries, "Latn")) {
			scriptVariantRows.push({
				variantKind,
				baseScripts: (scriptEntries.Latn._base ?? []).join(" "),
			});
		}
	}
	scriptVariantRows.sort((left, right) =>
		left.variantKind.localeCompare(right.variantKind),
	);

	const languageProfile = {
		schemaVersion: "1",
		kind: "language-core-profile",
		profileId: "fr-modern-typed-core",
		languageTag: "fr",
		languageName: frenchRecord.description,
		script: "Latn",
		defaultRegion: "FR",
		likelySubtag,
		iana: {
			fileDate: registry.fileDate,
			added: frenchRecord.added,
			suppressScript: frenchRecord.suppressScript,
			scope: frenchRecord.scope,
		},
		orthography: {
			defaultScript: "Latn",
			latinScriptRangeCount: latinScriptRanges.length,
			scriptVariants: scriptVariantRows,
		},
		coreResources: {
			orthographyResourceId: "fr-core-orthography",
			punctuationResourceId: "fr-core-punctuation",
			basicSegmentationResourceId: "fr-core-basic-segmentation",
		},
		sourceIds: resourceSpec.sourceIds,
	};
	const basicSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "fr-core-uax29-basic-segmentation",
		languageTag: "fr",
		script: "Latn",
		granularity: "word",
		schemes: [
			{
				schemeId: "uax29-grapheme",
				description: "Unicode UAX #29 grapheme break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-word",
				description: "Unicode UAX #29 word break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-sentence",
				description: "Unicode UAX #29 sentence break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
		],
		rules: [
			{
				ruleId: "fr-core-uax29-baseline",
				operation: "label",
				priority: 10,
				pattern: "UAX29:grapheme-word-sentence",
				label: "basic-boundary-profile",
				conditions: {
					sourceIds: [
						"source:unicode:ucd",
						"source:unicode:cldr-core",
					],
					likelySubtag,
					graphemeRangeCount: graphemeRows.length,
					wordRangeCount: wordRows.length,
					sentenceRangeCount: sentenceRows.length,
				},
			},
		],
		dictionaryRefs: [],
	};
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "fr",
		script: "Latn",
		likelySubtag,
		ianaFileDate: registry.fileDate,
		ianaSuppressScript: frenchRecord.suppressScript,
		latinScriptRangeCount: latinScriptRanges.length,
		punctuationRangeCount: punctuationRows.length,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		scriptVariantCount: scriptVariantRows.length,
		recordsAccepted: latinScriptRanges.length + punctuationRows.length,
		recordsRejected: 0,
		warnings: [
			"French core currently uses only IANA, Unicode, and CLDR source-backed resources.",
			"French abbreviations, stoplists, lexical entries, morphology, elision/contraction rules, syntax, KB, corpus, and parallel resources remain out of scope until exact source activation.",
			"Basic segmentation is a Unicode UAX #29 baseline; richer French segmentation remains in textpack-fr-segmentation.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "fr-core-quality",
		languageTag: "fr",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "fr-core-source-scope",
				task: "core.profile",
				severity: "info",
				message:
					"French core resources are generated from IANA, Unicode, and CLDR snapshots with scope-limited core profile claims.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "latin-script-range-count",
				name: "latinScriptRangeCount",
				value: quality.latinScriptRangeCount,
				unit: "ranges",
			},
			{
				metricId: "punctuation-range-count",
				name: "punctuationRangeCount",
				value: quality.punctuationRangeCount,
				unit: "ranges",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"fr-core-language-profile",
			stableJson(languageProfile),
		),
		outputFor(
			resourceSpec,
			"fr-core-orthography",
			tsvFile(
				["start", "end", "script", "comment"],
				latinScriptRanges.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"fr-core-punctuation",
			tsvFile(
				["start", "end", "generalCategory", "comment"],
				punctuationRows.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"fr-core-basic-segmentation",
			stableJson(basicSegmentation),
		),
		outputFor(resourceSpec, "fr-core-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"fr-core-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformArabicCoreProfile(resourceSpec, inputs) {
	const ianaText = requiredInput(
		inputs,
		"language-subtag-registry.txt",
		resourceSpec,
	);
	const generalCategoryText = requiredInput(
		inputs,
		"DerivedGeneralCategory.txt",
		resourceSpec,
	);
	const scriptsText = requiredInput(inputs, "Scripts.txt", resourceSpec);
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const scriptDataText = requiredInput(inputs, "scriptData.json", resourceSpec);

	const registry = parseIanaRegistry(ianaText);
	const arabicRecord = registry.records.find(
		(record) => record.type === "language" && record.subtag === "ar",
	);
	expect(
		arabicRecord !== undefined,
		`${resourceSpec.resourceSpecId} expected IANA language subtag ar.`,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.ar;
	expect(
		likelySubtag === "ar-Arab-EG",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ar -> ar-Arab-EG.`,
		likelySubtag,
	);
	const scriptData = JSON.parse(scriptDataText);
	const scripts = parseUnicodeRangeFile(scriptsText);
	const generalCategories = parseUnicodeRangeFile(generalCategoryText);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const arabicScriptRanges = scripts.filter((row) => row.value === "Arabic");
	const punctuationRows = generalCategories.filter((row) =>
		row.value.startsWith("P"),
	);
	const scriptVariantRows = [];
	for (const [variantKind, scriptEntries] of Object.entries(
		scriptData.supplemental.scriptData.scriptVariants,
	)) {
		if (Object.hasOwn(scriptEntries, "Arab")) {
			scriptVariantRows.push({
				variantKind,
				baseScripts: (scriptEntries.Arab._base ?? []).join(" "),
			});
		}
	}
	scriptVariantRows.sort((left, right) =>
		left.variantKind.localeCompare(right.variantKind),
	);

	const languageProfile = {
		schemaVersion: "1",
		kind: "language-core-profile",
		profileId: "ar-modern-typed-core",
		languageTag: "ar",
		languageName: arabicRecord.description,
		script: "Arab",
		defaultRegion: "EG",
		likelySubtag,
		iana: {
			fileDate: registry.fileDate,
			added: arabicRecord.added,
			suppressScript: arabicRecord.suppressScript,
			scope: arabicRecord.scope,
		},
		orthography: {
			defaultScript: "Arab",
			arabicScriptRangeCount: arabicScriptRanges.length,
			scriptVariants: scriptVariantRows,
		},
		coreResources: {
			orthographyResourceId: "ar-core-orthography",
			punctuationResourceId: "ar-core-punctuation",
			basicSegmentationResourceId: "ar-core-basic-segmentation",
		},
		sourceIds: resourceSpec.sourceIds,
	};
	const basicSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "ar-core-uax29-basic-segmentation",
		languageTag: "ar",
		script: "Arab",
		granularity: "word",
		schemes: [
			{
				schemeId: "uax29-grapheme",
				description: "Unicode UAX #29 grapheme break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-word",
				description: "Unicode UAX #29 word break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
			{
				schemeId: "uax29-sentence",
				description: "Unicode UAX #29 sentence break property baseline.",
				fields: [{ order: 1, name: "unicodeBreakProperty" }],
			},
		],
		rules: [
			{
				ruleId: "ar-core-uax29-baseline",
				operation: "label",
				priority: 10,
				pattern: "UAX29:grapheme-word-sentence",
				label: "basic-boundary-profile",
				conditions: {
					sourceIds: [
						"source:unicode:ucd",
						"source:unicode:cldr-core",
					],
					likelySubtag,
					graphemeRangeCount: graphemeRows.length,
					wordRangeCount: wordRows.length,
					sentenceRangeCount: sentenceRows.length,
				},
			},
		],
		dictionaryRefs: [],
	};
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "ar",
		script: "Arab",
		likelySubtag,
		ianaFileDate: registry.fileDate,
		ianaSuppressScript: arabicRecord.suppressScript,
		arabicScriptRangeCount: arabicScriptRanges.length,
		punctuationRangeCount: punctuationRows.length,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
		scriptVariantCount: scriptVariantRows.length,
		recordsAccepted: arabicScriptRanges.length + punctuationRows.length,
		recordsRejected: 0,
		warnings: [
			"Arabic core currently uses only IANA, Unicode, and CLDR source-backed resources.",
			"Arabic lexicon, morphology, clitic segmentation, syntax, KB, search, corpus, and parallel resources remain out of scope until exact source activation.",
			"Basic segmentation is a Unicode UAX #29 baseline; richer Arabic MSA tokenization resources remain in textpack-ar-segmentation.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-core-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-core-source-scope",
				task: "core.profile",
				severity: "info",
				message:
					"Arabic core resources are generated from IANA, Unicode, and CLDR snapshots with scope-limited core profile claims.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "arabic-script-range-count",
				name: "arabicScriptRangeCount",
				value: quality.arabicScriptRangeCount,
				unit: "ranges",
			},
			{
				metricId: "punctuation-range-count",
				name: "punctuationRangeCount",
				value: quality.punctuationRangeCount,
				unit: "ranges",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"ar-core-language-profile",
			stableJson(languageProfile),
		),
		outputFor(
			resourceSpec,
			"ar-core-orthography",
			tsvFile(
				["start", "end", "script", "comment"],
				arabicScriptRanges.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"ar-core-punctuation",
			tsvFile(
				["start", "end", "generalCategory", "comment"],
				punctuationRows.map((row) => [
					row.start,
					row.end,
					row.value,
					row.comment,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"ar-core-basic-segmentation",
			stableJson(basicSegmentation),
		),
		outputFor(resourceSpec, "ar-core-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"ar-core-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

const unicodeCldrLatinProfiles = {
	en: {
		languageTag: "en",
		languageName: "English",
		script: "Latn",
		likelySubtag: "en-Latn-US",
		scopeLabel: "modern typed English",
		defaultProfileLabel: "modern English Latin-script",
		normalizationProfileId: "en-modern-typed-unicode-normalization",
		normalizationQualityProfileId: "en-normalization-quality",
		likelySubtagRuleId: "cldr-english-latn-likely-subtag",
		normalizationOutputIds: {
			rules: "en-normalization-rules",
			profile: "en-normalization-profile",
			quality: "en-normalization-quality",
			qualityProfile: "en-normalization-quality-profile",
		},
		segmentationOutputIds: {
			boundaryProperties: "en-segmentation-boundary-properties",
			grapheme: "en-grapheme-segmentation-profile",
			word: "en-word-segmentation-profile",
			sentence: "en-sentence-segmentation-profile",
			quality: "en-segmentation-quality",
			qualityProfile: "en-segmentation-quality-profile",
		},
		segmentationProfileIds: {
			grapheme: "en-modern-typed-unicode-grapheme-segmentation",
			word: "en-modern-typed-unicode-word-segmentation",
			sentence: "en-modern-typed-unicode-sentence-segmentation",
		},
	},
	fr: {
		languageTag: "fr",
		languageName: "French",
		script: "Latn",
		likelySubtag: "fr-Latn-FR",
		scopeLabel: "modern typed French",
		defaultProfileLabel: "modern French Latin-script",
		normalizationProfileId: "fr-modern-typed-unicode-normalization",
		normalizationQualityProfileId: "fr-normalization-quality",
		likelySubtagRuleId: "cldr-french-latn-likely-subtag",
		normalizationOutputIds: {
			rules: "fr-normalization-rules",
			profile: "fr-normalization-profile",
			quality: "fr-normalization-quality",
			qualityProfile: "fr-normalization-quality-profile",
		},
		segmentationOutputIds: {
			boundaryProperties: "fr-segmentation-boundary-properties",
			grapheme: "fr-grapheme-segmentation-profile",
			word: "fr-word-segmentation-profile",
			sentence: "fr-sentence-segmentation-profile",
			quality: "fr-segmentation-quality",
			qualityProfile: "fr-segmentation-quality-profile",
		},
		segmentationProfileIds: {
			grapheme: "fr-modern-typed-unicode-grapheme-segmentation",
			word: "fr-modern-typed-unicode-word-segmentation",
			sentence: "fr-modern-typed-unicode-sentence-segmentation",
		},
	},
};

const frenchSurfaceContractionForms = ["au", "aux", "des", "du"];
const frenchSurfaceEvidenceMinimumCount = 25;
const frenchSurfaceGoldCaseLimit = 24;

function normalizeFrenchApostrophes(value) {
	return value.normalize("NFC").replaceAll("’", "'");
}

function frenchLookupFold(value) {
	return normalizeFrenchApostrophes(value)
		.toLocaleLowerCase("fr")
		.normalize("NFD")
		.replace(/\p{Mark}+/gu, "")
		.normalize("NFC");
}

function frenchSurfaceTokens(text, elisionPrefixes = new Set()) {
	const tokens = [];
	for (const match of text.matchAll(
		/[\p{Letter}\p{Mark}]+(?:['’][\p{Letter}\p{Mark}]+)?|\p{Number}+|[^\s]/gu,
	)) {
		const token = match[0];
		const apostropheIndex = token.search(/['’]/u);
		if (apostropheIndex > 0) {
			const prefix = token.slice(0, apostropheIndex).toLocaleLowerCase("fr");
			if (elisionPrefixes.has(prefix)) {
				tokens.push(token.slice(0, apostropheIndex + 1));
				tokens.push(token.slice(apostropheIndex + 1));
				continue;
			}
		}
		tokens.push(token);
	}
	return tokens;
}

function frenchAbbreviationCandidate(value) {
	if (!/^[\p{Letter}]{1,5}\.$/u.test(value)) return false;
	const stem = value.slice(0, -1);
	return stem === stem.toLocaleUpperCase("fr") || stem.length <= 3;
}

function deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs) {
	const text = readBzip2Input(
		inputs,
		"fra_sentences_detailed.tsv.bz2",
		resourceSpec,
	);
	const apostropheCounts = new Map();
	const prefixCounts = new Map();
	const prefixApostropheCounts = new Map();
	const contractionCounts = new Map(
		frenchSurfaceContractionForms.map((form) => [form, 0]),
	);
	const abbreviationCounts = new Map();
	const prefixExamples = new Map();
	const contractionExamples = new Map();
	const abbreviationExamples = new Map();
	let sentenceRowCount = 0;
	let elisionObservationCount = 0;
	let contractionObservationCount = 0;
	let abbreviationObservationCount = 0;

	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length < 3 || cells[1] !== "fra") continue;
		const sentenceId = cells[0];
		const sentenceText = cells[2];
		if (sentenceId === undefined || sentenceText === undefined) continue;
		sentenceRowCount += 1;
		for (const match of sentenceText.matchAll(
			/\b([\p{Letter}\p{Mark}]+)(['’])(?=[\p{Letter}\p{Mark}])/gu,
		)) {
			const prefix = match[1].toLocaleLowerCase("fr");
			const apostrophe = match[2];
			incrementCount(prefixCounts, prefix);
			incrementCount(apostropheCounts, apostrophe);
			incrementCount(
				prefixApostropheCounts,
				`${prefix}\u0000${apostrophe}`,
			);
			elisionObservationCount += 1;
			if (!prefixExamples.has(prefix)) {
				prefixExamples.set(prefix, { sentenceId, text: sentenceText });
			}
		}
		for (const match of sentenceText.matchAll(/\b[\p{Letter}\p{Mark}.]+\b\.?/gu)) {
			const token = match[0];
			const folded = token.toLocaleLowerCase("fr").replace(/\.$/u, "");
			if (frenchSurfaceContractionForms.includes(folded)) {
				incrementCount(contractionCounts, folded);
				contractionObservationCount += 1;
				if (!contractionExamples.has(folded)) {
					contractionExamples.set(folded, { sentenceId, text: sentenceText });
				}
			}
			if (frenchAbbreviationCandidate(token)) {
				incrementCount(abbreviationCounts, token);
				abbreviationObservationCount += 1;
				if (!abbreviationExamples.has(token)) {
					abbreviationExamples.set(token, { sentenceId, text: sentenceText });
				}
			}
		}
	}

	const observedElisionRows = sortedCountRows(prefixCounts)
		.filter(([, count]) => count >= frenchSurfaceEvidenceMinimumCount)
		.map(([prefix, count]) => {
			const apostropheRows = [...prefixApostropheCounts.entries()]
				.filter(([key]) => key.startsWith(`${prefix}\u0000`))
				.map(([key, apostropheCount]) => [
					key.slice(key.indexOf("\u0000") + 1),
					apostropheCount,
				])
				.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
			const example = prefixExamples.get(prefix);
			return {
				prefix,
				count,
				apostrophes: apostropheRows
					.map(([apostrophe, apostropheCount]) => `${apostrophe}:${apostropheCount}`)
					.join(" "),
				exampleSentenceId: example?.sentenceId ?? "",
			};
		});
	const observedContractionRows = sortedCountRows(contractionCounts)
		.filter(([, count]) => count > 0)
		.map(([form, count]) => {
			const example = contractionExamples.get(form);
			return {
				form,
				count,
				exampleSentenceId: example?.sentenceId ?? "",
			};
		});
	const observedAbbreviationRows = sortedCountRows(abbreviationCounts)
		.filter(([, count]) => count >= frenchSurfaceEvidenceMinimumCount)
		.map(([form, count]) => {
			const example = abbreviationExamples.get(form);
			return {
				form,
				count,
				exampleSentenceId: example?.sentenceId ?? "",
			};
		});
	const elisionPrefixSet = new Set(
		observedElisionRows.map((row) => row.prefix),
	);
	const normalizationGoldCases = [
		...observedElisionRows.slice(0, frenchSurfaceGoldCaseLimit / 2).map((row) => {
			const example = prefixExamples.get(row.prefix);
			const input = example?.text ?? "";
			return {
				caseId: `fr-normalization-elision-${row.prefix}`,
				source: "source:tatoeba:weekly-french-2026-06-06",
				sourceSentenceId: example?.sentenceId ?? "",
				category: "elision-apostrophe",
				input,
				expectedNfcCasefoldApostrophe: normalizeFrenchApostrophes(
					input,
				).toLocaleLowerCase("fr"),
				expectedLookupFold: frenchLookupFold(input),
			};
		}),
		...observedContractionRows.slice(0, frenchSurfaceGoldCaseLimit / 2).map((row) => {
			const example = contractionExamples.get(row.form);
			const input = example?.text ?? "";
			return {
				caseId: `fr-normalization-contraction-${row.form}`,
				source: "source:tatoeba:weekly-french-2026-06-06",
				sourceSentenceId: example?.sentenceId ?? "",
				category: "contraction-surface-form",
				input,
				expectedNfcCasefoldApostrophe: normalizeFrenchApostrophes(
					input,
				).toLocaleLowerCase("fr"),
				expectedLookupFold: frenchLookupFold(input),
				recognizedSurfaceForm: row.form,
			};
		}),
	].slice(0, frenchSurfaceGoldCaseLimit);
	const segmentationGoldCases = [
		...observedElisionRows.slice(0, frenchSurfaceGoldCaseLimit / 2).map((row) => {
			const example = prefixExamples.get(row.prefix);
			const input = example?.text ?? "";
			return {
				caseId: `fr-segmentation-elision-${row.prefix}`,
				source: "source:tatoeba:weekly-french-2026-06-06",
				sourceSentenceId: example?.sentenceId ?? "",
				category: "elision-apostrophe",
				input,
				expectedTokens: frenchSurfaceTokens(input, elisionPrefixSet),
			};
		}),
		...observedAbbreviationRows.slice(0, frenchSurfaceGoldCaseLimit / 4).map((row) => {
			const example = abbreviationExamples.get(row.form);
			const input = example?.text ?? "";
			return {
				caseId: `fr-segmentation-abbreviation-${row.form.replace(/\.$/u, "")}`,
				source: "source:tatoeba:weekly-french-2026-06-06",
				sourceSentenceId: example?.sentenceId ?? "",
				category: "abbreviation-period",
				input,
				expectedTokens: frenchSurfaceTokens(input, elisionPrefixSet),
			};
		}),
	].slice(0, frenchSurfaceGoldCaseLimit);
	return {
		sentenceRowCount,
		apostropheCounts: Object.fromEntries(sortedCountRows(apostropheCounts)),
		elisionObservationCount,
		contractionObservationCount,
		abbreviationObservationCount,
		elisionPrefixRows: observedElisionRows,
		contractionRows: observedContractionRows,
		abbreviationRows: observedAbbreviationRows,
		normalizationGoldCases,
		segmentationGoldCases,
	};
}

function transformUnicodeCldrNormalizationProfile(resourceSpec, inputs, config) {
	const aliasesText = inputs.get("aliases.json");
	const likelySubtagsText = inputs.get("likelySubtags.json");
	const propertyValueAliasesText = inputs.get("PropertyValueAliases.txt");
	expect(
		aliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing aliases.json.`,
	);
	expect(
		likelySubtagsText !== undefined,
		`${resourceSpec.resourceSpecId} missing likelySubtags.json.`,
	);
	expect(
		propertyValueAliasesText !== undefined,
		`${resourceSpec.resourceSpecId} missing PropertyValueAliases.txt.`,
	);
	const aliases = JSON.parse(aliasesText);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const propertyAliases = parsePropertyValueAliases(propertyValueAliasesText);
	const likelySubtag =
		likelySubtags.supplemental.likelySubtags[config.languageTag];
	expect(
		likelySubtag === config.likelySubtag,
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ${config.languageTag} -> ${config.likelySubtag}.`,
		likelySubtag,
	);
	const nfcQuickCheckAliases = propertyAliases.filter(
		(row) => row.property === "NFC_QC",
	);
	const caseAliasRows = propertyAliases.filter((row) =>
		["Cased", "CI", "CWCF", "CWCM", "CWKCF"].includes(row.property),
	);
	const aliasKinds = Object.keys(aliases.supplemental.metadata.alias).sort();
	const rules = [
		{
			ruleId: "unicode-nfc-compose",
			operation: "compose",
			priority: 10,
			note: `Use Unicode NFC canonical composition for stored and comparable ${config.scopeLabel} text.`,
		},
		{
			ruleId: "unicode-casefold-for-lookup",
			operation: "casefold",
			priority: 20,
			note: "Use Unicode casefolding for lookup/search normalization while preserving source text elsewhere.",
		},
		{
			ruleId: config.likelySubtagRuleId,
			operation: "map",
			priority: 30,
			input: config.languageTag,
			output: likelySubtag,
			note: `Use CLDR likely-subtag context for the default ${config.defaultProfileLabel} profile.`,
		},
	];
	const frenchSurfaceEvidence =
		config.languageTag === "fr"
			? deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs)
			: undefined;
	if (frenchSurfaceEvidence !== undefined) {
		rules.push(
			{
				ruleId: "french-apostrophe-normalize-for-lookup",
				operation: "replace",
				priority: 40,
				input: "’",
				output: "'",
				note: "Normalize French straight and typographic apostrophes for lookup while preserving source text in document storage.",
				evidenceResourceId: "fr-normalization-elision-prefixes",
			},
			{
				ruleId: "french-observed-elision-boundary-policy",
				operation: "map",
				priority: 50,
				pattern: "\\b(prefix)['’](letter)",
				note: "Recognize observed French elision prefixes from the pinned Tatoeba French sentence snapshot for lookup and token-boundary policy.",
				evidenceResourceId: "fr-normalization-elision-prefixes",
			},
			{
				ruleId: "french-observed-contraction-surface-policy",
				operation: "map",
				priority: 60,
				pattern: "\\b(au|aux|des|du)\\b",
				note: "Recognize observed French contraction surface forms from the pinned Tatoeba French sentence snapshot.",
				evidenceResourceId: "fr-normalization-contraction-forms",
			},
			{
				ruleId: "french-accent-fold-for-search-lookup",
				operation: "strip-diacritic",
				priority: 70,
				pattern: "NFD:Mark+",
				note: "Expose a lookup-only accent-folding policy for French search analyzers; source text normalization remains NFC.",
				evidenceResourceId: "fr-normalization-gold-cases",
			},
		);
	}
	const canonicalNormalization = {
		schemaVersion: "1",
		kind: "normalization-profile",
		profileId: config.normalizationProfileId,
		languageTag: config.languageTag,
		script: config.script,
		unicodeNormalization: "NFC",
		casePolicy: "casefold",
		rules: rules.map((rule) => ({
			ruleId: rule.ruleId,
			operation: rule.operation,
				priority: rule.priority,
				...(rule.input === undefined ? {} : { input: rule.input }),
				...(rule.output === undefined ? {} : { output: rule.output }),
				...(rule.pattern === undefined ? {} : { pattern: rule.pattern }),
				conditions: {
					scope: `${config.scopeLabel} normalization profile`,
					sourceIds: resourceSpec.sourceIds,
					note: rule.note,
					...(rule.evidenceResourceId === undefined
						? {}
						: { evidenceResourceId: rule.evidenceResourceId }),
				},
			})),
		};
	const summary = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: config.languageTag,
		script: config.script,
		likelySubtag,
			ruleCount: rules.length,
			nfcQuickCheckValueCount: nfcQuickCheckAliases.length,
			caseAliasRowCount: caseAliasRows.length,
			aliasKindCount: aliasKinds.length,
			aliasKinds,
			...(frenchSurfaceEvidence === undefined
				? {}
				: {
						tatoebaSentenceRowCount:
							frenchSurfaceEvidence.sentenceRowCount,
						apostropheCounts: frenchSurfaceEvidence.apostropheCounts,
						elisionPrefixCount:
							frenchSurfaceEvidence.elisionPrefixRows.length,
						elisionObservationCount:
							frenchSurfaceEvidence.elisionObservationCount,
						contractionFormCount:
							frenchSurfaceEvidence.contractionRows.length,
						contractionObservationCount:
							frenchSurfaceEvidence.contractionObservationCount,
						normalizationGoldCaseCount:
							frenchSurfaceEvidence.normalizationGoldCases.length,
					}),
			recordsAccepted: rules.length,
			recordsRejected: 0,
			warnings: [
				`This profile declares Unicode/CLDR-backed normalization policy for ${config.scopeLabel} text.`,
				frenchSurfaceEvidence === undefined
					? "It does not claim spelling correction, noisy-text cleanup, historical spelling normalization, transliteration, or corpus-derived normalization."
					: "It adds Tatoeba-observed French apostrophe, elision-prefix, contraction-surface, and lookup accent-fold evidence; spelling correction, noisy-text cleanup, historical spelling normalization, transliteration, and OCR cleanup remain outside this component.",
			],
		};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: config.normalizationQualityProfileId,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.languageTag}-normalization-scope`,
				task: "normalization.profile",
					severity: "info",
					message: `Unicode/CLDR-backed profile for ${config.scopeLabel}; spelling correction and noisy-text normalization are out of scope.`,
					metadata: {
						likelySubtag,
						sourceIds: resourceSpec.sourceIds,
						...(frenchSurfaceEvidence === undefined
							? {}
							: {
									elisionPrefixCount:
										frenchSurfaceEvidence.elisionPrefixRows.length,
									contractionFormCount:
										frenchSurfaceEvidence.contractionRows.length,
									normalizationGoldCaseCount:
										frenchSurfaceEvidence.normalizationGoldCases.length,
								}),
					},
				},
			],
		metrics: [
			{
				metricId: "rule-count",
				name: "ruleCount",
				value: summary.ruleCount,
				unit: "rules",
			},
			{
				metricId: "nfc-quick-check-value-count",
				name: "nfcQuickCheckValueCount",
				value: summary.nfcQuickCheckValueCount,
				unit: "aliases",
			},
			{
				metricId: "case-alias-row-count",
				name: "caseAliasRowCount",
				value: summary.caseAliasRowCount,
				unit: "aliases",
			},
				{
					metricId: "records-rejected",
					name: "recordsRejected",
					value: summary.recordsRejected,
					unit: "records",
				},
				...(frenchSurfaceEvidence === undefined
					? []
					: [
							{
								metricId: "french-elision-prefix-count",
								name: "elisionPrefixCount",
								value: summary.elisionPrefixCount,
								unit: "prefixes",
							},
							{
								metricId: "french-contraction-form-count",
								name: "contractionFormCount",
								value: summary.contractionFormCount,
								unit: "forms",
							},
							{
								metricId: "french-normalization-gold-case-count",
								name: "normalizationGoldCaseCount",
								value: summary.normalizationGoldCaseCount,
								unit: "cases",
							},
						]),
			],
			thresholds: [],
			evaluationRecordIds: [],
	};
	return [
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.rules,
			tsvFile(
					["ruleId", "operation", "priority", "input", "output", "note"],
					rules.map((rule) => [
						rule.ruleId,
						rule.operation,
						rule.priority,
					rule.input ?? "",
					rule.output ?? "",
						rule.note,
					]),
				),
			),
			...(frenchSurfaceEvidence === undefined
				? []
				: [
						outputFor(
							resourceSpec,
							"fr-normalization-elision-prefixes",
							tsvFile(
								[
									"prefix",
									"observedCount",
									"apostropheCounts",
									"exampleSentenceId",
								],
								frenchSurfaceEvidence.elisionPrefixRows.map((row) => [
									row.prefix,
									row.count,
									row.apostrophes,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-normalization-contraction-forms",
							tsvFile(
								["form", "observedCount", "exampleSentenceId"],
								frenchSurfaceEvidence.contractionRows.map((row) => [
									row.form,
									row.count,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-normalization-gold-cases",
							stableJson({
								schemaVersion: "1",
								kind: "normalization-gold-cases",
								languageTag: "fr",
								sourceIds: resourceSpec.sourceIds,
								cases: frenchSurfaceEvidence.normalizationGoldCases,
							}),
						),
					]),
			outputFor(
				resourceSpec,
				config.normalizationOutputIds.profile,
			stableJson(canonicalNormalization),
		),
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.quality,
			stableJson(summary),
		),
		outputFor(
			resourceSpec,
			config.normalizationOutputIds.qualityProfile,
			stableJson(canonicalQuality),
		),
	];
}

function transformEnglishNormalizationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrNormalizationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.en,
	);
}

function transformFrenchNormalizationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrNormalizationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.fr,
	);
}

function unicodePropertyCounts(rows) {
	const counts = new Map();
	for (const row of rows) {
		counts.set(row.value, (counts.get(row.value) ?? 0) + 1);
	}
	return Object.fromEntries(sortedCountRows(counts));
}

function segmentationCanonicalProfile({
	profileId,
	granularity,
	schemeId,
	description,
	propertyCounts,
	rangeCount,
	likelySubtag,
	sourceIds,
	languageTag,
	script,
	scopeLabel,
}) {
	return {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId,
		languageTag,
		script,
		granularity,
		schemes: [
			{
				schemeId,
				description,
				fields: [
					{ order: 1, name: "unicodeBreakProperty" },
					{ order: 2, name: "rangeCount" },
				],
			},
		],
		rules: [
			{
				ruleId: `${schemeId}-uax29-boundary-policy`,
				operation: "label",
				priority: 10,
				pattern: `UAX29:${granularity}`,
				label: `${granularity}-boundary`,
				conditions: {
					sourceIds,
					likelySubtag,
					rangeCount,
					propertyCounts,
					scope: `${scopeLabel} Unicode segmentation profile`,
				},
			},
		],
		dictionaryRefs: [],
	};
}

function transformUnicodeCldrSegmentationProfile(resourceSpec, inputs, config) {
	const graphemeText = requiredInput(
		inputs,
		"GraphemeBreakProperty.txt",
		resourceSpec,
	);
	const wordText = requiredInput(inputs, "WordBreakProperty.txt", resourceSpec);
	const sentenceText = requiredInput(
		inputs,
		"SentenceBreakProperty.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag =
		likelySubtags.supplemental.likelySubtags[config.languageTag];
	expect(
		likelySubtag === config.likelySubtag,
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ${config.languageTag} -> ${config.likelySubtag}.`,
		likelySubtag,
	);
	const graphemeRows = parseUnicodeRangeFile(graphemeText);
	const wordRows = parseUnicodeRangeFile(wordText);
	const sentenceRows = parseUnicodeRangeFile(sentenceText);
	const summaries = [
		{
			granularity: "grapheme",
			rows: graphemeRows,
			counts: unicodePropertyCounts(graphemeRows),
			resourceId: config.segmentationOutputIds.grapheme,
			profileId: config.segmentationProfileIds.grapheme,
			schemeId: "unicode-uax29-grapheme",
			description:
				"Unicode UAX #29 extended grapheme cluster boundary profile.",
		},
		{
			granularity: "word",
			rows: wordRows,
			counts: unicodePropertyCounts(wordRows),
			resourceId: config.segmentationOutputIds.word,
			profileId: config.segmentationProfileIds.word,
			schemeId: "unicode-uax29-word",
			description: "Unicode UAX #29 word boundary profile.",
		},
		{
			granularity: "sentence",
			rows: sentenceRows,
			counts: unicodePropertyCounts(sentenceRows),
			resourceId: config.segmentationOutputIds.sentence,
			profileId: config.segmentationProfileIds.sentence,
			schemeId: "unicode-uax29-sentence",
			description: "Unicode UAX #29 sentence boundary profile.",
			},
		];
	const frenchSurfaceEvidence =
		config.languageTag === "fr"
			? deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs)
			: undefined;
	const propertyRows = [];
	for (const summary of summaries) {
		for (const [property, rangeCount] of Object.entries(summary.counts)) {
			propertyRows.push([
				summary.granularity,
				property,
				rangeCount,
				likelySubtag,
			]);
		}
	}
	propertyRows.sort((left, right) => {
		const granularityDelta = left[0].localeCompare(right[0]);
		if (granularityDelta !== 0) return granularityDelta;
		return left[1].localeCompare(right[1]);
	});
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: config.languageTag,
		script: config.script,
		likelySubtag,
		graphemeRangeCount: graphemeRows.length,
		wordRangeCount: wordRows.length,
		sentenceRangeCount: sentenceRows.length,
			propertyRows: propertyRows.length,
			propertyCountsByGranularity: Object.fromEntries(
				summaries.map((summary) => [summary.granularity, summary.counts]),
			),
			...(frenchSurfaceEvidence === undefined
				? {}
				: {
						tatoebaSentenceRowCount:
							frenchSurfaceEvidence.sentenceRowCount,
						elisionPrefixCount:
							frenchSurfaceEvidence.elisionPrefixRows.length,
						elisionObservationCount:
							frenchSurfaceEvidence.elisionObservationCount,
						contractionFormCount:
							frenchSurfaceEvidence.contractionRows.length,
						contractionObservationCount:
							frenchSurfaceEvidence.contractionObservationCount,
						abbreviationCandidateCount:
							frenchSurfaceEvidence.abbreviationRows.length,
						abbreviationObservationCount:
							frenchSurfaceEvidence.abbreviationObservationCount,
						segmentationGoldCaseCount:
							frenchSurfaceEvidence.segmentationGoldCases.length,
					}),
			recordsAccepted:
				graphemeRows.length + wordRows.length + sentenceRows.length,
			recordsRejected: 0,
			warnings: [
				`This profile declares Unicode UAX #29-backed grapheme, word, and sentence boundary resources for ${config.scopeLabel} text.`,
				frenchSurfaceEvidence === undefined
					? "It does not claim dictionary tokenization, sentence-abbreviation tailoring, social-text tokenization, historical segmentation, OCR segmentation, or language-composite coverage."
					: "It adds Tatoeba-observed French elision-prefix, contraction-surface, abbreviation-candidate, and token gold-case resources; social-text tokenization, historical segmentation, and OCR segmentation remain outside this component.",
			],
		};
		const frenchTokenProfile =
			frenchSurfaceEvidence === undefined
				? undefined
				: {
					schemaVersion: "1",
					kind: "segmentation-profile",
					profileId: "fr-modern-typed-french-token-segmentation",
					languageTag: "fr",
					script: "Latn",
					granularity: "token",
					schemes: [
						{
							schemeId: "french-observed-surface-token-policy",
							description:
								"French token policy backed by observed Tatoeba apostrophe, contraction, and abbreviation surface evidence plus Unicode UAX #29 boundaries.",
							fields: [
								{ order: 1, name: "unicodeBreakProperty" },
								{ order: 2, name: "observedSurfaceClass" },
								{ order: 3, name: "sourceCount" },
							],
						},
					],
					rules: [
						{
							ruleId: "fr-token-split-after-observed-elision-apostrophe",
							operation: "split",
							priority: 40,
							pattern: "\\b(prefix)['’](letter)",
							label: "elision-prefix-token",
							conditions: {
								sourceIds: resourceSpec.sourceIds,
								evidenceResourceId: "fr-segmentation-elision-prefixes",
								elisionPrefixCount:
									frenchSurfaceEvidence.elisionPrefixRows.length,
							},
						},
						{
							ruleId: "fr-token-label-observed-contraction-surface-form",
							operation: "label",
							priority: 50,
							pattern: "\\b(au|aux|des|du)\\b",
							label: "contraction-surface-form",
							conditions: {
								sourceIds: resourceSpec.sourceIds,
								evidenceResourceId: "fr-segmentation-contraction-forms",
								contractionFormCount:
									frenchSurfaceEvidence.contractionRows.length,
							},
						},
						{
							ruleId: "fr-token-no-boundary-inside-observed-abbreviation",
							operation: "no-boundary",
							priority: 60,
							pattern: "abbreviation-period",
							label: "abbreviation-period",
							conditions: {
								sourceIds: resourceSpec.sourceIds,
								evidenceResourceId: "fr-segmentation-abbreviations",
								abbreviationCandidateCount:
									frenchSurfaceEvidence.abbreviationRows.length,
							},
							},
						],
						dictionaryRefs: [],
					};
		const segmentationScopeMessage =
			frenchSurfaceEvidence === undefined
				? `Unicode/CLDR-backed boundary profile for ${config.scopeLabel}.`
				: `Unicode/CLDR-backed boundary profile for ${config.scopeLabel}, with source-derived French elision, contraction, abbreviation, and gold-case evidence.`;
		const canonicalQuality = {
			schemaVersion: "1",
			kind: "quality-profile",
			profileId: `${config.languageTag}-segmentation-quality`,
			languageTag: config.languageTag,
			script: config.script,
			diagnostics: [
				{
					diagnosticId: `${config.languageTag}-segmentation-scope`,
					task: "segmentation.profile",
					severity: "info",
					message: segmentationScopeMessage,
					metadata: {
						likelySubtag,
						sourceIds: resourceSpec.sourceIds,
						...(frenchSurfaceEvidence === undefined
							? {}
							: {
									elisionPrefixCount:
										frenchSurfaceEvidence.elisionPrefixRows.length,
									contractionFormCount:
										frenchSurfaceEvidence.contractionRows.length,
									abbreviationCandidateCount:
										frenchSurfaceEvidence.abbreviationRows.length,
									segmentationGoldCaseCount:
										frenchSurfaceEvidence.segmentationGoldCases.length,
								}),
					},
				},
			],
			metrics: [
			{
				metricId: "grapheme-range-count",
				name: "graphemeRangeCount",
				value: quality.graphemeRangeCount,
				unit: "ranges",
			},
			{
				metricId: "word-range-count",
				name: "wordRangeCount",
				value: quality.wordRangeCount,
				unit: "ranges",
			},
			{
				metricId: "sentence-range-count",
				name: "sentenceRangeCount",
				value: quality.sentenceRangeCount,
				unit: "ranges",
			},
				{
					metricId: "records-rejected",
					name: "recordsRejected",
					value: quality.recordsRejected,
					unit: "records",
				},
				...(frenchSurfaceEvidence === undefined
					? []
					: [
							{
								metricId: "french-elision-prefix-count",
								name: "elisionPrefixCount",
								value: quality.elisionPrefixCount,
								unit: "prefixes",
							},
							{
								metricId: "french-contraction-form-count",
								name: "contractionFormCount",
								value: quality.contractionFormCount,
								unit: "forms",
							},
							{
								metricId: "french-abbreviation-candidate-count",
								name: "abbreviationCandidateCount",
								value: quality.abbreviationCandidateCount,
								unit: "forms",
							},
							{
								metricId: "french-segmentation-gold-case-count",
								name: "segmentationGoldCaseCount",
								value: quality.segmentationGoldCaseCount,
								unit: "cases",
							},
						]),
			],
			thresholds: [],
			evaluationRecordIds: [],
		};
	return [
		outputFor(
			resourceSpec,
			config.segmentationOutputIds.boundaryProperties,
			tsvFile(
				["granularity", "property", "rangeCount", "likelySubtag"],
				propertyRows,
			),
		),
		...summaries.map((summary) =>
			outputFor(
				resourceSpec,
				summary.resourceId,
				stableJson(
					segmentationCanonicalProfile({
						profileId: summary.profileId,
						granularity: summary.granularity,
						schemeId: summary.schemeId,
						description: summary.description,
						propertyCounts: summary.counts,
						rangeCount: summary.rows.length,
						likelySubtag,
						sourceIds: resourceSpec.sourceIds,
						languageTag: config.languageTag,
						script: config.script,
						scopeLabel: config.scopeLabel,
					}),
				),
				),
			),
			...(frenchSurfaceEvidence === undefined
				? []
				: [
						outputFor(
							resourceSpec,
							"fr-token-segmentation-profile",
							stableJson(frenchTokenProfile),
						),
						outputFor(
							resourceSpec,
							"fr-segmentation-elision-prefixes",
							tsvFile(
								[
									"prefix",
									"observedCount",
									"apostropheCounts",
									"exampleSentenceId",
								],
								frenchSurfaceEvidence.elisionPrefixRows.map((row) => [
									row.prefix,
									row.count,
									row.apostrophes,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-segmentation-contraction-forms",
							tsvFile(
								["form", "observedCount", "exampleSentenceId"],
								frenchSurfaceEvidence.contractionRows.map((row) => [
									row.form,
									row.count,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-segmentation-abbreviations",
							tsvFile(
								["form", "observedCount", "exampleSentenceId"],
								frenchSurfaceEvidence.abbreviationRows.map((row) => [
									row.form,
									row.count,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-segmentation-gold-cases",
							stableJson({
								schemaVersion: "1",
								kind: "segmentation-gold-cases",
								languageTag: "fr",
								sourceIds: resourceSpec.sourceIds,
								cases: frenchSurfaceEvidence.segmentationGoldCases,
							}),
						),
					]),
			outputFor(
				resourceSpec,
				config.segmentationOutputIds.quality,
			stableJson(quality),
		),
		outputFor(
			resourceSpec,
			config.segmentationOutputIds.qualityProfile,
			stableJson(canonicalQuality),
		),
	];
}

function transformEnglishSegmentationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrSegmentationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.en,
	);
}

function transformFrenchSegmentationProfile(resourceSpec, inputs) {
	return transformUnicodeCldrSegmentationProfile(
		resourceSpec,
		inputs,
		unicodeCldrLatinProfiles.fr,
	);
}

function camelSections(text) {
	const sections = new Map();
	let current = "";
	for (const line of text.split(/\r?\n/u)) {
		const header = line.match(/^###(.+?)###$/u);
		if (header !== null) {
			current = header[1].trim();
			if (!sections.has(current)) sections.set(current, []);
			continue;
		}
		if (current.length === 0 || line.length === 0) continue;
		sections.get(current)?.push(line);
	}
	return sections;
}

function splitFeatureToken(token) {
	const index = token.indexOf(":");
	if (index === -1) return undefined;
	return [token.slice(0, index), token.slice(index + 1)];
}

function parseFeatureString(text) {
	const features = {};
	for (const token of text.trim().split(/\s+/u)) {
		if (token.length === 0) continue;
		const pair = splitFeatureToken(token);
		if (pair === undefined) continue;
		features[pair[0]] = pair[1];
	}
	return features;
}

function incrementCount(counts, key, amount = 1) {
	counts.set(key, (counts.get(key) ?? 0) + amount);
}

function sortedCountRows(counts) {
	return [...counts.entries()].sort((left, right) => {
		const countDelta = right[1] - left[1];
		if (countDelta !== 0) return countDelta;
		return left[0].localeCompare(right[0]);
	});
}

function transformCamelMorphMsa(resourceSpec, inputs) {
	const text = requiredInput(inputs, "camel_morph_msa_v1.0.db", resourceSpec);
	const sections = camelSections(text);
	const defines = sections.get("DEFINES") ?? [];
	const defaults = sections.get("DEFAULTS") ?? [];
	const tokenizations = sections.get("TOKENIZATIONS") ?? [];
	const morphemeSections = ["PREFIXES", "STEMS", "SUFFIXES"];
	const compatibilitySections = ["TABLE AB", "TABLE BC", "TABLE AC"];
	const featureRows = [];
	for (const line of defines) {
		const parts = line.split(/\s+/u);
		if (parts[0] !== "DEFINE" || parts.length < 3) continue;
		const feature = parts[1];
		const values = parts.slice(2).map((token) => {
			const pair = splitFeatureToken(token);
			return pair === undefined ? token : pair[1];
		});
		featureRows.push([feature, values.length, values.join(" ")]);
	}
	featureRows.sort((left, right) => left[0].localeCompare(right[0]));

	const defaultRows = [];
	for (const line of defaults) {
		const payload = line.replace(/^DEFAULT\s+/u, "");
		const features = parseFeatureString(payload);
		const pos = features.pos ?? "";
		for (const [feature, value] of Object.entries(features).sort(
			(left, right) => left[0].localeCompare(right[0]),
		)) {
			defaultRows.push([pos, feature, value]);
		}
	}

	const tokenizationRows = [];
	for (const line of tokenizations) {
		const parts = line.split(/\s+/u);
		if (parts[0] !== "TOKENIZATION") continue;
		parts.slice(1).forEach((field, index) => {
			tokenizationRows.push([index + 1, field]);
		});
	}

	const morphemeRows = [];
	const morphemeCountsBySection = new Map();
	const morphemeCountsByPos = new Map();
	for (const section of morphemeSections) {
		const lines = sections.get(section) ?? [];
		for (const line of lines) {
			const [surface = "", category = "", ...rest] = line.split("\t");
			const featureText = rest.join(" ").trim();
			const features = parseFeatureString(featureText);
			incrementCount(morphemeCountsBySection, section);
			incrementCount(morphemeCountsByPos, features.pos ?? "");
			morphemeRows.push([
				section,
				surface,
				category,
				features.pos ?? "",
				features.lex ?? "",
				features.diac ?? "",
				features.bw ?? "",
				features.gloss ?? "",
				features.root ?? "",
				features.pattern ?? "",
				features.stem ?? "",
				features.stemcat ?? "",
				features.source ?? "",
				features.d3seg ?? "",
				features.atbseg ?? "",
				features.d3tok ?? "",
				features.atbtok ?? "",
				featureText,
			]);
		}
	}
	morphemeRows.sort((left, right) => {
		const sectionDelta = left[0].localeCompare(right[0]);
		if (sectionDelta !== 0) return sectionDelta;
		const categoryDelta = left[2].localeCompare(right[2]);
		if (categoryDelta !== 0) return categoryDelta;
		return left[1].localeCompare(right[1]);
	});

	const compatibilityRows = [];
	const compatibilityCounts = new Map();
	for (const section of compatibilitySections) {
		for (const line of sections.get(section) ?? []) {
			const [left = "", right = ""] = line.trim().split(/\s+/u);
			if (left.length === 0 || right.length === 0) continue;
			compatibilityRows.push([section.replace("TABLE ", ""), left, right]);
			incrementCount(compatibilityCounts, section);
		}
	}
	compatibilityRows.sort((left, right) => {
		const tableDelta = left[0].localeCompare(right[0]);
		if (tableDelta !== 0) return tableDelta;
		const leftDelta = left[1].localeCompare(right[1]);
		if (leftDelta !== 0) return leftDelta;
		return left[2].localeCompare(right[2]);
	});

	const summary = {
		schemaVersion: "1",
		sourceId: "source:camel:morph-msa-lrec-coling-2024",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		featureCount: featureRows.length,
		defaultFeatureCount: defaultRows.length,
		tokenizationFieldCount: tokenizationRows.length,
		morphemeCount: morphemeRows.length,
		compatibilityCount: compatibilityRows.length,
		morphemeCountsBySection: Object.fromEntries(
			sortedCountRows(morphemeCountsBySection),
		),
		morphemeCountsByPos: Object.fromEntries(
			sortedCountRows(morphemeCountsByPos),
		),
		compatibilityCounts: Object.fromEntries(
			sortedCountRows(compatibilityCounts),
		),
		recordsAccepted:
			featureRows.length +
			defaultRows.length +
			tokenizationRows.length +
			morphemeRows.length +
			compatibilityRows.length,
		recordsRejected: 0,
		warnings: [],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "ar-msa-camel-morphology",
		languageTag: "ar",
		script: "Arab",
		resourceRefs: [
			{
				resourceId: "ar-msa-camel-morph-features",
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
			{
				resourceId: "ar-msa-camel-morph-defaults",
				role: "defaults",
				recordCount: defaultRows.length,
			},
			{
				resourceId: "ar-msa-camel-morph-morphemes",
				role: "morpheme-inventory",
				recordCount: morphemeRows.length,
			},
			{
				resourceId: "ar-msa-camel-morph-compatibility",
				role: "compatibility-table",
				recordCount: compatibilityRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "ar-msa-camel-lookup",
				type: "lookup",
				resourceIds: [
					"ar-msa-camel-morph-features",
					"ar-msa-camel-morph-defaults",
					"ar-msa-camel-morph-morphemes",
					"ar-msa-camel-morph-compatibility",
				],
				coverage: {
					morphemeCount: morphemeRows.length,
					compatibilityCount: compatibilityRows.length,
				},
			},
		],
		featureInventory: featureRows.map(([feature, count, values]) => ({
			feature,
			count,
			values: values.length === 0 ? [] : values.split(" "),
		})),
		morphemeSets: sortedCountRows(morphemeCountsBySection).map(
			([section, count]) => ({
				setId: `section:${section}`,
				section,
				count,
			}),
		),
		compatibilityTables: sortedCountRows(compatibilityCounts).map(
			([table, count]) => ({
				tableId: table,
				count,
			}),
		),
	};
	const canonicalSegmentation = {
		schemaVersion: "1",
		kind: "segmentation-profile",
		profileId: "ar-msa-camel-segmentation",
		languageTag: "ar",
		script: "Arab",
		granularity: "morpheme",
		schemes: [
			{
				schemeId: "camel-morph-tokenizations",
				description: "CAMeL Morph MSA tokenization fields.",
				fields: tokenizationRows.map(([order, field]) => ({
					order,
					name: field,
				})),
			},
		],
		rules: [],
		dictionaryRefs: ["ar-msa-camel-morph-morphemes"],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-msa-camel-morphology-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-msa-camel-transform-warnings",
				task: "morphology.transform",
				severity: "info",
				message:
					"CAMeL Morph MSA transform completed without rejected records.",
				metadata: {
					warningCount: summary.warnings.length,
				},
			},
		],
		metrics: [
			{
				metricId: "morpheme-count",
				name: "morphemeCount",
				value: morphemeRows.length,
				unit: "records",
			},
			{
				metricId: "compatibility-count",
				name: "compatibilityCount",
				value: compatibilityRows.length,
				unit: "records",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-features",
			tsvFile(["feature", "valueCount", "values"], featureRows),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-defaults",
			tsvFile(["pos", "feature", "value"], defaultRows),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-tokenizations",
			tsvFile(["order", "field"], tokenizationRows),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-morphemes",
			tsvFile(
				[
					"section",
					"surface",
					"category",
					"pos",
					"lex",
					"diac",
					"bw",
					"gloss",
					"root",
					"pattern",
					"stem",
					"stemcat",
					"source",
					"d3seg",
					"atbseg",
					"d3tok",
					"atbtok",
					"features",
				],
				morphemeRows,
			),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morph-compatibility",
			tsvFile(["table", "leftCategory", "rightCategory"], compatibilityRows),
		),
		outputFor(resourceSpec, "ar-msa-camel-morph-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"ar-msa-camel-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-segmentation-canonical",
			stableJson(canonicalSegmentation),
		),
		outputFor(
			resourceSpec,
			"ar-msa-camel-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function codePointLabel(character) {
	return `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
}

const arabicNormalizationEquivalenceClasses = [
	{
		classId: "arabic-alef-variants",
		canonical: "\u0627",
		members: ["\u0627", "\u0622", "\u0623", "\u0625", "\u0671"],
	},
	{
		classId: "arabic-ya-variants",
		canonical: "\u064A",
		members: ["\u064A", "\u0649"],
	},
];

function transformArabicNormalizationProfile(resourceSpec, inputs) {
	const camelText = requiredInput(
		inputs,
		"camel_morph_msa_v1.0.db",
		resourceSpec,
	);
	const aliasesText = requiredInput(
		inputs,
		"PropertyValueAliases.txt",
		resourceSpec,
	);
	const likelySubtagsText = requiredInput(
		inputs,
		"likelySubtags.json",
		resourceSpec,
	);
	const sections = camelSections(camelText);
	const likelySubtags = JSON.parse(likelySubtagsText);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.ar;
	expect(
		likelySubtag === "ar-Arab-EG",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ar -> ar-Arab-EG.`,
		likelySubtag,
	);
	const propertyAliases = parsePropertyValueAliases(aliasesText);
	const nfcQuickCheckAliases = propertyAliases.filter(
		(row) => row.property === "NFC_QC",
	);
	const observedCodePoints = new Map();
	let observedFieldCount = 0;
	for (const section of ["PREFIXES", "STEMS", "SUFFIXES"]) {
		for (const line of sections.get(section) ?? []) {
			const [surface = "", , ...rest] = line.split("\t");
			const features = parseFeatureString(rest.join(" ").trim());
			for (const value of [
				surface,
				features.lex ?? "",
				features.diac ?? "",
				features.bw ?? "",
			]) {
				if (value.length === 0) continue;
				observedFieldCount += 1;
				for (const character of value) {
					observedCodePoints.set(
						character,
						(observedCodePoints.get(character) ?? 0) + 1,
					);
				}
			}
		}
	}
	const normalizationRules = [
		{
			ruleId: "unicode-nfc-compose",
			operation: "compose",
			priority: 10,
			note: "Use Unicode NFC canonical composition for stored and comparable Arabic MSA text.",
		},
		{
			ruleId: "unicode-casefold-for-lookup",
			operation: "casefold",
			priority: 20,
			note: "Use Unicode casefolding for lookup/search normalization while preserving source text elsewhere.",
		},
		{
			ruleId: "cldr-arab-likely-subtag",
			operation: "map",
			priority: 30,
			input: "ar",
			output: likelySubtag,
			note: "Use CLDR likely-subtag context for the default Arabic script profile.",
		},
		{
			ruleId: "arabic-delete-tatweel-for-lookup",
			operation: "delete",
			priority: 40,
			input: "\u0640",
			output: "",
			note: "Delete tatweel for lookup normalization.",
		},
		{
			ruleId: "arabic-strip-harakat-for-lookup",
			operation: "delete",
			priority: 50,
			pattern: "[\u064B-\u065F\u0670]",
			note: "Strip Arabic vowel marks and Quranic superscript alef for unvocalized lookup normalization.",
		},
	];
	for (const equivalenceClass of arabicNormalizationEquivalenceClasses) {
		for (const member of equivalenceClass.members) {
			if (member === equivalenceClass.canonical) continue;
			normalizationRules.push({
				ruleId: `${equivalenceClass.classId}-${codePointLabel(member).toLowerCase()}`,
				operation: "map",
				priority: 60,
				input: member,
				output: equivalenceClass.canonical,
				note: `Map ${equivalenceClass.classId} member ${codePointLabel(member)} to ${codePointLabel(equivalenceClass.canonical)} for lookup normalization.`,
			});
		}
	}
	const observedRows = [];
	const evidenceCharacters = new Set();
	for (const rule of normalizationRules) {
		if (rule.input !== undefined && rule.input.length === 1) {
			evidenceCharacters.add(rule.input);
		}
	}
	for (const equivalenceClass of arabicNormalizationEquivalenceClasses) {
		for (const member of equivalenceClass.members) {
			evidenceCharacters.add(member);
		}
	}
	for (const character of sorted([...evidenceCharacters])) {
		observedRows.push([
			codePointLabel(character),
			character,
			observedCodePoints.get(character) ?? 0,
		]);
	}
	const canonicalNormalization = {
		schemaVersion: "1",
		kind: "normalization-profile",
		profileId: "ar-msa-camel-unicode-normalization",
		languageTag: "ar",
		script: "Arab",
		unicodeNormalization: "NFC",
		casePolicy: "casefold",
		rules: normalizationRules.map((rule) => ({
			ruleId: rule.ruleId,
			operation: rule.operation,
			priority: rule.priority,
			...(rule.input === undefined ? {} : { input: rule.input }),
			...(rule.output === undefined ? {} : { output: rule.output }),
			...(rule.pattern === undefined ? {} : { pattern: rule.pattern }),
			conditions: {
				scope: "Arabic MSA lookup normalization profile",
				sourceIds: resourceSpec.sourceIds,
				likelySubtag,
				note: rule.note,
			},
		})),
		equivalenceClasses: arabicNormalizationEquivalenceClasses,
	};
	const summary = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "ar",
		script: "Arab",
		likelySubtag,
		ruleCount: normalizationRules.length,
		equivalenceClassCount: arabicNormalizationEquivalenceClasses.length,
		observedEvidenceCodePointCount: observedRows.length,
		observedFieldCount,
		nfcQuickCheckValueCount: nfcQuickCheckAliases.length,
		recordsAccepted: normalizationRules.length + observedRows.length,
		recordsRejected: 0,
		warnings: [
			"This profile declares Unicode/CLDR and CAMeL MSA-backed Arabic lookup normalization policy.",
			"It does not claim dialectal Arabic normalization, Quranic/Classical Arabic policy, transliteration, spelling correction, OCR cleanup, or corpus-derived noisy-text normalization.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-msa-normalization-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-normalization-scope",
				task: "normalization.profile",
				severity: "info",
				message:
					"Unicode/CLDR and CAMeL MSA-backed lookup profile; dialectal, Quranic/Classical, transliteration, OCR, and spelling-correction normalization are out of scope.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "rule-count",
				name: "ruleCount",
				value: summary.ruleCount,
				unit: "rules",
			},
			{
				metricId: "observed-evidence-code-point-count",
				name: "observedEvidenceCodePointCount",
				value: summary.observedEvidenceCodePointCount,
				unit: "codepoints",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(
			resourceSpec,
			"ar-normalization-rules",
			tsvFile(
				["ruleId", "operation", "priority", "input", "output", "pattern", "note"],
				normalizationRules.map((rule) => [
					rule.ruleId,
					rule.operation,
					rule.priority,
					rule.input ?? "",
					rule.output ?? "",
					rule.pattern ?? "",
					rule.note,
				]),
			),
		),
		outputFor(
			resourceSpec,
			"ar-normalization-observed-codepoints",
			tsvFile(["codePoint", "character", "observedCount"], observedRows),
		),
		outputFor(
			resourceSpec,
			"ar-normalization-profile",
			stableJson(canonicalNormalization),
		),
		outputFor(resourceSpec, "ar-normalization-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"ar-normalization-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function arabicLookupNormalize(value) {
	return value
		.normalize("NFC")
		.replace(/\u0640/gu, "")
		.replace(/[\u064B-\u065F\u0670]/gu, "")
		.replace(/[\u0622\u0623\u0625\u0671]/gu, "\u0627")
		.replace(/\u0649/gu, "\u064A")
		.trim()
		.replace(/\s+/gu, " ");
}

function transformArabicSearchProfile(resourceSpec, inputs) {
	const camelText = requiredInput(
		inputs,
		"camel_morph_msa_v1.0.db",
		resourceSpec,
	);
	const wordnetXml = requiredInput(inputs, "awn4.xml.gz", resourceSpec);
	const sections = camelSections(camelText);
	const likelySubtags = JSON.parse(
		requiredInput(inputs, "likelySubtags.json", resourceSpec),
	);
	const likelySubtag = likelySubtags.supplemental.likelySubtags.ar;
	expect(
		likelySubtag === "ar-Arab-EG",
		`${resourceSpec.resourceSpecId} expected CLDR likely subtag ar -> ar-Arab-EG.`,
		likelySubtag,
	);

	const tokenizationRows = [];
	for (const line of sections.get("TOKENIZATIONS") ?? []) {
		const parts = line.split(/\s+/u);
		if (parts[0] !== "TOKENIZATION") continue;
		parts.slice(1).forEach((field, index) => {
			tokenizationRows.push([index + 1, field]);
		});
	}

	const morphHookCounts = new Map();
	let morphemeCount = 0;
	for (const section of ["PREFIXES", "STEMS", "SUFFIXES"]) {
		for (const line of sections.get(section) ?? []) {
			const [, , ...rest] = line.split("\t");
			const features = parseFeatureString(rest.join(" ").trim());
			morphemeCount += 1;
			for (const feature of [
				"lex",
				"diac",
				"bw",
				"root",
				"stem",
				"d3seg",
				"atbseg",
				"d3tok",
				"atbtok",
			]) {
				if ((features[feature] ?? "").length > 0) {
					incrementCount(morphHookCounts, feature);
				}
			}
		}
	}
	const morphologyHookRows = sortedCountRows(morphHookCounts).map(
		([feature, count]) => [feature, count],
	);

	const entriesBySynset = new Map();
	let lexicalEntryCount = 0;
	for (const match of wordnetXml.matchAll(
		/<LexicalEntry\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/LexicalEntry>/gu,
	)) {
		const entryId = xmlDecode(match[1]);
		const body = match[2];
		const lemmaMatch = body.match(/<Lemma\b([^>]*)\/>/u);
		const lemmaAttrs = lemmaMatch === null ? {} : xmlAttributes(lemmaMatch[1]);
		const lemma = lemmaAttrs.writtenForm ?? "";
		const normalizedLemma = arabicLookupNormalize(lemma);
		if (normalizedLemma.length === 0) continue;
		lexicalEntryCount += 1;
		for (const senseMatch of body.matchAll(
			/<Sense\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Sense>)/gu,
		)) {
			const senseAttrs = xmlAttributes(senseMatch[1]);
			const synsetId = senseAttrs.synset ?? "";
			if (synsetId.length === 0) continue;
			const entries = entriesBySynset.get(synsetId) ?? [];
			entries.push({
				entryId,
				lemma,
				normalizedLemma,
				partOfSpeech: lemmaAttrs.partOfSpeech ?? "",
			});
			entriesBySynset.set(synsetId, entries);
		}
	}

	const synonymRows = [];
	for (const [synsetId, entries] of [...entriesBySynset.entries()].sort(
		(left, right) => left[0].localeCompare(right[0]),
	)) {
		const uniqueEntries = [
			...new Map(
				entries
					.sort((left, right) => left.entryId.localeCompare(right.entryId))
					.map((entry) => [entry.entryId, entry]),
			).values(),
		];
		if (uniqueEntries.length < 2) continue;
		for (const sourceEntry of uniqueEntries) {
			for (const targetEntry of uniqueEntries) {
				if (sourceEntry.entryId === targetEntry.entryId) continue;
				synonymRows.push([
					sourceEntry.normalizedLemma,
					targetEntry.normalizedLemma,
					sourceEntry.entryId,
					targetEntry.entryId,
					synsetId,
					sourceEntry.partOfSpeech,
				]);
			}
		}
	}
	synonymRows.sort((left, right) => {
		for (let index = 0; index < left.length; index += 1) {
			const delta = `${left[index]}`.localeCompare(`${right[index]}`);
			if (delta !== 0) return delta;
		}
		return 0;
	});

	const analyzer = {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "ar-msa-lookup-search-analyzer",
		languageTag: "ar",
		script: "Arab",
		tokenizer: {
			componentId: "camel-morph-tokenization",
			type: "dictionary-tokenization",
			mode: "msa-tokenization-fields",
			options: {
				tokenizationResourceId: "ar-search-tokenization-hooks",
				fallback: "unicode-word-boundary",
			},
		},
		charFilters: [
			{
				componentId: "unicode-nfc",
				type: "unicode-normalization",
				mode: "NFC",
			},
			{
				componentId: "arabic-lookup-normalization",
				type: "normalization-profile",
				mode: "msa-lookup",
				options: {
					ruleResourceId: "ar-search-normalization-policy",
					likelySubtag,
				},
			},
		],
		tokenFilters: [
			{
				componentId: "arabic-strip-tatweel-and-harakat",
				type: "arabic-mark-policy",
				mode: "lookup-delete",
				options: {
					deleteTatweel: true,
					deleteHarakat: true,
				},
			},
			{
				componentId: "camel-morph-msa-morphology-hooks",
				type: "morphology-lookup",
				mode: "candidate-expansion",
				options: {
					hookResourceId: "ar-search-morphology-hooks",
					source: "CAMeL Morph MSA",
				},
			},
			{
				componentId: "arabic-wordnet-synonym-expansion",
				type: "synonym-expansion",
				mode: "query-time-optional",
				options: {
					synonymResourceId: "ar-search-wordnet-synonyms",
					source: "Arabic WordNet 4.1.0",
				},
			},
		],
		resources: [
			{
				resourceId: "ar-search-normalization-policy",
				role: "normalizer",
			},
			{
				resourceId: "ar-search-morphology-hooks",
				role: "stemmer",
			},
			{
				resourceId: "ar-search-wordnet-synonyms",
				role: "synonyms",
			},
			{
				resourceId: "ar-search-quality-profile",
				role: "quality",
			},
		],
		fields: [
			{
				fieldName: "text",
				analyzerRole: "index",
			},
			{
				fieldName: "text",
				analyzerRole: "query",
			},
			{
				fieldName: "text",
				analyzerRole: "highlight",
			},
			{
				fieldName: "text",
				analyzerRole: "suggest",
			},
		],
	};

	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		languageTag: "ar",
		script: "Arab",
		likelySubtag,
		tokenizationFieldCount: tokenizationRows.length,
		morphemeCount,
		morphologyHookCount: morphologyHookRows.length,
		wordnetLexicalEntryCount: lexicalEntryCount,
		wordnetSynsetWithSynonymCount: [...entriesBySynset.values()].filter(
			(entries) => entries.length > 1,
		).length,
		synonymPairCount: synonymRows.length,
		recordsAccepted:
			tokenizationRows.length + morphologyHookRows.length + synonymRows.length,
		recordsRejected: 0,
		warnings: [
			"This profile declares Arabic MSA lookup/search analyzer resources from CAMeL Morph and Arabic WordNet.",
			"It does not claim a persistent index, corpus-derived ranking, dialectal Arabic search, Classical/Quranic Arabic search, or OPUS/Tatoeba-backed cross-lingual search.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "ar-search-quality",
		languageTag: "ar",
		script: "Arab",
		diagnostics: [
			{
				diagnosticId: "ar-search-scope",
				task: "search.profile",
				severity: "info",
				message:
					"Arabic MSA lookup/search profile; corpus ranking, dialectal search, and Classical/Quranic search are out of scope.",
				metadata: {
					likelySubtag,
					sourceIds: resourceSpec.sourceIds,
				},
			},
		],
		metrics: [
			{
				metricId: "synonym-pair-count",
				name: "synonymPairCount",
				value: quality.synonymPairCount,
				unit: "pairs",
			},
			{
				metricId: "morphology-hook-count",
				name: "morphologyHookCount",
				value: quality.morphologyHookCount,
				unit: "hooks",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"ar-search-normalization-policy",
			stableJson({
				schemaVersion: "1",
				languageTag: "ar",
				script: "Arab",
				likelySubtag,
				normalizationRuleIds: [
					"unicode-nfc-compose",
					"unicode-casefold-for-lookup",
					"arabic-delete-tatweel-for-lookup",
					"arabic-strip-harakat-for-lookup",
					"arabic-alef-variants",
					"arabic-ya-variants",
				],
			}),
		),
		outputFor(
			resourceSpec,
			"ar-search-tokenization-hooks",
			tsvFile(["order", "field"], tokenizationRows),
		),
		outputFor(
			resourceSpec,
			"ar-search-morphology-hooks",
			tsvFile(["feature", "observedMorphemeCount"], morphologyHookRows),
		),
		outputFor(
			resourceSpec,
			"ar-search-wordnet-synonyms",
			tsvFile(
				[
					"sourceNormalizedLemma",
					"targetNormalizedLemma",
					"sourceEntryId",
					"targetEntryId",
					"synsetId",
					"partOfSpeech",
				],
				synonymRows,
			),
		),
		outputFor(resourceSpec, "ar-search-profile", stableJson(analyzer)),
		outputFor(resourceSpec, "ar-search-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"ar-search-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function xmlAttributes(text) {
	const attributes = {};
	for (const match of text.matchAll(
		/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/gu,
	)) {
		attributes[match[1]] = xmlDecode(match[2]);
	}
	return attributes;
}

function xmlDecode(value) {
	return value
		.replace(/&#x([0-9a-f]+);/giu, (_, hex) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replace(/&#([0-9]+);/gu, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/&quot;/gu, '"')
		.replace(/&apos;/gu, "'")
		.replace(/&lt;/gu, "<")
		.replace(/&gt;/gu, ">")
		.replace(/&amp;/gu, "&");
}

function firstXmlText(body, tagName) {
	const pattern = new RegExp(
		`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`,
		"u",
	);
	const match = body.match(pattern);
	if (match === null) return "";
	return xmlDecode(
		match[1]
			.replace(/<[^>]+>/gu, " ")
			.replace(/\s+/gu, " ")
			.trim(),
	);
}

function countXmlTags(body, tagName) {
	const pattern = new RegExp(`<${tagName}\\b`, "gu");
	return [...body.matchAll(pattern)].length;
}

function transformWordnetLmf(resourceSpec, inputs, config) {
	const xml = requiredInput(inputs, config.inputFileName, resourceSpec);
	const ids = {
		kbCanonical: `${config.resourcePrefix}-kb-canonical`,
		lexicalEntries: `${config.resourcePrefix}-lexical-entries`,
		lexiconCanonical: `${config.resourcePrefix}-lexicon-canonical`,
		quality: `${config.resourcePrefix}-quality`,
		qualityProfile: `${config.resourcePrefix}-quality-profile`,
		relations: `${config.resourcePrefix}-relations`,
		senses: `${config.resourcePrefix}-senses`,
		synsets: `${config.resourcePrefix}-synsets`,
	};
	const lexicalEntryRows = [];
	const senseRows = [];
	const relationRows = [];
	const synsetRows = [];
	const lexicalPosCounts = new Map();
	const relationTypeCounts = new Map();

	for (const match of xml.matchAll(
		/<LexicalEntry\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/LexicalEntry>/gu,
	)) {
		const entryId = xmlDecode(match[1]);
		const body = match[2];
		const lemmaMatch = body.match(/<Lemma\b([^>]*)\/>/u);
		const lemmaAttrs = lemmaMatch === null ? {} : xmlAttributes(lemmaMatch[1]);
		const lemma = lemmaAttrs.writtenForm ?? "";
		const partOfSpeech = lemmaAttrs.partOfSpeech ?? "";
		lexicalEntryRows.push([entryId, lemma, partOfSpeech]);
		incrementCount(lexicalPosCounts, partOfSpeech);
		for (const senseMatch of body.matchAll(
			/<Sense\b([^>]*?)(?:\/>|>([\s\S]*?)<\/Sense>)/gu,
		)) {
			const senseAttrs = xmlAttributes(senseMatch[1]);
			const senseId = senseAttrs.id ?? "";
			const synsetId = senseAttrs.synset ?? "";
			senseRows.push([
				senseId,
				entryId,
				lemma,
				partOfSpeech,
				synsetId,
				senseAttrs.subcat ?? "",
			]);
			const senseBody = senseMatch[2] ?? "";
			for (const relationMatch of senseBody.matchAll(
				/<SenseRelation\b([^>]*)\/>/gu,
			)) {
				const relationAttrs = xmlAttributes(relationMatch[1]);
				const relType = relationAttrs.relType ?? "";
				relationRows.push([
					"sense",
					senseId,
					relType,
					relationAttrs.target ?? "",
				]);
				incrementCount(relationTypeCounts, `sense:${relType}`);
			}
		}
	}

	for (const match of xml.matchAll(/<Synset\b([^>]*)>([\s\S]*?)<\/Synset>/gu)) {
		const attrs = xmlAttributes(match[1]);
		const body = match[2];
		const synsetId = attrs.id ?? "";
		synsetRows.push([
			synsetId,
			attrs.ili ?? "",
			attrs.partOfSpeech ?? "",
			attrs.lexfile ?? "",
			attrs.members ?? "",
			firstXmlText(body, "Definition"),
			countXmlTags(body, "Example"),
		]);
		for (const relationMatch of body.matchAll(
			/<SynsetRelation\b([^>]*)\/>/gu,
		)) {
			const relationAttrs = xmlAttributes(relationMatch[1]);
			const relType = relationAttrs.relType ?? "";
			relationRows.push([
				"synset",
				synsetId,
				relType,
				relationAttrs.target ?? "",
			]);
			incrementCount(relationTypeCounts, `synset:${relType}`);
		}
	}

	lexicalEntryRows.sort((left, right) => left[0].localeCompare(right[0]));
	senseRows.sort((left, right) => left[0].localeCompare(right[0]));
	synsetRows.sort((left, right) => left[0].localeCompare(right[0]));
	relationRows.sort((left, right) => {
		const scopeDelta = left[0].localeCompare(right[0]);
		if (scopeDelta !== 0) return scopeDelta;
		const sourceDelta = left[1].localeCompare(right[1]);
		if (sourceDelta !== 0) return sourceDelta;
		const typeDelta = left[2].localeCompare(right[2]);
		if (typeDelta !== 0) return typeDelta;
		return left[3].localeCompare(right[3]);
	});

	const summary = {
		schemaVersion: "1",
		sourceId: config.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		lexicalEntryCount: lexicalEntryRows.length,
		senseCount: senseRows.length,
		synsetCount: synsetRows.length,
		relationCount: relationRows.length,
		lexicalEntriesByPartOfSpeech: Object.fromEntries(
			sortedCountRows(lexicalPosCounts),
		),
		relationsByType: Object.fromEntries(sortedCountRows(relationTypeCounts)),
		recordsAccepted:
			lexicalEntryRows.length +
			senseRows.length +
			synsetRows.length +
			relationRows.length,
		recordsRejected: 0,
		warnings: [],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: config.lexiconId,
		languageTag: config.languageTag,
		script: config.script,
		entryCount: lexicalEntryRows.length,
		resourceRefs: [
			{
				resourceId: ids.lexicalEntries,
				role: "entries",
				recordCount: lexicalEntryRows.length,
			},
		],
	};
	const canonicalKb = {
		schemaVersion: "1",
		kind: "knowledge-base",
		kbId: config.kbId,
		languageTags: [config.languageTag],
		entityCount: synsetRows.length + senseRows.length,
		relationCount: relationRows.length,
		resourceRefs: [
			{
				resourceId: ids.senses,
				role: "senses",
				recordCount: senseRows.length,
			},
			{
				resourceId: ids.synsets,
				role: "synsets",
				recordCount: synsetRows.length,
			},
			{
				resourceId: ids.relations,
				role: "relations",
				recordCount: relationRows.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: config.qualityProfileId,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.resourcePrefix}-transform-warnings`,
				task: "kb.transform",
				severity: "info",
				message: `${config.sourceLabel} transform completed without rejected records.`,
				metadata: {
					warningCount: summary.warnings.length,
				},
			},
		],
		metrics: [
			{
				metricId: "lexical-entry-count",
				name: "lexicalEntryCount",
				value: lexicalEntryRows.length,
				unit: "records",
			},
			{
				metricId: "sense-count",
				name: "senseCount",
				value: senseRows.length,
				unit: "records",
			},
			{
				metricId: "relation-count",
				name: "relationCount",
				value: relationRows.length,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			ids.lexicalEntries,
			tsvFile(["entryId", "lemma", "partOfSpeech"], lexicalEntryRows),
		),
		outputFor(
			resourceSpec,
			ids.senses,
			tsvFile(
				["senseId", "entryId", "lemma", "partOfSpeech", "synsetId", "subcat"],
				senseRows,
			),
		),
		outputFor(
			resourceSpec,
			ids.synsets,
			tsvFile(
				[
					"synsetId",
					"ili",
					"partOfSpeech",
					"lexfile",
					"members",
					"definition",
					"exampleCount",
				],
				synsetRows,
			),
		),
		outputFor(
			resourceSpec,
			ids.relations,
			tsvFile(["scope", "sourceId", "relType", "targetId"], relationRows),
		),
		outputFor(resourceSpec, ids.quality, stableJson(summary)),
		outputFor(
			resourceSpec,
			ids.lexiconCanonical,
			stableJson(canonicalLexicon),
		),
		outputFor(resourceSpec, ids.kbCanonical, stableJson(canonicalKb)),
		outputFor(
			resourceSpec,
			ids.qualityProfile,
			stableJson(canonicalQuality),
		),
	];
}

function transformOpenEnglishWordnetLmf(resourceSpec, inputs) {
	return transformWordnetLmf(resourceSpec, inputs, {
		inputFileName: "english-wordnet-2025.xml.gz",
		kbId: "wordnet-en-kb",
		languageTag: "en",
		lexiconId: "wordnet-en-lexicon",
		qualityProfileId: "wordnet-en-quality",
		resourcePrefix: "wordnet-en",
		script: "Latn",
		sourceId: "source:wordnet:open-english-2025",
		sourceLabel: "Open English WordNet",
	});
}

function transformArabicWordnetLmf(resourceSpec, inputs) {
	return transformWordnetLmf(resourceSpec, inputs, {
		inputFileName: "awn4.xml.gz",
		kbId: "wordnet-ar-kb",
		languageTag: "ar",
		lexiconId: "wordnet-ar-lexicon",
		qualityProfileId: "wordnet-ar-quality",
		resourcePrefix: "wordnet-ar",
		script: "Arab",
		sourceId: "source:wordnet:arabic-v4.1.0",
		sourceLabel: "Arabic WordNet 4.1.0",
	});
}

const WIKIDATA_ARTIFACT_VERSION = "20260608";
const WIKIDATA_20260608_GZIP = {
	fileName: "wikidata-20260608-all.json.gz",
	sizeBytes: 142291512349,
	sourceUrl:
		"https://dumps.wikimedia.org/wikidatawiki/entities/20260608/wikidata-20260608-all.json.gz",
};

function checksumFromSidecar(text, fileName, algorithm) {
	for (const line of text.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (trimmed.length === 0) continue;
		const [value, candidate] = trimmed.split(/\s+/u);
		if (candidate === fileName) return `${algorithm}:${value}`;
	}
	throw new Error(`Missing ${algorithm} checksum for ${fileName}.`);
}

const WIKIDATA_ARTIFACT_CONFIG_BY_PACKAGE = new Map([
	[
		"@ismail-elkorchi/textpack-wikidata-ar",
		{
			languageName: "Arabic",
			languageTag: "ar",
			resourcePrefix: "wikidata-ar",
			script: "Arab",
		},
	],
	[
		"@ismail-elkorchi/textpack-wikidata-en",
		{
			languageName: "English",
			languageTag: "en",
			resourcePrefix: "wikidata-en",
			script: "Latn",
		},
	],
	[
		"@ismail-elkorchi/textpack-wikidata-fr",
		{
			languageName: "French",
			languageTag: "fr",
			resourcePrefix: "wikidata-fr",
			script: "Latn",
		},
	],
]);

function wikidataArtifactConfig(resourceSpec) {
	const config = WIKIDATA_ARTIFACT_CONFIG_BY_PACKAGE.get(
		resourceSpec.packageName,
	);
	expect(
		config !== undefined,
		`${resourceSpec.resourceSpecId} uses wikidata-main-artifact for unsupported package ${resourceSpec.packageName}.`,
	);
	const artifactId = `artifact:textpack-wikidata-${config.languageTag}:full:wikidata-entities-json:${WIKIDATA_ARTIFACT_VERSION}`;
	return {
		...config,
		artifactId,
		kbId: `${config.resourcePrefix}-entity-kb`,
		kbResourceId: `${config.resourcePrefix}-kb-artifact`,
		qualityProfileId: `${config.resourcePrefix}-artifact-quality`,
		qualityResourceId: `${config.resourcePrefix}-quality`,
		qualityProfileResourceId: `${config.resourcePrefix}-quality-profile`,
	};
}

function transformWikidataMainArtifact(resourceSpec, inputs) {
	const config = wikidataArtifactConfig(resourceSpec);
	const sha1Sums = requiredInput(
		inputs,
		"wikidata-20260608-sha1sums.txt",
		resourceSpec,
	);
	const md5Sums = requiredInput(
		inputs,
		"wikidata-20260608-md5sums.txt",
		resourceSpec,
	);
	const sha1Checksum = checksumFromSidecar(
		sha1Sums,
		WIKIDATA_20260608_GZIP.fileName,
		"sha1",
	);
	const md5Checksum = checksumFromSidecar(
		md5Sums,
		WIKIDATA_20260608_GZIP.fileName,
		"md5",
	);
	const extractBasename = `wikidata-${config.languageTag}-core`;
	if (hasInputPath(inputs, `${extractBasename}-entities.tsv`)) {
		const entities = requiredInput(
			inputs,
			`${extractBasename}-entities.tsv`,
			resourceSpec,
		);
		const aliases = requiredInput(
			inputs,
			`${extractBasename}-aliases.tsv`,
			resourceSpec,
		);
		const relations = requiredInput(
			inputs,
			`${extractBasename}-relations.tsv`,
			resourceSpec,
		);
		const extractMetadata = JSON.parse(
			requiredInput(
				inputs,
				`${extractBasename}-extract-metadata.json`,
				resourceSpec,
			),
		);
		const entityRowCount = extractMetadata.entityRowCount;
		const aliasRowCount = extractMetadata.aliasRowCount;
		const relationRowCount = extractMetadata.relationRowCount;
		const ids = {
			entities: `${config.resourcePrefix}-entities`,
			aliases: `${config.resourcePrefix}-aliases`,
			relations: `${config.resourcePrefix}-relations`,
			kb: `${config.resourcePrefix}-kb-canonical`,
		};
		const kbResource = {
			schemaVersion: "1",
		kind: "knowledge-base",
		kbId: config.kbId,
		languageTags: [config.languageTag],
		entityCount: entityRowCount,
		relationCount: relationRowCount,
		resourceRefs: [
			{
				resourceId: ids.entities,
				role: "entities",
				recordCount: entityRowCount,
			},
			{
				resourceId: ids.aliases,
				role: "aliases",
				recordCount: aliasRowCount,
			},
			{
				resourceId: ids.relations,
				role: "relations",
				recordCount: relationRowCount,
			},
		],
	};
		const summary = {
			schemaVersion: "1",
			sourceId: "source:wikidata:main",
			pipelineId: resourceSpec.pipelineId,
			pipelineVersion: resourceSpec.pipelineVersion,
			version: WIKIDATA_ARTIFACT_VERSION,
			extractId: extractMetadata.extractId,
			endpoint: extractMetadata.endpoint,
			entityRowCount,
			aliasRowCount,
			relationRowCount,
			recordsAccepted: entityRowCount + aliasRowCount + relationRowCount,
			recordsRejected: 0,
			sha1Checksum,
			md5Checksum,
			localResourceIds: [ids.entities, ids.aliases, ids.relations, ids.kb],
			warnings: [
				"Wikimedia publishes SHA-1 and MD5 sidecars for the full dump; the local extract files are pinned by SHA-256 in the forge snapshot.",
				"The local Wikidata extract is scoped to declared core entity classes and sitelink thresholds; it is not a full Wikidata entity dump.",
			],
		};
		const canonicalQuality = {
			schemaVersion: "1",
			kind: "quality-profile",
			profileId: `${config.resourcePrefix}-core-extract-quality`,
			languageTag: config.languageTag,
			script: config.script,
			diagnostics: [
				{
					diagnosticId: `${config.resourcePrefix}-local-core-extract`,
					task: "kb.materialization",
					severity: "info",
					message: `Wikidata ${config.languageName} core entity data is materialized as local canonical TSV resources for the declared extract scope.`,
					metadata: {
						extractId: extractMetadata.extractId,
						scope: extractMetadata.scope,
					},
				},
				{
					diagnosticId: `${config.resourcePrefix}-extract-scope`,
					task: "kb.coverage",
					severity: "info",
					message:
						"The extract scope is declared by class ids and sitelink thresholds; it does not claim complete Wikidata coverage.",
					metadata: {
						classes: extractMetadata.classes,
					},
				},
			],
			metrics: [
				{
					metricId: "entity-row-count",
					name: "entityRowCount",
					value: entityRowCount,
					unit: "rows",
				},
				{
					metricId: "alias-row-count",
					name: "aliasRowCount",
					value: aliasRowCount,
					unit: "rows",
				},
				{
					metricId: "relation-row-count",
					name: "relationRowCount",
					value: relationRowCount,
					unit: "rows",
				},
			],
			thresholds: [],
			evaluationRecordIds: [],
		};
		return [
			outputFor(resourceSpec, ids.entities, entities),
			outputFor(resourceSpec, ids.aliases, aliases),
			outputFor(resourceSpec, ids.relations, relations),
			outputFor(resourceSpec, ids.kb, stableJson(kbResource)),
			outputFor(resourceSpec, config.qualityResourceId, stableJson(summary)),
			outputFor(
				resourceSpec,
				config.qualityProfileResourceId,
				stableJson(canonicalQuality),
			),
		];
	}
	const kbResource = {
		schemaVersion: "1",
		kind: "knowledge-base",
		kbId: config.kbId,
		languageTags: [config.languageTag],
		resourceRefs: [
			{
				resourceId: config.artifactId,
				role: "entities",
			},
			{
				resourceId: config.artifactId,
				role: "labels",
			},
			{
				resourceId: config.artifactId,
				role: "aliases",
			},
			{
				resourceId: config.artifactId,
				role: "relations",
			},
			{
				resourceId: config.artifactId,
				role: "ontology",
			},
		],
	};
	const summary = {
		schemaVersion: "1",
		sourceId: "source:wikidata:main",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		artifactId: config.artifactId,
		version: WIKIDATA_ARTIFACT_VERSION,
		sourceUrl: WIKIDATA_20260608_GZIP.sourceUrl,
		sizeBytes: WIKIDATA_20260608_GZIP.sizeBytes,
		sha1Checksum,
		md5Checksum,
		recordsAccepted: 2,
		recordsRejected: 0,
		warnings: [
			"Wikimedia publishes SHA-1 and MD5 sidecars for this dump; no upstream SHA-256 sidecar is available for the pinned artifact.",
			"The full Wikidata dump is artifact-backed; local KB lookup requires a generated language-specific extract.",
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: config.qualityProfileId,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `${config.resourcePrefix}-explicit-artifact-fetch`,
				task: "kb.artifact",
				severity: "info",
				message: `Wikidata main entity data for ${config.languageName} KB consumers is exposed as an explicit artifact descriptor; local KB lookup requires a generated language-specific extract.`,
				metadata: {
					artifactId: config.artifactId,
					artifactPolicy: "fetch-explicit",
				},
			},
			{
				diagnosticId: `${config.resourcePrefix}-upstream-checksum-strength`,
				task: "kb.artifact",
				severity: "warning",
				message:
					"The upstream checksum sidecar for the pinned Wikidata artifact is SHA-1, not SHA-256.",
				metadata: {
					sha1Checksum,
					md5Checksum,
				},
			},
		],
		metrics: [
			{
				metricId: "artifact-size-bytes",
				name: "artifactSizeBytes",
				value: WIKIDATA_20260608_GZIP.sizeBytes,
				unit: "bytes",
			},
			{
				metricId: "upstream-sha1-sidecar-present",
				name: "upstreamSha1SidecarPresent",
				value: true,
				unit: "boolean",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(resourceSpec, config.kbResourceId, stableJson(kbResource)),
		outputFor(resourceSpec, config.qualityResourceId, stableJson(summary)),
		outputFor(
			resourceSpec,
			config.qualityProfileResourceId,
			stableJson(canonicalQuality),
		),
	];
}

function tatoebaMetadata(resourceSpec, inputs, fileName) {
	const metadata = JSON.parse(
		requiredInput(inputs, fileName, resourceSpec),
	);
	expect(
		Array.isArray(metadata.exports),
		`${resourceSpec.resourceSpecId} Tatoeba metadata must declare exports.`,
	);
	return metadata;
}

function requiredInputPath(inputs, basename, resourceSpec) {
	const relative = inputs.get(`${basename}:path`);
	expect(
		relative !== undefined,
		`${resourceSpec.resourceSpecId} missing ${basename} path.`,
	);
	return relative;
}

function hasInputPath(inputs, basename) {
	return inputs.has(`${basename}:path`);
}

function readBzip2Input(inputs, basename, resourceSpec) {
	const relative = requiredInputPath(inputs, basename, resourceSpec);
	const absolute = path.join(ROOT, relative);
	const child = spawnSync("bunzip2", ["-c", absolute], {
		encoding: "utf8",
		maxBuffer: 768 * 1024 * 1024,
	});
	expect(
		child.status === 0,
		`${resourceSpec.resourceSpecId} failed to decompress ${basename}.`,
		child.stderr?.toString("utf8").trim() ?? "",
	);
	return child.stdout.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n");
}

function canonicalTatoebaCorpusTsv(text, artifact, config) {
	const rows = [
		[
			"sentenceId",
			"languageTag",
			"tatoebaLanguageCode",
			"text",
			"owner",
			"createdAt",
			"modifiedAt",
		],
	];
	let accepted = 0;
	let rejected = 0;
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length < 6) {
			rejected += 1;
			continue;
		}
		const [sentenceId, tatoebaLanguageCode, sentenceText, owner, createdAt, modifiedAt] = cells;
		if (
			sentenceId === undefined ||
			tatoebaLanguageCode !== artifact.tatoebaLanguageCode ||
			sentenceText === undefined
		) {
			rejected += 1;
			continue;
		}
		rows.push([
			sentenceId,
			config.languageTag,
			tatoebaLanguageCode,
			sentenceText,
			owner ?? "",
			createdAt ?? "",
			modifiedAt ?? "",
		]);
		accepted += 1;
	}
	return {
		text: tsvFile(rows[0], rows.slice(1)),
		accepted,
		rejected,
	};
}

function canonicalTatoebaParallelTsv(text, artifact, config) {
	const rows = [
		[
			"sourceSentenceId",
			"targetSentenceId",
			"sourceLanguageTag",
			"targetLanguageTag",
			"sourceTatoebaLanguageCode",
			"targetTatoebaLanguageCode",
		],
	];
	let accepted = 0;
	let rejected = 0;
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const cells = line.split("\t");
		if (cells.length < 2) {
			rejected += 1;
			continue;
		}
		const [sourceSentenceId, targetSentenceId] = cells;
		if (sourceSentenceId === undefined || targetSentenceId === undefined) {
			rejected += 1;
			continue;
		}
		rows.push([
			sourceSentenceId,
			targetSentenceId,
			config.languageTag,
			artifact.targetLanguageTag,
			artifact.sourceTatoebaLanguageCode,
			artifact.targetTatoebaLanguageCode,
		]);
		accepted += 1;
	}
	return {
		text: tsvFile(rows[0], rows.slice(1)),
		accepted,
		rejected,
	};
}

function checksumValue(artifact) {
	return `sha256:${artifact.sha256}`;
}

function scriptForLanguageTag(languageTag) {
	if (languageTag === "ar") return "Arab";
	if (languageTag === "el" || languageTag === "grc") return "Grek";
	return "Latn";
}

function tatoebaArtifactDescriptor(artifact, sourceIds) {
	return {
		artifactId: artifact.artifactId,
		sourceIds,
		version: "2026-06-06",
		profile: "full",
		sizeBytes: artifact.sizeBytes,
		mediaType: "text/tab-separated-values",
		compression: "bzip2",
		checksum: {
			algorithm: "sha256",
			value: artifact.sha256,
		},
		licenseExpression: "CC-BY-2.0-FR",
		redistributionPolicy: "redistributable-with-attribution",
		retrieval: {
			kind: "https",
			uri: artifact.uri,
			instructions:
				"Fetch explicitly from Tatoeba weekly exports and verify the SHA-256 checksum before unpacking or indexing.",
		},
		cacheKey: `tatoeba-${artifact.fileName.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "")}-2026-06-06`,
		expectedFiles: [
			{
				path: artifact.expectedPath,
				sizeBytes: artifact.sizeBytes,
				checksum: checksumValue(artifact),
			},
		],
	};
}

function transformTatoebaCorpusArtifact(resourceSpec, inputs, config) {
	const metadata = tatoebaMetadata(resourceSpec, inputs, config.metadataFile);
	const corpusArtifact = metadata.exports.find(
		(artifact) => artifact.role === "corpus",
	);
	expect(
		corpusArtifact !== undefined,
		`${resourceSpec.resourceSpecId} missing Tatoeba ${config.languageName} corpus artifact metadata.`,
	);
	if (!hasInputPath(inputs, corpusArtifact.fileName)) {
		const corpusResource = {
			schemaVersion: "1",
			kind: "corpus",
			corpusId: config.corpusId,
			languageTags: [config.languageTag],
			splits: ["full"],
			documents: [
				{
					documentId: config.documentId,
					languageTag: config.languageTag,
					script: config.script,
					split: "full",
					title: `Tatoeba ${config.languageName} detailed sentences weekly export 2026-06-06`,
					artifactId: corpusArtifact.artifactId,
					path: corpusArtifact.expectedPath,
					checksum: checksumValue(corpusArtifact),
					metadata: {
						sourceId: metadata.sourceId,
						tatoebaLanguageCode: corpusArtifact.tatoebaLanguageCode,
						rowCount: corpusArtifact.rowCount,
						lastModified: corpusArtifact.lastModified,
						etag: corpusArtifact.etag,
						licenseExpression: metadata.licenseExpression,
						artifactDescriptor: tatoebaArtifactDescriptor(
							corpusArtifact,
							resourceSpec.sourceIds,
						),
					},
				},
			],
		};
		const summary = {
			schemaVersion: "1",
			sourceId: metadata.sourceId,
			pipelineId: resourceSpec.pipelineId,
			pipelineVersion: resourceSpec.pipelineVersion,
			artifactId: corpusArtifact.artifactId,
			version: metadata.version,
			sourceUrl: corpusArtifact.uri,
			sizeBytes: corpusArtifact.sizeBytes,
			rowCount: corpusArtifact.rowCount,
			sha256Checksum: checksumValue(corpusArtifact),
			recordsAccepted: 1,
			recordsRejected: 0,
			warnings: [
				`The Tatoeba ${config.languageName} corpus is artifact-backed and must be fetched explicitly; it is not vendored in the npm package.`,
				"The detailed export includes contributor fields needed for attribution-aware downstream processing.",
			],
		};
		const qualityProfile = {
			schemaVersion: "1",
			kind: "quality-profile",
			profileId: `tatoeba-${config.resourcePrefix}-corpus-artifact-quality`,
			languageTag: config.languageTag,
			script: config.script,
			diagnostics: [
				{
					diagnosticId: `tatoeba-${config.resourcePrefix}-explicit-corpus-artifact-fetch`,
					task: "corpus.artifact",
					severity: "info",
					message:
						`Tatoeba ${config.languageName} sentence data is exposed as an explicit artifact descriptor; local corpus rows have not been materialized yet.`,
					metadata: {
						artifactId: corpusArtifact.artifactId,
						artifactPolicy: "fetch-explicit",
					},
				},
				{
					diagnosticId: `tatoeba-${config.resourcePrefix}-attribution-corpus-fields`,
					task: "corpus.license",
					severity: "info",
					message:
						"The pinned detailed sentence export preserves owner and timestamp fields for attribution-aware downstream use.",
					metadata: {
						licenseExpression: metadata.licenseExpression,
					},
				},
			],
			metrics: [
				{
					metricId: "sentence-row-count",
					name: "sentenceRowCount",
					value: corpusArtifact.rowCount,
					unit: "rows",
				},
				{
					metricId: "artifact-size-bytes",
					name: "artifactSizeBytes",
					value: corpusArtifact.sizeBytes,
					unit: "bytes",
				},
			],
			thresholds: [],
			evaluationRecordIds: [],
		};
		return [
			outputFor(
				resourceSpec,
				`${config.resourcePrefix}-tatoeba-corpus-artifact`,
				stableJson(corpusResource),
			),
			outputFor(
				resourceSpec,
				`${config.resourcePrefix}-tatoeba-corpus-quality`,
				stableJson(summary),
			),
			outputFor(
				resourceSpec,
				`${config.resourcePrefix}-tatoeba-corpus-quality-profile`,
				stableJson(qualityProfile),
			),
		];
	}
	const materialized = canonicalTatoebaCorpusTsv(
		readBzip2Input(inputs, corpusArtifact.fileName, resourceSpec),
		corpusArtifact,
		config,
	);
	expect(
		materialized.accepted === corpusArtifact.rowCount,
		`${resourceSpec.resourceSpecId} materialized ${materialized.accepted} ${config.languageName} Tatoeba corpus rows, expected ${corpusArtifact.rowCount}.`,
	);
	const rowChecksum = sha256(materialized.text);
	const sentenceResourceId = `${config.resourcePrefix}-tatoeba-corpus-sentences`;
	const sentenceOutput = resourceSpec.outputs.find(
		(output) => output.resourceId === sentenceResourceId,
	);
	expect(
		sentenceOutput !== undefined,
		`${resourceSpec.resourceSpecId} does not declare output ${sentenceResourceId}.`,
	);
	const corpusResource = {
		schemaVersion: "1",
		kind: "corpus",
		corpusId: config.corpusId,
		languageTags: [config.languageTag],
		splits: ["full"],
		documents: [
			{
				documentId: config.documentId,
				languageTag: config.languageTag,
				script: config.script,
				split: "full",
				title: `Tatoeba ${config.languageName} detailed sentences weekly export 2026-06-06`,
				artifactId: corpusArtifact.artifactId,
				path: sentenceOutput.path,
				checksum: rowChecksum,
				metadata: {
					sourceId: metadata.sourceId,
					sourceUrl: corpusArtifact.uri,
					tatoebaLanguageCode: corpusArtifact.tatoebaLanguageCode,
					rowCount: materialized.accepted,
					lastModified: corpusArtifact.lastModified,
					etag: corpusArtifact.etag,
					licenseExpression: metadata.licenseExpression,
					localResourceId: sentenceResourceId,
				},
			},
		],
	};
	const summary = {
		schemaVersion: "1",
		sourceId: metadata.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		artifactId: corpusArtifact.artifactId,
		version: metadata.version,
		sourceUrl: corpusArtifact.uri,
		sizeBytes: corpusArtifact.sizeBytes,
		rowCount: corpusArtifact.rowCount,
		materializedRowCount: materialized.accepted,
		localResourceId: sentenceResourceId,
		localResourceChecksum: rowChecksum,
		sha256Checksum: checksumValue(corpusArtifact),
		recordsAccepted: materialized.accepted,
		recordsRejected: materialized.rejected,
		warnings: [
			"The detailed export includes contributor fields needed for attribution-aware downstream processing.",
		],
	};
	const qualityProfile = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: `tatoeba-${config.resourcePrefix}-corpus-materialized-quality`,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: `tatoeba-${config.resourcePrefix}-local-corpus-rows`,
				task: "corpus.materialization",
				severity: "info",
				message:
					`Tatoeba ${config.languageName} sentence data is materialized as local canonical TSV rows.`,
				metadata: {
					artifactId: corpusArtifact.artifactId,
					resourceId: `${config.resourcePrefix}-tatoeba-corpus-sentences`,
					rowChecksum,
				},
			},
			{
				diagnosticId: `tatoeba-${config.resourcePrefix}-attribution-corpus-fields`,
				task: "corpus.license",
				severity: "info",
				message:
					"The pinned detailed sentence export preserves owner and timestamp fields for attribution-aware downstream use.",
				metadata: {
					licenseExpression: metadata.licenseExpression,
				},
			},
		],
		metrics: [
			{
				metricId: "sentence-row-count",
				name: "sentenceRowCount",
				value: materialized.accepted,
				unit: "rows",
			},
			{
				metricId: "rejected-row-count",
				name: "rejectedRowCount",
				value: materialized.rejected,
				unit: "rows",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		outputFor(
			resourceSpec,
			sentenceResourceId,
			materialized.text,
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-corpus-canonical`,
			stableJson(corpusResource),
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-corpus-quality`,
			stableJson(summary),
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-corpus-quality-profile`,
			stableJson(qualityProfile),
		),
	];
}

function transformTatoebaEnglishCorpusArtifact(resourceSpec, inputs) {
	return transformTatoebaCorpusArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-en-artifacts.json",
		languageName: "English",
		languageTag: "en",
		script: "Latn",
		resourcePrefix: "en",
		corpusId: "tatoeba-en-2026-06-06",
		documentId: "tatoeba-eng-sentences-detailed-2026-06-06",
	});
}

function transformTatoebaArabicCorpusArtifact(resourceSpec, inputs) {
	return transformTatoebaCorpusArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-ar-artifacts.json",
		languageName: "Arabic",
		languageTag: "ar",
		script: "Arab",
		resourcePrefix: "ar",
		corpusId: "tatoeba-ar-2026-06-06",
		documentId: "tatoeba-ara-sentences-detailed-2026-06-06",
	});
}

function transformTatoebaFrenchCorpusArtifact(resourceSpec, inputs) {
	return transformTatoebaCorpusArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-fr-artifacts.json",
		languageName: "French",
		languageTag: "fr",
		script: "Latn",
		resourcePrefix: "fr",
		corpusId: "tatoeba-fr-2026-06-06",
		documentId: "tatoeba-fra-sentences-detailed-2026-06-06",
	});
}

function parallelResourceIdForTatoebaTarget(sourcePrefix, targetCode) {
	return `${sourcePrefix}-tatoeba-parallel-${targetCode}`;
}

function transformTatoebaParallelArtifact(resourceSpec, inputs, config) {
	const metadata = tatoebaMetadata(resourceSpec, inputs, config.metadataFile);
	const linkArtifacts = metadata.exports
		.filter((artifact) => artifact.role === "parallel-links")
		.sort((left, right) =>
			left.targetTatoebaLanguageCode.localeCompare(
				right.targetTatoebaLanguageCode,
			),
		);
	expect(
		linkArtifacts.length > 0,
		`${resourceSpec.resourceSpecId} missing Tatoeba ${config.languageName} parallel link metadata.`,
	);
	const allLinksMaterialized = linkArtifacts.every((artifact) =>
		hasInputPath(inputs, artifact.fileName),
	);
	const outputs = linkArtifacts.map((artifact) => {
		if (!hasInputPath(inputs, artifact.fileName)) {
			const descriptor = tatoebaArtifactDescriptor(
				artifact,
				resourceSpec.sourceIds,
			);
			const resource = {
				schemaVersion: "1",
				kind: "alignment-table",
				parallelId: `tatoeba-${config.resourcePrefix}-${artifact.targetLanguageTag}-2026-06-06`,
				languagePair: {
					sourceLanguage: config.languageTag,
					targetLanguage: artifact.targetLanguageTag,
					sourceScript: config.script,
					targetScript: scriptForLanguageTag(artifact.targetLanguageTag),
				},
				units: [
					{
						unitId: `${artifact.sourceTatoebaLanguageCode}-${artifact.targetTatoebaLanguageCode}-links-2026-06-06`,
						metadata: {
							sourceId: metadata.sourceId,
							artifactId: artifact.artifactId,
							path: artifact.expectedPath,
							checksum: checksumValue(artifact),
							rowCount: artifact.rowCount,
							lastModified: artifact.lastModified,
							etag: artifact.etag,
							licenseExpression: metadata.licenseExpression,
							artifactDescriptor: descriptor,
						},
					},
				],
			};
			return outputFor(
				resourceSpec,
				parallelResourceIdForTatoebaTarget(
					config.resourcePrefix,
					artifact.targetTatoebaLanguageCode,
				),
				stableJson(resource),
			);
		}
		const materialized = canonicalTatoebaParallelTsv(
			readBzip2Input(inputs, artifact.fileName, resourceSpec),
			artifact,
			config,
		);
		expect(
			materialized.accepted === artifact.rowCount,
			`${resourceSpec.resourceSpecId} materialized ${materialized.accepted} ${config.languageName}-${artifact.targetLanguageTag} Tatoeba parallel rows, expected ${artifact.rowCount}.`,
		);
		return outputFor(
			resourceSpec,
			parallelResourceIdForTatoebaTarget(
				config.resourcePrefix,
				artifact.targetTatoebaLanguageCode,
			),
			materialized.text,
		);
	});
	const totalRowCount = linkArtifacts.reduce(
		(total, artifact) => total + artifact.rowCount,
		0,
	);
	const totalArtifactBytes = linkArtifacts.reduce(
		(total, artifact) => total + artifact.sizeBytes,
		0,
	);
	const summary = {
		schemaVersion: "1",
		sourceId: metadata.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		version: metadata.version,
		languagePairCount: linkArtifacts.length,
		totalLinkRowCount: totalRowCount,
		totalArtifactBytes,
		artifactIds: linkArtifacts.map((artifact) => artifact.artifactId),
		languagePairs: linkArtifacts.map((artifact) => ({
			sourceLanguageTag: artifact.sourceLanguageTag,
			targetLanguageTag: artifact.targetLanguageTag,
			sourceTatoebaLanguageCode: artifact.sourceTatoebaLanguageCode,
			targetTatoebaLanguageCode: artifact.targetTatoebaLanguageCode,
			rowCount: artifact.rowCount,
			sizeBytes: artifact.sizeBytes,
			sha256Checksum: checksumValue(artifact),
			...(allLinksMaterialized
				? {
						localResourceId: parallelResourceIdForTatoebaTarget(
							config.resourcePrefix,
							artifact.targetTatoebaLanguageCode,
						),
					}
				: {}),
		})),
		recordsAccepted: allLinksMaterialized ? totalRowCount : linkArtifacts.length,
		recordsRejected: 0,
		warnings: allLinksMaterialized
			? [
					"Link artifacts provide sentence-id alignment tables; sentence text must be resolved from compatible Tatoeba sentence exports.",
				]
			: [
					`Tatoeba ${config.languageName} parallel links are artifact-backed and must be fetched explicitly; they are not vendored in the npm package.`,
					"Link artifacts provide sentence-id alignment tables; sentence text must be resolved from compatible Tatoeba sentence exports.",
				],
	};
	const qualityProfile = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: allLinksMaterialized
			? `tatoeba-${config.resourcePrefix}-parallel-materialized-quality`
			: `tatoeba-${config.resourcePrefix}-parallel-artifact-quality`,
		languageTag: config.languageTag,
		script: config.script,
		diagnostics: [
			{
				diagnosticId: allLinksMaterialized
					? `tatoeba-${config.resourcePrefix}-local-parallel-rows`
					: `tatoeba-${config.resourcePrefix}-explicit-parallel-artifact-fetch`,
				task: allLinksMaterialized
					? "parallel.materialization"
					: "parallel.artifact",
				severity: "info",
				message: allLinksMaterialized
					? `Tatoeba ${config.languageName} parallel alignments are materialized as local canonical TSV rows.`
					: `Tatoeba ${config.languageName} parallel alignments are exposed as explicit artifact descriptors; local alignment rows have not been materialized yet.`,
				metadata: {
					artifactIds: linkArtifacts.map((artifact) => artifact.artifactId),
					...(allLinksMaterialized
						? {
								resourceIds: linkArtifacts.map((artifact) =>
									parallelResourceIdForTatoebaTarget(
										config.resourcePrefix,
										artifact.targetTatoebaLanguageCode,
									),
								),
							}
						: { artifactPolicy: "fetch-explicit" }),
				},
			},
		],
		metrics: [
			{
				metricId: "language-pair-count",
				name: "languagePairCount",
				value: linkArtifacts.length,
				unit: "pairs",
			},
			{
				metricId: "parallel-link-row-count",
				name: "parallelLinkRowCount",
				value: totalRowCount,
				unit: "rows",
			},
			{
				metricId: "artifact-size-bytes",
				name: "artifactSizeBytes",
				value: totalArtifactBytes,
				unit: "bytes",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};
	return [
		...outputs,
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-parallel-quality`,
			stableJson(summary),
		),
		outputFor(
			resourceSpec,
			`${config.resourcePrefix}-tatoeba-parallel-quality-profile`,
			stableJson(qualityProfile),
		),
	];
}

function transformTatoebaEnglishParallelArtifact(resourceSpec, inputs) {
	return transformTatoebaParallelArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-en-artifacts.json",
		languageName: "English",
		languageTag: "en",
		script: "Latn",
		resourcePrefix: "en",
	});
}

function transformTatoebaArabicParallelArtifact(resourceSpec, inputs) {
	return transformTatoebaParallelArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-ar-artifacts.json",
		languageName: "Arabic",
		languageTag: "ar",
		script: "Arab",
		resourcePrefix: "ar",
	});
}

function transformTatoebaFrenchParallelArtifact(resourceSpec, inputs) {
	return transformTatoebaParallelArtifact(resourceSpec, inputs, {
		metadataFile: "tatoeba-fr-artifacts.json",
		languageName: "French",
		languageTag: "fr",
		script: "Latn",
		resourcePrefix: "fr",
	});
}

function transformOpenEnglishWordnetLexicon(resourceSpec, inputs) {
	const xml = requiredInput(
		inputs,
		"english-wordnet-2025.xml.gz",
		resourceSpec,
	);
	const lexicalEntryRows = [];
	const lexicalPosCounts = new Map();

	for (const match of xml.matchAll(
		/<LexicalEntry\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/LexicalEntry>/gu,
	)) {
		const entryId = xmlDecode(match[1]);
		const body = match[2];
		const lemmaMatch = body.match(/<Lemma\b([^>]*)\/>/u);
		const lemmaAttrs = lemmaMatch === null ? {} : xmlAttributes(lemmaMatch[1]);
		const lemma = lemmaAttrs.writtenForm ?? "";
		const partOfSpeech = lemmaAttrs.partOfSpeech ?? "";
		if (entryId.length === 0 || lemma.length === 0) continue;
		lexicalEntryRows.push([entryId, lemma, partOfSpeech]);
		incrementCount(lexicalPosCounts, partOfSpeech);
	}

	lexicalEntryRows.sort((left, right) => left[0].localeCompare(right[0]));

	const summary = {
		schemaVersion: "1",
		sourceId: "source:wordnet:open-english-2025",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		lexicalEntryCount: lexicalEntryRows.length,
		lexicalEntriesByPartOfSpeech: Object.fromEntries(
			sortedCountRows(lexicalPosCounts),
		),
		recordsAccepted: lexicalEntryRows.length,
		recordsRejected: 0,
		warnings: [],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "en-wordnet-lexicon",
		languageTag: "en",
		script: "Latn",
		entryCount: lexicalEntryRows.length,
		resourceRefs: [
			{
				resourceId: "en-wordnet-lexical-entries",
				role: "entries",
				recordCount: lexicalEntryRows.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-wordnet-lexicon-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-wordnet-lexicon-transform-warnings",
				task: "lexicon.transform",
				severity: "info",
				message:
					"Open English WordNet lexical-entry transform completed without rejected records.",
				metadata: {
					warningCount: summary.warnings.length,
				},
			},
		],
		metrics: [
			{
				metricId: "lexical-entry-count",
				name: "lexicalEntryCount",
				value: lexicalEntryRows.length,
				unit: "records",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-wordnet-lexical-entries",
			tsvFile(["entryId", "lemma", "partOfSpeech"], lexicalEntryRows),
		),
		outputFor(
			resourceSpec,
			"en-wordnet-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(resourceSpec, "en-wordnet-lexicon-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"en-wordnet-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

const esdbDefaultProfiles = [
	{
		profileId: "en_AU",
		languageTag: "en-AU",
		region: "AU",
		spelling: "Australian",
		sourceFile: "en_AU.txt",
	},
	{
		profileId: "en_CA",
		languageTag: "en-CA",
		region: "CA",
		spelling: "Canadian",
		sourceFile: "en_CA.txt",
	},
	{
		profileId: "en_GB_ise",
		languageTag: "en-GB",
		region: "GB",
		spelling: "British -ise",
		sourceFile: "en_GB-ise.txt",
	},
	{
		profileId: "en_GB_ize",
		languageTag: "en-GB",
		region: "GB",
		spelling: "British -ize",
		sourceFile: "en_GB-ize.txt",
	},
	{
		profileId: "en_US",
		languageTag: "en-US",
		region: "US",
		spelling: "American",
		sourceFile: "en_US.txt",
	},
];

function parseWordlist(text) {
	const words = [];
	const seen = new Set();
	let rejected = 0;
	let duplicateCount = 0;
	for (const line of text.split(/\r?\n/u)) {
		const word = line.trim();
		if (word.length === 0) continue;
		if (word.includes("\t")) {
			rejected += 1;
			continue;
		}
		if (seen.has(word)) {
			duplicateCount += 1;
			continue;
		}
		seen.add(word);
		words.push(word);
	}
	words.sort((left, right) => left.localeCompare(right));
	return { words, rejected, duplicateCount };
}

function transformEsdbWordlistDiff(resourceSpec, inputs) {
	const profileRows = [];
	const wordRows = [];
	const profileWordSets = [];
	const wordCountsByProfile = {};
	let recordsRejected = 0;
	let duplicateWithinProfileCount = 0;
	const uniqueWords = new Set();

	for (const profile of esdbDefaultProfiles) {
		const text = requiredInput(inputs, profile.sourceFile, resourceSpec);
		const parsed = parseWordlist(text);
		recordsRejected += parsed.rejected;
		duplicateWithinProfileCount += parsed.duplicateCount;
		const wordSet = new Set(parsed.words);
		profileWordSets.push(wordSet);
		wordCountsByProfile[profile.profileId] = parsed.words.length;
		profileRows.push([
			profile.profileId,
			profile.languageTag,
			profile.region,
			profile.spelling,
			profile.sourceFile,
			parsed.words.length,
		]);
		for (const word of parsed.words) {
			uniqueWords.add(word);
			wordRows.push([
				profile.profileId,
				profile.languageTag,
				profile.region,
				profile.spelling,
				word,
			]);
		}
	}

	wordRows.sort((left, right) => {
		const profileDelta = left[0].localeCompare(right[0]);
		if (profileDelta !== 0) return profileDelta;
		return left[4].localeCompare(right[4]);
	});
	profileRows.sort((left, right) => left[0].localeCompare(right[0]));

	let sharedWordCount = 0;
	for (const word of uniqueWords) {
		if (profileWordSets.every((wordSet) => wordSet.has(word))) {
			sharedWordCount += 1;
		}
	}

	const summary = {
		schemaVersion: "1",
		sourceId: "source:esdb:wordlist-diff-en-default-2026-02-25",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		release: "rel-2026.02.25",
		profileCount: esdbDefaultProfiles.length,
		totalWordRows: wordRows.length,
		uniqueWordCount: uniqueWords.size,
		sharedWordCount,
		wordCountsByProfile: sortJson(wordCountsByProfile),
		duplicateWithinProfileCount,
		recordsAccepted: wordRows.length,
		recordsRejected,
		warnings: [
			"Generated wordlist outputs are spell-checker dictionaries, not a complete English lexical database.",
			"ESDB database internals are intentionally not used because the upstream schema is still unstable.",
		],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "en-esdb-default-wordlists",
		languageTag: "en",
		script: "Latn",
		entryCount: uniqueWords.size,
		resourceRefs: [
			{
				resourceId: "en-esdb-default-wordlists",
				role: "forms",
				recordCount: wordRows.length,
			},
			{
				resourceId: "en-esdb-default-profiles",
				role: "entries",
				recordCount: profileRows.length,
			},
		],
	};
	const canonicalSearchProfile = {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "en-esdb-default-wordlist-analyzer",
		languageTag: "en",
		script: "Latn",
		tokenizer: {
			componentId: "unicode-word",
			type: "unicode-word-boundary",
			mode: "default",
		},
		charFilters: [
			{
				componentId: "apostrophe-preserve",
				type: "character-policy",
				mode: "preserve-apostrophes",
				options: {
					characters: ["'", "’"],
				},
			},
		],
		tokenFilters: [
			{
				componentId: "unicode-simple-casefold",
				type: "casefold",
				mode: "unicode-simple",
			},
			{
				componentId: "esdb-default-wordlist-filter",
				type: "wordlist-membership",
				mode: "regional-default",
				options: {
					profiles: esdbDefaultProfiles.map((profile) => profile.profileId),
				},
			},
		],
		resources: [
			{
				resourceId: "en-esdb-default-wordlists",
				role: "lexicon",
			},
		],
		fields: [
			{
				fieldName: "text",
				analyzerRole: "index",
			},
			{
				fieldName: "text",
				analyzerRole: "query",
			},
			{
				fieldName: "text",
				analyzerRole: "suggest",
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-esdb-default-wordlist-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-esdb-source-scope",
				task: "lexicon.transform",
				severity: "info",
				message:
					"ESDB generated default wordlists provide spelling forms by regional profile, not full lexical semantics or inflection metadata.",
				metadata: {
					release: summary.release,
				},
			},
		],
		metrics: [
			{
				metricId: "profile-count",
				name: "profileCount",
				value: summary.profileCount,
				unit: "profiles",
			},
			{
				metricId: "total-word-rows",
				name: "totalWordRows",
				value: summary.totalWordRows,
				unit: "rows",
			},
			{
				metricId: "unique-word-count",
				name: "uniqueWordCount",
				value: summary.uniqueWordCount,
				unit: "words",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: summary.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-esdb-default-wordlists",
			tsvFile(
				["profileId", "languageTag", "region", "spelling", "word"],
				wordRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-esdb-default-profiles",
			tsvFile(
				[
					"profileId",
					"languageTag",
					"region",
					"spelling",
					"sourceFile",
					"wordCount",
				],
				profileRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-esdb-wordlist-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(
			resourceSpec,
			"en-esdb-wordlist-search-profile",
			stableJson(canonicalSearchProfile),
		),
		outputFor(resourceSpec, "en-esdb-wordlist-quality", stableJson(summary)),
		outputFor(
			resourceSpec,
			"en-esdb-wordlist-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function splitScowlLine(line) {
	const firstSeparator = line.indexOf(": ");
	if (firstSeparator === -1) return undefined;
	const scowlInfo = line.slice(0, firstSeparator).trim();
	let rest = line.slice(firstSeparator + 2).trim();
	const secondSeparator = rest.indexOf(": ");
	if (secondSeparator !== -1) {
		const candidate = rest.slice(0, secondSeparator).trim();
		if (!candidate.includes("<")) {
			rest = rest.slice(secondSeparator + 2).trim();
		}
	}
	const formSeparator = rest.indexOf(": ");
	if (formSeparator === -1) {
		return { scowlInfo, lemmaInfo: rest, formsText: "" };
	}
	return {
		scowlInfo,
		lemmaInfo: rest.slice(0, formSeparator).trim(),
		formsText: rest.slice(formSeparator + 2).trim(),
	};
}

function parseScowlInfo(scowlInfo) {
	const sizeMatch = scowlInfo.match(/^([0-9]+)/u);
	return {
		size: sizeMatch === null ? "" : sizeMatch[1],
		tags: [...scowlInfo.matchAll(/\[([^\]]+)\]/gu)]
			.map((match) => match[1])
			.sort((left, right) => left.localeCompare(right))
			.join(" "),
	};
}

function parseScowlLemmaInfo(lemmaInfo, fallbackLemma) {
	const match = lemmaInfo.match(
		/^(.*?)\s*<([^>]*)>(?:\s*\{([^}]*)\})?(?:\s*\(([^)]*)\))?\s*$/u,
	);
	const rawLemma = (match?.[1] ?? lemmaInfo)
		.replace(/†/gu, "")
		.replace(/^!/u, "")
		.trim();
	const lemma =
		rawLemma === "-" && fallbackLemma.length > 0 ? fallbackLemma : rawLemma;
	const posSpec = match?.[2]?.trim() ?? "";
	const slashIndex = posSpec.indexOf("/");
	const partOfSpeech =
		(slashIndex === -1 ? posSpec : posSpec.slice(0, slashIndex)).trim() ||
		"unclassified";
	const posClass =
		slashIndex === -1 ? "" : posSpec.slice(slashIndex + 1).trim();
	return {
		lemma,
		partOfSpeech,
		posClass,
	};
}

function cleanScowlFormAlternative(value) {
	let form = value
		.trim()
		.replace(/^\(/u, "")
		.replace(/\)$/u, "")
		.replace(/†/gu, "")
		.trim();
	const variantSeparator = form.indexOf(": ");
	if (variantSeparator !== -1) {
		form = form.slice(variantSeparator + 2).trim();
	}
	form = form.replace(/-$/u, "").trim();
	if (form.length === 0 || form === "-") return undefined;
	return form;
}

function parseScowlDerivedForms(formsText) {
	const forms = [];
	for (const token of formsText.split(",")) {
		for (const alternative of token.split(/\s+\|\s+/u)) {
			const form = cleanScowlFormAlternative(alternative);
			if (form !== undefined) forms.push(form);
		}
	}
	return sorted(new Set(forms));
}

function transformScowlV2Inflection(resourceSpec, inputs) {
	const text = requiredInput(inputs, "scowl.txt", resourceSpec);
	const entryRows = [];
	const posCounts = new Map();
	const lemmaSet = new Set();
	const formSet = new Set();
	let groupIndex = 0;
	let inGroup = false;
	let groupLemma = "";
	let sourceLineNumber = 0;
	let parsedLineCount = 0;
	let derivedFormCount = 0;
	let recordsRejected = 0;

	function addEntry({
		scowlInfo,
		size,
		tags,
		lemma,
		form,
		formRole,
		partOfSpeech,
		posClass,
		rawDerivedForm,
	}) {
		const entryId = `scowl-v2-${String(entryRows.length + 1).padStart(7, "0")}`;
		entryRows.push([
			entryId,
			groupIndex,
			sourceLineNumber,
			size,
			tags,
			scowlInfo,
			lemma,
			form,
			formRole,
			partOfSpeech,
			posClass,
			rawDerivedForm,
		]);
		incrementCount(posCounts, `${partOfSpeech}\t${posClass}\t${formRole}`);
		lemmaSet.add(lemma);
		formSet.add(form);
	}

	for (const line of text.split(/\r?\n/u)) {
		sourceLineNumber += 1;
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (inGroup) groupIndex += 1;
			inGroup = false;
			groupLemma = "";
			continue;
		}
		if (trimmed.startsWith("#")) continue;
		const record = splitScowlLine(trimmed);
		if (record === undefined) {
			recordsRejected += 1;
			continue;
		}
		const { size, tags } = parseScowlInfo(record.scowlInfo);
		const parsedLemma = parseScowlLemmaInfo(record.lemmaInfo, groupLemma);
		if (parsedLemma.lemma.length === 0 || size.length === 0) {
			recordsRejected += 1;
			continue;
		}
		inGroup = true;
		parsedLineCount += 1;
		if (!record.lemmaInfo.trim().startsWith("-")) groupLemma = parsedLemma.lemma;
		addEntry({
			scowlInfo: record.scowlInfo,
			size,
			tags,
			lemma: parsedLemma.lemma,
			form: parsedLemma.lemma,
			formRole: "lemma",
			partOfSpeech: parsedLemma.partOfSpeech,
			posClass: parsedLemma.posClass,
			rawDerivedForm: "",
		});
		for (const derivedForm of parseScowlDerivedForms(record.formsText)) {
			derivedFormCount += 1;
			addEntry({
				scowlInfo: record.scowlInfo,
				size,
				tags,
				lemma: parsedLemma.lemma,
				form: derivedForm,
				formRole: "derived",
				partOfSpeech: parsedLemma.partOfSpeech,
				posClass: parsedLemma.posClass,
				rawDerivedForm: derivedForm,
			});
		}
	}

	entryRows.sort((left, right) => {
		const lemmaDelta = left[6].localeCompare(right[6]);
		if (lemmaDelta !== 0) return lemmaDelta;
		const formDelta = left[7].localeCompare(right[7]);
		if (formDelta !== 0) return formDelta;
		return String(left[0]).localeCompare(String(right[0]));
	});
	const analyzerRows = entryRows
		.map((row) => [
			row[7],
			row[6],
			row[9],
			row[10],
			row[8],
			row[3],
			row[4],
			row[0],
		])
		.sort((left, right) => {
			const formDelta = left[0].localeCompare(right[0]);
			if (formDelta !== 0) return formDelta;
			const lemmaDelta = left[1].localeCompare(right[1]);
			if (lemmaDelta !== 0) return lemmaDelta;
			const posDelta = left[2].localeCompare(right[2]);
			if (posDelta !== 0) return posDelta;
			return left[7].localeCompare(right[7]);
		});
	const generatorRows = entryRows
		.map((row) => [
			row[6],
			row[7],
			row[9],
			row[10],
			row[8],
			row[3],
			row[4],
			row[0],
		])
		.sort((left, right) => {
			const lemmaDelta = left[0].localeCompare(right[0]);
			if (lemmaDelta !== 0) return lemmaDelta;
			const formDelta = left[1].localeCompare(right[1]);
			if (formDelta !== 0) return formDelta;
			const posDelta = left[2].localeCompare(right[2]);
			if (posDelta !== 0) return posDelta;
			return left[7].localeCompare(right[7]);
		});
	const posRows = sortedCountRows(posCounts).map(([key, count]) => [
		...key.split("\t"),
		count,
	]);
	const partOfSpeechValues = uniqueSorted(
		posRows.map(([partOfSpeech]) => partOfSpeech),
	);
	const posClassValues = uniqueSorted(
		posRows.map(([, posClass]) => posClass).filter((value) => value.length > 0),
	);
	const quality = {
		schemaVersion: "1",
		sourceId: "source:scowl:v2-rel-2026-02-25",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		release: "rel-2026.02.25",
		parsedLineCount,
		groupCount: groupIndex + (inGroup ? 1 : 0),
		lemmaRecordCount: parsedLineCount,
		uniqueLemmaCount: lemmaSet.size,
		uniqueFormCount: formSet.size,
		derivedFormCount,
		inflectionRowCount: entryRows.length,
		lookupAnalyzerRowCount: analyzerRows.length,
		lookupGeneratorRowCount: generatorRows.length,
		posInventoryCount: posRows.length,
		recordsAccepted: entryRows.length,
		recordsRejected,
		warnings: [
			"SCOWLv2 scowl.txt is a pinned release text export; this package does not claim stable upstream database-schema coverage.",
			"Generated lookup analyzer and generator indexes preserve SCOWLv2 source-release scope and do not claim finite-state or context-disambiguating morphology.",
		],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "en-scowl-v2-inflection-lexicon",
		languageTag: "en",
		script: "Latn",
		entryCount: formSet.size,
		resourceRefs: [
			{
				resourceId: "en-scowl-inflection-entries",
				role: "forms",
				recordCount: entryRows.length,
			},
			{
				resourceId: "en-scowl-pos-inventory",
				role: "entries",
				recordCount: posRows.length,
			},
		],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "en-scowl-v2-inflection",
		languageTag: "en",
		script: "Latn",
		resourceRefs: [
			{
				resourceId: "en-scowl-inflection-entries",
				role: "paradigm-table",
				recordCount: entryRows.length,
			},
			{
				resourceId: "en-scowl-lookup-analyzer",
				role: "analyzer",
				recordCount: analyzerRows.length,
			},
			{
				resourceId: "en-scowl-lookup-generator",
				role: "generator",
				recordCount: generatorRows.length,
			},
			{
				resourceId: "en-scowl-pos-inventory",
				role: "feature-inventory",
				recordCount: posRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "en-scowl-v2-lookup-analyzer",
				type: "lookup",
				resourceIds: [
					"en-scowl-lookup-analyzer",
					"en-scowl-lookup-generator",
					"en-scowl-pos-inventory",
				],
				coverage: {
					lookupAnalyzerRowCount: analyzerRows.length,
					lookupGeneratorRowCount: generatorRows.length,
					uniqueLemmaCount: lemmaSet.size,
					uniqueFormCount: formSet.size,
					derivedFormCount,
				},
			},
		],
		featureInventory: [
			{
				feature: "partOfSpeech",
				values: partOfSpeechValues,
				count: partOfSpeechValues.length,
			},
			{
				feature: "posClass",
				values: posClassValues,
				count: posClassValues.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "en-scowl-v2-inflection-quality",
		languageTag: "en",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "en-scowl-v2-source-scope",
				task: "morphology.transform",
				severity: "info",
				message:
					"SCOWLv2 resources provide pinned lookup analyzer and generator indexes over source POS and inflection rows.",
				metadata: {
					release: quality.release,
				},
			},
		],
		metrics: [
			{
				metricId: "unique-lemma-count",
				name: "uniqueLemmaCount",
				value: quality.uniqueLemmaCount,
				unit: "lemmas",
			},
			{
				metricId: "unique-form-count",
				name: "uniqueFormCount",
				value: quality.uniqueFormCount,
				unit: "forms",
			},
			{
				metricId: "derived-form-count",
				name: "derivedFormCount",
				value: quality.derivedFormCount,
				unit: "forms",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"en-scowl-inflection-entries",
			tsvFile(
				[
					"entryId",
					"groupIndex",
					"sourceLineNumber",
					"scowlSize",
					"tags",
					"scowlInfo",
					"lemma",
					"form",
					"formRole",
					"partOfSpeech",
					"posClass",
					"rawDerivedForm",
				],
				entryRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-scowl-lookup-analyzer",
			tsvFile(
				[
					"form",
					"lemma",
					"partOfSpeech",
					"posClass",
					"formRole",
					"scowlSize",
					"tags",
					"entryId",
				],
				analyzerRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-scowl-lookup-generator",
			tsvFile(
				[
					"lemma",
					"form",
					"partOfSpeech",
					"posClass",
					"formRole",
					"scowlSize",
					"tags",
					"entryId",
				],
				generatorRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-scowl-pos-inventory",
			tsvFile(
				["partOfSpeech", "posClass", "formRole", "count"],
				posRows,
			),
		),
		outputFor(
			resourceSpec,
			"en-scowl-inflection-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(
			resourceSpec,
			"en-scowl-inflection-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(resourceSpec, "en-scowl-inflection-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"en-scowl-inflection-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function transformFrenchUnimorph(resourceSpec, inputs) {
	const text = requiredInput(inputs, "fra", resourceSpec);
	const entryRows = [];
	const analyzerRows = [];
	const generatorRows = [];
	const featureCounts = new Map();
	const posCounts = new Map();
	const lemmaSet = new Set();
	const formSet = new Set();
	let sourceLineNumber = 0;
	let recordsRejected = 0;

	for (const line of text.split(/\r?\n/u)) {
		sourceLineNumber += 1;
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
		const columns = trimmed.split("\t");
		if (columns.length < 3) {
			recordsRejected += 1;
			continue;
		}
		const [lemma = "", form = "", featureBundle = ""] = columns.map((value) =>
			value.trim(),
		);
		if (
			lemma.length === 0 ||
			form.length === 0 ||
			featureBundle.length === 0
		) {
			recordsRejected += 1;
			continue;
		}
		const features = featureBundle
			.split(";")
			.map((feature) => feature.trim())
			.filter((feature) => feature.length > 0);
		const partOfSpeech = features[0] ?? "unclassified";
		const entryId = `unimorph-fra-${String(entryRows.length + 1).padStart(7, "0")}`;
		entryRows.push([
			entryId,
			sourceLineNumber,
			lemma,
			form,
			partOfSpeech,
			featureBundle,
			features.length,
		]);
		analyzerRows.push([form, lemma, partOfSpeech, featureBundle, entryId]);
		generatorRows.push([lemma, form, partOfSpeech, featureBundle, entryId]);
		lemmaSet.add(lemma);
		formSet.add(form);
		incrementCount(posCounts, partOfSpeech);
		for (const feature of features) incrementCount(featureCounts, feature);
	}

	entryRows.sort((left, right) => {
		const lemmaDelta = left[2].localeCompare(right[2]);
		if (lemmaDelta !== 0) return lemmaDelta;
		const formDelta = left[3].localeCompare(right[3]);
		if (formDelta !== 0) return formDelta;
		const featureDelta = left[5].localeCompare(right[5]);
		return featureDelta !== 0 ? featureDelta : left[0].localeCompare(right[0]);
	});
	analyzerRows.sort((left, right) => {
		const formDelta = left[0].localeCompare(right[0]);
		if (formDelta !== 0) return formDelta;
		const lemmaDelta = left[1].localeCompare(right[1]);
		if (lemmaDelta !== 0) return lemmaDelta;
		return left[3].localeCompare(right[3]);
	});
	generatorRows.sort((left, right) => {
		const lemmaDelta = left[0].localeCompare(right[0]);
		if (lemmaDelta !== 0) return lemmaDelta;
		const formDelta = left[1].localeCompare(right[1]);
		if (formDelta !== 0) return formDelta;
		return left[3].localeCompare(right[3]);
	});
	const featureRows = sortedCountRows(featureCounts);
	const posRows = sortedCountRows(posCounts);
	const quality = {
		schemaVersion: "1",
		sourceId: "source:unimorph:french-master-f672f8c",
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		commit: "f672f8cceb2d5f5a1e2241b5622c8845f8274635",
		entryCount: entryRows.length,
		lookupAnalyzerRowCount: analyzerRows.length,
		lookupGeneratorRowCount: generatorRows.length,
		uniqueLemmaCount: lemmaSet.size,
		uniqueFormCount: formSet.size,
		featureValueCount: featureRows.length,
		partOfSpeechCount: posRows.length,
		recordsAccepted: entryRows.length,
		recordsRejected,
		warnings: [
			"UniMorph French is CC-BY-SA-3.0 and this generated package is share-alike isolated.",
			"UniMorph feature bundles are emitted as source feature tags; this package does not claim context-disambiguating morphology.",
		],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "fr-unimorph-f672f8c",
		languageTag: "fr",
		script: "Latn",
		resourceRefs: [
			{
				resourceId: "fr-unimorph-paradigms",
				role: "paradigm-table",
				recordCount: entryRows.length,
			},
			{
				resourceId: "fr-unimorph-lookup-analyzer",
				role: "analyzer",
				recordCount: analyzerRows.length,
			},
			{
				resourceId: "fr-unimorph-lookup-generator",
				role: "generator",
				recordCount: generatorRows.length,
			},
			{
				resourceId: "fr-unimorph-feature-inventory",
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "fr-unimorph-f672f8c-lookup-analyzer",
				type: "paradigm-table",
				resourceIds: [
					"fr-unimorph-paradigms",
					"fr-unimorph-lookup-analyzer",
					"fr-unimorph-lookup-generator",
					"fr-unimorph-feature-inventory",
				],
				coverage: {
					entryCount: entryRows.length,
					uniqueLemmaCount: lemmaSet.size,
					uniqueFormCount: formSet.size,
					featureValueCount: featureRows.length,
				},
			},
		],
		featureInventory: [
			{
				feature: "unimorphFeature",
				values: featureRows.map(([feature]) => feature),
				count: featureRows.length,
			},
			{
				feature: "partOfSpeech",
				values: posRows.map(([partOfSpeech]) => partOfSpeech),
				count: posRows.length,
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "fr-unimorph-f672f8c-quality",
		languageTag: "fr",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "fr-unimorph-share-alike-isolation",
				task: "license.boundary",
				severity: "info",
				message:
					"UniMorph French resources are generated only in an explicit share-alike isolated package.",
				metadata: {
					sourceId: quality.sourceId,
					license: "CC-BY-SA-3.0",
				},
			},
		],
		metrics: [
			{
				metricId: "entry-count",
				name: "entryCount",
				value: quality.entryCount,
				unit: "entries",
			},
			{
				metricId: "unique-lemma-count",
				name: "uniqueLemmaCount",
				value: quality.uniqueLemmaCount,
				unit: "lemmas",
			},
			{
				metricId: "unique-form-count",
				name: "uniqueFormCount",
				value: quality.uniqueFormCount,
				unit: "forms",
			},
			{
				metricId: "feature-value-count",
				name: "featureValueCount",
				value: quality.featureValueCount,
				unit: "features",
			},
			{
				metricId: "records-rejected",
				name: "recordsRejected",
				value: quality.recordsRejected,
				unit: "records",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"fr-unimorph-paradigms",
			tsvFile(
				[
					"entryId",
					"sourceLineNumber",
					"lemma",
					"form",
					"partOfSpeech",
					"featureBundle",
					"featureCount",
				],
				entryRows,
			),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-lookup-analyzer",
			tsvFile(
				["form", "lemma", "partOfSpeech", "featureBundle", "entryId"],
				analyzerRows,
			),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-lookup-generator",
			tsvFile(
				["lemma", "form", "partOfSpeech", "featureBundle", "entryId"],
				generatorRows,
			),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-feature-inventory",
			tsvFile(["feature", "count"], featureRows),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-pos-inventory",
			tsvFile(["partOfSpeech", "count"], posRows),
		),
		outputFor(
			resourceSpec,
			"fr-unimorph-morphology-canonical",
			stableJson(canonicalMorphology),
		),
		outputFor(resourceSpec, "fr-unimorph-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"fr-unimorph-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function lexiqueNumber(value) {
	if (value === undefined || value.trim().length === 0) return "";
	const parsed = Number.parseFloat(value.replace(",", "."));
	return Number.isFinite(parsed) ? parsed : "";
}

function lexiqueCell(cells, columnIndex, columnName) {
	const index = columnIndex.get(columnName);
	return index === undefined ? "" : (cells[index] ?? "").trim();
}

function transformFrenchLexique383(resourceSpec, inputs) {
	const text = requiredInput(inputs, "Lexique383.tsv", resourceSpec).replace(
		/^\uFEFF/u,
		"",
	);
	const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
	expect(lines.length > 1, `${resourceSpec.resourceSpecId} has no Lexique rows.`);
	const header = lines[0].split("\t");
	const columnIndex = new Map(header.map((column, index) => [column, index]));
	for (const requiredColumn of ["ortho", "lemme", "cgram", "genre", "nombre"]) {
		expect(
			columnIndex.has(requiredColumn),
			`${resourceSpec.resourceSpecId} missing Lexique column ${requiredColumn}.`,
		);
	}

	const entryRows = [];
	const lemmaForms = new Map();
	const posCounts = new Map();
	const genderCounts = new Map();
	const numberCounts = new Map();
	const uniqueForms = new Set();
	const uniqueLemmas = new Set();
	let recordsRejected = 0;
	let inflectedVerbRowCount = 0;

	for (const line of lines.slice(1)) {
		const cells = line.split("\t");
		if (cells.length < header.length) {
			recordsRejected += 1;
			continue;
		}
		const form = lexiqueCell(cells, columnIndex, "ortho");
		const lemma = lexiqueCell(cells, columnIndex, "lemme") || form;
		const partOfSpeech = lexiqueCell(cells, columnIndex, "cgram");
		if (form.length === 0 || lemma.length === 0 || partOfSpeech.length === 0) {
			recordsRejected += 1;
			continue;
		}
		const gender = lexiqueCell(cells, columnIndex, "genre");
		const number = lexiqueCell(cells, columnIndex, "nombre");
		const inflectionInfo = lexiqueCell(cells, columnIndex, "infover");
		const entryId = `lexique-383-${String(entryRows.length + 1).padStart(6, "0")}`;
		entryRows.push([
			entryId,
			form,
			lemma,
			partOfSpeech,
			gender,
			number,
			lexiqueCell(cells, columnIndex, "phon"),
			lexiqueNumber(lexiqueCell(cells, columnIndex, "freqfilms2")),
			lexiqueNumber(lexiqueCell(cells, columnIndex, "freqlivres")),
			lexiqueCell(cells, columnIndex, "islem"),
			inflectionInfo,
			lexiqueCell(cells, columnIndex, "morphoder"),
			lexiqueNumber(lexiqueCell(cells, columnIndex, "nbmorph")),
		]);
		uniqueForms.add(form);
		uniqueLemmas.add(lemma);
		incrementCount(posCounts, partOfSpeech);
		if (gender.length > 0) incrementCount(genderCounts, gender);
		if (number.length > 0) incrementCount(numberCounts, number);
		if (inflectionInfo.length > 0) inflectedVerbRowCount += 1;
		const lemmaKey = `${lemma}\u0000${partOfSpeech}`;
		const lemmaEntry = lemmaForms.get(lemmaKey) ?? {
			lemma,
			partOfSpeech,
			forms: new Set(),
		};
		lemmaEntry.forms.add(form);
		lemmaForms.set(lemmaKey, lemmaEntry);
	}

	entryRows.sort((left, right) => {
		const formDelta = left[1].localeCompare(right[1]);
		if (formDelta !== 0) return formDelta;
		const lemmaDelta = left[2].localeCompare(right[2]);
		if (lemmaDelta !== 0) return lemmaDelta;
		return left[3].localeCompare(right[3]);
	});

	const lemmaRows = [...lemmaForms.values()]
		.map((entry) => [
			entry.lemma,
			entry.partOfSpeech,
			entry.forms.size,
			[...entry.forms].sort((left, right) => left.localeCompare(right)).join(" "),
		])
		.sort((left, right) => {
			const lemmaDelta = left[0].localeCompare(right[0]);
			return lemmaDelta !== 0 ? lemmaDelta : left[1].localeCompare(right[1]);
		});
	const posRows = sortedCountRows(posCounts);
	const frenchSurfaceEvidence = hasInputPath(
		inputs,
		"fra_sentences_detailed.tsv.bz2",
	)
		? deriveFrenchTatoebaSurfaceEvidence(resourceSpec, inputs)
		: undefined;
	const quality = {
		schemaVersion: "1",
		sourceIds: resourceSpec.sourceIds,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		release: "3.83",
		entryCount: entryRows.length,
		lemmaCount: lemmaRows.length,
		uniqueFormCount: uniqueForms.size,
		uniqueLemmaCount: uniqueLemmas.size,
		posInventoryCount: posRows.length,
		genderCounts: Object.fromEntries(sortedCountRows(genderCounts)),
		numberCounts: Object.fromEntries(sortedCountRows(numberCounts)),
		inflectedVerbRowCount,
		...(frenchSurfaceEvidence === undefined
			? {}
			: {
					tatoebaSentenceRowCount:
						frenchSurfaceEvidence.sentenceRowCount,
					searchElisionPrefixCount:
						frenchSurfaceEvidence.elisionPrefixRows.length,
					searchContractionFormCount:
						frenchSurfaceEvidence.contractionRows.length,
					searchGoldCaseCount:
						frenchSurfaceEvidence.normalizationGoldCases.length,
				}),
		recordsAccepted: entryRows.length,
		recordsRejected,
		warnings: [
			"Lexique 3.83 is CC-BY-SA-4.0 and this generated package is share-alike isolated.",
			"Lexique frequency fields are source corpus statistics, not a full contemporary French corpus package.",
			...(frenchSurfaceEvidence === undefined
				? []
				: [
						"Tatoeba French sentence evidence is used only for observed French apostrophe, elision-prefix, and contraction-surface search policy.",
					]),
		],
	};
	const canonicalLexicon = {
		schemaVersion: "1",
		kind: "lexicon",
		lexiconId: "fr-lexique-383",
		languageTag: "fr",
		script: "Latn",
		entryCount: entryRows.length,
		resourceRefs: [
			{
				resourceId: "fr-lexique-entries",
				role: "entries",
				recordCount: entryRows.length,
			},
			{
				resourceId: "fr-lexique-lemmas",
				role: "lemmas",
				recordCount: lemmaRows.length,
			},
		],
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: "fr-lexique-383-lookup",
		languageTag: "fr",
		script: "Latn",
		resourceRefs: [
			{
				resourceId: "fr-lexique-entries",
				role: "analyzer",
				recordCount: entryRows.length,
			},
			{
				resourceId: "fr-lexique-pos-inventory",
				role: "feature-inventory",
				recordCount: posRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: "fr-lexique-383-form-lookup",
				type: "lookup",
				resourceIds: ["fr-lexique-entries", "fr-lexique-lemmas"],
				coverage: {
					entryCount: entryRows.length,
					lemmaCount: lemmaRows.length,
					inflectedVerbRowCount,
				},
			},
		],
		featureInventory: [
			{
				feature: "partOfSpeech",
				values: sorted([...posCounts.keys()]),
				count: posRows.length,
			},
			{
				feature: "gender",
				values: sorted([...genderCounts.keys()]),
				count: genderCounts.size,
			},
			{
				feature: "number",
				values: sorted([...numberCounts.keys()]),
				count: numberCounts.size,
			},
		],
	};
	const canonicalSearchProfile = {
		schemaVersion: "1",
		kind: "search-profile",
		analyzerId: "fr-lexique-383-analyzer",
		languageTag: "fr",
		script: "Latn",
		tokenizer: {
			componentId: "unicode-word",
			type: "unicode-word-boundary",
			mode: "default",
		},
			charFilters: [
				{
					componentId: "french-apostrophe-normalizer",
					type: "character-policy",
					mode: "normalize-typographic-and-straight-apostrophes",
					options: {
						characters: ["'", "’"],
						evidenceResourceId:
							frenchSurfaceEvidence === undefined
								? undefined
								: "fr-lexique-search-elision-prefixes",
					},
				},
			],
		tokenFilters: [
			{
				componentId: "unicode-simple-casefold",
				type: "casefold",
					mode: "unicode-simple",
				},
				{
					componentId: "french-accent-fold",
					type: "diacritic-fold",
					mode: "lookup-only",
					options: {
						normalization: "NFD",
						removeUnicodeMarks: true,
					},
				},
				...(frenchSurfaceEvidence === undefined
					? []
					: [
							{
								componentId: "french-observed-elision-prefixes",
								type: "elision-policy",
								mode: "prefix-apostrophe-boundary",
								options: {
									evidenceResourceId:
										"fr-lexique-search-elision-prefixes",
									minimumObservedCount:
										frenchSurfaceEvidenceMinimumCount,
								},
							},
							{
								componentId: "french-observed-contraction-surfaces",
								type: "contraction-policy",
								mode: "surface-form-recognition",
								options: {
									evidenceResourceId:
										"fr-lexique-search-contraction-forms",
								},
							},
						]),
				{
					componentId: "lexique-form-lemma-lookup",
					type: "lexicon-lookup",
				mode: "form-to-lemma",
				options: {
					entryResourceId: "fr-lexique-entries",
					lemmaResourceId: "fr-lexique-lemmas",
					frequencyFields: ["freqfilms2", "freqlivres"],
				},
			},
		],
		resources: [
				{
					resourceId: "fr-lexique-entries",
					role: "lexicon",
				},
				...(frenchSurfaceEvidence === undefined
					? []
					: [
							{
								resourceId: "fr-lexique-search-elision-prefixes",
								role: "normalizer",
							},
							{
								resourceId: "fr-lexique-search-contraction-forms",
								role: "normalizer",
							},
							{
								resourceId: "fr-lexique-search-gold-cases",
								role: "quality",
							},
						]),
			],
		fields: [
			{
				fieldName: "text",
				analyzerRole: "index",
			},
			{
				fieldName: "text",
				analyzerRole: "query",
			},
			{
				fieldName: "text",
				analyzerRole: "suggest",
			},
		],
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: "fr-lexique-383-quality",
		languageTag: "fr",
		script: "Latn",
		diagnostics: [
			{
				diagnosticId: "fr-lexique-383-share-alike-isolation",
				task: "license.boundary",
				severity: "info",
					message:
						"Lexique 3.83 resources are generated only in an explicit share-alike isolated package.",
					metadata: {
						sourceIds: quality.sourceIds,
						license: "CC-BY-SA-4.0",
					},
				},
		],
		metrics: [
			{
				metricId: "entry-count",
				name: "entryCount",
				value: quality.entryCount,
				unit: "entries",
			},
			{
				metricId: "lemma-count",
				name: "lemmaCount",
				value: quality.lemmaCount,
				unit: "lemmas",
			},
			{
				metricId: "unique-form-count",
				name: "uniqueFormCount",
				value: quality.uniqueFormCount,
				unit: "forms",
			},
				{
					metricId: "records-rejected",
					name: "recordsRejected",
					value: quality.recordsRejected,
					unit: "records",
				},
				...(frenchSurfaceEvidence === undefined
					? []
					: [
							{
								metricId: "search-elision-prefix-count",
								name: "searchElisionPrefixCount",
								value: quality.searchElisionPrefixCount,
								unit: "prefixes",
							},
							{
								metricId: "search-contraction-form-count",
								name: "searchContractionFormCount",
								value: quality.searchContractionFormCount,
								unit: "forms",
							},
							{
								metricId: "search-gold-case-count",
								name: "searchGoldCaseCount",
								value: quality.searchGoldCaseCount,
								unit: "cases",
							},
						]),
			],
			thresholds: [],
			evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			"fr-lexique-entries",
			tsvFile(
				[
					"entryId",
					"form",
					"lemma",
					"partOfSpeech",
					"gender",
					"number",
					"phonetic",
					"freqFilms",
					"freqBooks",
					"isLemma",
					"inflectionInfo",
					"derivationalMorphology",
					"morphemeCount",
				],
				entryRows,
			),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-lemmas",
			tsvFile(["lemma", "partOfSpeech", "formCount", "forms"], lemmaRows),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-pos-inventory",
			tsvFile(["partOfSpeech", "rowCount"], posRows),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-lexicon-canonical",
			stableJson(canonicalLexicon),
		),
		outputFor(
			resourceSpec,
			"fr-lexique-morphology-canonical",
			stableJson(canonicalMorphology),
		),
			outputFor(
				resourceSpec,
				"fr-lexique-search-profile",
				stableJson(canonicalSearchProfile),
			),
			...(frenchSurfaceEvidence === undefined
				? []
				: [
						outputFor(
							resourceSpec,
							"fr-lexique-search-elision-prefixes",
							tsvFile(
								[
									"prefix",
									"observedCount",
									"apostropheCounts",
									"exampleSentenceId",
								],
								frenchSurfaceEvidence.elisionPrefixRows.map((row) => [
									row.prefix,
									row.count,
									row.apostrophes,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-lexique-search-contraction-forms",
							tsvFile(
								["form", "observedCount", "exampleSentenceId"],
								frenchSurfaceEvidence.contractionRows.map((row) => [
									row.form,
									row.count,
									row.exampleSentenceId,
								]),
							),
						),
						outputFor(
							resourceSpec,
							"fr-lexique-search-gold-cases",
							stableJson({
								schemaVersion: "1",
								kind: "search-gold-cases",
								languageTag: "fr",
								sourceIds: resourceSpec.sourceIds,
								cases: frenchSurfaceEvidence.normalizationGoldCases.map(
									(testCase) => ({
										caseId: testCase.caseId.replace(
											"fr-normalization",
											"fr-search",
										),
										source: testCase.source,
										sourceSentenceId: testCase.sourceSentenceId,
										category: testCase.category,
										input: testCase.input,
										expectedAnalyzerTokens: frenchSurfaceTokens(
											testCase.input,
											new Set(
												frenchSurfaceEvidence.elisionPrefixRows.map(
													(row) => row.prefix,
												),
											),
										).map((token) => frenchLookupFold(token)),
									}),
								),
							}),
						),
					]),
			outputFor(resourceSpec, "fr-lexique-quality", stableJson(quality)),
		outputFor(
			resourceSpec,
			"fr-lexique-quality-profile",
			stableJson(canonicalQuality),
		),
	];
}

function conlluSplitName(basename) {
	if (basename.includes("-ud-train.")) return "train";
	if (basename.includes("-ud-dev.")) return "dev";
	if (basename.includes("-ud-test.")) return "test";
	return basename.replace(/\.conllu$/u, "");
}

const udConlluTransformProfiles = new Map([
	[
		"@ismail-elkorchi/textpack-en-syntax-ud-gumreddit",
		{
			annotationTableId: "en-ud-gumreddit-annotations",
			dependencyId: "en-ud-gumreddit-dependencies",
			diagnosticId: "en-ud-gumreddit-raw-text-policy",
			evalPrefix: "eval:en-ud-gumreddit",
			featureId: "en-ud-gumreddit-features",
			languageTag: "en",
			morphologyAnalyzerId: "en-ud-gumreddit-feature-profile",
			morphologyId: "en-ud-gumreddit-morphosyntax",
			morphologyResourceId: "en-ud-gumreddit-morphology-canonical",
			qualityId: "en-ud-gumreddit-quality",
			qualityProfileId: "en-ud-gumreddit-quality-profile",
			script: "Latn",
			sentenceProfileId: "en-ud-gumreddit-sentence-profile",
			sourceId: "source:ud:english-gumreddit-r2.18",
			syntaxId: "en-ud-gumreddit-syntax",
			syntaxResourceId: "en-ud-gumreddit-syntax-canonical",
			treebankId: "ud-english-gumreddit",
			uposId: "en-ud-gumreddit-upos",
			warnings: [
				"Generated resources intentionally exclude FORM and LEMMA fields because the source treebank is annotation-only.",
			],
		},
	],
	[
		"@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa",
		{
			annotationTableId: "ar-ud-nyuad-annotations",
			dependencyId: "ar-ud-nyuad-dependencies",
			diagnosticId: "ar-ud-nyuad-raw-text-policy",
			evalPrefix: "eval:ar-ud-nyuad",
			featureId: "ar-ud-nyuad-features",
			languageTag: "ar",
			morphologyAnalyzerId: "ar-ud-nyuad-feature-profile",
			morphologyId: "ar-ud-nyuad-morphosyntax",
			morphologyResourceId: "ar-ud-nyuad-morphology-canonical",
			qualityId: "ar-ud-nyuad-quality",
			qualityProfileId: "ar-ud-nyuad-quality-profile",
			script: "Arab",
			sentenceProfileId: "ar-ud-nyuad-sentence-profile",
			sourceId: "source:ud:arabic-nyuad-r2.18",
			syntaxId: "ar-ud-nyuad-syntax",
			syntaxResourceId: "ar-ud-nyuad-syntax-canonical",
			treebankId: "ud-arabic-nyuad",
			uposId: "ar-ud-nyuad-upos",
			warnings: [
				"Generated resources intentionally exclude FORM and LEMMA fields because the source treebank is annotation-only.",
				"UD Arabic NYUAD is share-alike isolated and cannot enter the default Arabic composite.",
			],
		},
	],
	[
		"@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa",
		{
			annotationTableId: "fr-ud-gsd-annotations",
			dependencyId: "fr-ud-gsd-dependencies",
			diagnosticId: "fr-ud-gsd-raw-text-policy",
			evalPrefix: "eval:fr-ud-gsd",
			featureId: "fr-ud-gsd-features",
			languageTag: "fr",
			morphologyAnalyzerId: "fr-ud-gsd-feature-profile",
			morphologyId: "fr-ud-gsd-morphosyntax",
			morphologyResourceId: "fr-ud-gsd-morphology-canonical",
			qualityId: "fr-ud-gsd-quality",
			qualityProfileId: "fr-ud-gsd-quality-profile",
			script: "Latn",
			sentenceProfileId: "fr-ud-gsd-sentence-profile",
			sourceId: "source:ud:french-gsd-r2.18",
			syntaxId: "fr-ud-gsd-syntax",
			syntaxResourceId: "fr-ud-gsd-syntax-canonical",
			treebankId: "ud-french-gsd",
			uposId: "fr-ud-gsd-upos",
			warnings: [
				"Generated resources intentionally exclude FORM and LEMMA fields.",
				"UD French GSD is share-alike isolated and cannot enter the default French composite.",
			],
		},
	],
]);

function udConlluProfileForPackage(packageName) {
	const profile = udConlluTransformProfiles.get(packageName);
	expect(profile !== undefined, `${packageName} has no UD CoNLL-U profile.`);
	return profile;
}

function transformUdConlluProfile(resourceSpec, inputs) {
	const profile = udConlluProfileForPackage(resourceSpec.packageName);
	const inputNames = resourceSpec.inputFiles
		.map((inputFile) => path.basename(inputFile.path))
		.filter((basename) => basename.endsWith(".conllu"))
		.sort((left, right) => left.localeCompare(right));
	const uposCounts = new Map();
	const featureCounts = new Map();
	const dependencyCounts = new Map();
	const sentenceStats = new Map();
	const annotationRows = [];
	for (const basename of inputNames) {
		const split = conlluSplitName(basename);
		const text = requiredInput(inputs, basename, resourceSpec);
		let sentenceCount = 0;
		let tokenCount = 0;
		let maxTokenCount = 0;
		for (const block of text.split(/\r?\n\r?\n/u)) {
			if (block.trim().length === 0) continue;
			let sentenceTokenCount = 0;
			const blockRows = [];
			for (const line of block.split(/\r?\n/u)) {
				if (line.length === 0 || line.startsWith("#")) continue;
				const columns = line.split("\t");
				if (columns.length < 10 || !/^[0-9]+$/u.test(columns[0])) continue;
				const upos = columns[3] ?? "_";
				const xpos = columns[4] ?? "_";
				const features = columns[5] ?? "_";
				const head = columns[6] ?? "_";
				const deprel = columns[7] ?? "_";
				incrementCount(uposCounts, `${upos}\t${xpos}`);
				incrementCount(dependencyCounts, `${split}\t${deprel}`);
				if (features !== "_") {
					for (const feature of features.split("|")) {
						const [name = "", value = ""] = feature.split("=");
						if (name.length > 0)
							incrementCount(featureCounts, `${name}\t${value}`);
					}
				}
				sentenceTokenCount += 1;
				blockRows.push([
					split,
					sentenceCount + 1,
					columns[0],
					upos,
					xpos,
					features,
					head,
					deprel,
					columns[8] ?? "_",
					columns[9] ?? "_",
				]);
			}
			if (sentenceTokenCount > 0) {
				sentenceCount += 1;
				tokenCount += sentenceTokenCount;
				maxTokenCount = Math.max(maxTokenCount, sentenceTokenCount);
				annotationRows.push(...blockRows);
			}
		}
		sentenceStats.set(split, {
			sentenceCount,
			tokenCount,
			averageTokenCount:
				sentenceCount === 0
					? 0
					: Number((tokenCount / sentenceCount).toFixed(2)),
			maxTokenCount,
		});
	}

	const uposRows = sortedCountRows(uposCounts).map(([key, count]) => [
		...key.split("\t"),
		count,
	]);
	const featureRows = sortedCountRows(featureCounts).map(([key, count]) => [
		...key.split("\t"),
		count,
	]);
	const dependencyRows = sortedCountRows(dependencyCounts).map(
		([key, count]) => [...key.split("\t"), count],
	);
	const sentenceRows = [...sentenceStats.entries()]
		.sort((left, right) => left[0].localeCompare(right[0]))
		.map(([split, stats]) => [
			split,
			stats.sentenceCount,
			stats.tokenCount,
			stats.averageTokenCount,
			stats.maxTokenCount,
		]);
	const totalSentences = [...sentenceStats.values()].reduce(
		(total, stats) => total + stats.sentenceCount,
		0,
	);
	const totalTokens = [...sentenceStats.values()].reduce(
		(total, stats) => total + stats.tokenCount,
		0,
	);
	const summary = {
		schemaVersion: "1",
		sourceId: profile.sourceId,
		pipelineId: resourceSpec.pipelineId,
		pipelineVersion: resourceSpec.pipelineVersion,
		splits: Object.fromEntries([...sentenceStats.entries()].sort()),
		totalSentences,
		totalTokens,
		annotationRowCount: annotationRows.length,
		uposPairCount: uposRows.length,
		featureValueCount: featureRows.length,
		dependencyLabelBySplitCount: dependencyRows.length,
		rawTextFieldsEmitted: false,
		recordsAccepted: totalTokens,
		recordsRejected: 0,
		warnings: profile.warnings,
	};
	const featureInventory = new Map();
	for (const [feature, value, count] of featureRows) {
		const values = featureInventory.get(feature) ?? [];
		values.push({ value, count });
		featureInventory.set(feature, values);
	}
	const canonicalSyntax = {
		schemaVersion: "1",
		kind: "syntax",
		syntaxId: profile.syntaxId,
		languageTag: profile.languageTag,
		script: profile.script,
		annotationScheme: "Universal Dependencies",
		resourceRefs: [
			{
				resourceId: profile.uposId,
				role: "tagset",
				recordCount: uposRows.length,
			},
			{
				resourceId: profile.featureId,
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
			{
				resourceId: profile.dependencyId,
				role: "dependency-labels",
				recordCount: dependencyRows.length,
			},
			{
				resourceId: profile.sentenceProfileId,
				role: "sentence-profile",
				recordCount: sentenceRows.length,
			},
			{
				resourceId: profile.annotationTableId,
				role: "annotation-table",
				recordCount: annotationRows.length,
			},
		],
		tagsets: [
			{
				tagsetId: "upos-xpos",
				tags: uposRows.map(([upos, xpos, count]) => ({
					tag: upos,
					secondaryTag: xpos,
					count,
				})),
			},
		],
		features: featureRows.map(([feature, value, count]) => ({
			feature,
			value,
			count,
		})),
		dependencyLabels: dependencyRows.map(([split, label, count]) => ({
			split,
			label,
			count,
		})),
		treebanks: sentenceRows.map(
			([
				split,
				sentenceCount,
				tokenCount,
				averageTokenCount,
				maxTokenCount,
			]) => ({
				treebankId: profile.treebankId,
				split,
				sentenceCount,
				tokenCount,
				averageTokenCount,
				maxTokenCount,
			}),
		),
	};
	const canonicalMorphology = {
		schemaVersion: "1",
		kind: "morphology",
		morphologyId: profile.morphologyId,
		languageTag: profile.languageTag,
		script: profile.script,
		resourceRefs: [
			{
				resourceId: profile.featureId,
				role: "feature-inventory",
				recordCount: featureRows.length,
			},
			{
				resourceId: profile.annotationTableId,
				role: "analyzer",
				recordCount: annotationRows.length,
			},
		],
		analyzers: [
			{
				analyzerId: profile.morphologyAnalyzerId,
				type: "statistical",
				resourceIds: [profile.featureId, profile.annotationTableId],
				coverage: {
					tokenCount: totalTokens,
					featureValueCount: featureRows.length,
				},
			},
		],
		featureInventory: [...featureInventory.entries()]
			.sort((left, right) => left[0].localeCompare(right[0]))
			.map(([feature, values]) => ({
				feature,
				count: values.length,
				values: values
					.sort((left, right) => left.value.localeCompare(right.value))
					.map((entry) => entry.value),
			})),
	};
	const canonicalQuality = {
		schemaVersion: "1",
		kind: "quality-profile",
		profileId: profile.qualityProfileId,
		languageTag: profile.languageTag,
		script: profile.script,
		diagnostics: [
			{
				diagnosticId: profile.diagnosticId,
				task: "syntax.transform",
				severity: "info",
				message: "Generated UD resources exclude FORM and LEMMA text fields.",
				metadata: {
					rawTextFieldsEmitted: summary.rawTextFieldsEmitted,
				},
			},
		],
		metrics: [
			{
				metricId: "total-token-count",
				name: "totalTokens",
				value: totalTokens,
				unit: "tokens",
			},
			{
				metricId: "annotation-row-count",
				name: "annotationRowCount",
				value: annotationRows.length,
				unit: "records",
			},
			{
				metricId: "dependency-label-by-split-count",
				name: "dependencyLabelBySplitCount",
				value: dependencyRows.length,
				unit: "labels",
			},
		],
		thresholds: [],
		evaluationRecordIds: [],
	};

	return [
		outputFor(
			resourceSpec,
			profile.uposId,
			tsvFile(["upos", "xpos", "count"], uposRows),
		),
		outputFor(
			resourceSpec,
			profile.featureId,
			tsvFile(["feature", "value", "count"], featureRows),
		),
		outputFor(
			resourceSpec,
			profile.dependencyId,
			tsvFile(["split", "deprel", "count"], dependencyRows),
		),
		outputFor(
			resourceSpec,
			profile.sentenceProfileId,
			tsvFile(
				[
					"split",
					"sentenceCount",
					"tokenCount",
					"averageTokenCount",
					"maxTokenCount",
				],
				sentenceRows,
			),
		),
		outputFor(
			resourceSpec,
			profile.annotationTableId,
			tsvFile(
				[
					"split",
					"sentenceIndex",
					"tokenId",
					"upos",
					"xpos",
					"features",
					"head",
					"deprel",
					"deps",
					"misc",
				],
				annotationRows,
			),
		),
		outputFor(resourceSpec, profile.qualityId, stableJson(summary)),
		outputFor(
			resourceSpec,
			profile.syntaxResourceId,
			stableJson(canonicalSyntax),
		),
		outputFor(
			resourceSpec,
			profile.morphologyResourceId,
			stableJson(canonicalMorphology),
		),
		outputFor(
			resourceSpec,
			profile.qualityProfileId,
			stableJson(canonicalQuality),
		),
	];
}

function requiredInput(inputs, basename, resourceSpec) {
	const text = inputs.get(basename);
	expect(
		text !== undefined,
		`${resourceSpec.resourceSpecId} missing ${basename}.`,
	);
	return text;
}

const transformRunners = new Map([
	["arabic-core-profile", transformArabicCoreProfile],
	["arabic-normalization-profile", transformArabicNormalizationProfile],
	["arabic-search-profile", transformArabicSearchProfile],
	["arabic-wordnet-lmf", transformArabicWordnetLmf],
	["camel-morph-msa", transformCamelMorphMsa],
	["cldr-core-foundation", transformCldrCoreFoundation],
	["english-core-profile", transformEnglishCoreProfile],
	["english-normalization-profile", transformEnglishNormalizationProfile],
	["english-segmentation-profile", transformEnglishSegmentationProfile],
	["esdb-wordlist-diff", transformEsdbWordlistDiff],
	["french-core-profile", transformFrenchCoreProfile],
	["french-lexique-383", transformFrenchLexique383],
	["french-normalization-profile", transformFrenchNormalizationProfile],
	["french-segmentation-profile", transformFrenchSegmentationProfile],
	["french-unimorph", transformFrenchUnimorph],
	["iana-language-registry", transformIanaLanguageRegistry],
	["open-english-wordnet-lexicon", transformOpenEnglishWordnetLexicon],
	["open-english-wordnet-lmf", transformOpenEnglishWordnetLmf],
	["scowl-v2-inflection", transformScowlV2Inflection],
	["tatoeba-arabic-corpus-artifact", transformTatoebaArabicCorpusArtifact],
	["tatoeba-arabic-parallel-artifact", transformTatoebaArabicParallelArtifact],
	["tatoeba-english-corpus-artifact", transformTatoebaEnglishCorpusArtifact],
	["tatoeba-english-parallel-artifact", transformTatoebaEnglishParallelArtifact],
	["tatoeba-french-corpus-artifact", transformTatoebaFrenchCorpusArtifact],
	["tatoeba-french-parallel-artifact", transformTatoebaFrenchParallelArtifact],
	["ud-conllu-profile", transformUdConlluProfile],
	["unicode-17-core", transformUnicode17Core],
	["wikidata-main-artifact", transformWikidataMainArtifact],
]);

async function collectTransformInputs(resourceSpec) {
	const inputs = new Map();
	for (const inputFile of resourceSpec.inputFiles) {
		const bytes = await readFile(path.join(ROOT, inputFile.path));
		const actualChecksum = sha256Bytes(bytes);
		expect(
			actualChecksum === inputFile.checksum,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} checksum mismatch.`,
			`expected ${inputFile.checksum}\nactual   ${actualChecksum}`,
		);
		const basename = path.basename(inputFile.path);
		inputs.set(`${basename}:path`, inputFile.path);
		inputs.set(
			basename,
			inputFile.path.endsWith(".gz")
				? gunzipSync(bytes).toString("utf8")
				: bytes.toString("utf8"),
		);
	}
	return inputs;
}

async function collectResourcePayloads(packSpec, manifest, resourceSpecById) {
	const payloadsById = new Map();
	for (const resourceSpecId of packSpec.resourceSpecIds) {
		const resourceSpec = resourceSpecById.get(resourceSpecId);
		const runner = transformRunners.get(resourceSpec.pipelineId);
		expect(
			runner !== undefined,
			`${resourceSpec.resourceSpecId} declares unsupported pipeline ${resourceSpec.pipelineId}.`,
		);
		const inputs = await collectTransformInputs(resourceSpec);
		const outputs = runner(resourceSpec, inputs);
		const declaredOutputIds = new Set(
			resourceSpec.outputs.map((output) => output.resourceId),
		);
		for (const output of outputs) {
			expect(
				declaredOutputIds.has(output.id),
				`${resourceSpec.resourceSpecId} produced undeclared output ${output.id}.`,
			);
			const lines = output.text.split(/\r?\n/u);
			const nonEmptyLineCount = lines
				.map((line) => line.trim())
				.filter((line) => line.length > 0).length;
			payloadsById.set(output.id, {
				id: output.id,
				kind: output.kind,
				path: output.path,
				sourcePath: resourceSpec.resourceSpecId,
				text: encodedResourceText(output),
				resourceText: output.text,
				resourceTextByteLength: Buffer.byteLength(output.text, "utf8"),
				encoded: output.path.endsWith(GZIP_BASE64_RESOURCE_SUFFIX)
					? "gzip-base64"
					: "utf8",
				byteLength: Buffer.byteLength(encodedResourceText(output), "utf8"),
				lineCount: output.text.length === 0 ? 0 : lines.length,
				nonEmptyLineCount,
				checksum: sha256(encodedResourceText(output)),
				sizeClass: sizeClass(
					Buffer.byteLength(encodedResourceText(output), "utf8"),
				),
				pipelineId: resourceSpec.pipelineId,
				pipelineVersion: resourceSpec.pipelineVersion,
				resourceSpecId,
			});
		}
	}
	const payloads = [];
	for (const resource of manifest.resources) {
		const payload = payloadsById.get(resource.id);
		expect(
			payload !== undefined,
			`${packSpec.packageName} source-backed transform did not produce ${resource.id}.`,
		);
		expect(
			payload.path === resource.path,
			`${packSpec.packageName} resource ${resource.id} path mismatch.`,
		);
		payloads.push(payload);
	}
	return payloads;
}

function encodedResourceText(output) {
	if (!output.path.endsWith(GZIP_BASE64_RESOURCE_SUFFIX)) return output.text;
	return `${gzipSync(Buffer.from(output.text, "utf8")).toString("base64")}\n`;
}

function resourceStats(payloads) {
	return payloads
		.map((payload) => ({
			id: payload.id,
			kind: payload.kind,
			path: payload.path,
			byteLength: payload.byteLength,
			resourceTextByteLength: payload.resourceTextByteLength,
			lineCount: payload.lineCount,
			nonEmptyLineCount: payload.nonEmptyLineCount,
			checksum: payload.checksum,
			sizeClass: payload.sizeClass,
			...(payload.resourceSpecId === undefined
				? {}
				: {
						resourceSpecId: payload.resourceSpecId,
						pipelineId: payload.pipelineId,
						pipelineVersion: payload.pipelineVersion,
					}),
		}))
		.sort((left, right) => left.id.localeCompare(right.id));
}

function capabilitySlots(manifest) {
	return [...manifest.capabilitySlots]
		.map((slot) => ({
			slot: slot.slot,
			status: slot.status,
			...(slot.resourceIds === undefined
				? {}
				: { resourceIds: slot.resourceIds }),
			...(slot.artifactIds === undefined
				? {}
				: { artifactIds: slot.artifactIds }),
			...(slot.notes === undefined ? {} : { notes: slot.notes }),
			...(slot.capabilities === undefined
				? {}
				: { capabilities: slot.capabilities }),
		}))
		.sort((left, right) => left.slot.localeCompare(right.slot));
}

function capabilities(manifest) {
	const output = {};
	for (const slot of manifest.capabilitySlots) {
		for (const [key, value] of Object.entries(slot.capabilities ?? {})) {
			output[key] = value;
		}
	}
	return output;
}

function knownGaps(packSpec, manifest) {
	const gaps = [];
	if (packSpec.packClass === "language-composite") {
		const hasRequiredLanguageSlots = languageCompositeRequiredSlots.every((slot) =>
			manifest.capabilitySlots.some(
				(candidate) =>
					candidate.slot === slot && candidate.status === "task-supported",
			),
		);
		if (packSpec.supportLevel !== "feature-complete" || !hasRequiredLanguageSlots) {
			gaps.push(
				"generated language recipe composite has incomplete required task-supported slot coverage",
			);
		}
	} else if (packSpec.packClass === "language-component-composite") {
		gaps.push(
			"generated language component recipe composite; broader language composite coverage remains follow-up",
		);
	} else if (packSpec.packClass === "foundation-composite") {
		gaps.push(
			"source-backed foundation composite; downstream engine integration is follow-up",
		);
	} else if (
		packSpec.generationMode === "source-backed" &&
		packSpec.packClass === "language-concrete"
	) {
		gaps.push(
			"source-backed language capability slice; broader resources and evaluation coverage remain follow-up",
		);
	} else if (
		packSpec.generationMode === "source-backed" &&
		[
			"domain",
			"historical-noisy",
			"kb",
			"license-isolated",
			"parallel",
		].includes(packSpec.packClass)
	) {
		gaps.push(
			"source-backed task capability slice; broader resources and evaluation coverage remain follow-up",
		);
	} else if (packSpec.generationMode === "source-backed") {
		gaps.push(
			"source-backed foundation slice; downstream engine integration is follow-up",
		);
	} else {
		gaps.push("unsupported generated pack mode");
	}
	if (packSpec.packageName.includes("demo")) {
		gaps.push("demo package is blocked by the publishability gate");
	}
	if (
		!isCompositePack(packSpec) &&
		packSpec.packClass !== "foundation" &&
		!manifest.resources.some((resource) => resource.kind === "quality-profile")
	) {
		gaps.push("no quality-profile resource coverage");
	}
	for (const gapNote of manifest.gapNotes ?? []) {
		gaps.push(gapNote.message);
	}
	return sorted(new Set(gaps));
}

function manifestTs(manifest) {
	return `${generatedHeader()}import type { TextPackManifest } from "@ismail-elkorchi/textpack";

// biome-ignore format: generated manifest preserves the canonical JSON projection.
export const manifest: TextPackManifest = ${jsonFile(manifest).trimEnd()} as const;
`;
}

function indexTs() {
	return `${generatedHeader()}export { manifest } from "./manifest.js";
export { resources } from "./resources.js";

import { manifest } from "./manifest.js";
import { resources } from "./resources.js";

export default { manifest, resources };
`;
}

const componentLicensePolicyOrder = [
	"default",
	"allow-attribution",
	"allow-share-alike",
	"allow-copyleft",
	"local-only",
];

const componentArtifactPolicyOrder = ["none", "locked", "fetch-explicit"];

function maxComponentPolicy(components, field, order, fallback) {
	let maxIndex = order.indexOf(fallback);
	for (const component of components) {
		const value = component[field] ?? fallback;
		const index = order.indexOf(value);
		if (index > maxIndex) maxIndex = index;
	}
	return order[maxIndex] ?? fallback;
}

function compositeIndexTs(pack) {
	const conflictPolicy = [
		"language-composite",
		"language-component-composite",
		"foundation-composite",
	].includes(pack.packClass)
		? `"first"`
		: `"error"`;
	const defaultLicensePolicy = maxComponentPolicy(
		pack.components,
		"licensePolicy",
		componentLicensePolicyOrder,
		"default",
	);
	const defaultArtifactPolicy = maxComponentPolicy(
		pack.components,
		"artifactPolicy",
		componentArtifactPolicyOrder,
		"none",
	);
	const oneLineLoaderDeclaration = `export async function ${pack.loader.functionName}(options: ${pack.loader.optionsName} = {}) {`;
	const loaderDeclaration =
		oneLineLoaderDeclaration.length <= 80
			? oneLineLoaderDeclaration
			: `export async function ${pack.loader.functionName}(
\toptions: ${pack.loader.optionsName} = {},
) {`;
	const cases = pack.components
		.map((component) => {
			const loader = pack.componentLoaders?.[component.packageName];
			if (loader !== undefined) {
				const loaderAccess = /^[A-Za-z_$][\w$]*$/u.test(loader)
					? `module.${loader}`
					: `module[${JSON.stringify(loader)}]`;
				return `\t\tcase ${JSON.stringify(component.packageName)}: {
\t\t\tconst module = await import(component.packageName);
\t\t\tconst loader = ${loaderAccess};
\t\t\tif (typeof loader !== "function") {
\t\t\t\tthrow new TypeError(
\t\t\t\t\t\`Generated component resolver for \${component.packageName} did not export ${loader}.\`,
\t\t\t\t);
\t\t\t}
\t\t\treturn loader(options);
\t\t}`;
			}
			return `\t\tcase ${JSON.stringify(component.packageName)}:
\t\t\treturn import(component.packageName);`;
		})
		.join("\n");
	const languageSupportExports =
		pack.languageSupport === true
			? `export type {
\tTextPackLanguageSupportEntry,
\tTextPackLanguageSupportLevel,
} from "./language-support.js";
export {
\tgetLanguageSupport,
\thasLanguageSupport,
\tlanguageSupport,
\tlistLanguageSupport,
\tlistLanguagesBySupportLevel,
} from "./language-support.js";
`
			: "";
	return `${generatedHeader()}${languageSupportExports}export { manifest } from "./manifest.js";
export { resources } from "./resources.js";

import {
\tloadPack,
\ttype ResolveTextPackComponentsOptions,
\tresolvePackComponents,
\ttype TextPackComponent,
} from "@ismail-elkorchi/textpack";
import { manifest } from "./manifest.js";
import { resources } from "./resources.js";

export interface ${pack.loader.optionsName}
\textends Omit<ResolveTextPackComponentsOptions, "resolveComponent"> {
\treadonly resolveComponent?: ResolveTextPackComponentsOptions["resolveComponent"];
}

async function resolveGeneratedComponent(
\tcomponent: TextPackComponent,
\toptions: ${pack.loader.optionsName},
): Promise<unknown> {
\tvoid options;
\tswitch (component.packageName) {
${cases}
\t\tdefault:
\t\t\tthrow new TypeError(
\t\t\t\t\`No generated resolver entry for \${component.packageName}.\`,
\t\t\t);
\t}
}

${loaderDeclaration}
\treturn resolvePackComponents(await loadPack({ manifest, resources }), {
\t\t...options,
\t\tlicensePolicy: options.licensePolicy ?? ${JSON.stringify(defaultLicensePolicy)},
\t\tartifactPolicy: options.artifactPolicy ?? ${JSON.stringify(defaultArtifactPolicy)},
\t\tconflictPolicy: options.conflictPolicy ?? ${conflictPolicy},
\t\tresolveComponent:
\t\t\toptions.resolveComponent ??
\t\t\t((component) => resolveGeneratedComponent(component, options)),
\t});
}

export default { manifest, resources, ${pack.loader.functionName} };
`;
}

function resourcesTs(pack) {
	const entries = pack.payloads
		.map(
			(payload) =>
				`\t${JSON.stringify(payload.id)}: ${resourceMapValueTs(pack, payload)},`,
		)
		.join("\n");
	const body = entries.length === 0 ? "" : `\n${entries}\n`;
	return `${generatedHeader()}import type { PackResourceMap } from "@ismail-elkorchi/textpack";

// biome-ignore format: generated resource map preserves deterministic payload ordering.
export const resources: PackResourceMap = {${body}} as const;
`;
}

function resourceMapValueTs(pack, payload) {
	const descriptor = sortJson({
		kind: "file-backed-resource",
		packageName: pack.packageName,
		packageRoot: "__TEXTPACK_PACKAGE_ROOT__",
		path: payload.path,
		encoding: payload.encoded,
		checksum: payload.checksum,
		byteLength: payload.byteLength,
		resourceTextByteLength: payload.resourceTextByteLength,
		lineCount: payload.lineCount,
		nonEmptyLineCount: payload.nonEmptyLineCount,
	});
	const properties = Object.entries(descriptor).map(([key, value]) => {
		if (key === "packageRoot") {
			return `${JSON.stringify(key)}: new URL("../", import.meta.url).href`;
		}
		return `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
	});
	return `{${properties.join(",")}}`;
}

function packageId(packageName) {
	return packageName.replace("@ismail-elkorchi/", "");
}

function packagePathId(value) {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/gu, "-")
		.replace(/^-+|-+$/gu, "");
	return slug.length === 0 ? "source" : slug;
}

function licenseExpressionUsesLocalRefs(licenseExpression) {
	return /\bLicenseRef-/u.test(licenseExpression ?? "");
}

function packageJsonLicenseField(pack) {
	return licenseExpressionUsesLocalRefs(pack.licenseExpression)
		? "SEE LICENSE IN LICENSE.generated.md"
		: pack.licenseExpression;
}

function urlBasename(value) {
	try {
		return path.basename(new URL(value).pathname);
	} catch {
		return path.basename(value);
	}
}

function localLicenseEvidenceFilesForIds(sourceIds, snapshotIds, context) {
	const sources = sourceIds
		.map((sourceId) => context.sourceById.get(sourceId))
		.filter((source) => source !== undefined);
	const evidenceUrls = new Set(
		sources.flatMap((source) => source.licenseEvidence ?? []),
	);
	const evidenceBasenames = new Set([...evidenceUrls].map(urlBasename));
	const filesByPackagePath = new Map();
	for (const snapshotId of snapshotIds) {
		const snapshot = context.snapshotById.get(snapshotId);
		if (snapshot === undefined || !sourceIds.includes(snapshot.sourceId)) {
			continue;
		}
		for (const file of snapshot.files ?? []) {
			const basename = path.basename(file.path);
			const matchesLicenseName =
				/(^|[._-])(license|licence|copying|notice|copyright)([._-]|$)/iu.test(
					basename,
				);
			const matchesEvidenceBasename =
				evidenceBasenames.has(basename) && matchesLicenseName;
			if (!matchesLicenseName && !matchesEvidenceBasename) {
				continue;
			}
			const packagePath = `licenses/${packagePathId(snapshot.sourceId)}/${basename}`;
			filesByPackagePath.set(packagePath, {
				byteLength: file.byteLength,
				checksum: file.checksum,
				mediaType: file.mediaType,
				packagePath,
				snapshotId,
				sourceId: snapshot.sourceId,
				sourcePath: file.path,
				sourceUrl: file.sourceUrl,
			});
		}
	}
	return [...filesByPackagePath.values()].sort((left, right) =>
		left.packagePath.localeCompare(right.packagePath),
	);
}

const REQUIRED_PUBLISHABILITY_EVIDENCE = [
	"productionGradeSourceCoverage",
	"auditedLicense",
	"declaredScope",
	"conformanceEvidence",
	"generatedReports",
];

function missingPublishabilityEvidence(spec) {
	const evidence = spec.publishabilityEvidence ?? {};
	const missing = [];
	for (const field of REQUIRED_PUBLISHABILITY_EVIDENCE) {
		const value = evidence[field];
		if (Array.isArray(value)) {
			if (value.length === 0) missing.push(field);
			continue;
		}
		if (typeof value !== "string" || value.trim().length === 0) {
			missing.push(field);
		}
	}
	if (
		Array.isArray(evidence.generatedReports) &&
		!PACKAGE_REPORT_FILES.every((report) =>
			evidence.generatedReports.includes(report),
		)
	) {
		missing.push("generatedReports:standard-report-set");
	}
	return missing;
}

function publishabilityFor(spec, manifest, context) {
	const requested = spec.publishable === true;
	const reasons = [];
	const sourceIds = spec.sourceIds ?? spec.catalogSourceIds ?? [];
	const snapshotIds = spec.snapshotIds ?? spec.catalogSnapshotIds ?? [];
	if (!requested) {
		reasons.push("generated packs are non-publishable by default");
	}
	if (
		(spec.generationMode !== undefined &&
			spec.generationMode !== "source-backed") ||
		(spec.mode !== undefined && spec.mode !== "source-backed")
	) {
		reasons.push("only source-backed generated packs can be publishable");
	}
		if (spec.supportLevel === "sampled") {
			reasons.push("sampled support level is not production-grade");
		}
		if (spec.supportLevel === "artifact-backed") {
			reasons.push(
				"artifact-backed descriptors require local materialized payloads before publishability",
			);
		}
	if (
		spec.packageName.includes("demo") ||
		manifest.targets?.domains?.includes("demo") === true
	) {
		reasons.push("demo packs are validation outputs");
	}
	if (
		requested &&
		spec.packClass === "language-composite" &&
		spec.supportLevel !== "feature-complete"
	) {
		reasons.push(
			"language composites require feature-complete support before public developer use",
		);
	}
	if (
		requested &&
		spec.packClass === "language-component-composite" &&
		sourceIds.length > 0 &&
		sourceIds.every((sourceId) => foundationSourceIds.has(sourceId))
	) {
		for (const slot of manifest.capabilitySlots ?? []) {
			if (!foundationOnlyAllowedSlots.has(slot.slot)) {
				reasons.push(
					`foundation-only component composites cannot publish ${slot.slot} capability slots`,
				);
			}
		}
	}
		for (const slot of manifest.capabilitySlots ?? []) {
			if (slot.status === "sampled") {
				reasons.push(`capability slot ${slot.slot} is sampled`);
			}
			if (slot.status === "artifact-backed") {
				reasons.push(
					`capability slot ${slot.slot} is artifact-backed without local task-usable payloads`,
				);
			}
		}
	if (requested) {
		for (const missing of missingPublishabilityEvidence(spec)) {
			reasons.push(`missing publishability evidence: ${missing}`);
		}
		if (
			licenseExpressionUsesLocalRefs(manifest.license) &&
			localLicenseEvidenceFilesForIds(sourceIds, snapshotIds, context)
				.length === 0
		) {
			reasons.push(
				"LicenseRef package licenses require local snapshot license evidence files",
			);
		}
	}
	const uniqueReasons = sorted(new Set(reasons));
	const publishable = requested && uniqueReasons.length === 0;
	return {
		publishable,
		status: publishable ? "publishable" : "blocked",
		reasons: uniqueReasons,
	};
}

function assertPublishabilityRequest(spec, manifest, context) {
	const publishability = publishabilityFor(spec, manifest, context);
	expect(
		spec.publishable !== true || publishability.publishable,
		`${spec.packageName} requested publishable output but failed the publishability gate.`,
		publishability.reasons.join("\n"),
	);
	return publishability;
}

function packagePublishFields(pack) {
	if (pack.publishable) {
		return {
			publishConfig: {
				access: "public",
			},
		};
	}
	return { private: true };
}

function publishabilityMarkdown(pack) {
	const reasons =
		pack.publishability.reasons.length === 0
			? "- None"
			: pack.publishability.reasons.map((reason) => `- ${reason}`).join("\n");
	return `## Publishability

Publishable: \`${pack.publishable ? "true" : "false"}\`
Status: \`${pack.publishability.status}\`

${reasons}
`;
}

function compositePackageJson(pack) {
	const dependencies = {
		"@ismail-elkorchi/textpack": "0.1.0",
	};
	for (const component of pack.components) {
		if (component.role === "required") {
			dependencies[component.packageName] = component.versionRange;
		}
	}
	const packageJson = {
		name: pack.packageName,
		version: pack.packageVersion,
		description: pack.description,
		type: "module",
		sideEffects: false,
		exports: {
			".": {
				types: "./dist/index.d.ts",
				import: "./dist/index.js",
			},
			"./pack.manifest.json": "./pack.manifest.json",
		},
		scripts: {
			...PACKAGE_SCRIPTS,
			"test:all":
				"npm run -s build && node test/smoke.mjs && node test/negative.mjs && npm run -s check:pack",
		},
		dependencies,
		license: packageJsonLicenseField(pack),
		files: [
			"dist",
			"pack.manifest.json",
			".textpack-generated.json",
			...(pack.licenseEvidenceFiles.length === 0 ? [] : ["licenses"]),
			"LICENSE.generated.md",
			"NOTICE.generated.md",
			"SOURCES.generated.json",
			"ATTRIBUTION.generated.md",
			"COVERAGE.generated.json",
			"EVALUATION.generated.json",
			"QUALITY.generated.json",
			"README.md",
			"CHANGELOG.md",
		],
		...packagePublishFields(pack),
	};
	return jsonFile(packageJson);
}

function concretePackageJson(pack) {
	const packageJson = {
		name: pack.packageName,
		version: pack.packageVersion,
		description: pack.description,
		type: "module",
		sideEffects: false,
		exports: {
			".": {
				types: "./dist/index.d.ts",
				import: "./dist/index.js",
			},
			"./pack.manifest.json": "./pack.manifest.json",
		},
		scripts: {
			...PACKAGE_SCRIPTS,
			"test:all":
				"npm run -s build && node test/smoke.mjs && npm run -s check:pack",
		},
		dependencies: {
			"@ismail-elkorchi/textpack": "0.1.0",
		},
		license: packageJsonLicenseField(pack),
		files: [
			"dist",
			"pack.manifest.json",
			...pack.payloads.map((payload) => payload.path),
			".textpack-generated.json",
			...(pack.licenseEvidenceFiles.length === 0 ? [] : ["licenses"]),
			"LICENSE.generated.md",
			"NOTICE.generated.md",
			"SOURCES.generated.json",
			"ATTRIBUTION.generated.md",
			"COVERAGE.generated.json",
			"EVALUATION.generated.json",
			"QUALITY.generated.json",
			"README.md",
			"CHANGELOG.md",
		],
		...packagePublishFields(pack),
	};
	return jsonFile(packageJson);
}

function tsconfigJson() {
	return `{
\t"extends": "../../../tsconfig.json",
\t"compilerOptions": {
\t\t"noEmit": true,
\t\t"types": ["node"]
\t},
\t"include": ["src/**/*.ts"]
}
`;
}

function tsconfigBuildJson() {
	return `{
\t"extends": "./tsconfig.json",
\t"compilerOptions": {
\t\t"noEmit": false,
\t\t"declaration": true,
\t\t"declarationMap": true,
\t\t"sourceMap": true,
\t\t"outDir": "dist",
\t\t"rootDir": "src",
\t\t"allowImportingTsExtensions": false,
\t\t"paths": {}
\t},
\t"include": ["src/**/*.ts"]
}
`;
}

function compositeReadme(pack) {
	const required = pack.components
		.filter((component) => component.role === "required")
		.map((component) => `- \`${component.packageName}\``)
		.join("\n");
	const optional =
		pack.components
			.filter((component) => component.role === "optional")
			.map((component) => `- \`${component.packageName}\``)
			.join("\n") || "- None";
	const supportApi =
		pack.languageSupport === true
			? `
## Language Support API

\`\`\`ts
import { getLanguageSupport, hasLanguageSupport } from "${pack.packageName}";
\`\`\`
`
			: "";
	const policySurface =
		pack.policySurface === "policy-expanded-wrapper"
			? `
## Policy Surface

This package is a policy-expanded wrapper. It contains no direct resource payloads, but it requires isolated component packages with non-default license policy. The manifest dependency graph and generated reports preserve the component package names, license policies, and full license expression.
`
			: "";
	return `# ${pack.packageName}

Generated ${pack.loader.languageName} recipe composite textpack.

\`\`\`ts
import { ${pack.loader.functionName} } from "${pack.packageName}";

const pack = await ${pack.loader.functionName}();
\`\`\`

## Required Components

${required}

## Optional Components

${optional}
${policySurface}
${supportApi}
${publishabilityMarkdown(pack)}
`;
}

function compositeChangelog(pack) {
	return `# ${pack.packageName}

## 0.1.0

- Generated ${pack.generationMode} recipe composite package.
`;
}

function concreteReadme(pack) {
	const resources = pack.manifest.resources
		.map(
			(resource) =>
				`- \`${resource.id}\` (${resource.kind}, ${resource.format})`,
		)
		.join("\n");
	return `# ${pack.packageName}

Generated ${pack.packClass} textpack.

This package is generated from pinned source snapshots by \`${GENERATED_BY}\`.

\`\`\`ts
import { manifest, resources } from "${pack.packageName}";
\`\`\`

## Resources

${resources}

${publishabilityMarkdown(pack)}
`;
}

function concreteChangelog(pack) {
	return `# ${pack.packageName}

## 0.1.0

- Generated source-backed foundation package.
`;
}

function concreteSmokeTest(pack) {
	return `import assert from "node:assert/strict";
import { manifest, resources } from "../dist/index.js";

const packageName = ${JSON.stringify(pack.packageName)};

assert.equal(manifest.packageName, packageName);
assert.equal(typeof resources, "object");
assert.equal(Object.keys(resources).length, manifest.resources.length);
assert.ok(manifest.resources.length > 0);

for (const resource of manifest.resources) {
\tconst value = resources[resource.id];
\tassert.equal(typeof value, "object");
\tassert.equal(value?.kind, "file-backed-resource");
\tassert.equal(value?.path, resource.path);
\tassert.equal(typeof value?.checksum, "string");
\tassert.equal(typeof value?.byteLength, "number");
\tassert.equal(typeof value?.encoding, "string");
\tassert.equal(typeof value?.lineCount, "number");
}
`;
}

function languageSupportTs(entries) {
	const levelCodes = {
		registered: "r",
		"unicode-covered": "u",
		profiled: "p",
		"task-supported": "t",
	};
	const foundationPacks = [
		"@ismail-elkorchi/textpack-foundation",
		"@ismail-elkorchi/textpack-language-registry",
		"@ismail-elkorchi/textpack-unicode-17",
		"@ismail-elkorchi/textpack-cldr-core",
	];
	const foundationSourceCoverage = [
		"source:iana:language-subtag-registry",
		"source:unicode:ucd",
		"source:unicode:cldr-core",
	];
	const compactRows = entries.map((entry) => [
		entry.languageTag,
		entry.languageName,
		entry.scripts.join(" "),
		entry.regions.join(" "),
		entry.supportLevels.map((level) => levelCodes[level]).join(""),
		entry.packs.filter((pack) => !foundationPacks.includes(pack)).join(" "),
		entry.capabilitySlots.join(" "),
		entry.sourceCoverage
			.filter((sourceId) => !foundationSourceCoverage.includes(sourceId))
			.join(" "),
		entry.knownGaps.join(" | "),
	]);
	return `${generatedHeader()}export type TextPackLanguageSupportLevel =
\t| "registered"
\t| "unicode-covered"
\t| "profiled"
\t| "task-supported";

export interface TextPackLanguageSupportEntry {
\treadonly languageTag: string;
\treadonly languageName: string;
\treadonly scripts: readonly string[];
\treadonly regions: readonly string[];
\treadonly supportLevels: readonly TextPackLanguageSupportLevel[];
\treadonly packs: readonly string[];
\treadonly capabilitySlots: readonly string[];
\treadonly sourceCoverage: readonly string[];
\treadonly lastBuiltAt: string;
\treadonly knownGaps: readonly string[];
}

type LanguageSupportRow = readonly [
\tlanguageTag: string,
\tlanguageName: string,
\tscripts: string,
\tregions: string,
\tsupportLevels: string,
\ttaskPacks: string,
\tcapabilitySlots: string,
\ttaskSourceCoverage: string,
\tknownGaps: string,
];

const lastBuiltAt = ${JSON.stringify(entries[0]?.lastBuiltAt ?? "")};

const foundationPacks = [
\t"@ismail-elkorchi/textpack-foundation",
\t"@ismail-elkorchi/textpack-language-registry",
] as const;

const unicodeCoveredPacks = ["@ismail-elkorchi/textpack-unicode-17"] as const;
const profiledPacks = ["@ismail-elkorchi/textpack-cldr-core"] as const;

const foundationSourceCoverage = [
\t"source:iana:language-subtag-registry",
] as const;

const unicodeCoveredSourceCoverage = ["source:unicode:ucd"] as const;
const profiledSourceCoverage = ["source:unicode:cldr-core"] as const;

// biome-ignore format: generated compact rows preserve deterministic source ordering.
const languageSupportRows: readonly LanguageSupportRow[] = ${JSON.stringify(compactRows)} as const;

const supportRank = new Map<TextPackLanguageSupportLevel, number>([
\t["registered", 0],
\t["unicode-covered", 1],
\t["profiled", 2],
\t["task-supported", 3],
]);

function uniqueSortedStrings(values: readonly string[]): readonly string[] {
\treturn [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function splitCell(value: string): readonly string[] {
\treturn value.length === 0 ? [] : value.split(" ");
}

function splitGapCell(value: string): readonly string[] {
\treturn value.length === 0 ? [] : value.split(" | ");
}

function decodeSupportLevel(code: string): TextPackLanguageSupportLevel {
\tswitch (code) {
\t\tcase "r":
\t\t\treturn "registered";
\t\tcase "u":
\t\t\treturn "unicode-covered";
\t\tcase "p":
\t\t\treturn "profiled";
\t\tcase "t":
\t\t\treturn "task-supported";
\t\tdefault:
\t\t\tthrow new TypeError(\`Unsupported language-support level code \${code}.\`);
\t}
}

function decodeSupportLevels(
\tcodes: string,
): readonly TextPackLanguageSupportLevel[] {
\treturn [...codes].map((code) => decodeSupportLevel(code));
}

function decodeLanguageSupportRow(
\trow: LanguageSupportRow,
): TextPackLanguageSupportEntry {
\tconst supportLevels = decodeSupportLevels(row[4]);
\tconst hasUnicodeCoverage = supportLevels.includes("unicode-covered");
\tconst hasProfileCoverage = supportLevels.includes("profiled");
\treturn {
\t\tlanguageTag: row[0],
\t\tlanguageName: row[1],
\t\tscripts: splitCell(row[2]),
\t\tregions: splitCell(row[3]),
\t\tsupportLevels,
\t\tpacks: uniqueSortedStrings([
\t\t\t...foundationPacks,
\t\t\t...(hasUnicodeCoverage ? unicodeCoveredPacks : []),
\t\t\t...(hasProfileCoverage ? profiledPacks : []),
\t\t\t...splitCell(row[5]),
\t\t]),
\t\tcapabilitySlots: splitCell(row[6]),
\t\tsourceCoverage: uniqueSortedStrings([
\t\t\t...foundationSourceCoverage,
\t\t\t...(hasUnicodeCoverage ? unicodeCoveredSourceCoverage : []),
\t\t\t...(hasProfileCoverage ? profiledSourceCoverage : []),
\t\t\t...splitCell(row[7]),
\t\t]),
\t\tlastBuiltAt,
\t\tknownGaps: splitGapCell(row[8]),
\t};
}

export const languageSupport: readonly TextPackLanguageSupportEntry[] =
\tlanguageSupportRows.map((row) => decodeLanguageSupportRow(row));

const supportByTag = new Map(
\tlanguageSupport.map((entry) => [entry.languageTag.toLowerCase(), entry]),
);

function normalizeLanguageTag(languageTag: string): string {
\treturn (
\t\tlanguageTag.trim().replace(/_/gu, "-").split("-")[0]?.toLowerCase() ?? ""
\t);
}

export function listLanguageSupport(): readonly TextPackLanguageSupportEntry[] {
\treturn languageSupport;
}

export function getLanguageSupport(
\tlanguageTag: string,
): TextPackLanguageSupportEntry | undefined {
\treturn supportByTag.get(normalizeLanguageTag(languageTag));
}

export function hasLanguageSupport(
\tlanguageTag: string,
\tlevel: TextPackLanguageSupportLevel = "registered",
): boolean {
\tconst entry = getLanguageSupport(languageTag);
\tif (entry === undefined) return false;
\tconst requiredRank = supportRank.get(level) ?? Number.MAX_SAFE_INTEGER;
\treturn entry.supportLevels.some(
\t\t(candidate) =>
\t\t\t(supportRank.get(candidate) ?? Number.MIN_SAFE_INTEGER) >= requiredRank,
\t);
}

export function listLanguagesBySupportLevel(
\tlevel: TextPackLanguageSupportLevel,
): readonly TextPackLanguageSupportEntry[] {
\treturn languageSupport.filter((entry) =>
\t\thasLanguageSupport(entry.languageTag, level),
\t);
}
`;
}

function languageCompositeSmokeAssertions(pack) {
	const expectedResourceKeysByPackageName = new Map([
		[
			"@ismail-elkorchi/textpack-en",
			[
				"en-tatoeba-corpus-sentences",
				"en-tatoeba-parallel-fra",
				"wikidata-en-entities",
				"wikidata-en-aliases",
				"wikidata-en-relations",
			],
		],
		[
			"@ismail-elkorchi/textpack-ar",
			[
				"ar-tatoeba-corpus-sentences",
				"ar-tatoeba-parallel-eng",
				"wikidata-ar-entities",
				"wikidata-ar-aliases",
				"wikidata-ar-relations",
			],
		],
		[
			"@ismail-elkorchi/textpack-fr",
				[
					"fr-tatoeba-corpus-sentences",
					"fr-tatoeba-parallel-eng",
					"fr-normalization-elision-prefixes",
					"fr-segmentation-gold-cases",
					"fr-lexique-search-gold-cases",
					"wikidata-fr-entities",
					"wikidata-fr-aliases",
					"wikidata-fr-relations",
			],
		],
	]);
	const expectedResourceKeys = expectedResourceKeysByPackageName.get(
		pack.packageName,
	);
	if (expectedResourceKeys === undefined) return "";
	const serializedResourceKeys = `[\n${expectedResourceKeys
		.map((resourceKey) => `\t${JSON.stringify(resourceKey)},`)
		.join("\n")}\n]`;
	return `
const requiredSlots = [
\t"foundation",
\t"core",
\t"normalization",
\t"segmentation",
\t"lexicon",
\t"morphology",
\t"syntax",
\t"kb",
\t"search",
\t"corpus",
\t"parallel",
\t"quality",
];
const slotStatuses = new Map(
\tresolved.manifest.capabilitySlots?.map((slot) => [slot.slot, slot.status]) ??
\t\t[],
);

assert.equal(
\tresolved.manifest.components?.filter(
\t\t(component) => component.role === "required",
\t).length,
\t12,
);
for (const slot of requiredSlots) {
\tassert.equal(slotStatuses.get(slot), "task-supported");
}
for (const resourceKey of ${serializedResourceKeys}) {
\tassert.ok(
\t\tObject.hasOwn(resolved.resources, resourceKey),
\t\t\`Expected generated resource \${resourceKey} to be loaded.\`,
\t);
}
`;
}

function compositeSmokeTest(pack) {
	const importedNames =
		pack.languageSupport === true
			? [
					"getLanguageSupport",
					"hasLanguageSupport",
					"languageSupport",
					"listLanguagesBySupportLevel",
					pack.loader.functionName,
					"manifest",
				]
			: [pack.loader.functionName, "manifest"];
	const importStatement =
		importedNames.length <= 2
			? `import { ${importedNames.join(", ")} } from "../dist/index.js";`
			: `import {
\t${importedNames.join(",\n\t")},
} from "../dist/index.js";`;
	const languageSupportAssertions =
		pack.languageSupport === true
			? `
const english = getLanguageSupport("en");

assert.ok(english);
assert.ok(hasLanguageSupport("en", "registered"));
assert.ok(hasLanguageSupport("en", "unicode-covered"));
assert.ok(hasLanguageSupport("en", "profiled"));
assert.equal(hasLanguageSupport("en", "task-supported"), true);
assert.ok(listLanguagesBySupportLevel("registered").length > 1000);
assert.ok(listLanguagesBySupportLevel("task-supported").length >= 2);
assert.ok(languageSupport.length > 1000);
`
			: "";
	const optionalAssertions = [
		languageCompositeSmokeAssertions(pack),
		languageSupportAssertions,
	]
		.filter((assertion) => assertion !== "")
		.map((assertion) => assertion.trim())
		.join("\n\n");
	const optionalAssertionBlock =
		optionalAssertions === "" ? "" : `\n\n${optionalAssertions}`;
	return `import assert from "node:assert/strict";
${importStatement}

const resolved = await ${pack.loader.functionName}();

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
\tresolved.manifest.components?.some(
\t\t(component) => component.role === "required",
\t),
);${optionalAssertionBlock}
`;
}

function compositeNegativeTest(pack) {
	const required = pack.components.find(
		(component) => component.role === "required",
	);
	return `import assert from "node:assert/strict";
import { ${pack.loader.functionName} } from "../dist/index.js";

await assert.rejects(
\t() =>
\t\t${pack.loader.functionName}({
\t\t\tresolveComponent: async () => {
\t\t\t\tthrow new Error("missing component");
\t\t\t},
\t\t}),
\t/Required textpack component ${required.packageName.replaceAll("/", "\\/")} could not be resolved: missing component/,
);
`;
}

function noticeMarkdown(pack, context) {
	const packageDescription =
		pack.packClass === "language-composite"
			? "This package is a source-backed recipe composite. It contains no original resource payloads; it resolves declared production component textpacks through generated loader helpers."
			: pack.packClass === "language-component-composite"
				? "This package is a source-backed component recipe composite. It contains no original resource payloads; it resolves declared production component textpacks through generated loader helpers."
				: pack.packClass === "foundation-composite"
					? "This package is a source-backed recipe composite. It contains no original resource payloads; it resolves declared foundation component textpacks through generated loader helpers and exposes the generated language-support API."
					: "This package is source-backed. Its resource payloads are deterministic transform outputs from pinned local source snapshots. The normal forge build is offline and verifies input checksums before emitting package files.";
	return `# NOTICE

Generated by \`${GENERATED_BY}\`.

Package: \`${pack.packageName}\`
Mode: \`${context.mode}\`
Policy surface: \`${pack.policySurface ?? "default"}\`
Generated at: \`${context.generatedAt}\`
Publishable: \`${pack.publishable ? "true" : "false"}\`
Publishability status: \`${pack.publishability.status}\`

${packageDescription}

License expression: \`${pack.licenseExpression}\`
Source ids: ${pack.sourceIds.map((sourceId) => `\`${sourceId}\``).join(", ")}
Snapshot ids: ${pack.snapshotIds.map((snapshotId) => `\`${snapshotId}\``).join(", ")}

${licenseEvidenceMarkdown(pack, context)}

## Publishability Gate

${pack.publishability.reasons.map((reason) => `- ${reason}`).join("\n") || "- No blocking reasons."}
`;
}

function licenseEvidenceMarkdown(pack, context) {
	const sources = pack.sourceIds
		.map((sourceId) => context.sourceById.get(sourceId))
		.filter((source) => source !== undefined);
	const evidenceUrls = sorted(
		new Set(sources.flatMap((source) => source.licenseEvidence ?? [])),
	);
	const snapshots = pack.snapshotIds
		.map((snapshotId) => context.snapshotById.get(snapshotId))
		.filter((snapshot) => snapshot !== undefined);
	const localEvidenceFiles = sorted(
		new Set(
			snapshots.flatMap((snapshot) =>
				(snapshot.files ?? [])
					.filter(
						(file) =>
							/license/iu.test(file.path) ||
							(file.sourceUrl !== undefined &&
								evidenceUrls.includes(file.sourceUrl)),
					)
					.map((file) => `${file.path} (${file.checksum})`),
			),
		),
	);
	const sourceEvidence =
		evidenceUrls.length === 0
			? "- No source license evidence URLs declared."
			: evidenceUrls.map((url) => `- ${url}`).join("\n");
	const localEvidence =
		(pack.licenseEvidenceFiles ?? []).length > 0
			? pack.licenseEvidenceFiles
					.map(
						(file) =>
							`- \`${file.packagePath}\` from \`${file.sourcePath}\` (${file.checksum})`,
					)
					.join("\n")
			: localEvidenceFiles.length === 0
				? "- No local snapshot license files declared."
				: localEvidenceFiles.map((entry) => `- \`${entry}\``).join("\n");
	return `## License Evidence

Source evidence:

${sourceEvidence}

Local snapshot evidence:

${localEvidence}`;
}

async function licenseReportMarkdown(pack, context) {
	const sourceRows = pack.sourceIds
		.map((sourceId) => context.sourceById.get(sourceId))
		.filter((source) => source !== undefined)
		.map(
			(source) =>
				`- \`${source.sourceId}\`: \`${source.licenseExpression}\` (${source.redistributionPolicy})`,
		)
		.join("\n");
	const sourceEvidenceUrls = sorted(
		new Set(
			pack.sourceIds.flatMap(
				(sourceId) => context.sourceById.get(sourceId)?.licenseEvidence ?? [],
			),
		),
	);
	const sourceEvidence =
		sourceEvidenceUrls.length === 0
			? "- No source license evidence URLs declared."
			: sourceEvidenceUrls.map((url) => `- ${url}`).join("\n");
	const includedFiles =
		pack.licenseEvidenceFiles.length === 0
			? "- No package-local license evidence files were copied from snapshots."
			: pack.licenseEvidenceFiles
					.map(
						(file) =>
							`- \`${file.packagePath}\` from \`${file.sourcePath}\` (${file.checksum})`,
					)
					.join("\n");
	const localLicenseTexts = [];
	for (const file of pack.licenseEvidenceFiles) {
		const text = await readFile(path.join(ROOT, file.sourcePath), "utf8");
		localLicenseTexts.push(`### ${file.packagePath}

Source id: \`${file.sourceId}\`
Snapshot id: \`${file.snapshotId}\`
Checksum: \`${file.checksum}\`

\`\`\`text
${text.replaceAll("```", "\\`\\`\\`")}
\`\`\``);
	}
	const localTextSection =
		localLicenseTexts.length === 0
			? "No package-local license text is available for this generated package."
			: localLicenseTexts.join("\n\n");
	return `# License

Generated by \`${GENERATED_BY}\` at \`${context.generatedAt}\`.

Package: \`${pack.packageName}\`
Package.json license field: \`${packageJsonLicenseField(pack)}\`
Manifest license expression: \`${pack.licenseExpression}\`

## Source License Expressions

${sourceRows || "- No source license expressions declared."}

## Source License Evidence URLs

${sourceEvidence}

## Included Package License Files

${includedFiles}

## Included License Text

${localTextSection}
`;
}

function attributionMarkdown(pack, context) {
	const citations =
		pack.manifest.citations?.map((citation) => `- ${citation}`).join("\n") ??
		"- No citation entries declared.";
	return `# Attribution

Generated by \`${GENERATED_BY}\` at \`${context.generatedAt}\`.

Package: \`${pack.packageName}\`
License expression: \`${pack.licenseExpression}\`

## Sources

${pack.sourceIds.map((sourceId) => `- \`${sourceId}\``).join("\n")}

${licenseEvidenceMarkdown(pack, context)}

## Citations

${citations}
`;
}

function sourcesReportFor(pack, context) {
	const sources = pack.sourceIds.map((sourceId) =>
		context.sourceById.get(sourceId),
	);
	const sourcePolicies = pack.sourceIds.map((sourceId) =>
		context.sourcePolicyById.get(sourceId),
	);
	const snapshots = pack.snapshotIds.map((snapshotId) =>
		context.snapshotById.get(snapshotId),
	);
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packageName: pack.packageName,
		packageId: pack.packageId,
		policySurface: pack.policySurface ?? "default",
		publishable: pack.publishable,
		publishability: pack.publishability,
		sourceIds: pack.sourceIds,
		snapshotIds: pack.snapshotIds,
		resourceSpecIds: pack.resourceSpecIds ?? [],
		sources,
		sourcePolicies,
		snapshots,
		components: pack.components ?? [],
		resources: pack.resourceStats.map((resource) => ({
			id: resource.id,
			kind: resource.kind,
			path: resource.path,
			...(resource.resourceSpecId === undefined
				? {}
				: {
						resourceSpecId: resource.resourceSpecId,
						pipelineId: resource.pipelineId,
						pipelineVersion: resource.pipelineVersion,
					}),
			checksum: resource.checksum,
			byteLength: resource.byteLength,
		})),
	};
}

function payloadById(pack, resourceId) {
	const payload = pack.payloads.find(
		(candidate) => candidate.id === resourceId,
	);
	expect(
		payload !== undefined,
		`${pack.packageName} missing generated payload ${resourceId}.`,
	);
	return payload;
}

function payloadJson(pack, resourceId) {
	return JSON.parse(payloadById(pack, resourceId).resourceText);
}

function tsvDataRows(text) {
	const [, ...rows] = text
		.split(/\r?\n/u)
		.filter((line) => line.trim().length > 0)
		.map((line) => line.split("\t"));
	return rows;
}

function metricResult(value, operator, threshold) {
	if (operator === "exists") return value === undefined ? "fail" : "pass";
	if (operator === "eq") return value === threshold ? "pass" : "fail";
	if (typeof value !== "number" || typeof threshold !== "number") {
		return "warning";
	}
	if (operator === "gte") return value >= threshold ? "pass" : "fail";
	if (operator === "gt") return value > threshold ? "pass" : "fail";
	if (operator === "lte") return value <= threshold ? "pass" : "fail";
	if (operator === "lt") return value < threshold ? "pass" : "fail";
	return "warning";
}

function evaluationRecord(pack, options) {
	const metric = {
		name: options.metricName,
		value: options.value,
		unit: options.unit,
		...(options.operator === undefined ? {} : { operator: options.operator }),
		...(options.threshold === undefined
			? {}
			: { threshold: options.threshold }),
	};
	const result =
		options.result ??
		metricResult(
			options.value,
			options.operator ?? "exists",
			options.threshold,
		);
	return {
		schemaVersion: "1",
		recordId: options.recordId,
		packageName: pack.packageName,
		resourceSpecId: options.resourceSpecId,
		pipelineId: options.pipelineId,
		capabilitySlot: options.capabilitySlot,
		taskType: options.taskType,
		evaluationKind: options.evaluationKind,
		result,
		metric,
		dataset: {
			sourceIds: pack.sourceIds,
			snapshotIds: pack.snapshotIds,
			...(pack.manifest.targets.languages === undefined
				? {}
				: { languages: pack.manifest.targets.languages }),
			...(pack.manifest.targets.scripts === undefined
				? {}
				: { scripts: pack.manifest.targets.scripts }),
			...(pack.manifest.targets.modalities === undefined
				? {}
				: { modalities: pack.manifest.targets.modalities }),
			...(options.split === undefined ? {} : { split: options.split }),
		},
		evidence: {
			resourceIds: options.resourceIds,
			...(options.sampleSize === undefined
				? {}
				: { sampleSize: options.sampleSize }),
			...(options.observations === undefined
				? {}
				: { observations: options.observations }),
		},
		limitations: options.limitations ?? [],
	};
}

function resourceSpecIdFor(pack) {
	return pack.resourceSpecIds[0] ?? "resource-spec:unknown";
}

function taskPipelineId(pack) {
	return (
		pack.payloads.find((payload) => payload.pipelineId !== undefined)
			?.pipelineId ?? "unknown"
	);
}

function languageRegistryEvaluationRecords(pack) {
	const summary = payloadJson(pack, "bcp47-language-registry-summary");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:language-registry:bcp47-record-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "language-registry",
			taskType: "language-registry.bcp47",
			evaluationKind: "coverage",
			resourceIds: [
				"bcp47-language-subtags",
				"bcp47-language-registry-summary",
			],
			metricName: "recordCount",
			value: summary.recordCount,
			unit: "records",
			operator: "gte",
			threshold: 1,
			observations: {
				countsByType: summary.countsByType,
				fileDate: summary.fileDate,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:language-registry:bcp47-type-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "language-registry",
			taskType: "language-registry.type-coverage",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"bcp47-language-subtags",
				"bcp47-language-registry-summary",
			],
			metricName: "registryTypeCount",
			value: Object.keys(summary.countsByType ?? {}).length,
			unit: "types",
			operator: "gte",
			threshold: 7,
			observations: {
				deprecatedRecordCount: summary.deprecatedRecordCount,
			},
		}),
	];
}

function unicodeFoundationEvaluationRecords(pack) {
	const summary = payloadJson(pack, "unicode-17-core-summary");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:unicode-17:block-range-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "unicode-profile",
			taskType: "unicode-profile.blocks",
			evaluationKind: "coverage",
			resourceIds: ["unicode-17-blocks", "unicode-17-core-summary"],
			metricName: "blockRangeCount",
			value: summary.blockRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				version: summary.version,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:unicode-17:script-range-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "unicode-profile",
			taskType: "unicode-profile.scripts",
			evaluationKind: "coverage",
			resourceIds: ["unicode-17-scripts", "unicode-17-core-summary"],
			metricName: "scriptRangeCount",
			value: summary.scriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:unicode-17:property-alias-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "unicode-profile",
			taskType: "unicode-profile.property-aliases",
			evaluationKind: "coverage",
			resourceIds: [
				"unicode-17-property-value-aliases",
				"unicode-17-core-summary",
			],
			metricName: "propertyValueAliasCount",
			value: summary.propertyValueAliasCount,
			unit: "aliases",
			operator: "gte",
			threshold: 1,
		}),
	];
}

function cldrFoundationEvaluationRecords(pack) {
	const summary = payloadJson(pack, "cldr-48-core-summary");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:cldr-core:likely-subtag-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "locale-profile",
			taskType: "locale-profile.likely-subtags",
			evaluationKind: "coverage",
			resourceIds: ["cldr-48-likely-subtags", "cldr-48-core-summary"],
			metricName: "likelySubtagCount",
			value: summary.likelySubtagCount,
			unit: "mappings",
			operator: "gte",
			threshold: 1,
			observations: {
				cldrVersion: summary.cldrVersion,
				unicodeVersion: summary.unicodeVersion,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:cldr-core:locale-alias-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "locale-profile",
			taskType: "locale-profile.aliases",
			evaluationKind: "coverage",
			resourceIds: ["cldr-48-locale-aliases", "cldr-48-core-summary"],
			metricName: "aliasCount",
			value: summary.aliasCount,
			unit: "aliases",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:cldr-core:script-variant-coverage",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "locale-profile",
			taskType: "locale-profile.script-variants",
			evaluationKind: "coverage",
			resourceIds: ["cldr-48-script-data", "cldr-48-core-summary"],
			metricName: "scriptVariantCount",
			value: summary.scriptVariantCount,
			unit: "variants",
			operator: "gte",
			threshold: 1,
		}),
	];
}

function foundationCompositeEvaluationRecords(pack) {
	const requiredComponents = (pack.components ?? []).filter(
		(component) => component.role === "required",
	);
	return [
		evaluationRecord(pack, {
			recordId: "eval:textpack-foundation:required-component-graph",
			resourceSpecId: pack.specPath ?? resourceSpecIdFor(pack),
			pipelineId: "foundation-composite",
			capabilitySlot: "language-registry",
			taskType: "composite.required-component-graph",
			evaluationKind: "resource-conformance",
			resourceIds: [],
			metricName: "requiredComponentCount",
			value: requiredComponents.length,
			unit: "components",
			operator: "eq",
			threshold: 3,
			observations: {
				requiredComponents: requiredComponents.map(
					(component) => component.packageName,
				),
				capabilitySlots: (pack.capabilitySlots ?? []).map((slot) => slot.slot),
			},
		}),
	];
}

function componentCompositeEvaluationRecords(pack) {
	const requiredComponents = (pack.components ?? []).filter(
		(component) => component.role === "required",
	);
	const primarySlot =
		pack.capabilitySlots.find((slot) => slot.slot !== "quality")?.slot ??
		pack.capabilitySlots[0]?.slot ??
		"composite";
	return [
		evaluationRecord(pack, {
			recordId: `eval:${pack.packageId}:required-component-graph`,
			resourceSpecId: pack.specPath ?? resourceSpecIdFor(pack),
			pipelineId: "component-composite",
			capabilitySlot: primarySlot,
			taskType: "composite.required-component-graph",
			evaluationKind: "resource-conformance",
			resourceIds: [],
			metricName: "requiredComponentCount",
			value: requiredComponents.length,
			unit: "components",
			operator: "eq",
			threshold: requiredComponents.length,
			observations: {
				requiredComponents: requiredComponents.map(
					(component) => component.packageName,
				),
				capabilitySlots: (pack.capabilitySlots ?? []).map((slot) => slot.slot),
			},
		}),
	];
}

function languageCompositeEvaluationRecords(pack) {
	const requiredComponents = (pack.components ?? []).filter(
		(component) => component.role === "required",
	);
	return (pack.capabilitySlots ?? []).map((slot) =>
		evaluationRecord(pack, {
			recordId: `eval:${pack.packageId}:${slot.slot}-component-evidence`,
			resourceSpecId: pack.specPath ?? resourceSpecIdFor(pack),
			pipelineId: "language-composite",
			capabilitySlot: slot.slot,
			taskType: `composite.${slot.slot}.component-evidence`,
			evaluationKind: "resource-conformance",
			resourceIds: [],
			metricName: `${slot.slot}RequiredComponentGraphPresent`,
			value: Number(slot.status === "task-supported"),
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				requiredComponents: requiredComponents.map(
					(component) => component.packageName,
				),
				slotNotes: slot.notes ?? [],
				policySurface: pack.policySurface ?? "default",
			},
			limitations: [
				"Language-composite evidence verifies that the required generated component graph is present and policy-compatible; task-level metrics live in the component packs.",
			],
		}),
	);
}

function camelMorphEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-msa-camel-morph-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:morpheme-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"ar-msa-camel-morph-morphemes",
				"ar-msa-camel-morph-features",
			],
			metricName: "morphemeCount",
			value: quality.morphemeCount,
			unit: "records",
			operator: "gte",
			threshold: 1,
			observations: {
				featureCount: quality.featureCount,
				defaultFeatureCount: quality.defaultFeatureCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:compatibility-tables",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.compatibility",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-msa-camel-morph-compatibility"],
			metricName: "compatibilityCount",
			value: quality.compatibilityCount,
			unit: "records",
			operator: "gte",
			threshold: 1,
			observations: {
				compatibilityCounts: quality.compatibilityCounts,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:tokenization-fields",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.dictionary-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-msa-camel-morph-tokenizations"],
			metricName: "tokenizationFieldCount",
			value: quality.tokenizationFieldCount,
			unit: "fields",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies CAMeL Morph tokenization scheme coverage, not end-to-end clitic segmentation accuracy.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-msa-camel-morph:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-msa-camel-morph-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function udHeadReferenceCoverage(pack, profile) {
	const rows = tsvDataRows(
		payloadById(pack, profile.annotationTableId).resourceText,
	);
	const sentenceTokens = new Map();
	for (const row of rows) {
		const key = `${row[0] ?? ""}\t${row[1] ?? ""}`;
		const tokens = sentenceTokens.get(key) ?? new Set();
		tokens.add(row[2] ?? "");
		sentenceTokens.set(key, tokens);
	}
	let checked = 0;
	let valid = 0;
	for (const row of rows) {
		const key = `${row[0] ?? ""}\t${row[1] ?? ""}`;
		const head = row[6] ?? "";
		checked += 1;
		if (head === "0" || sentenceTokens.get(key)?.has(head) === true) {
			valid += 1;
		}
	}
	return {
		checked,
		valid,
		ratio: checked === 0 ? 0 : Number((valid / checked).toFixed(6)),
	};
}

function udSyntaxEvaluationRecords(pack) {
	const profile = udConlluProfileForPackage(pack.packageName);
	const quality = payloadJson(pack, profile.qualityId);
	const headCoverage = udHeadReferenceCoverage(pack, profile);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:annotation-volume`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "tagging",
			taskType: "tagging.profile",
			evaluationKind: "coverage",
			resourceIds: [
				profile.uposId,
				profile.featureId,
				profile.annotationTableId,
			],
			metricName: "totalTokens",
			value: quality.totalTokens,
			unit: "tokens",
			operator: "gte",
			threshold: 1,
			observations: {
				totalSentences: quality.totalSentences,
				uposPairCount: quality.uposPairCount,
				featureValueCount: quality.featureValueCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:dependency-label-coverage`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "syntax",
			taskType: "syntax.dependency-profile",
			evaluationKind: "coverage",
			resourceIds: [
				profile.dependencyId,
				profile.sentenceProfileId,
				profile.annotationTableId,
			],
			metricName: "dependencyLabelBySplitCount",
			value: quality.dependencyLabelBySplitCount,
			unit: "labels-by-split",
			operator: "gte",
			threshold: 1,
			observations: {
				splits: quality.splits,
			},
		}),
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:head-reference-coverage`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "syntax",
			taskType: "syntax.dependency-integrity",
			evaluationKind: "resource-conformance",
			resourceIds: [profile.annotationTableId],
			metricName: "headReferenceCoverageRatio",
			value: headCoverage.ratio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: headCoverage.checked,
			observations: {
				validHeadReferences: headCoverage.valid,
			},
		}),
		evaluationRecord(pack, {
			recordId: `${profile.evalPrefix}:no-raw-text-fields`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.redistribution-integrity",
			evaluationKind: "integrity",
			resourceIds: [profile.qualityId],
			metricName: "rawTextFieldsEmitted",
			value: quality.rawTextFieldsEmitted,
			unit: "boolean",
			operator: "eq",
			threshold: false,
			limitations: [
				"FORM and LEMMA are intentionally excluded; this pack evaluates annotation-derived syntax resources only.",
			],
		}),
	];
}

function englishWordnetLexiconEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-wordnet-lexicon-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-wordnet-lexicon:lexical-entry-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.lookup",
			evaluationKind: "coverage",
			resourceIds: [
				"en-wordnet-lexical-entries",
				"en-wordnet-lexicon-canonical",
			],
			metricName: "lexicalEntryCount",
			value: quality.lexicalEntryCount,
			unit: "entries",
			operator: "gte",
			threshold: 1,
			observations: {
				lexicalEntriesByPartOfSpeech: quality.lexicalEntriesByPartOfSpeech,
			},
			limitations: [
				"This verifies Open English WordNet lexical-entry coverage; it does not claim complete spelling-list, frequency, or inflectional morphology coverage.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-wordnet-lexicon:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-wordnet-lexicon-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function esdbWordlistEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-esdb-wordlist-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:default-profile-count",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.spelling-wordlist",
			evaluationKind: "coverage",
			resourceIds: [
				"en-esdb-default-wordlists",
				"en-esdb-default-profiles",
				"en-esdb-wordlist-lexicon-canonical",
			],
			metricName: "profileCount",
			value: quality.profileCount,
			unit: "profiles",
			operator: "eq",
			threshold: 5,
			observations: {
				wordCountsByProfile: quality.wordCountsByProfile,
			},
			limitations: [
				"Profiles cover generated default regional spell-checker wordlists only; ESDB large dictionaries and unstable database internals are not included.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:word-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.spelling-wordlist",
			evaluationKind: "coverage",
			resourceIds: [
				"en-esdb-default-wordlists",
				"en-esdb-wordlist-lexicon-canonical",
			],
			metricName: "uniqueWordCount",
			value: quality.uniqueWordCount,
			unit: "words",
			operator: "gte",
			threshold: 100000,
			observations: {
				totalWordRows: quality.totalWordRows,
				sharedWordCount: quality.sharedWordCount,
			},
			limitations: [
				"This is a spelling-form wordlist volume check, not proof of complete English lexicon or morphology coverage.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:search-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.analyzer-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["en-esdb-wordlist-search-profile"],
			metricName: "searchProfileCount",
			value: 1,
			unit: "profiles",
			operator: "eq",
			threshold: 1,
			limitations: [
				"The search profile declares analyzer resources and wordlist membership hooks; it is not a full search index.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-esdb-wordlist:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-esdb-wordlist-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
			observations: {
				duplicateWithinProfileCount: quality.duplicateWithinProfileCount,
			},
		}),
	];
}

function englishCoreEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-core-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-core:iana-language-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.language-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["en-core-language-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "en-Latn-US",
			observations: {
				ianaFileDate: quality.ianaFileDate,
				ianaSuppressScript: quality.ianaSuppressScript,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:latin-orthography-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.orthography",
			evaluationKind: "coverage",
			resourceIds: ["en-core-orthography"],
			metricName: "latinScriptRangeCount",
			value: quality.latinScriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:unicode-punctuation-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.punctuation",
			evaluationKind: "coverage",
			resourceIds: ["en-core-punctuation"],
			metricName: "punctuationRangeCount",
			value: quality.punctuationRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:scowl-abbreviation-rows",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.abbreviation-table",
			evaluationKind: "coverage",
			resourceIds: ["en-core-abbreviations"],
			metricName: "abbreviationCount",
			value: quality.abbreviationCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
			limitations: [
				"SCOWLv2 abbreviation rows are lexical/POS resources; they are not a sentence-boundary disambiguation model.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:scowl-function-word-rows",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.stoplist-candidates",
			evaluationKind: "coverage",
			resourceIds: ["en-core-function-words"],
			metricName: "functionWordCount",
			value: quality.functionWordCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
			limitations: [
				"Rows are SCOWLv2 closed-class POS records with SCOWL size <= 60; they are not corpus-frequency stopword weights.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:basic-segmentation-baseline",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.basic-segmentation",
			evaluationKind: "coverage",
			resourceIds: ["en-core-basic-segmentation"],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				graphemeRangeCount: quality.graphemeRangeCount,
				sentenceRangeCount: quality.sentenceRangeCount,
			},
			limitations: [
				"This verifies a basic Unicode UAX #29 segmentation baseline; richer English segmentation is provided by textpack-en-segmentation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-core:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-core-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function frenchCoreEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-core-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:fr-core:iana-language-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.language-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["fr-core-language-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "fr-Latn-FR",
			observations: {
				ianaFileDate: quality.ianaFileDate,
				ianaSuppressScript: quality.ianaSuppressScript,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:latin-orthography-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.orthography",
			evaluationKind: "coverage",
			resourceIds: ["fr-core-orthography"],
			metricName: "latinScriptRangeCount",
			value: quality.latinScriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:unicode-punctuation-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.punctuation",
			evaluationKind: "coverage",
			resourceIds: ["fr-core-punctuation"],
			metricName: "punctuationRangeCount",
			value: quality.punctuationRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:basic-segmentation-baseline",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.basic-segmentation",
			evaluationKind: "coverage",
			resourceIds: ["fr-core-basic-segmentation"],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				graphemeRangeCount: quality.graphemeRangeCount,
				sentenceRangeCount: quality.sentenceRangeCount,
			},
			limitations: [
				"This verifies a basic Unicode UAX #29 segmentation baseline; richer French segmentation is provided by textpack-fr-segmentation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-core:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["fr-core-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function arabicCoreEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-core-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-core:iana-language-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.language-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-core-language-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "ar-Arab-EG",
			observations: {
				ianaFileDate: quality.ianaFileDate,
				ianaSuppressScript: quality.ianaSuppressScript,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:arabic-orthography-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.orthography",
			evaluationKind: "coverage",
			resourceIds: ["ar-core-orthography"],
			metricName: "arabicScriptRangeCount",
			value: quality.arabicScriptRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:unicode-punctuation-ranges",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.punctuation",
			evaluationKind: "coverage",
			resourceIds: ["ar-core-punctuation"],
			metricName: "punctuationRangeCount",
			value: quality.punctuationRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:basic-segmentation-baseline",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "core",
			taskType: "core.basic-segmentation",
			evaluationKind: "coverage",
			resourceIds: ["ar-core-basic-segmentation"],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			observations: {
				graphemeRangeCount: quality.graphemeRangeCount,
				sentenceRangeCount: quality.sentenceRangeCount,
			},
			limitations: [
				"This verifies a basic Unicode UAX #29 segmentation baseline; richer Arabic MSA tokenization resources are provided by textpack-ar-segmentation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-core:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-core-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function unicodeCldrNormalizationEvaluationRecords(pack, config) {
	const quality = payloadJson(pack, config.normalizationOutputIds.quality);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:profile-rules`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.profile",
			evaluationKind: "resource-conformance",
			resourceIds: [
				config.normalizationOutputIds.rules,
				config.normalizationOutputIds.profile,
			],
			metricName: "ruleCount",
			value: quality.ruleCount,
			unit: "rules",
			operator: "gte",
			threshold: 3,
			limitations: [
				"This verifies the generated Unicode/CLDR normalization profile, not spelling correction or noisy-text normalization accuracy.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:unicode-nfc-evidence`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.unicode-nfc-policy",
			evaluationKind: "coverage",
			resourceIds: [config.normalizationOutputIds.profile],
			metricName: "nfcQuickCheckValueCount",
			value: quality.nfcQuickCheckValueCount,
			unit: "aliases",
			operator: "gte",
			threshold: 3,
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:cldr-likely-subtag`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.locale-context",
			evaluationKind: "coverage",
			resourceIds: [config.normalizationOutputIds.profile],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: config.likelySubtag,
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-normalization:transform-rejections`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: [config.normalizationOutputIds.quality],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function englishNormalizationEvaluationRecords(pack) {
	return unicodeCldrNormalizationEvaluationRecords(
		pack,
		unicodeCldrLatinProfiles.en,
	);
}

function frenchNormalizationEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-normalization-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		...unicodeCldrNormalizationEvaluationRecords(
			pack,
			unicodeCldrLatinProfiles.fr,
		),
		evaluationRecord(pack, {
			recordId: "eval:fr-normalization:observed-elision-prefixes",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.elision-apostrophe-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-normalization-elision-prefixes",
				"fr-normalization-profile",
			],
			metricName: "elisionPrefixCount",
			value: quality.elisionPrefixCount,
			unit: "prefixes",
			operator: "gte",
			threshold: 10,
			observations: {
				elisionObservationCount: quality.elisionObservationCount,
				apostropheCounts: quality.apostropheCounts,
				tatoebaSentenceRowCount: quality.tatoebaSentenceRowCount,
			},
			limitations: [
				"This verifies observed modern French apostrophe/elision surface policy from Tatoeba; it is not historical or OCR normalization.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-normalization:observed-contraction-forms",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.contraction-surface-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-normalization-contraction-forms",
				"fr-normalization-profile",
			],
			metricName: "contractionFormCount",
			value: quality.contractionFormCount,
			unit: "forms",
			operator: "eq",
			threshold: 4,
			observations: {
				contractionObservationCount: quality.contractionObservationCount,
			},
			limitations: [
				"This records French contraction surface forms observed in the pinned Tatoeba corpus; syntactic expansion lives in syntax/treebank resources.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-normalization:gold-cases",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.gold-cases",
			evaluationKind: "gold-evaluation",
			resourceIds: [
				"fr-normalization-gold-cases",
				"fr-normalization-profile",
			],
			metricName: "normalizationGoldCaseCount",
			value: quality.normalizationGoldCaseCount,
			unit: "cases",
			operator: "gte",
			threshold: 10,
		}),
	];
}

function arabicNormalizationEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-normalization-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:profile-rules",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-normalization-rules", "ar-normalization-profile"],
			metricName: "ruleCount",
			value: quality.ruleCount,
			unit: "rules",
			operator: "gte",
			threshold: 7,
			limitations: [
				"This verifies the generated Arabic MSA lookup normalization profile, not dialectal normalization, transliteration, spelling correction, OCR cleanup, or noisy-text normalization accuracy.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:unicode-nfc-evidence",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.unicode-nfc-policy",
			evaluationKind: "coverage",
			resourceIds: ["ar-normalization-profile"],
			metricName: "nfcQuickCheckValueCount",
			value: quality.nfcQuickCheckValueCount,
			unit: "aliases",
			operator: "gte",
			threshold: 3,
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:cldr-likely-subtag",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.locale-context",
			evaluationKind: "coverage",
			resourceIds: ["ar-normalization-profile"],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: "ar-Arab-EG",
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:camel-evidence-codepoints",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "normalization",
			taskType: "normalization.source-evidence",
			evaluationKind: "coverage",
			resourceIds: [
				"ar-normalization-observed-codepoints",
				"ar-normalization-profile",
			],
			metricName: "observedEvidenceCodePointCount",
			value: quality.observedEvidenceCodePointCount,
			unit: "codepoints",
			operator: "gte",
			threshold: 1,
			observations: {
				observedFieldCount: quality.observedFieldCount,
				equivalenceClassCount: quality.equivalenceClassCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-normalization:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-normalization-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function unicodeCldrSegmentationEvaluationRecords(pack, config) {
	const quality = payloadJson(pack, config.segmentationOutputIds.quality);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:grapheme-boundary-properties`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.grapheme-profile",
			evaluationKind: "coverage",
			resourceIds: [
				config.segmentationOutputIds.boundaryProperties,
				config.segmentationOutputIds.grapheme,
			],
			metricName: "graphemeRangeCount",
			value: quality.graphemeRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies Unicode grapheme break property coverage, not language-specific dictionary tokenization.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:word-boundary-properties`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.word-profile",
			evaluationKind: "coverage",
			resourceIds: [
				config.segmentationOutputIds.boundaryProperties,
				config.segmentationOutputIds.word,
			],
			metricName: "wordRangeCount",
			value: quality.wordRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies Unicode word break property coverage, not a trained tokenizer or abbreviation model.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:sentence-boundary-properties`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.sentence-profile",
			evaluationKind: "coverage",
			resourceIds: [
				config.segmentationOutputIds.boundaryProperties,
				config.segmentationOutputIds.sentence,
			],
			metricName: "sentenceRangeCount",
			value: quality.sentenceRangeCount,
			unit: "ranges",
			operator: "gte",
			threshold: 1,
			limitations: [
				"This verifies Unicode sentence break property coverage; English abbreviation tailoring is out of scope for this component.",
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:cldr-likely-subtag`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.locale-context",
			evaluationKind: "coverage",
			resourceIds: [config.segmentationOutputIds.word],
			metricName: "likelySubtag",
			value: quality.likelySubtag,
			unit: "tag",
			operator: "eq",
			threshold: config.likelySubtag,
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.languageTag}-segmentation:transform-rejections`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: [config.segmentationOutputIds.quality],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function englishSegmentationEvaluationRecords(pack) {
	return unicodeCldrSegmentationEvaluationRecords(
		pack,
		unicodeCldrLatinProfiles.en,
	);
}

function frenchSegmentationEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-segmentation-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		...unicodeCldrSegmentationEvaluationRecords(
			pack,
			unicodeCldrLatinProfiles.fr,
		),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:observed-elision-token-policy",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.elision-token-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-elision-prefixes",
			],
			metricName: "elisionPrefixCount",
			value: quality.elisionPrefixCount,
			unit: "prefixes",
			operator: "gte",
			threshold: 10,
			observations: {
				elisionObservationCount: quality.elisionObservationCount,
				tatoebaSentenceRowCount: quality.tatoebaSentenceRowCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:observed-contraction-token-policy",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.contraction-surface-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-contraction-forms",
			],
			metricName: "contractionFormCount",
			value: quality.contractionFormCount,
			unit: "forms",
			operator: "eq",
			threshold: 4,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:observed-abbreviation-policy",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.abbreviation-period-policy",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-abbreviations",
			],
			metricName: "abbreviationCandidateCount",
			value: quality.abbreviationCandidateCount,
			unit: "forms",
			operator: "gte",
			threshold: 1,
			limitations: [
				"Abbreviation rows are high-frequency period-bearing candidates observed in Tatoeba; domain-specific abbreviations belong in domain packs.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-segmentation:gold-cases",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "segmentation",
			taskType: "segmentation.gold-cases",
			evaluationKind: "gold-evaluation",
			resourceIds: [
				"fr-token-segmentation-profile",
				"fr-segmentation-gold-cases",
			],
			metricName: "segmentationGoldCaseCount",
			value: quality.segmentationGoldCaseCount,
			unit: "cases",
			operator: "gte",
			threshold: 10,
		}),
	];
}

function scowlInflectionEvaluationRecords(pack) {
	const quality = payloadJson(pack, "en-scowl-inflection-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:lemma-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.inflection-inventory",
			evaluationKind: "coverage",
			resourceIds: [
				"en-scowl-inflection-entries",
				"en-scowl-inflection-morphology-canonical",
			],
			metricName: "uniqueLemmaCount",
			value: quality.uniqueLemmaCount,
			unit: "lemmas",
			operator: "gte",
			threshold: 100000,
			observations: {
				inflectionRowCount: quality.inflectionRowCount,
				uniqueFormCount: quality.uniqueFormCount,
				lookupAnalyzerRowCount: quality.lookupAnalyzerRowCount,
				lookupGeneratorRowCount: quality.lookupGeneratorRowCount,
			},
			limitations: [
				"This verifies SCOWLv2 POS and inflection inventory volume; lookup analysis and generation are source-scope candidate tables, not context-disambiguating morphology.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:lookup-analyzer-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-analyzer",
			evaluationKind: "coverage",
			resourceIds: [
				"en-scowl-lookup-analyzer",
				"en-scowl-inflection-morphology-canonical",
			],
			metricName: "lookupAnalyzerRowCount",
			value: quality.lookupAnalyzerRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
			observations: {
				uniqueFormCount: quality.uniqueFormCount,
				uniqueLemmaCount: quality.uniqueLemmaCount,
			},
			limitations: [
				"Lookup analyzer rows return SCOWLv2 candidate lemmas and POS metadata; they do not perform context disambiguation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:lookup-generator-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-generator",
			evaluationKind: "coverage",
			resourceIds: [
				"en-scowl-lookup-generator",
				"en-scowl-inflection-morphology-canonical",
			],
			metricName: "lookupGeneratorRowCount",
			value: quality.lookupGeneratorRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
			observations: {
				derivedFormCount: quality.derivedFormCount,
				uniqueLemmaCount: quality.uniqueLemmaCount,
			},
			limitations: [
				"Lookup generator rows return SCOWLv2 candidate forms for a lemma; they do not rank forms by corpus frequency or context.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:derived-form-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.inflection-inventory",
			evaluationKind: "coverage",
			resourceIds: ["en-scowl-inflection-entries"],
			metricName: "derivedFormCount",
			value: quality.derivedFormCount,
			unit: "forms",
			operator: "gte",
			threshold: 1,
			limitations: [
				"Derived forms come from the pinned SCOWLv2 text export and preserve source release scope.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:pos-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.pos-inventory",
			evaluationKind: "resource-conformance",
			resourceIds: ["en-scowl-pos-inventory"],
			metricName: "posInventoryCount",
			value: quality.posInventoryCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
		}),
		evaluationRecord(pack, {
			recordId: "eval:en-scowl-inflection:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["en-scowl-inflection-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function lexiqueEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-lexique-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:entry-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.entry-inventory",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-lexique-entries",
				"fr-lexique-lexicon-canonical",
			],
			metricName: "entryCount",
			value: quality.entryCount,
			unit: "entries",
			operator: "gte",
			threshold: 100000,
			observations: {
				uniqueFormCount: quality.uniqueFormCount,
				uniqueLemmaCount: quality.uniqueLemmaCount,
			},
			limitations: [
				"Lexique 3.83 is an isolated share-alike lexical database and does not unlock the default French composite.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:lemma-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexicon",
			taskType: "lexicon.lemma-inventory",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-lexique-lemmas",
				"fr-lexique-lexicon-canonical",
			],
			metricName: "lemmaCount",
			value: quality.lemmaCount,
			unit: "lemmas",
			operator: "gte",
			threshold: 50000,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-lexique:pos-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.pos-inventory",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"fr-lexique-pos-inventory",
				"fr-lexique-morphology-canonical",
			],
			metricName: "posInventoryCount",
			value: quality.posInventoryCount,
			unit: "rows",
			operator: "gte",
			threshold: 1,
			observations: {
				inflectedVerbRowCount: quality.inflectedVerbRowCount,
				genderCounts: quality.genderCounts,
				numberCounts: quality.numberCounts,
			},
		}),
			evaluationRecord(pack, {
				recordId: "eval:fr-lexique:search-profile",
				resourceSpecId,
				pipelineId,
			capabilitySlot: "search",
			taskType: "search.analyzer-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["fr-lexique-search-profile"],
			metricName: "searchProfilePresent",
			value: 1,
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			limitations: [
				"The search profile is source-backed by Lexique form/lemma data; it is not a corpus-trained French ranking profile.",
				],
			}),
			evaluationRecord(pack, {
				recordId: "eval:fr-lexique:search-elision-prefixes",
				resourceSpecId,
				pipelineId,
				capabilitySlot: "search",
				taskType: "search.elision-apostrophe-policy",
				evaluationKind: "coverage",
				resourceIds: [
					"fr-lexique-search-profile",
					"fr-lexique-search-elision-prefixes",
				],
				metricName: "searchElisionPrefixCount",
				value: quality.searchElisionPrefixCount,
				unit: "prefixes",
				operator: "gte",
				threshold: 10,
				observations: {
					tatoebaSentenceRowCount: quality.tatoebaSentenceRowCount,
				},
			}),
			evaluationRecord(pack, {
				recordId: "eval:fr-lexique:search-contraction-forms",
				resourceSpecId,
				pipelineId,
				capabilitySlot: "search",
				taskType: "search.contraction-surface-policy",
				evaluationKind: "coverage",
				resourceIds: [
					"fr-lexique-search-profile",
					"fr-lexique-search-contraction-forms",
				],
				metricName: "searchContractionFormCount",
				value: quality.searchContractionFormCount,
				unit: "forms",
				operator: "eq",
				threshold: 4,
			}),
			evaluationRecord(pack, {
				recordId: "eval:fr-lexique:search-gold-cases",
				resourceSpecId,
				pipelineId,
				capabilitySlot: "search",
				taskType: "search.gold-cases",
				evaluationKind: "gold-evaluation",
				resourceIds: [
					"fr-lexique-search-profile",
					"fr-lexique-search-gold-cases",
				],
				metricName: "searchGoldCaseCount",
				value: quality.searchGoldCaseCount,
				unit: "cases",
				operator: "gte",
				threshold: 10,
				limitations: [
					"Gold cases verify analyzer policy coverage for observed Tatoeba surface forms; ranked retrieval evaluation belongs in corpus/search benchmark packs.",
				],
			}),
			evaluationRecord(pack, {
				recordId: "eval:fr-lexique:transform-rejections",
				resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["fr-lexique-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function frenchUnimorphEvaluationRecords(pack) {
	const quality = payloadJson(pack, "fr-unimorph-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:entry-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.paradigm-table",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-unimorph-paradigms",
				"fr-unimorph-morphology-canonical",
			],
			metricName: "entryCount",
			value: quality.entryCount,
			unit: "entries",
			operator: "gte",
			threshold: 100000,
			observations: {
				uniqueLemmaCount: quality.uniqueLemmaCount,
				uniqueFormCount: quality.uniqueFormCount,
				featureValueCount: quality.featureValueCount,
			},
			limitations: [
				"UniMorph French is an isolated share-alike paradigm source and does not unlock the default French composite.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:lookup-analyzer-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-analyzer",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-unimorph-lookup-analyzer",
				"fr-unimorph-morphology-canonical",
			],
			metricName: "lookupAnalyzerRowCount",
			value: quality.lookupAnalyzerRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:lookup-generator-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.lookup-generator",
			evaluationKind: "coverage",
			resourceIds: [
				"fr-unimorph-lookup-generator",
				"fr-unimorph-morphology-canonical",
			],
			metricName: "lookupGeneratorRowCount",
			value: quality.lookupGeneratorRowCount,
			unit: "rows",
			operator: "gte",
			threshold: 100000,
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:feature-inventory",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "morphology",
			taskType: "morphology.feature-inventory",
			evaluationKind: "resource-conformance",
			resourceIds: [
				"fr-unimorph-feature-inventory",
				"fr-unimorph-pos-inventory",
			],
			metricName: "featureValueCount",
			value: quality.featureValueCount,
			unit: "features",
			operator: "gte",
			threshold: 1,
			observations: {
				partOfSpeechCount: quality.partOfSpeechCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: "eval:fr-unimorph:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["fr-unimorph-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function arabicSearchEvaluationRecords(pack) {
	const quality = payloadJson(pack, "ar-search-quality");
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	return [
		evaluationRecord(pack, {
			recordId: "eval:ar-search:analyzer-profile",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.analyzer-profile",
			evaluationKind: "resource-conformance",
			resourceIds: ["ar-search-profile"],
			metricName: "analyzerProfilePresent",
			value: 1,
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				likelySubtag: quality.likelySubtag,
				tokenizationFieldCount: quality.tokenizationFieldCount,
			},
			limitations: [
				"This verifies a source-backed Arabic MSA analyzer profile; it does not verify persistent index behavior or corpus-derived ranking.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-search:wordnet-synonym-volume",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.synonym-expansion",
			evaluationKind: "coverage",
			resourceIds: ["ar-search-wordnet-synonyms"],
			metricName: "synonymPairCount",
			value: quality.synonymPairCount,
			unit: "pairs",
			operator: "gte",
			threshold: 1,
			observations: {
				wordnetLexicalEntryCount: quality.wordnetLexicalEntryCount,
				wordnetSynsetWithSynonymCount: quality.wordnetSynsetWithSynonymCount,
			},
			limitations: [
				"Synonym hooks come from Arabic WordNet synset membership; they are optional query expansion candidates, not ranked semantic search.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-search:camel-morphology-hooks",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "search",
			taskType: "search.morphology-hooks",
			evaluationKind: "coverage",
			resourceIds: ["ar-search-morphology-hooks"],
			metricName: "morphologyHookCount",
			value: quality.morphologyHookCount,
			unit: "hooks",
			operator: "gte",
			threshold: 1,
			observations: {
				morphemeCount: quality.morphemeCount,
			},
			limitations: [
				"CAMeL Morph hooks expose source-backed lookup fields for analyzer construction; they do not perform context disambiguation.",
			],
		}),
		evaluationRecord(pack, {
			recordId: "eval:ar-search:transform-rejections",
			resourceSpecId,
			pipelineId,
			capabilitySlot: "quality",
			taskType: "quality.transform-integrity",
			evaluationKind: "integrity",
			resourceIds: ["ar-search-quality"],
			metricName: "recordsRejected",
			value: quality.recordsRejected,
			unit: "records",
			operator: "eq",
			threshold: 0,
		}),
	];
}

function wordnetLinkCoverage(pack, ids) {
	const entryRows = tsvDataRows(
		payloadById(pack, ids.lexicalEntries).resourceText,
	);
	const senseRows = tsvDataRows(
		payloadById(pack, ids.senses).resourceText,
	);
	const synsetRows = tsvDataRows(
		payloadById(pack, ids.synsets).resourceText,
	);
	const relationRows = tsvDataRows(
		payloadById(pack, ids.relations).resourceText,
	);
	const entryIds = new Set(entryRows.map((row) => row[0] ?? ""));
	const senseIds = new Set(senseRows.map((row) => row[0] ?? ""));
	const synsetIds = new Set(synsetRows.map((row) => row[0] ?? ""));
	let sensesWithKnownEntry = 0;
	let sensesWithKnownSynset = 0;
	for (const row of senseRows) {
		if (entryIds.has(row[1] ?? "")) sensesWithKnownEntry += 1;
		if (synsetIds.has(row[4] ?? "")) sensesWithKnownSynset += 1;
	}
	let relationsWithKnownEndpoints = 0;
	for (const row of relationRows) {
		const scope = row[0] ?? "";
		const ids = scope === "sense" ? senseIds : synsetIds;
		if (ids.has(row[1] ?? "") && ids.has(row[3] ?? "")) {
			relationsWithKnownEndpoints += 1;
		}
	}
	return {
		senseCount: senseRows.length,
		relationCount: relationRows.length,
		sensesWithKnownEntry,
		sensesWithKnownSynset,
		relationsWithKnownEndpoints,
		senseEntryCoverageRatio:
			senseRows.length === 0
				? 0
				: Number((sensesWithKnownEntry / senseRows.length).toFixed(6)),
		senseSynsetCoverageRatio:
			senseRows.length === 0
				? 0
				: Number((sensesWithKnownSynset / senseRows.length).toFixed(6)),
		relationEndpointCoverageRatio:
			relationRows.length === 0
				? 0
				: Number(
						(relationsWithKnownEndpoints / relationRows.length).toFixed(6),
					),
	};
}

function wordnetEvaluationRecords(pack, config) {
	const ids = {
		lexicalEntries: `${config.resourcePrefix}-lexical-entries`,
		quality: `${config.resourcePrefix}-quality`,
		relations: `${config.resourcePrefix}-relations`,
		senses: `${config.resourcePrefix}-senses`,
		synsets: `${config.resourcePrefix}-synsets`,
	};
	const quality = payloadJson(pack, ids.quality);
	const coverage = wordnetLinkCoverage(pack, ids);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const relationResult =
		coverage.relationEndpointCoverageRatio === 1 ? "pass" : "warning";
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:lexical-entry-volume`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexical-semantics",
			taskType: "kb.lexical-semantics",
			evaluationKind: "coverage",
			resourceIds: [ids.lexicalEntries, ids.senses, ids.synsets],
			metricName: "senseCount",
			value: quality.senseCount,
			unit: "senses",
			operator: "gte",
			threshold: 1,
			observations: {
				lexicalEntryCount: quality.lexicalEntryCount,
				synsetCount: quality.synsetCount,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:sense-entry-links`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexical-semantics",
			taskType: "kb.sense-linking",
			evaluationKind: "resource-conformance",
			resourceIds: [ids.lexicalEntries, ids.senses],
			metricName: "senseEntryCoverageRatio",
			value: coverage.senseEntryCoverageRatio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: coverage.senseCount,
			observations: {
				sensesWithKnownEntry: coverage.sensesWithKnownEntry,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:sense-synset-links`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexical-semantics",
			taskType: "kb.synset-linking",
			evaluationKind: "resource-conformance",
			resourceIds: [ids.senses, ids.synsets],
			metricName: "senseSynsetCoverageRatio",
			value: coverage.senseSynsetCoverageRatio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			sampleSize: coverage.senseCount,
			observations: {
				sensesWithKnownSynset: coverage.sensesWithKnownSynset,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}:relation-endpoints`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "lexical-semantics",
			taskType: "kb.semantic-relations",
			evaluationKind: "resource-conformance",
			resourceIds: [ids.relations],
			metricName: "relationEndpointCoverageRatio",
			value: coverage.relationEndpointCoverageRatio,
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			result: relationResult,
			sampleSize: coverage.relationCount,
			observations: {
				relationsWithKnownEndpoints: coverage.relationsWithKnownEndpoints,
				relationCount: quality.relationCount,
			},
			limitations:
				relationResult === "pass"
					? []
					: [
							`Some ${config.sourceLabel} relation endpoints reference ids outside the generated in-package endpoint set.`,
						],
		}),
	];
}

function wikidataArtifactEvaluationRecords(pack, config) {
	const quality = payloadJson(pack, `${config.resourcePrefix}-quality`);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const materialized = typeof quality.entityRowCount === "number";
	if (materialized) {
		return [
			evaluationRecord(pack, {
				recordId: `eval:${config.resourcePrefix}:entity-extract`,
				resourceSpecId,
				pipelineId,
				capabilitySlot: "kb",
				taskType: "kb.entity-extract",
				evaluationKind: "resource-conformance",
				resourceIds: [
					`${config.resourcePrefix}-entities`,
					`${config.resourcePrefix}-kb-canonical`,
				],
				metricName: "entityRowCount",
				value: quality.entityRowCount,
				unit: "rows",
				operator: "gte",
				threshold: 1000,
				observations: {
					extractId: quality.extractId,
					endpoint: quality.endpoint,
					version: quality.version,
				},
				limitations: [
					`The Wikidata ${config.languageName} extract is scoped to declared core entity classes and thresholds; it is not a full Wikidata dump.`,
				],
			}),
			evaluationRecord(pack, {
				recordId: `eval:${config.resourcePrefix}:alias-coverage`,
				resourceSpecId,
				pipelineId,
				capabilitySlot: "kb",
				taskType: "kb.entity-aliases",
				evaluationKind: "coverage",
				resourceIds: [`${config.resourcePrefix}-aliases`],
				metricName: "aliasRowCount",
				value: quality.aliasRowCount,
				unit: "rows",
				operator: "gte",
				threshold: 1000,
				observations: {
					entityRowCount: quality.entityRowCount,
					aliasRowCount: quality.aliasRowCount,
				},
			}),
			evaluationRecord(pack, {
				recordId: `eval:${config.resourcePrefix}:relation-coverage`,
				resourceSpecId,
				pipelineId,
				capabilitySlot: "kb",
				taskType: "kb.entity-relations",
				evaluationKind: "coverage",
				resourceIds: [`${config.resourcePrefix}-relations`],
				metricName: "relationRowCount",
				value: quality.relationRowCount,
				unit: "rows",
				operator: "gte",
				threshold: 1000,
				observations: {
					relationRowCount: quality.relationRowCount,
				},
			}),
		];
	}
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.resourcePrefix}:artifact-descriptor`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.entity-artifact",
			evaluationKind: "resource-conformance",
			resourceIds: [`${config.resourcePrefix}-kb-artifact`],
			metricName: "artifactSizeBytes",
			value: quality.sizeBytes,
			unit: "bytes",
			operator: "gte",
			threshold: 1,
			observations: {
				artifactId: quality.artifactId,
				sourceUrl: quality.sourceUrl,
				version: quality.version,
			},
			limitations: [
				`The full Wikidata entity dump for ${config.languageName} KB consumers is artifact-backed and is not available to runtime lookup until explicitly fetched.`,
			],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.resourcePrefix}:checksum-sidecar`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "kb",
			taskType: "kb.artifact-checksum",
			evaluationKind: "resource-conformance",
			resourceIds: [`${config.resourcePrefix}-quality`],
			metricName: "upstreamSha1ChecksumPresent",
			value: Number(
				typeof quality.sha1Checksum === "string" &&
					quality.sha1Checksum.startsWith("sha1:"),
			),
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				sha1Checksum: quality.sha1Checksum,
				md5Checksum: quality.md5Checksum,
			},
			limitations: [
				"Wikimedia publishes SHA-1 and MD5 sidecars for this dump; no upstream SHA-256 sidecar was available for this pinned artifact.",
			],
		}),
	];
}

function tatoebaCorpusEvaluationRecords(pack, config) {
	const quality = payloadJson(
		pack,
		`${config.resourcePrefix}-tatoeba-corpus-quality`,
	);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const materialized = typeof quality.materializedRowCount === "number";
	return [
		evaluationRecord(pack, {
			recordId: materialized
				? `eval:${config.evaluationPrefix}-corpus:materialized-rows`
				: `eval:${config.evaluationPrefix}-corpus:artifact-descriptor`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "corpus",
			taskType: materialized
				? "corpus.materialized-rows"
				: "corpus.artifact",
			evaluationKind: "resource-conformance",
			resourceIds: [
				materialized
					? `${config.resourcePrefix}-tatoeba-corpus-sentences`
					: `${config.resourcePrefix}-tatoeba-corpus-artifact`,
			],
			metricName: "sentenceRowCount",
			value: materialized ? quality.materializedRowCount : quality.rowCount,
			unit: "rows",
			operator: "gte",
			threshold: config.rowCountThreshold,
			observations: materialized
				? {
						artifactId: quality.artifactId,
						localResourceId: quality.localResourceId,
						localResourceChecksum: quality.localResourceChecksum,
						sourceUrl: quality.sourceUrl,
						sha256Checksum: quality.sha256Checksum,
					}
				: {
						artifactId: quality.artifactId,
						sourceUrl: quality.sourceUrl,
						sha256Checksum: quality.sha256Checksum,
					},
			limitations: materialized
				? [
						`The Tatoeba ${config.languageName} corpus rows are local sentence rows from the detailed export; they are example sentences, not a balanced reference corpus.`,
					]
				: [
						`The Tatoeba ${config.languageName} corpus is artifact-backed and is not available as raw text until explicitly fetched.`,
					],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-corpus:checksum`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "corpus",
			taskType: "corpus.source-artifact-checksum",
			evaluationKind: "integrity",
			resourceIds: [`${config.resourcePrefix}-tatoeba-corpus-quality`],
			metricName: "sha256ChecksumPresent",
			value: Number(
				typeof quality.sha256Checksum === "string" &&
					quality.sha256Checksum.startsWith("sha256:"),
			),
			unit: "boolean",
			operator: "eq",
			threshold: 1,
			observations: {
				sha256Checksum: quality.sha256Checksum,
			},
		}),
	];
}

function tatoebaEnglishCorpusEvaluationRecords(pack) {
	return tatoebaCorpusEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-en",
		languageName: "English",
		resourcePrefix: "en",
		rowCountThreshold: 1000000,
	});
}

function tatoebaArabicCorpusEvaluationRecords(pack) {
	return tatoebaCorpusEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-ar",
		languageName: "Arabic",
		resourcePrefix: "ar",
		rowCountThreshold: 50000,
	});
}

function tatoebaFrenchCorpusEvaluationRecords(pack) {
	return tatoebaCorpusEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-fr",
		languageName: "French",
		resourcePrefix: "fr",
		rowCountThreshold: 500000,
	});
}

function tatoebaParallelEvaluationRecords(pack, config) {
	const quality = payloadJson(
		pack,
		`${config.resourcePrefix}-tatoeba-parallel-quality`,
	);
	const resourceSpecId = resourceSpecIdFor(pack);
	const pipelineId = taskPipelineId(pack);
	const materialized = quality.languagePairs.every(
		(pair) => typeof pair.localResourceId === "string",
	);
	const parallelResourceIds = pack.resourceStats
		.map((resource) => resource.id)
		.filter((resourceId) =>
			resourceId.startsWith(`${config.resourcePrefix}-tatoeba-parallel-`),
		)
		.filter((resourceId) => !resourceId.includes("quality"))
		.sort();
	return [
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-parallel:language-pair-coverage`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "parallel",
			taskType: materialized
				? "parallel.materialized-links"
				: "parallel.artifact",
			evaluationKind: "coverage",
			resourceIds: parallelResourceIds,
			metricName: "languagePairCount",
			value: quality.languagePairCount,
			unit: "pairs",
			operator: "gte",
			threshold: config.languagePairThreshold,
			observations: {
				languagePairs: quality.languagePairs,
				artifactIds: quality.artifactIds,
			},
			limitations: materialized
				? [
						"Tatoeba local link tables provide sentence-id alignments; sentence text is resolved from compatible Tatoeba sentence resources.",
					]
				: [
						"Tatoeba link artifacts provide sentence-id alignment tables; sentence text must be resolved from compatible Tatoeba sentence exports.",
					],
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-parallel:link-row-volume`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "parallel",
			taskType: "parallel.alignment-links",
			evaluationKind: "coverage",
			resourceIds: parallelResourceIds,
			metricName: "parallelLinkRowCount",
			value: quality.totalLinkRowCount,
			unit: "rows",
			operator: "gte",
			threshold: config.linkRowThreshold,
			observations: {
				languagePairCount: quality.languagePairCount,
				totalArtifactBytes: quality.totalArtifactBytes,
			},
		}),
		evaluationRecord(pack, {
			recordId: `eval:${config.evaluationPrefix}-parallel:checksum`,
			resourceSpecId,
			pipelineId,
			capabilitySlot: "parallel",
			taskType: materialized
				? "parallel.source-artifact-checksum"
				: "parallel.artifact-checksum",
			evaluationKind: "integrity",
			resourceIds: [`${config.resourcePrefix}-tatoeba-parallel-quality`],
			metricName: "sha256ChecksumCoverageRatio",
			value: Number(
				quality.languagePairs.every((pair) =>
					pair.sha256Checksum.startsWith("sha256:"),
				),
			),
			unit: "ratio",
			operator: "eq",
			threshold: 1,
			observations: {
				languagePairCount: quality.languagePairCount,
			},
		}),
	];
}

function tatoebaEnglishParallelEvaluationRecords(pack) {
	return tatoebaParallelEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-en",
		resourcePrefix: "en",
		languagePairThreshold: 8,
		linkRowThreshold: 1000000,
	});
}

function tatoebaArabicParallelEvaluationRecords(pack) {
	return tatoebaParallelEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-ar",
		resourcePrefix: "ar",
		languagePairThreshold: 4,
		linkRowThreshold: 50000,
	});
}

function tatoebaFrenchParallelEvaluationRecords(pack) {
	return tatoebaParallelEvaluationRecords(pack, {
		evaluationPrefix: "tatoeba-fr",
		resourcePrefix: "fr",
		languagePairThreshold: 4,
		linkRowThreshold: 500000,
	});
}

function evaluationRecordsForPack(pack) {
	if (pack.packageName === "@ismail-elkorchi/textpack-language-registry") {
		return languageRegistryEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-unicode-17") {
		return unicodeFoundationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-cldr-core") {
		return cldrFoundationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-foundation") {
		return foundationCompositeEvaluationRecords(pack);
	}
	if (pack.packClass === "language-composite") {
		return languageCompositeEvaluationRecords(pack);
	}
	if (pack.packClass === "language-component-composite") {
		return componentCompositeEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-msa-morphology") {
		return camelMorphEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-normalization") {
		return arabicNormalizationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-core") {
		return arabicCoreEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-search") {
		return arabicSearchEvaluationRecords(pack);
	}
	if (
		pack.packageName === "@ismail-elkorchi/textpack-en-syntax-ud-gumreddit" ||
		pack.packageName === "@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa" ||
		pack.packageName === "@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa"
	) {
		return udSyntaxEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-lexicon") {
		return englishWordnetLexiconEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-wordlist-esdb") {
		return esdbWordlistEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-core") {
		return englishCoreEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-core") {
		return frenchCoreEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-normalization") {
		return englishNormalizationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-segmentation") {
		return englishSegmentationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-normalization") {
		return frenchNormalizationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-segmentation") {
		return frenchSegmentationEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-inflection-scowl") {
		return scowlInflectionEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-lexique-sa") {
		return lexiqueEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-unimorph-sa") {
		return frenchUnimorphEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wordnet-en") {
		return wordnetEvaluationRecords(pack, {
			evaluationPrefix: "wordnet-en",
			resourcePrefix: "wordnet-en",
			sourceLabel: "Open English WordNet",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wordnet-ar") {
		return wordnetEvaluationRecords(pack, {
			evaluationPrefix: "wordnet-ar",
			resourcePrefix: "wordnet-ar",
			sourceLabel: "Arabic WordNet 4.1.0",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wikidata-ar") {
		return wikidataArtifactEvaluationRecords(pack, {
			languageName: "Arabic",
			resourcePrefix: "wikidata-ar",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wikidata-en") {
		return wikidataArtifactEvaluationRecords(pack, {
			languageName: "English",
			resourcePrefix: "wikidata-en",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-wikidata-fr") {
		return wikidataArtifactEvaluationRecords(pack, {
			languageName: "French",
			resourcePrefix: "wikidata-fr",
		});
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-corpus") {
		return tatoebaEnglishCorpusEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-en-parallel") {
		return tatoebaEnglishParallelEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-corpus") {
		return tatoebaArabicCorpusEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-ar-parallel") {
		return tatoebaArabicParallelEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-corpus") {
		return tatoebaFrenchCorpusEvaluationRecords(pack);
	}
	if (pack.packageName === "@ismail-elkorchi/textpack-fr-parallel") {
		return tatoebaFrenchParallelEvaluationRecords(pack);
	}
	return [];
}

function evaluationSummary(records) {
	const counts = {
		pass: 0,
		warning: 0,
		fail: 0,
		"not-applicable": 0,
	};
	for (const record of records) counts[record.result] += 1;
	const status =
		records.length === 0
			? "not-applicable"
			: counts.fail > 0
				? "failed"
				: counts.warning > 0
					? "warning"
					: "passed";
	return {
		status,
		recordCount: records.length,
		passCount: counts.pass,
		warningCount: counts.warning,
		failCount: counts.fail,
		notApplicableCount: counts["not-applicable"],
	};
}

function evaluationReportFor(pack, context) {
	const records = evaluationRecordsForPack(pack).sort((left, right) =>
		left.recordId.localeCompare(right.recordId),
	);
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packageName: pack.packageName,
		publishable: pack.publishable,
		publishability: pack.publishability,
		resourceSpecIds: pack.resourceSpecIds ?? [],
		summary: evaluationSummary(records),
		records,
		knownGaps: pack.knownGaps,
	};
}

function qualityReportFor(pack, context) {
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packageName: pack.packageName,
		publishable: pack.publishable,
		publishability: pack.publishability,
		supportLevel: pack.supportLevel,
		resourceCount: pack.resourceStats.length,
		acceptedRecordCount: pack.resourceStats.reduce(
			(total, resource) => total + resource.nonEmptyLineCount,
			0,
		),
		rejectedRecordCount: 0,
		warnings: pack.knownGaps,
		resources: pack.resourceStats,
		resourceSpecIds: pack.resourceSpecIds ?? [],
		capabilitySlots: pack.capabilitySlots,
		resourcePaths: pack.resourceStats.map((resource) => resource.path),
		components: pack.components ?? [],
		artifactRequirements: [],
		licenseWarnings: [],
	};
}

function coverageEvidenceLevel(slot, evaluationRecordIds, resourceIds) {
	if (slot.status === "artifact-backed") {
		return evaluationRecordIds.length > 0
			? "artifact-evaluated"
			: "artifact-descriptor";
	}
	if (evaluationRecordIds.length > 0) return "task-evaluated";
	if (resourceIds.length > 0) return "resource-inventory";
	return "none";
}

function coverageReportFor(pack, context, evaluationRecords) {
	const evaluationIdsBySlot = new Map();
	for (const record of evaluationRecords) {
		const existing = evaluationIdsBySlot.get(record.capabilitySlot) ?? [];
		existing.push(record.recordId);
		evaluationIdsBySlot.set(record.capabilitySlot, existing);
	}
	const capabilityEvidence = pack.capabilitySlots.map((slot) => {
		const evaluationRecordIds = sorted(
			evaluationIdsBySlot.get(slot.slot) ?? [],
		);
		const resourceIds = slot.resourceIds ?? [];
		return {
			slot: slot.slot,
			status: slot.status,
			resourceIds,
			evaluationRecordIds,
			evidenceLevel: coverageEvidenceLevel(
				slot,
				evaluationRecordIds,
				resourceIds,
			),
			limitations: sorted(
				new Set(
					evaluationRecords
						.filter((record) => record.capabilitySlot === slot.slot)
						.flatMap((record) => record.limitations),
				),
			),
		};
	});
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packageName: pack.packageName,
		publishable: pack.publishable,
		publishability: pack.publishability,
		targets: pack.manifest.targets,
		resourceKinds: sorted(
			new Set(pack.manifest.resources.map((resource) => resource.kind)),
		),
		resourceCoverage: pack.resourceStats.map((resource) => ({
			resourceId: resource.id,
			kind: resource.kind,
			path: resource.path,
			byteLength: resource.byteLength,
			nonEmptyLineCount: resource.nonEmptyLineCount,
			checksum: resource.checksum,
			sizeClass: resource.sizeClass,
			...(resource.resourceSpecId === undefined
				? {}
				: {
						resourceSpecId: resource.resourceSpecId,
						pipelineId: resource.pipelineId,
						pipelineVersion: resource.pipelineVersion,
					}),
		})),
		capabilities: capabilities(pack.manifest),
		capabilitySlots: pack.capabilitySlots,
		capabilityEvidence,
		coverageStatus:
			evaluationRecords.length > 0 ? "evaluated" : "declared-only",
		evaluationRecordIds: evaluationRecords.map((record) => record.recordId),
		components: pack.components ?? [],
		gapNotes: pack.manifest.gapNotes ?? [],
		knownGaps: pack.knownGaps,
	};
}

function assertFeatureCompleteLanguageCompositeEvidence(pack, evaluationRecords) {
	if (
		pack.packClass !== "language-composite" ||
		pack.supportLevel !== "feature-complete"
	) {
		return;
	}
	const evaluatedSlots = new Set(
		evaluationRecords
			.filter((record) => record.result === "pass")
			.map((record) => record.capabilitySlot),
	);
	for (const slot of languageCompositeRequiredSlots) {
		const declaredSlot = pack.capabilitySlots.find(
			(candidate) => candidate.slot === slot,
		);
		expect(
			declaredSlot?.status === "task-supported" &&
				evaluatedSlots.has(slot),
			`${pack.packageName} is feature-complete but slot ${slot} lacks passing generated evaluation evidence.`,
		);
	}
}

async function packageOutputsFor(pack, context) {
	const outputs = new Map();
	const evaluationReport = evaluationReportFor(pack, context);
	assertFeatureCompleteLanguageCompositeEvidence(pack, evaluationReport.records);
	if (isCompositePack(pack)) {
		outputs.set(`${pack.packageDir}/package.json`, compositePackageJson(pack));
		outputs.set(`${pack.packageDir}/README.md`, compositeReadme(pack));
		outputs.set(`${pack.packageDir}/CHANGELOG.md`, compositeChangelog(pack));
		outputs.set(`${pack.packageDir}/tsconfig.json`, tsconfigJson());
		outputs.set(`${pack.packageDir}/tsconfig.build.json`, tsconfigBuildJson());
		outputs.set(`${pack.packageDir}/test/smoke.mjs`, compositeSmokeTest(pack));
		outputs.set(
			`${pack.packageDir}/test/negative.mjs`,
			compositeNegativeTest(pack),
		);
		if (pack.languageSupport === true) {
			outputs.set(
				`${pack.packageDir}/src/language-support.ts`,
				languageSupportTs(context.languageSupport),
			);
		}
	} else if (pack.generatedPackageFiles === true) {
		outputs.set(`${pack.packageDir}/package.json`, concretePackageJson(pack));
		outputs.set(`${pack.packageDir}/README.md`, concreteReadme(pack));
		outputs.set(`${pack.packageDir}/CHANGELOG.md`, concreteChangelog(pack));
		outputs.set(`${pack.packageDir}/tsconfig.json`, tsconfigJson());
		outputs.set(`${pack.packageDir}/tsconfig.build.json`, tsconfigBuildJson());
		outputs.set(`${pack.packageDir}/test/smoke.mjs`, concreteSmokeTest(pack));
	}
	outputs.set(`${pack.packageDir}/pack.manifest.json`, jsonFile(pack.manifest));
	if (pack.generatedSourceFiles.includes("src/index.ts")) {
		outputs.set(
			`${pack.packageDir}/src/index.ts`,
			isCompositePack(pack) ? compositeIndexTs(pack) : indexTs(),
		);
	}
	if (pack.generatedSourceFiles.includes("src/manifest.ts")) {
		outputs.set(
			`${pack.packageDir}/src/manifest.ts`,
			manifestTs(pack.manifest),
		);
	}
	if (pack.generatedSourceFiles.includes("src/resources.ts")) {
		outputs.set(
			`${pack.packageDir}/src/resources.ts`,
			resourcesTs(pack),
		);
	}
	for (const payload of pack.payloads) {
		outputs.set(`${pack.packageDir}/${payload.path}`, payload.text);
	}
	for (const licenseFile of pack.licenseEvidenceFiles ?? []) {
		outputs.set(
			`${pack.packageDir}/${licenseFile.packagePath}`,
			await readFile(path.join(ROOT, licenseFile.sourcePath), "utf8"),
		);
	}
	outputs.set(
		`${pack.packageDir}/LICENSE.generated.md`,
		await licenseReportMarkdown(pack, context),
	);
	outputs.set(
		`${pack.packageDir}/NOTICE.generated.md`,
		noticeMarkdown(pack, context),
	);
	outputs.set(
		`${pack.packageDir}/SOURCES.generated.json`,
		stableJson(sourcesReportFor(pack, context)),
	);
	outputs.set(
		`${pack.packageDir}/ATTRIBUTION.generated.md`,
		attributionMarkdown(pack, context),
	);
	outputs.set(
		`${pack.packageDir}/COVERAGE.generated.json`,
		stableJson(coverageReportFor(pack, context, evaluationReport.records)),
	);
	outputs.set(
		`${pack.packageDir}/EVALUATION.generated.json`,
		stableJson(evaluationReport),
	);
	outputs.set(
		`${pack.packageDir}/QUALITY.generated.json`,
		stableJson(qualityReportFor(pack, context)),
	);
	return outputs;
}

function packageFileDigests(outputs, packageDir) {
	const prefix = `${packageDir}/`;
	return [...outputs.entries()]
		.filter(([relative]) => relative.startsWith(prefix))
		.map(([relative, text]) => ({
			path: relative.slice(prefix.length),
			checksum: sha256(text),
		}))
		.sort((left, right) => left.path.localeCompare(right.path));
}

function compositeGeneratedDataSizeBytes(outputs, pack) {
	if (!isCompositePack(pack)) return 0;
	const languageSupport = outputs.get(
		`${pack.packageDir}/src/language-support.ts`,
	);
	return languageSupport === undefined
		? 0
		: Buffer.byteLength(languageSupport, "utf8");
}

async function validateSnapshotFiles(snapshot) {
	if (!Array.isArray(snapshot.files)) return;
	const entries = [];
	for (const file of snapshot.files) {
		const absolute = snapshotDataPath(
			file.path,
			`${snapshot.snapshotId} file path`,
		);
		const bytes = await readFile(absolute);
		const fileStat = await stat(absolute);
		const checksum = sha256Bytes(bytes);
		expect(
			checksum === file.checksum,
			`${snapshot.snapshotId} file ${file.path} checksum mismatch.`,
			`expected ${file.checksum}\nactual   ${checksum}`,
		);
		expect(
			fileStat.size === file.byteLength,
			`${snapshot.snapshotId} file ${file.path} byteLength mismatch.`,
			`expected ${file.byteLength}\nactual   ${fileStat.size}`,
		);
		entries.push({
			path: file.path,
			checksum,
			byteLength: fileStat.size,
		});
	}
	entries.sort((left, right) => left.path.localeCompare(right.path));
	const checksum = snapshotAggregateChecksum(entries);
	expect(
		checksum === snapshot.checksum,
		`${snapshot.snapshotId} aggregate checksum mismatch.`,
		`expected ${snapshot.checksum}\nactual   ${checksum}`,
	);
}

function findSnapshotFile(context, snapshotId, basename) {
	const snapshot = context.snapshotById.get(snapshotId);
	expect(snapshot !== undefined, `Missing snapshot ${snapshotId}.`);
	const file = snapshot.files?.find((candidate) =>
		candidate.path.endsWith(`/${basename}`),
	);
	expect(
		file !== undefined,
		`Snapshot ${snapshotId} does not contain ${basename}.`,
	);
	return file.path;
}

function parseLikelySubtag(tag) {
	const [language, script, region] = tag.split(/[-_]/u);
	return {
		language,
		script: script?.length === 4 ? script : undefined,
		region: region?.length === 2 || region?.length === 3 ? region : undefined,
	};
}

function uniqueSorted(values) {
	return sorted(
		new Set(values.filter((value) => value !== undefined && value !== "")),
	);
}

function orderedSupportLevels(values) {
	const present = new Set(values);
	return supportLevels.filter((level) => present.has(level));
}

function packHasLocalTaskSupport(pack) {
	return pack.capabilitySlots.some((slot) =>
		["task-supported", "feature-complete"].includes(slot.status),
	);
}

async function buildLanguageSupportIndex(context, packs) {
	const registryText = await readText(
		findSnapshotFile(
			context,
			"snapshot:source:iana:language-subtag-registry:2026-05-05",
			"language-subtag-registry.txt",
		),
	);
	const likelySubtags = await readJson(
		findSnapshotFile(
			context,
			"snapshot:source:unicode:cldr-core:48.2.0",
			"likelySubtags.json",
		),
	);
	const likelyByLanguage = new Map();
	for (const [source, target] of Object.entries(
		likelySubtags.supplemental.likelySubtags,
	)) {
		const sourceLanguage = source.split(/[-_]/u)[0];
		if (!likelyByLanguage.has(sourceLanguage)) {
			likelyByLanguage.set(sourceLanguage, parseLikelySubtag(target));
		}
	}
	const registry = parseIanaRegistry(registryText);
	const taskPacksByLanguage = new Map();
	for (const pack of packs) {
		if (pack.publishable !== true) continue;
		if (!packHasLocalTaskSupport(pack)) continue;
		const languages = pack.manifest.targets.languages ?? [];
		if (languages.length === 0) continue;
		if (
			![
				"language-composite",
				"language-component-composite",
				"language-concrete",
				"domain",
				"historical-noisy",
				"parallel",
			].includes(pack.packClass)
		) {
			continue;
		}
		for (const language of languages) {
			const existing = taskPacksByLanguage.get(language) ?? [];
			existing.push(pack);
			taskPacksByLanguage.set(language, existing);
		}
	}
	const entries = [];
	for (const record of registry.records) {
		if (record.type !== "language" || record.subtag.length === 0) continue;
		const languageTag = record.subtag;
		const likely = likelyByLanguage.get(languageTag);
		const script = record.suppressScript || likely?.script;
		const region = likely?.region;
		const taskPacks = taskPacksByLanguage.get(languageTag) ?? [];
		const levels = ["registered"];
		if (script !== undefined) levels.push("unicode-covered");
		if (likely !== undefined || record.suppressScript.length > 0) {
			levels.push("profiled");
		}
		if (taskPacks.length > 0) levels.push("task-supported");
		const componentPacks = [
			"@ismail-elkorchi/textpack-foundation",
			"@ismail-elkorchi/textpack-language-registry",
			...(levels.includes("unicode-covered")
				? ["@ismail-elkorchi/textpack-unicode-17"]
				: []),
			...(levels.includes("profiled")
				? ["@ismail-elkorchi/textpack-cldr-core"]
				: []),
			...taskPacks.map((pack) => pack.packageName),
		];
		const sourceCoverage = [
			"source:iana:language-subtag-registry",
			...(levels.includes("unicode-covered") ? ["source:unicode:ucd"] : []),
			...(levels.includes("profiled") ? ["source:unicode:cldr-core"] : []),
			...taskPacks.flatMap((pack) => pack.sourceIds),
		];
		const capabilitySlots = uniqueSorted(
			taskPacks.flatMap((pack) =>
				pack.capabilitySlots
					.filter((slot) => slot.status !== "planned")
					.map((slot) => slot.slot),
			),
		);
		entries.push({
			languageTag,
			languageName: record.description.split(" | ")[0] || languageTag,
			scripts: script === undefined ? [] : [script],
			regions: region === undefined ? [] : [region],
			supportLevels: orderedSupportLevels(levels),
			packs: uniqueSorted(componentPacks),
			capabilitySlots,
			sourceCoverage: uniqueSorted(sourceCoverage),
			lastBuiltAt: context.generatedAt,
			knownGaps:
				taskPacks.length === 0
					? []
					: uniqueSorted(
							taskPacks.flatMap((pack) =>
								pack.supportLevel === "feature-complete"
									? []
									: [
											`${pack.packageName} is ${pack.supportLevel}, not feature-complete.`,
										],
							),
						),
		});
	}
	return entries.sort((left, right) =>
		left.languageTag.localeCompare(right.languageTag),
	);
}

async function collectContext() {
	const lock = await readJson(LOCK_PATH);
	const lockfileChecksum = sha256(await readText(LOCK_PATH));
	expect(
		Array.isArray(lock.packSpecPaths) && lock.packSpecPaths.length > 0,
		"Forge lock must declare packSpecPaths.",
	);
	expect(
		Array.isArray(lock.resourceSpecPaths),
		"Forge lock must declare resourceSpecPaths.",
	);
	expect(
		Array.isArray(lock.sourcePolicyPaths) && lock.sourcePolicyPaths.length > 0,
		"Forge lock must declare sourcePolicyPaths.",
	);
	const catalogs = await Promise.all(
		lock.packSpecPaths.map((packSpecPath) =>
			readJson(packSpecPath).then((catalog) => ({
				...catalog,
				specPath: packSpecPath,
			})),
		),
	);
	for (const catalog of catalogs) {
		expect(
			catalog.schemaVersion === "1",
			"Pack catalog schemaVersion must be 1.",
		);
		expect(
			catalog.mode === "source-backed",
			`Pack catalog mode ${catalog.mode} is unsupported.`,
		);
		expect(
			Array.isArray(catalog.packs),
			"Pack catalog packs must be an array.",
		);
	}
	const resourceSpecs = await Promise.all(
		lock.resourceSpecPaths.map((resourceSpecPath) =>
			readJson(resourceSpecPath),
		),
	);
	const resourceSpecById = new Map();
	for (const resourceSpec of resourceSpecs) {
		validateResourceSpec(resourceSpec);
		expect(
			!resourceSpecById.has(resourceSpec.resourceSpecId),
			`Duplicate resource spec id ${resourceSpec.resourceSpecId}.`,
		);
		resourceSpecById.set(resourceSpec.resourceSpecId, resourceSpec);
	}
	const sources = await Promise.all(
		lock.sourcePaths.map((sourcePath) => readJson(sourcePath)),
	);
	const sourcePolicySpecs = await Promise.all(
		lock.sourcePolicyPaths.map((sourcePolicyPath) =>
			readJson(sourcePolicyPath),
		),
	);
	const snapshots = await Promise.all(
		lock.snapshotPaths.map((snapshotPath) => readJson(snapshotPath)),
	);
	const sourceById = validateSourceCatalog(sources);
	const sourcePolicyContext = collectSourcePolicies(sourcePolicySpecs);
	const snapshotById = validateSnapshotCatalog(snapshots, sourceById);
	for (const snapshot of snapshots) await validateSnapshotFiles(snapshot);
	for (const lockEntry of lock.snapshotLocks ?? []) {
		const snapshot = snapshotById.get(lockEntry.snapshotId);
		expect(
			snapshot !== undefined,
			`Snapshot lock references unknown ${lockEntry.snapshotId}.`,
		);
		expect(
			snapshot.checksum === lockEntry.checksum,
			`Snapshot lock checksum mismatch for ${lockEntry.snapshotId}.`,
			`expected ${lockEntry.checksum}\nactual   ${snapshot.checksum}`,
		);
	}
	for (const resourceSpec of resourceSpecs) {
		validateResourceSourceGraph(resourceSpec, sourceById, snapshotById);
	}
	const baseContext = {
		generatedAt: lock.generatedAt,
		forgeVersion: lock.forgeVersion,
		lockfileChecksum,
		licenseClassByName: sourcePolicyContext.licenseClassByName,
		languagePolicies: sourcePolicyContext.languagePolicies,
		languagePolicyByTag: sourcePolicyContext.languagePolicyByTag,
		mode: lock.mode,
		sources,
		sourcePolicies: sourcePolicyContext.sourcePolicies,
		sourcePolicyById: sourcePolicyContext.sourcePolicyById,
		sourcePolicySpecs,
		snapshots,
		sourceById,
		snapshotById,
	};
	validateActiveSourcePolicies(baseContext);
	const packs = [];
	const allPackSpecs = catalogs.flatMap((catalog) =>
		catalog.packs.map((pack) => ({
			...pack,
			catalogSourceIds: catalog.sourceIds,
			catalogSnapshotIds: catalog.snapshotIds,
			specPath: catalog.specPath,
		})),
	);
	const compositeSpecs = await Promise.all(
		(lock.compositeSpecPaths ?? []).map((compositeSpecPath) =>
			readJson(compositeSpecPath).then((spec) => ({
				...spec,
				specPath: compositeSpecPath,
			})),
		),
	);
	const compositeLoaderByPackageName = new Map(
		compositeSpecs.map((spec) => [spec.packageName, spec.loader.functionName]),
	);
	const knownPackageNames = new Set([
		...allPackSpecs.map((pack) => pack.packageName),
		...compositeSpecs.map((spec) => spec.packageName),
	]);
	for (const packSpec of allPackSpecs) {
		const normalizedPackSpec = {
			...packSpec,
			generationMode: "source-backed",
		};
		validatePackSpec(normalizedPackSpec, resourceSpecById);
		const manifest = manifestFor(packSpec, baseContext);
		const packageJson =
			normalizedPackSpec.generatedPackageFiles === true
				? {
						name: normalizedPackSpec.packageName,
						version: manifest.version,
						description: normalizedPackSpec.description,
						license: manifest.license,
					}
				: await readJson(`${normalizedPackSpec.packageDir}/package.json`);
		expect(
			packageJson.name === normalizedPackSpec.packageName,
			`${normalizedPackSpec.packageDir} package name does not match pack spec.`,
		);
		expect(
			manifest.packageName === normalizedPackSpec.packageName,
			`${normalizedPackSpec.packageName} manifest packageName must match pack spec.`,
		);
		expect(
			packageJson.version === manifest.version,
			`${normalizedPackSpec.packageName} package version must match manifest version.`,
		);
		const payloads = await collectResourcePayloads(
			normalizedPackSpec,
			manifest,
			resourceSpecById,
		);
		const stats = resourceStats(payloads);
		const npmShippedSizeBytes = stats.reduce(
			(total, resource) => total + resource.byteLength,
			0,
		);
		const sourceIds =
			normalizedPackSpec.sourceIds ?? normalizedPackSpec.catalogSourceIds;
		const snapshotIds =
			normalizedPackSpec.snapshotIds ?? normalizedPackSpec.catalogSnapshotIds;
		const publishability = assertPublishabilityRequest(
			normalizedPackSpec,
			manifest,
			baseContext,
		);
		const licenseEvidenceFiles = localLicenseEvidenceFilesForIds(
			sourceIds,
			snapshotIds,
			baseContext,
		);
		for (const sourceId of sourceIds) {
			expect(
				sourceById.has(sourceId),
				`${normalizedPackSpec.packageName} references unknown source ${sourceId}.`,
			);
		}
		for (const snapshotId of snapshotIds) {
			expect(
				snapshotById.has(snapshotId),
				`${normalizedPackSpec.packageName} references unknown snapshot ${snapshotId}.`,
			);
		}
		validatePackageSourcePolicy(
			{
				packageName: normalizedPackSpec.packageName,
				packClass: normalizedPackSpec.packClass,
				publishable: publishability.publishable,
				sourceIds,
				targets: manifest.targets,
			},
			baseContext,
		);
		packs.push({
			artifactBackedSizeBytes: 0,
			artifactProfiles: [],
			capabilitySlots: capabilitySlots(manifest),
			components: manifest.components ?? [],
			description: packageJson.description,
			generatedPackageFiles: normalizedPackSpec.generatedPackageFiles === true,
			generatedSourceFiles: normalizedPackSpec.generatedSourceFiles,
			generationMode: normalizedPackSpec.generationMode,
			knownGaps: knownGaps(normalizedPackSpec, manifest),
			licenseExpression:
				manifest.license ?? packageJson.license ?? "UNLICENSED",
			licenseEvidenceFiles,
			manifest,
			npmShippedSizeBytes,
			packageDir: normalizedPackSpec.packageDir,
			packageId: packageId(packageJson.name),
			packageName: packageJson.name,
			packageVersion: packageJson.version,
			packClass: normalizedPackSpec.packClass,
			policySurface: "default",
			payloads,
			publishable: publishability.publishable,
			publishability,
			resourceStats: stats,
			resourceSpecIds: normalizedPackSpec.resourceSpecIds ?? [],
			specPath: normalizedPackSpec.specPath,
			sourceIds,
			snapshotIds,
			supportLevel: normalizedPackSpec.supportLevel,
		});
	}
	for (const spec of compositeSpecs) {
		validateCompositeSpec(spec, knownPackageNames);
		const manifest = compositeManifestFor(spec, baseContext);
		const compositeSourceIds = spec.sourceIds ?? [];
		const compositeSnapshotIds = spec.snapshotIds ?? [];
		for (const sourceId of compositeSourceIds) {
			expect(
				sourceById.has(sourceId),
				`${spec.packageName} references unknown source ${sourceId}.`,
			);
		}
		for (const snapshotId of compositeSnapshotIds) {
			expect(
				snapshotById.has(snapshotId),
				`${spec.packageName} references unknown snapshot ${snapshotId}.`,
			);
		}
		validatePackageSourcePolicy(
			{
				packageName: spec.packageName,
				packClass: spec.packClass,
				policySurface: spec.policySurface ?? "default",
				publishable: spec.publishable === true,
				sourceIds: compositeSourceIds,
				targets: manifest.targets,
			},
			baseContext,
		);
		const compositePack = {
			artifactBackedSizeBytes: 0,
			artifactProfiles: [],
			capabilitySlots: capabilitySlots(manifest),
			components: manifest.components ?? [],
			description: spec.description,
			generatedSourceFiles: [
				"src/index.ts",
				"src/manifest.ts",
				"src/resources.ts",
			],
			generationMode: spec.mode,
			knownGaps: knownGaps(spec, manifest),
			languageSupport: spec.languageSupport === true,
			licenseExpression: manifest.license,
			licenseEvidenceFiles: localLicenseEvidenceFilesForIds(
				compositeSourceIds,
				compositeSnapshotIds,
				baseContext,
			),
			loader: {
				...spec.loader,
				optionsName: `Load${spec.loader.languageName}Options`,
			},
			componentLoaders: Object.fromEntries(
				spec.components
					.filter((component) =>
						compositeLoaderByPackageName.has(component.packageName),
					)
					.map((component) => [
						component.packageName,
						compositeLoaderByPackageName.get(component.packageName),
					]),
			),
			manifest,
			npmShippedSizeBytes: 0,
			packageDir: spec.packageDir,
			packageId: packageId(spec.packageName),
			packageName: spec.packageName,
			packageVersion: spec.version,
			packClass: spec.packClass,
			policySurface: spec.policySurface ?? "default",
			payloads: [],
			resourceStats: [],
			resourceSpecIds: [],
			sourceIds: compositeSourceIds,
			snapshotIds: compositeSnapshotIds,
			specPath: spec.specPath,
			supportLevel: spec.supportLevel,
		};
		const publishability = assertPublishabilityRequest(
			{ ...spec, generationMode: spec.mode },
			manifest,
			baseContext,
		);
		compositePack.publishable = publishability.publishable;
		compositePack.publishability = publishability;
		packs.push(compositePack);
	}
	const context = {
		...baseContext,
		packs: packs.sort((left, right) =>
			left.packageName.localeCompare(right.packageName),
		),
	};
	const packageByName = new Map(
		context.packs.map((pack) => [pack.packageName, pack]),
	);
	for (const composite of context.packs.filter((pack) =>
		isCompositePack(pack),
	)) {
		validateCompositeComponentSourcePolicies(composite, packageByName, context);
	}
	context.languageSupport = await buildLanguageSupportIndex(
		context,
		context.packs,
	);
	for (const pack of context.packs) {
		const outputs = await packageOutputsFor(pack, context);
		pack.npmShippedSizeBytes =
			pack.npmShippedSizeBytes + compositeGeneratedDataSizeBytes(outputs, pack);
		const fileDigests = packageFileDigests(outputs, pack.packageDir);
		pack.fileDigests = fileDigests;
		pack.generatedFiles = fileDigests.map((entry) => entry.path);
		pack.outputChecksum = sha256(stableJson({ files: fileDigests }));
	}
	const languageCompositeReadiness = languageCompositeReadinessFor(context);
	validateDeveloperFacingCompositePublishability(
		context,
		languageCompositeReadiness,
	);
	return context;
}

function markerFor(pack, context) {
	return {
		schemaVersion: "1",
		generatedBy: GENERATED_BY,
		forgeVersion: context.forgeVersion,
		mode: context.mode,
		generatedAt: context.generatedAt,
		generatorCommand: BUILD_COMMAND,
		lockfile: LOCK_PATH,
		lockfileChecksum: context.lockfileChecksum,
		packageName: pack.packageName,
		packageVersion: pack.packageVersion,
		policySurface: pack.policySurface ?? "default",
		publishable: pack.publishable,
		publishability: pack.publishability,
		packSpecPath: pack.specPath ?? DEFAULT_PACK_SPEC_PATH,
		outputChecksum: pack.outputChecksum,
		generatedFiles: pack.generatedFiles,
	};
}

function inventoryFor(context) {
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		packages: context.packs.map((pack) => ({
			packageId: pack.packageId,
			packageName: pack.packageName,
			version: pack.packageVersion,
			packClass: pack.packClass,
			policySurface: pack.policySurface ?? "default",
			supportLevel: pack.supportLevel,
			publishable: pack.publishable,
			publishability: pack.publishability,
			sourceIds: pack.sourceIds,
			snapshotIds: pack.snapshotIds,
			licenseExpression: pack.licenseExpression,
			npmShippedSizeBytes: pack.npmShippedSizeBytes,
			artifactBackedSizeBytes: pack.artifactBackedSizeBytes,
			artifactProfiles: pack.artifactProfiles,
			outputChecksum: pack.outputChecksum,
			generatedFiles: pack.generatedFiles,
			reports: PACKAGE_REPORT_FILES,
			components: pack.components ?? [],
			capabilitySlots: pack.capabilitySlots.map((slot) => ({
				slot: slot.slot,
				status: slot.status,
				...(slot.resourceIds === undefined
					? {}
					: { resourceIds: slot.resourceIds }),
				...(slot.artifactIds === undefined
					? {}
					: { artifactIds: slot.artifactIds }),
				...(slot.notes === undefined ? {} : { notes: slot.notes }),
				...(slot.capabilities === undefined
					? {}
					: { capabilities: slot.capabilities }),
			})),
			knownGaps: pack.knownGaps,
		})),
	};
}

function inventoryMarkdown(inventory) {
	const lines = [
		"# Generated Textpack Inventory",
		"",
		"Status: generated source-backed foundation packs, task slices, and component composites only; sampled, demo, fixture-backed, and transitional textpacks are excluded from the active package graph",
		`Generated at: \`${inventory.generatedAt}\``,
		"",
		"| Package | Class | Support | Publishable | npm bytes | Artifact bytes | Slots | Reports | Known gaps |",
		"| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |",
	];
	for (const pack of inventory.packages) {
		const slots = pack.capabilitySlots
			.map((slot) => `${slot.slot}:${slot.status}`)
			.join(", ");
		lines.push(
			`| \`${pack.packageName}\` | \`${pack.packClass}\` | \`${pack.supportLevel}\` | \`${pack.publishable ? "true" : "false"}\` | ${pack.npmShippedSizeBytes} | ${pack.artifactBackedSizeBytes} | ${slots} | ${pack.reports.map((report) => `\`${report}\``).join(", ")} | ${pack.knownGaps.join("; ")} |`,
		);
	}
	lines.push("");
	return `${lines.join("\n")}\n`;
}

function requiredLanguageSlotPackageName(languageTag, slot) {
	if (slot === "foundation") {
		return "@ismail-elkorchi/textpack-foundation";
	}
	return `@ismail-elkorchi/textpack-${languageTag}-${slot}`;
}

function languageDisplayName(languageTag, context) {
	return (
		context.languagePolicyByTag.get(languageTag)?.languageName ??
		context.languageSupport.find((entry) => entry.languageTag === languageTag)
			?.languageName ??
		languageTag
	);
}

function slotAliases(slot) {
	return languageReadinessSlotAliases[slot] ?? [slot];
}

function packSupportsLanguage(pack, languageTag) {
	if (pack.packageName === "@ismail-elkorchi/textpack-foundation") return true;
	return (pack.manifest.targets?.languages ?? []).includes(languageTag);
}

function packSupportsReadinessSlot(pack, slot) {
	if (slot === "foundation") {
		return pack.packageName === "@ismail-elkorchi/textpack-foundation";
	}
	const aliases = new Set(slotAliases(slot));
	return pack.capabilitySlots.some(
		(capabilitySlot) =>
			aliases.has(capabilitySlot.slot) &&
			["task-supported", "feature-complete"].includes(capabilitySlot.status),
	);
}

function standardReportsGenerated(pack) {
	const generatedFiles = new Set(pack.generatedFiles ?? []);
	return PACKAGE_REPORT_FILES.every((report) => generatedFiles.has(report));
}

function sourceAuditedForDefaultComposite(pack, context) {
	return pack.sourceIds.every((sourceId) => {
		const policy = context.sourcePolicyById.get(sourceId);
		if (isPolicyExpandedWrapper(pack)) {
			return (
				policy !== undefined &&
				sourcePolicyAllowsPolicyExpandedWrapper(policy)
			);
		}
		return (
			policy !== undefined &&
			policy.reviewState === "approved" &&
			policy.publishableByDefault === true &&
			policy.defaultCompositeAllowed === true &&
			publishableSourcePolicyClasses.has(policy.policyClass)
		);
	});
}

function sourceRequirementsFor(languageTag, slot) {
	return languageReadinessSourceRequirements[languageTag]?.[slot] ?? [];
}

function sourceRequirementSatisfied(requirement, sourceIds) {
	const sourceIdSet = new Set(sourceIds);
	if (Array.isArray(requirement.allSourceIds)) {
		return requirement.allSourceIds.every((sourceId) =>
			sourceIdSet.has(sourceId),
		);
	}
	if (Array.isArray(requirement.anySourceIds)) {
		return requirement.anySourceIds.some((sourceId) => sourceIdSet.has(sourceId));
	}
	return true;
}

function languageSlotSourceRequirementBlockers({
	exactPack,
	languageTag,
	slot,
}) {
	const requirements = sourceRequirementsFor(languageTag, slot);
	if (requirements.length === 0) return [];
	if (exactPack === undefined) {
		return requirements.map((requirement) => {
			const sourceIds = [
				...(requirement.allSourceIds ?? []),
				...(requirement.anySourceIds ?? []),
			];
			return `${requirement.label}; expected one of ${sourceIds.join(", ")} before full ${languageTag} ${slot} readiness can be marked ready.`;
		});
	}
	return requirements
		.filter(
			(requirement) =>
				!sourceRequirementSatisfied(requirement, exactPack.sourceIds),
		)
		.map((requirement) => {
			const sourceIds = [
				...(requirement.allSourceIds ?? []),
				...(requirement.anySourceIds ?? []),
			];
			return `${requirement.label} is required for full ${languageTag} ${slot} readiness; expected one of ${sourceIds.join(", ")}.`;
		});
}

function languageReadinessStage({
	adapterValid,
	artifactBacked,
	compositeReady,
	evaluated,
	exactPack,
	generated,
	publishable,
	schemaValid,
	sourceAudited,
	sourceRequirementsSatisfied,
}) {
	if (exactPack === undefined) return "missing";
	if (!sourceAudited) return generated ? "generated" : "missing";
	if (!generated) return "source-audited";
	if (!schemaValid) return "generated";
	if (!adapterValid) return "schema-valid";
	if (artifactBacked) return "artifact-backed";
	if (!evaluated) return "adapter-valid";
	if (!publishable) return "evaluated";
	if (!sourceRequirementsSatisfied) return "source-requirements-missing";
	if (!compositeReady) return "publishable";
	return "composite-ready";
}

function languageSlotBlockers({
	adapterValid,
	artifactBacked,
	candidatePacks,
	compositeReady,
	evaluated,
	exactPack,
	generated,
	publishable,
	requiredPackageName,
	schemaValid,
	sourceAudited,
	sourceRequirementBlockers,
	sourceRequirementsSatisfied,
	standardReports,
	slot,
	slotCapabilitySatisfied,
}) {
	const blockers = [];
	if (exactPack === undefined) {
		blockers.push(`${requiredPackageName} has not been generated.`);
		if (candidatePacks.length > 0) {
			blockers.push(
				"Candidate source-backed packs exist, but the required slot package has not been selected for this composite slot.",
			);
		}
		blockers.push(...sourceRequirementBlockers);
		return blockers;
	}
	if (!sourceAudited) {
		blockers.push("source policy audit is incomplete for default composite use.");
	}
	if (!generated) blockers.push("generated package files are incomplete.");
	if (!schemaValid) blockers.push("manifest/resource schema validation is incomplete.");
	if (!standardReports) blockers.push("standard generated reports are incomplete.");
	if (!evaluated) blockers.push("evaluation evidence is incomplete.");
	if (!adapterValid) blockers.push("runtime adapter evidence is incomplete.");
	if (artifactBacked) {
		blockers.push(
			"slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.",
		);
	}
	if (!publishable) blockers.push("package has not passed the publishability gate.");
	if (!sourceRequirementsSatisfied) {
		blockers.push(...sourceRequirementBlockers);
	}
	if (!slotCapabilitySatisfied) {
		blockers.push(
			`${requiredPackageName} does not declare production coverage for the ${slot} slot.`,
		);
	}
	if (!compositeReady && blockers.length === 0) {
		blockers.push("slot is not marked composite-ready.");
	}
	return blockers;
}

function languageCompositeReadinessFor(context) {
	const packageByName = new Map(
		context.packs.map((pack) => [pack.packageName, pack]),
	);
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		languages: developerFacingLanguageTags.map((languageTag) => {
			const slots = languageCompositeRequiredSlots.map((slot) => {
				const requiredPackageName = requiredLanguageSlotPackageName(
					languageTag,
					slot,
				);
				const exactPack = packageByName.get(requiredPackageName);
				const candidatePacks = context.packs
					.filter(
						(pack) =>
							pack.packageName !== requiredPackageName &&
							pack.packClass !== "language-composite" &&
							packSupportsLanguage(pack, languageTag) &&
							packSupportsReadinessSlot(pack, slot),
					)
					.map((pack) => ({
						packageName: pack.packageName,
						packClass: pack.packClass,
						publishable: pack.publishable,
						capabilitySlots: pack.capabilitySlots.map(
							(capabilitySlot) => capabilitySlot.slot,
						),
					}))
					.sort((left, right) =>
						left.packageName.localeCompare(right.packageName),
					);
				const sourceAudited =
					exactPack !== undefined &&
					sourceAuditedForDefaultComposite(exactPack, context);
				const generated =
					exactPack !== undefined &&
					typeof exactPack.outputChecksum === "string" &&
					exactPack.generatedFiles.length > 0;
				const schemaValid = exactPack !== undefined;
				const standardReports =
					exactPack !== undefined && standardReportsGenerated(exactPack);
				const evaluated =
					exactPack !== undefined &&
					standardReports &&
					exactPack.generatedFiles.includes("EVALUATION.generated.json");
				const adapterValid = exactPack !== undefined && standardReports;
				const publishable =
					exactPack !== undefined && exactPack.publishable === true;
				const exactSlot = exactPack?.capabilitySlots.find(
					(capabilitySlot) =>
						capabilitySlot.slot === slot || slotAliases(slot).includes(capabilitySlot.slot),
				);
				const artifactBacked =
					exactPack?.supportLevel === "artifact-backed" ||
					exactSlot?.status === "artifact-backed";
				const slotCapabilitySatisfied =
					exactPack !== undefined && packSupportsReadinessSlot(exactPack, slot);
				const sourceRequirements = sourceRequirementsFor(languageTag, slot);
				const sourceRequirementBlockers =
					languageSlotSourceRequirementBlockers({
						exactPack,
						languageTag,
						slot,
					});
				const sourceRequirementsSatisfied =
					sourceRequirementBlockers.length === 0;
				const compositeReady =
					exactPack !== undefined &&
					sourceAudited &&
					generated &&
					schemaValid &&
					standardReports &&
					evaluated &&
					adapterValid &&
					publishable &&
					sourceRequirementsSatisfied &&
					slotCapabilitySatisfied;
				const state = {
					adapterValid,
					artifactBacked,
					compositeReady,
					evaluated,
					exactPack,
					generated,
					publishable,
					schemaValid,
					sourceAudited,
					sourceRequirementsSatisfied,
				};
				const blockers = languageSlotBlockers({
					...state,
					candidatePacks,
					requiredPackageName,
					sourceRequirementBlockers,
					standardReports,
					slot,
					slotCapabilitySatisfied,
				});
				return {
					slot,
					requiredPackageName,
					stage: languageReadinessStage(state),
					checks: {
						packagePresent: exactPack !== undefined,
						sourceAudited,
						generated,
						schemaValid,
						standardReports,
						adapterValid,
						artifactBacked,
						evaluated,
						publishable,
						sourceRequirementsSatisfied,
						slotCapabilitySatisfied,
						compositeReady,
					},
					capabilityAliases: slotAliases(slot),
					capabilitySlots:
						exactPack?.capabilitySlots.map((capabilitySlot) => ({
							slot: capabilitySlot.slot,
							status: capabilitySlot.status,
						})) ?? [],
					sourceIds: exactPack?.sourceIds ?? [],
					sourceRequirements,
					candidatePacks,
					blockers,
				};
			});
			const readySlots = slots.filter((slot) => slot.checks.compositeReady);
			const blockedSlots = slots.filter((slot) => !slot.checks.compositeReady);
			const compositePackageName = `@ismail-elkorchi/textpack-${languageTag}`;
			return {
				languageTag,
				languageName: languageDisplayName(languageTag, context),
				compositePackageName,
				compositeReady: blockedSlots.length === 0,
				summary: {
					requiredSlotCount: slots.length,
					readySlotCount: readySlots.length,
					blockedSlotCount: blockedSlots.length,
					readySlots: readySlots.map((slot) => slot.slot),
					blockedSlots: blockedSlots.map((slot) => slot.slot),
				},
				requiredSlots: slots,
			};
		}),
	};
}

function validateDeveloperFacingCompositePublishability(context, readiness) {
	const packageByName = new Map(
		context.packs.map((pack) => [pack.packageName, pack]),
	);
	for (const language of readiness.languages) {
		const pack = packageByName.get(language.compositePackageName);
		if (pack?.publishable !== true) continue;
		expect(
			language.compositeReady === true,
			`${language.compositePackageName} cannot be publishable until every required language slot is composite-ready. Blocked slots: ${language.summary.blockedSlots.join(", ") || "none"}.`,
		);
	}
}

function languageCompositeReadinessMarkdown(readiness) {
	const lines = [
		"# Language Composite Readiness",
		"",
		`Generated at: \`${readiness.generatedAt}\``,
		"",
		"This report is generated from the active forge graph. It gates language composites: `textpack-en`, `textpack-ar`, and `textpack-fr` stay non-publishable until every required slot is composite-ready.",
		"",
		"Candidate packs are informational only. A candidate does not satisfy a slot until the exact required package is generated, audited, evaluated, publishable, declares production coverage for that slot, and is not descriptor-only.",
		"",
		"## Summary",
		"",
		"| Language | Composite | Ready slots | Blocked slots | Composite ready |",
		"| --- | --- | ---: | --- | --- |",
	];
	for (const language of readiness.languages) {
		lines.push(
			`| \`${language.languageTag}\` ${markdownCell(language.languageName)} | \`${language.compositePackageName}\` | ${language.summary.readySlotCount}/${language.summary.requiredSlotCount} | ${language.summary.blockedSlots.map((slot) => `\`${slot}\``).join(", ") || "None"} | \`${language.compositeReady ? "true" : "false"}\` |`,
		);
	}
	for (const language of readiness.languages) {
		lines.push(
			"",
			`## ${language.languageName} (${language.languageTag})`,
			"",
			"| Slot | Required package | Stage | Candidates | Blockers |",
			"| --- | --- | --- | --- | --- |",
		);
		for (const slot of language.requiredSlots) {
			lines.push(
				`| \`${slot.slot}\` | \`${slot.requiredPackageName}\` | \`${slot.stage}\` | ${slot.candidatePacks.map((pack) => `\`${pack.packageName}\``).join(", ") || "None"} | ${slot.blockers.map(markdownCell).join("<br>") || "None"} |`,
			);
		}
	}
	lines.push("");
	return `${lines.join("\n")}\n`;
}

function sizeReportFor(context) {
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		limits: {
			tinyUnpackedBytes: 500 * 1024,
			smallUnpackedBytes: 5 * 1024 * 1024,
			mediumUnpackedBytes: 50 * 1024 * 1024,
			hugeUnpackedBytes: 500 * 1024 * 1024,
			compositePackedBytes: 500 * 1024,
		},
		packages: context.packs.map((pack) => ({
			packageName: pack.packageName,
			packageDir: pack.packageDir,
			publishable: pack.publishable,
			publishability: pack.publishability,
			npmShippedSizeBytes: pack.npmShippedSizeBytes,
			artifactBackedSizeBytes: pack.artifactBackedSizeBytes,
			sizeClass: sizeClass(pack.npmShippedSizeBytes),
			outputChecksum: pack.outputChecksum,
			resources: pack.resourceStats,
		})),
	};
}

function countBy(values, selector) {
	const counts = {};
	for (const value of values) {
		const key = selector(value);
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return sortJson(counts);
}

function sourcePolicyGeneratedFor(context) {
	return {
		schemaVersion: "1",
		generatedAt: context.generatedAt,
		generatedBy: GENERATED_BY,
		mode: context.mode,
		policyIds: context.sourcePolicySpecs.map(
			(policySpec) => policySpec.policyId,
		),
		summaries: {
			sourceCount: context.sourcePolicies.length,
			languageCount: context.languagePolicies.length,
			activeSourceCount: context.sources.length,
			byPolicyClass: countBy(
				context.sourcePolicies,
				(policy) => policy.policyClass,
			),
			byReviewState: countBy(
				context.sourcePolicies,
				(policy) => policy.reviewState,
			),
			byPriority: countBy(context.sourcePolicies, (policy) => policy.priority),
		},
		licenseClasses: sourcePolicyClasses.map((policyClass) => ({
			class: policyClass,
			defaultCompositeAllowed:
				context.licenseClassByName.get(policyClass).defaultCompositeAllowed,
			publishableByDefault:
				context.licenseClassByName.get(policyClass).publishableByDefault,
			packageNameSuffixes:
				context.licenseClassByName.get(policyClass).packageNameSuffixes,
			description: context.licenseClassByName.get(policyClass).description,
		})),
		languages: context.languagePolicies.map((language) => ({
			languageTag: language.languageTag,
			languageName: language.languageName,
			firstSources: language.firstSources,
			secondWaveSources: language.secondWaveSources,
			isolatedSources: language.isolatedSources,
		})),
		sources: context.sourcePolicies.map((policy) => ({
			sourceId: policy.sourceId,
			family: policy.family,
			name: policy.name,
			policyClass: policy.policyClass,
			redistributionPolicy: policy.redistributionPolicy,
			reviewState: policy.reviewState,
			defaultCompositeAllowed: policy.defaultCompositeAllowed,
			publishableByDefault: policy.publishableByDefault,
			requiredPackageNameSuffixes: policy.requiredPackageNameSuffixes,
			languages: policy.languages,
			capabilitySlots: policy.capabilitySlots,
			priority: policy.priority,
			licenseExpression: policy.licenseExpression,
			homepageUrl: policy.homepageUrl,
			notes: policy.notes,
		})),
	};
}

function markdownCell(value) {
	return String(value ?? "")
		.replace(/\\/gu, "\\\\")
		.replace(/\|/gu, "\\|")
		.replace(/\r?\n/gu, " ")
		.trim();
}

function linkedSourceId(sourceId) {
	return `\`${sourceId}\``;
}

function sourcePolicySummaryCell(sourceIds, sourcePolicyById) {
	return sourceIds
		.map((sourceId) => {
			const policy = sourcePolicyById.get(sourceId);
			if (policy === undefined) return `${linkedSourceId(sourceId)}:unknown`;
			return `${linkedSourceId(sourceId)}:${policy.policyClass}/${policy.reviewState}`;
		})
		.join("<br>");
}

function sourceReadinessMarkdown(context) {
	const lines = [
		"# Source Readiness",
		"",
		`Generated at: \`${context.generatedAt}\``,
		"",
		"This report is generated from the forge source-policy universe. It is metadata-only unless a source also appears in `sourcePaths`, `snapshotPaths`, and a resource spec.",
		"",
		"Policy rule: a source may not generate a pack until its policy class, package name, composite license policy, publishability gate, and source review state all agree.",
		"",
		"## License Classes",
		"",
		"| Class | Default composite | Publishable by default | Required suffixes | Source count |",
		"| --- | --- | --- | --- | ---: |",
	];
	const countsByClass = new Map(
		Object.entries(
			countBy(context.sourcePolicies, (policy) => policy.policyClass),
		),
	);
	for (const policyClass of sourcePolicyClasses) {
		const definition = context.licenseClassByName.get(policyClass);
		lines.push(
			`| \`${policyClass}\` | \`${definition.defaultCompositeAllowed ? "true" : "false"}\` | \`${definition.publishableByDefault ? "true" : "false"}\` | ${definition.packageNameSuffixes.map((suffix) => `\`${suffix}\``).join(", ") || "None"} | ${countsByClass.get(policyClass) ?? 0} |`,
		);
	}
	lines.push(
		"",
		"## Language Priorities",
		"",
		"| Language | First sources | Second wave | Isolated / review-only |",
		"| --- | --- | --- | --- |",
	);
	for (const languageTag of requiredSourcePolicyLanguageTags) {
		const language = context.languagePolicyByTag.get(languageTag);
		lines.push(
			`| \`${language.languageTag}\` ${markdownCell(language.languageName)} | ${sourcePolicySummaryCell(language.firstSources, context.sourcePolicyById)} | ${sourcePolicySummaryCell(language.secondWaveSources, context.sourcePolicyById)} | ${sourcePolicySummaryCell(language.isolatedSources, context.sourcePolicyById)} |`,
		);
	}
	lines.push(
		"",
		"## Source Catalog",
		"",
		"| Source | Family | Policy | Review | Priority | Default composite | Publishable source posture | Languages | Capabilities | Notes |",
		"| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
	);
	for (const policy of context.sourcePolicies) {
		lines.push(
			`| ${linkedSourceId(policy.sourceId)} | \`${markdownCell(policy.family)}\` | \`${policy.policyClass}\` | \`${policy.reviewState}\` | \`${policy.priority}\` | \`${policy.defaultCompositeAllowed ? "true" : "false"}\` | \`${policy.publishableByDefault ? "true" : "false"}\` | ${policy.languages.map((language) => `\`${language}\``).join(", ")} | ${policy.capabilitySlots.map((slot) => `\`${slot}\``).join(", ")} | ${markdownCell(policy.notes)} |`,
		);
	}
	lines.push("");
	return `${lines.join("\n")}\n`;
}

async function writeGenerated(relative, text) {
	await mkdir(path.dirname(path.join(ROOT, relative)), { recursive: true });
	await writeFile(path.join(ROOT, relative), text);
}

async function generatedOutputs() {
	const context = await collectContext();
	const inventory = inventoryFor(context);
	const languageCompositeReadiness = languageCompositeReadinessFor(context);
	const outputs = new Map([
		[INVENTORY_JSON_PATH, stableJson(inventory)],
		[INVENTORY_MD_PATH, inventoryMarkdown(inventory)],
		[SOURCE_POLICY_JSON_PATH, stableJson(sourcePolicyGeneratedFor(context))],
		[SOURCE_READINESS_MD_PATH, sourceReadinessMarkdown(context)],
		[
			LANGUAGE_COMPOSITE_READINESS_JSON_PATH,
			stableJson(languageCompositeReadiness),
		],
		[
			LANGUAGE_COMPOSITE_READINESS_MD_PATH,
			languageCompositeReadinessMarkdown(languageCompositeReadiness),
		],
		[SIZE_REPORT_PATH, stableJson(sizeReportFor(context))],
	]);
	for (const pack of context.packs) {
		for (const [relative, text] of await packageOutputsFor(pack, context)) {
			outputs.set(relative, text);
		}
		outputs.set(
			`${pack.packageDir}/.textpack-generated.json`,
			stableJson(markerFor(pack, context)),
		);
	}
	return outputs;
}

async function build(filter) {
	const outputs = await generatedOutputs();
	for (const [relative, text] of outputs) {
		if (
			filter === undefined ||
			(filter === "inventory" && relative.startsWith("docs/textpacks/")) ||
			(filter === "size" && relative === SIZE_REPORT_PATH)
		) {
			await writeGenerated(relative, text);
		}
	}
}

async function drift() {
	const outputs = await generatedOutputs();
	const failures = [];
	for (const [relative, expected] of outputs) {
		const absolute = path.join(ROOT, relative);
		let actual;
		try {
			actual = await readFile(absolute, "utf8");
		} catch {
			failures.push(`${relative} is missing.`);
			continue;
		}
		if (actual !== expected) failures.push(`${relative} is stale.`);
	}
	if (failures.length > 0) {
		fail("Textpack forge drift check failed.", failures.join("\n"));
	}
	console.log(`Textpack forge drift OK (${outputs.size} files).`);
}

async function licenseAudit() {
	const context = await collectContext();
	const packageByName = new Map(
		context.packs.map((pack) => [pack.packageName, pack]),
	);
	for (const pack of context.packs) {
		validatePackageSourcePolicy(pack, context);
	}
	for (const composite of context.packs.filter((pack) =>
		isCompositePack(pack),
	)) {
		validateCompositeComponentSourcePolicies(composite, packageByName, context);
	}
	console.log(
		`Textpack forge license audit OK (${context.sourcePolicies.length} policy sources, ${context.sources.length} active sources, ${context.packs.length} packages).`,
	);
}

async function verify() {
	const lock = await readJson(LOCK_PATH);
	const required = [
		LOCK_PATH,
		...(lock.sourcePaths ?? []),
		...(lock.sourcePolicyPaths ?? []),
		...(lock.snapshotPaths ?? []),
		...(lock.resourceSpecPaths ?? []),
		...(lock.packSpecPaths ?? []),
		INVENTORY_JSON_PATH,
		INVENTORY_MD_PATH,
		SOURCE_POLICY_JSON_PATH,
		SOURCE_READINESS_MD_PATH,
		LANGUAGE_COMPOSITE_READINESS_JSON_PATH,
		LANGUAGE_COMPOSITE_READINESS_MD_PATH,
		SIZE_REPORT_PATH,
		...(lock.compositeSpecPaths ?? []),
	];
	for (const relative of required) {
		if (!(await fileExists(relative))) fail(`${relative} is missing.`);
	}
	await licenseAudit();
	await drift();
}

async function acquire() {
	const lock = await readJson(LOCK_PATH);
	const snapshots = await Promise.all(
		lock.snapshotPaths.map((snapshotPath) => readJson(snapshotPath)),
	);
	let acquiredCount = 0;
	for (const snapshot of snapshots) {
		for (const file of snapshot.files ?? []) {
			expect(
				typeof file.sourceUrl === "string" && file.sourceUrl.length > 0,
				`${snapshot.snapshotId} file ${file.path} does not declare sourceUrl.`,
			);
			const absolute = snapshotDataPath(
				file.path,
				`${snapshot.snapshotId} file path`,
			);
			await mkdir(path.dirname(absolute), {
				recursive: true,
			});
			const tempPath = `${absolute}.download`;
			await rm(tempPath, { force: true });
			await acquireSourceUrl(file.sourceUrl, tempPath);
			const bytes = await readFile(tempPath);
			const checksum = sha256Bytes(bytes);
			expect(
				checksum === file.checksum,
				`${snapshot.snapshotId} acquired ${file.path} checksum mismatch.`,
				`expected ${file.checksum}\nactual   ${checksum}`,
			);
			expect(
				bytes.byteLength === file.byteLength,
				`${snapshot.snapshotId} acquired ${file.path} byteLength mismatch.`,
				`expected ${file.byteLength}\nactual   ${bytes.byteLength}`,
			);
			await rename(tempPath, absolute);
			acquiredCount += 1;
		}
	}
	await collectContext();
	console.log(`Textpack forge acquired ${acquiredCount} snapshot files.`);
}

async function snapshotUpdate() {
	const lock = await readJson(LOCK_PATH);
	const snapshotEntries = await Promise.all(
		lock.snapshotPaths.map(async (snapshotPath) => ({
			snapshotPath,
			snapshot: await readJson(snapshotPath),
		})),
	);
	const snapshotFileByKey = new Map();
	for (const entry of snapshotEntries) {
		if (!Array.isArray(entry.snapshot.files)) continue;
		const files = [];
		for (const file of entry.snapshot.files) {
			const absolute = snapshotDataPath(
				file.path,
				`${entry.snapshot.snapshotId} file path`,
			);
			const bytes = await readFile(absolute);
			const fileStat = await stat(absolute);
			const updatedFile = {
				...file,
				byteLength: fileStat.size,
				checksum: sha256Bytes(bytes),
			};
			files.push(updatedFile);
			snapshotFileByKey.set(
				`${entry.snapshot.snapshotId}\n${updatedFile.path}`,
				updatedFile,
			);
		}
		files.sort((left, right) => left.path.localeCompare(right.path));
		entry.snapshot.files = files;
		entry.snapshot.checksum = snapshotAggregateChecksum(files);
	}
	for (const entry of snapshotEntries) {
		await writeJson(entry.snapshotPath, entry.snapshot);
	}
	for (const resourceSpecPath of lock.resourceSpecPaths ?? []) {
		const resourceSpec = await readJson(resourceSpecPath);
		let changed = false;
		for (const inputFile of resourceSpec.inputFiles ?? []) {
			const snapshotFile = snapshotFileByKey.get(
				`${inputFile.snapshotId}\n${inputFile.path}`,
			);
			expect(
				snapshotFile !== undefined,
				`${resourceSpec.resourceSpecId} input ${inputFile.path} is not declared by snapshot ${inputFile.snapshotId}.`,
			);
			if (inputFile.checksum !== snapshotFile.checksum) {
				inputFile.checksum = snapshotFile.checksum;
				changed = true;
			}
		}
		if (changed) await writeJson(resourceSpecPath, resourceSpec);
	}
	lock.snapshotLocks = snapshotEntries.map((entry) => ({
		snapshotId: entry.snapshot.snapshotId,
		checksum: entry.snapshot.checksum,
	}));
	await writeJson(LOCK_PATH, lock);
	await collectContext();
	console.log(
		`Textpack forge updated ${snapshotEntries.length} snapshot descriptors.`,
	);
}

async function main() {
	const command = process.argv[2] ?? "help";
	if (command === "acquire") {
		await acquire();
		return;
	}
	if (command === "build") {
		await build();
		return;
	}
	if (command === "inventory") {
		await build("inventory");
		return;
	}
	if (command === "size") {
		await build("size");
		return;
	}
	if (command === "drift") {
		await drift();
		return;
	}
	if (command === "verify") {
		await verify();
		return;
	}
	if (command === "license-audit") {
		await licenseAudit();
		return;
	}
	if (command === "snapshot-update") {
		await snapshotUpdate();
		return;
	}
	const commands = [
		"acquire",
		"build",
		"inventory",
		"size",
		"drift",
		"license-audit",
		"verify",
		"snapshot-update",
	].join(", ");
	fail(`Usage: node tools/textpack-forge/cli.mjs <${commands}>`);
}

await main();
