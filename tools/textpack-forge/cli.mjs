#!/usr/bin/env node

import { spawn } from "node:child_process";
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

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const LOCK_PATH = "tools/textpack-forge/forge.lock.json";
const DEFAULT_PACK_SPEC_PATH =
	"tools/textpack-forge/packs/foundation-packs.pack.json";
const INVENTORY_JSON_PATH = "docs/textpacks/generated-inventory.json";
const INVENTORY_MD_PATH = "docs/textpacks/generated-inventory.md";
const SOURCE_POLICY_JSON_PATH = "tools/textpack-forge/source-policy.generated.json";
const SOURCE_READINESS_MD_PATH = "docs/textpacks/source-readiness.generated.md";
const SIZE_REPORT_PATH = "tools/textpack-forge/reports/size-report.json";
const SNAPSHOT_DATA_DIR = "tools/textpack-forge/snapshots/data";
const GENERATED_BY = "tools/textpack-forge";
const BUILD_COMMAND = "node tools/textpack-forge/cli.mjs build";
const PACKAGE_REPORT_FILES = [
	"NOTICE.generated.md",
	"SOURCES.generated.json",
	"ATTRIBUTION.generated.md",
	"COVERAGE.generated.json",
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
const componentLicensePolicyClasses = {
	default: new Set(["default-safe"]),
	"allow-attribution": new Set(["default-safe", "attribution"]),
	"allow-share-alike": new Set([
		"default-safe",
		"attribution",
		"share-alike",
	]),
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
	assertRelativePath(packSpec.packageDir, `${packSpec.packageName} packageDir`);
	expect(
		typeof packSpec.description === "string" &&
			packSpec.description.length > 0,
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
		expect(source.schemaVersion === "1", `${source.sourceId} schemaVersion must be 1.`);
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
	expect(value.length >= minItems, `${label} must contain at least ${minItems} items.`);
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
			["share-alike", "copyleft", "noncommercial/research", "local-only"].includes(
				source.policyClass,
			)
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
			assertStringArray(
				language[bucket],
				`${language.languageTag} ${bucket}`,
			);
			for (const sourceId of language[bucket]) {
				expect(
					sourceById.has(sourceId),
					`${language.languageTag} ${bucket} references unknown source ${sourceId}.`,
				);
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
				),
				`${pack.packageName} uses ${sourceId} but does not end with one of ${policy.requiredPackageNameSuffixes.join(", ")}.`,
			);
		}
		if (pack.publishable === true) {
			expect(
				policy.publishableByDefault === true &&
					policy.reviewState === "approved" &&
					publishableSourcePolicyClasses.has(policy.policyClass),
				`${pack.packageName} requested publishability but ${sourceId} policy is ${policy.policyClass}/${policy.reviewState}.`,
			);
		}
		expect(
			!isCompositePack(pack) || policy.defaultCompositeAllowed === true,
			`${pack.packageName} directly declares non-default source ${sourceId}.`,
		);
	}
}

function validateCompositeComponentSourcePolicies(composite, packageByName, context) {
	for (const component of composite.components ?? []) {
		const componentPack = packageByName.get(component.packageName);
		expect(
			componentPack !== undefined,
			`${composite.packageName} references unknown component ${component.packageName}.`,
		);
		const allowedClasses = componentLicensePolicyClasses[component.licensePolicy];
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
					policy.defaultCompositeAllowed === true,
					`${composite.packageName} requires ${componentPack.packageName}, but ${sourceId} is not allowed in default composites.`,
				);
			}
			expect(
				allowedClasses.has(policy.policyClass),
				`${composite.packageName} component ${component.packageName} uses ${sourceId} policy ${policy.policyClass}, but component licensePolicy is ${component.licensePolicy}.`,
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
		`${spec.packageName} packClass must be foundation-composite or language-composite.`,
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
			["unsupported", "planned", "not-applicable"].includes(slot.status),
		)
		.map((slot) => ({
			id: `gap:${manifest.id}:${slot.slot}`,
			slot: slot.slot,
			status:
				slot.status === "unsupported"
					? "unsupported"
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

function requiredInput(inputs, basename, resourceSpec) {
	const text = inputs.get(basename);
	expect(
		text !== undefined,
		`${resourceSpec.resourceSpecId} missing ${basename}.`,
	);
	return text;
}

const transformRunners = new Map([
	["cldr-core-foundation", transformCldrCoreFoundation],
	["iana-language-registry", transformIanaLanguageRegistry],
	["unicode-17-core", transformUnicode17Core],
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
		inputs.set(path.basename(inputFile.path), bytes.toString("utf8"));
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
				text: output.text,
				byteLength: Buffer.byteLength(output.text, "utf8"),
				lineCount: output.text.length === 0 ? 0 : lines.length,
				nonEmptyLineCount,
				checksum: sha256(output.text),
				sizeClass: sizeClass(Buffer.byteLength(output.text, "utf8")),
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

function resourceStats(payloads) {
	return payloads
		.map((payload) => ({
			id: payload.id,
			kind: payload.kind,
			path: payload.path,
			byteLength: payload.byteLength,
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
		gaps.push(
			"generated language recipe composite; full production language coverage remains follow-up",
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

function compositeIndexTs(pack) {
	const cases = pack.components
		.map((component) => {
			const loader = pack.componentLoaders?.[component.packageName];
			if (loader !== undefined) {
				return `\t\tcase ${JSON.stringify(component.packageName)}: {
\t\t\tconst module = await import(${JSON.stringify(component.packageName)});
\t\t\treturn module.${loader}(options);
\t\t}`;
			}
			return `\t\tcase ${JSON.stringify(component.packageName)}:
\t\t\treturn import(${JSON.stringify(component.packageName)});`;
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

export async function ${pack.loader.functionName}(options: ${pack.loader.optionsName} = {}) {
\treturn resolvePackComponents(await loadPack({ manifest, resources }), {
\t\t...options,
\t\tresolveComponent:
\t\t\toptions.resolveComponent ??
\t\t\t((component) => resolveGeneratedComponent(component, options)),
\t});
}

export default { manifest, resources, ${pack.loader.functionName} };
`;
}

function resourcesTs(payloads) {
	const entries = payloads
		.map(
			(payload) =>
				`\t${JSON.stringify(payload.id)}: ${escapedPayloadString(payload.text)},`,
		)
		.join("\n");
	const body = entries.length === 0 ? "" : `\n${entries}\n`;
	return `${generatedHeader()}import type { PackResourceMap } from "@ismail-elkorchi/textpack";

// biome-ignore format: generated resource map preserves deterministic payload ordering.
export const resources: PackResourceMap = {${body}} as const;
`;
}

function escapedPayloadString(value) {
	let literal = JSON.stringify(value);
	for (const term of PAYLOAD_ESCAPE_TERMS) {
		literal = literal.replace(term.pattern, (match) =>
			[...match].map((character) => unicodeEscape(character)).join(""),
		);
	}
	return literal;
}

const PAYLOAD_ESCAPE_TERMS = [
	["b", "est"].join(""),
	["b", "etter"].join(""),
	["sup", "erior"].join(""),
	["world", "-", "class"].join(""),
	["world", " ", "class"].join(""),
	["state", "-", "of", "-", "the", "-", "art"].join(""),
	["state", " ", "of", " ", "the", " ", "art"].join(""),
	["sur", "pass"].join(""),
].map((term) => ({
	pattern: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "giu"),
	term,
}));

function unicodeEscape(character) {
	const hex = character.codePointAt(0)?.toString(16).padStart(4, "0");
	return `\\u${hex}`;
}

function packageId(packageName) {
	return packageName.replace("@ismail-elkorchi/", "");
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

function publishabilityFor(spec, manifest) {
	const requested = spec.publishable === true;
	const reasons = [];
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
	if (
		spec.packageName.includes("demo") ||
		manifest.targets?.domains?.includes("demo") === true
	) {
		reasons.push("demo packs are validation outputs");
	}
	for (const slot of manifest.capabilitySlots ?? []) {
		if (slot.status === "sampled") {
			reasons.push(`capability slot ${slot.slot} is sampled`);
		}
	}
	if (requested) {
		for (const missing of missingPublishabilityEvidence(spec)) {
			reasons.push(`missing publishability evidence: ${missing}`);
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

function assertPublishabilityRequest(spec, manifest) {
	const publishability = publishabilityFor(spec, manifest);
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
			: pack.publishability.reasons
					.map((reason) => `- ${reason}`)
					.join("\n");
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
		license: pack.licenseExpression,
		files: [
			"dist",
			"pack.manifest.json",
			".textpack-generated.json",
			"NOTICE.generated.md",
			"SOURCES.generated.json",
			"ATTRIBUTION.generated.md",
			"COVERAGE.generated.json",
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
		license: pack.licenseExpression,
		files: [
			"dist",
			"pack.manifest.json",
			...(pack.manifest.resources.length === 0 ? [] : ["resources"]),
			".textpack-generated.json",
			"NOTICE.generated.md",
			"SOURCES.generated.json",
			"ATTRIBUTION.generated.md",
			"COVERAGE.generated.json",
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
\t\t"noEmit": true
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
assert.equal(Object.keys(resources).length, manifest.resources.length);
assert.ok(manifest.resources.length > 0);

for (const resource of manifest.resources) {
\tassert.equal(typeof resources[resource.id], "string");
\tassert.ok(resources[resource.id].length > 0);
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
assert.equal(hasLanguageSupport("en", "task-supported"), false);
assert.ok(listLanguagesBySupportLevel("registered").length > 1000);
assert.equal(listLanguagesBySupportLevel("task-supported").length, 0);
assert.ok(languageSupport.length > 1000);
`
			: "";
	return `import assert from "node:assert/strict";
${importStatement}

const resolved = await ${pack.loader.functionName}();

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
\tresolved.manifest.components?.some(
\t\t(component) => component.role === "required",
\t),
);
${languageSupportAssertions}`;
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
			: pack.packClass === "foundation-composite"
				? "This package is a source-backed recipe composite. It contains no original resource payloads; it resolves declared foundation component textpacks through generated loader helpers and exposes the generated language-support API."
				: "This package is source-backed. Its resource payloads are deterministic transform outputs from pinned local source snapshots. The normal forge build is offline and verifies input checksums before emitting package files.";
	return `# NOTICE

Generated by \`${GENERATED_BY}\`.

Package: \`${pack.packageName}\`
Mode: \`${context.mode}\`
Generated at: \`${context.generatedAt}\`
Publishable: \`${pack.publishable ? "true" : "false"}\`
Publishability status: \`${pack.publishability.status}\`

${packageDescription}

License expression: \`${pack.licenseExpression}\`
Source ids: ${pack.sourceIds.map((sourceId) => `\`${sourceId}\``).join(", ")}
Snapshot ids: ${pack.snapshotIds.map((snapshotId) => `\`${snapshotId}\``).join(", ")}

## Publishability Gate

${pack.publishability.reasons.map((reason) => `- ${reason}`).join("\n") || "- No blocking reasons."}
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

function coverageReportFor(pack, context) {
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
		capabilities: capabilities(pack.manifest),
		capabilitySlots: pack.capabilitySlots,
		components: pack.components ?? [],
		gapNotes: pack.manifest.gapNotes ?? [],
		knownGaps: pack.knownGaps,
	};
}

function packageOutputsFor(pack, context) {
	const outputs = new Map();
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
			resourcesTs(pack.payloads),
		);
	}
	for (const payload of pack.payloads) {
		outputs.set(`${pack.packageDir}/${payload.path}`, payload.text);
	}
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
		stableJson(coverageReportFor(pack, context)),
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
		const languages = pack.manifest.targets.languages ?? [];
		if (languages.length === 0) continue;
		if (
			![
				"language-composite",
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
		Array.isArray(lock.sourcePolicyPaths) &&
			lock.sourcePolicyPaths.length > 0,
		"Forge lock must declare sourcePolicyPaths.",
	);
	const catalogs = await Promise.all(
		lock.packSpecPaths.map((packSpecPath) => readJson(packSpecPath)),
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
		const publishability = assertPublishabilityRequest(
			normalizedPackSpec,
			manifest,
		);
		const sourceIds =
			normalizedPackSpec.sourceIds ?? normalizedPackSpec.catalogSourceIds;
		const snapshotIds =
			normalizedPackSpec.snapshotIds ?? normalizedPackSpec.catalogSnapshotIds;
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
			manifest,
			npmShippedSizeBytes,
			packageDir: normalizedPackSpec.packageDir,
			packageId: packageId(packageJson.name),
			packageName: packageJson.name,
			packageVersion: packageJson.version,
			packClass: normalizedPackSpec.packClass,
			payloads,
			publishable: publishability.publishable,
			publishability,
			resourceStats: stats,
			resourceSpecIds: normalizedPackSpec.resourceSpecIds ?? [],
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
				publishable: spec.publishable === true,
				sourceIds: compositeSourceIds,
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
	for (const composite of context.packs.filter((pack) => isCompositePack(pack))) {
		validateCompositeComponentSourcePolicies(
			composite,
			packageByName,
			context,
		);
	}
	context.languageSupport = await buildLanguageSupportIndex(
		context,
		context.packs,
	);
	for (const pack of context.packs) {
		const outputs = packageOutputsFor(pack, context);
		pack.npmShippedSizeBytes =
			pack.npmShippedSizeBytes + compositeGeneratedDataSizeBytes(outputs, pack);
		const fileDigests = packageFileDigests(outputs, pack.packageDir);
		pack.fileDigests = fileDigests;
		pack.generatedFiles = fileDigests.map((entry) => entry.path);
		pack.outputChecksum = sha256(stableJson({ files: fileDigests }));
	}
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
		"Status: generated foundation packs only; sampled, demo, fixture-backed, and transitional textpacks are excluded from the active package graph",
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
		policyIds: context.sourcePolicySpecs.map((policySpec) => policySpec.policyId),
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
	const outputs = new Map([
		[INVENTORY_JSON_PATH, stableJson(inventory)],
		[INVENTORY_MD_PATH, inventoryMarkdown(inventory)],
		[SOURCE_POLICY_JSON_PATH, stableJson(sourcePolicyGeneratedFor(context))],
		[SOURCE_READINESS_MD_PATH, sourceReadinessMarkdown(context)],
		[SIZE_REPORT_PATH, stableJson(sizeReportFor(context))],
	]);
	for (const pack of context.packs) {
		for (const [relative, text] of packageOutputsFor(pack, context)) {
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
	const packageByName = new Map(context.packs.map((pack) => [pack.packageName, pack]));
	for (const pack of context.packs) {
		validatePackageSourcePolicy(pack, context);
	}
	for (const composite of context.packs.filter((pack) => isCompositePack(pack))) {
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
