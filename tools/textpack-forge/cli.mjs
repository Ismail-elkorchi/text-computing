#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import {
	acquireFromForgeLock,
	updateSnapshotsFromForgeLock,
} from "./lib/acquisition.mjs";
import {
	assertPublishabilityRequest,
	BUILD_COMMAND,
	expectedGeneratedFilesForPack,
	inventoryFor,
	inventoryMarkdown,
	LOCK_PATH,
	languageDistributionReadinessFor,
	languageDistributionReadinessMarkdown,
	languageDistributionRequiredSlots,
	localLicenseEvidenceFilesForIds,
	markerFor,
	packageId,
	packageOutputsFor,
	sizeReportFor,
	sourcePolicyGeneratedFor,
	sourceReadinessMarkdown,
	validateDeveloperFacingDistributionPublishability,
	validateDistributionStorageBudgets,
} from "./lib/emission.mjs";
import {
	assertDeclaredConformanceEvaluation,
	assertTaskSupportedDistributionEvaluation,
} from "./lib/evaluation.mjs";
import {
	buildLookupIndex,
	LOOKUP_INDEX_SCHEMA_ID,
	LOOKUP_INDEX_STORAGE_FORMAT,
	lookupIndexMetadata,
	lookupIndexPath,
	lookupIndexResourceId,
} from "./lib/lookup-index.mjs";
import {
	assertGenerationChronology,
	collectSourcePolicies,
	generatedGapNotes,
	higherCapabilityTier,
	validateActiveSourcePolicies,
	validateCompositeComponentSourcePolicies,
	validatePackageSourcePolicy,
	withCapabilityBindings,
} from "./lib/policy.mjs";
import { transformRunners } from "./lib/transforms.mjs";
import {
	buildUnitComponents,
	buildUnitIdForPackageName,
	cleanStaleTextpackPackageDirs,
	cleanStaleTextpackPackageFiles,
	generatedPackageDirs,
	isCompositePack,
	validateCompositeSpec,
	validatePackSpec,
	validateResourceLineage,
	validateResourceSourceGraph,
	validateResourceSpec,
	validateSnapshotCatalog,
	validateSourceCatalog,
	verifyGeneratedPackageFiles,
} from "./lib/validation.mjs";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const FORGE_CLI_PATH = "tools/textpack-forge/cli.mjs";
const FORGE_LIB_DIR = "tools/textpack-forge/lib";
const FORGE_SCHEMA_DIR = "tools/textpack-forge/schemas";
const INVENTORY_JSON_PATH = "docs/textpacks/generated-inventory.json";
const INVENTORY_MD_PATH = "docs/textpacks/generated-inventory.md";
const SOURCE_POLICY_JSON_PATH =
	"tools/textpack-forge/source-policy.generated.json";
const SOURCE_READINESS_MD_PATH = "docs/textpacks/source-readiness.generated.md";
const LANGUAGE_DISTRIBUTION_READINESS_JSON_PATH =
	"docs/textpacks/language-distribution-readiness.generated.json";
const LANGUAGE_DISTRIBUTION_READINESS_MD_PATH =
	"docs/textpacks/language-distribution-readiness.generated.md";
const SIZE_REPORT_PATH = "tools/textpack-forge/reports/size-report.json";
const SNAPSHOT_DATA_DIR = "tools/textpack-forge/snapshots/data";
const GZIP_BASE64_RESOURCE_SUFFIX = ".gz.b64";
const AUTO_COMPRESS_RESOURCE_BYTES = 64 * 1024;
const DISTRIBUTION_PACKAGE_NAMES = new Set([
	"@ismail-elkorchi/textpack-ar",
	"@ismail-elkorchi/textpack-en",
	"@ismail-elkorchi/textpack-fr",
]);
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

async function forgeInputChecksum(lock) {
	const libraryPaths = (await readdir(path.join(ROOT, FORGE_LIB_DIR)))
		.filter((name) => name.endsWith(".mjs"))
		.map((name) => `${FORGE_LIB_DIR}/${name}`);
	const schemaPaths = (await readdir(path.join(ROOT, FORGE_SCHEMA_DIR)))
		.filter((name) => name.endsWith(".json"))
		.map((name) => `${FORGE_SCHEMA_DIR}/${name}`);
	const inputPaths = sorted(
		new Set([
			LOCK_PATH,
			FORGE_CLI_PATH,
			...libraryPaths,
			...schemaPaths,
			...(lock.sourcePaths ?? []),
			...(lock.sourcePolicyPaths ?? []),
			...(lock.snapshotPaths ?? []),
			...(lock.resourceSpecPaths ?? []),
			...(lock.packSpecPaths ?? []),
			...(lock.compositeSpecPaths ?? []),
		]),
	);
	const entries = await Promise.all(
		inputPaths.map(async (inputPath) => {
			const bytes = await readFile(path.join(ROOT, inputPath));
			return {
				path: inputPath,
				byteLength: bytes.byteLength,
				checksum: sha256Bytes(bytes),
			};
		}),
	);
	return sha256(stableJson(entries));
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

function manifestFor(packSpec, context) {
	const manifest = withCapabilityBindings(cloneJson(packSpec.manifest));
	const gapNotes = generatedGapNotes(
		manifest,
		"internal build unit",
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
	const manifest = withCapabilityBindings({
		schemaVersion: "1",
		id: `pack:${spec.packageName.replace("@ismail-elkorchi/textpack-", "")}`,
		name: spec.name,
		version: spec.version,
		packageName: spec.packageName,
		targets: spec.targets,
		resources: [],
		capabilitySlots: spec.capabilitySlots,
		license: spec.license,
		citations: spec.citations,
	});
	const gapNotes = generatedGapNotes(
		manifest,
		"self-contained language distribution",
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

function attachLookupIndexBinding(manifest, sourceResourceId, indexResource) {
	for (const slot of manifest.capabilitySlots) {
		const referencesSource =
			slot.resourceIds?.includes(sourceResourceId) === true ||
			slot.bindings?.some(
				(binding) => binding.resourceId === sourceResourceId,
			) === true;
		if (!referencesSource) continue;
		slot.resourceIds = uniqueValues([
			...(slot.resourceIds ?? []),
			indexResource.id,
		]);
		const binding = {
			role: "index",
			resourceId: indexResource.id,
			schemaId: LOOKUP_INDEX_SCHEMA_ID,
			required: true,
		};
		slot.bindings = [...(slot.bindings ?? []), binding].sort((left, right) =>
			distributionBindingKey(left).localeCompare(distributionBindingKey(right)),
		);
	}
}

function attachCanonicalLookupIndexRefs(outputs, indexes) {
	const attachedIndexIds = new Set();
	for (const output of outputs) {
		if (!output.path.endsWith(".json")) continue;
		let canonical;
		try {
			canonical = JSON.parse(output.text);
		} catch {
			continue;
		}
		if (!Array.isArray(canonical.resourceRefs)) continue;
		let changed = false;
		for (const index of indexes) {
			if (
				!canonical.resourceRefs.some(
					(reference) =>
						reference.resourceId === index.metadata.indexedResourceId,
				)
			) {
				continue;
			}
			if (
				canonical.resourceRefs.some(
					(reference) => reference.resourceId === index.id,
				)
			) {
				continue;
			}
			canonical.resourceRefs.push({
				resourceId: index.id,
				role: "lookup-index",
				recordCount: index.metadata.recordCount,
			});
			attachedIndexIds.add(index.id);
			changed = true;
		}
		if (changed) output.text = stableJson(canonical);
	}
	return attachedIndexIds;
}

function withLookupIndexOutputs(resourceSpec, manifest, outputs) {
	const sourceDescriptors = new Map(
		manifest.resources.map((resource) => [resource.id, resource]),
	);
	const outputSpecs = new Map(
		resourceSpec.outputs.map((output) => [output.resourceId, output]),
	);
	const indexes = [];
	for (const output of outputs) {
		const sourceDescriptor = sourceDescriptors.get(output.id);
		if (sourceDescriptor === undefined) continue;
		const outputSpec = outputSpecs.get(output.id);
		const lookupKeyColumns = outputSpec?.lookupKeyColumns;
		if (!Array.isArray(lookupKeyColumns)) continue;
		const index = buildLookupIndex(
			output.text,
			sourceDescriptor.schemaId,
			lookupKeyColumns,
			{
				emptyKeyColumns: outputSpec.lookupEmptyKeyColumns ?? [],
				patternColumns: outputSpec.lookupPatternColumns ?? [],
			},
		);
		expect(
			index !== undefined && index.recordCount > 0,
			`${output.id} declares lookupKeyColumns but produced no lookup index records.`,
		);
		const logicalSourceText = output.text;
		const logicalSourcePath = output.path;
		const logicalSourceFormat = sourceDescriptor.format;
		const indexId = lookupIndexResourceId(output.id);
		const metadata = {
			...lookupIndexMetadata({
				sourceResourceId: output.id,
				sourceResourceSchemaId: sourceDescriptor.schemaId,
				sourceText: output.text,
				indexText: index.text,
				keyColumns: index.keyColumns,
				emptyKeyColumns: index.emptyKeyColumns,
				fuzzyColumns: index.fuzzyColumns,
				patternColumns: index.patternColumns,
				recordCount: index.recordCount,
				rowReferenceCount: index.rowReferenceCount,
			}),
		};
		const sharedPath = lookupIndexPath(logicalSourcePath);
		const descriptor = {
			id: indexId,
			kind: "dataset",
			path: sharedPath,
			format: LOOKUP_INDEX_STORAGE_FORMAT,
			license: sourceDescriptor.license,
			citations: sourceDescriptor.citations,
			schemaId: LOOKUP_INDEX_SCHEMA_ID,
			metadata,
		};
		sourceDescriptor.path = sharedPath;
		sourceDescriptor.format = LOOKUP_INDEX_STORAGE_FORMAT;
		sourceDescriptor.metadata = {
			storageFormat: LOOKUP_INDEX_STORAGE_FORMAT,
			lookupIndexResourceId: indexId,
			logicalFormat: logicalSourceFormat,
			logicalPath: logicalSourcePath,
			logicalTextChecksum: metadata.indexedResourceTextChecksum,
			logicalTextByteLength: metadata.indexedResourceTextByteLength,
			logicalRowCount: metadata.sourceRowCount,
		};
		output.path = sharedPath;
		output.text = index.text;
		output.lookupIndex = true;
		output.logicalText = logicalSourceText;
		output.logicalRowCount = metadata.sourceRowCount;
		output.sharedStorageResourceIds = [output.id, indexId];
		const derivedOutput = {
			id: indexId,
			kind: descriptor.kind,
			path: sharedPath,
			text: index.text,
			lookupIndex: true,
			metadata,
			logicalRowCount: 0,
			sharedStorageResourceIds: [output.id, indexId],
		};
		manifest.resources.push(descriptor);
		attachLookupIndexBinding(manifest, output.id, descriptor);
		indexes.push(derivedOutput);
	}
	const attachedIndexIds = attachCanonicalLookupIndexRefs(outputs, indexes);
	for (const index of indexes) {
		expect(
			attachedIndexIds.has(index.id),
			`${index.id} has no canonical resourceRef with role lookup-index.`,
		);
	}
	return [...outputs, ...indexes];
}

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

async function collectResourcePayloads(
	packSpec,
	manifest,
	resourceSpecById,
	context,
) {
	const payloadsById = new Map();
	for (const resourceSpecId of packSpec.resourceSpecIds) {
		const resourceSpec = resourceSpecById.get(resourceSpecId);
		const runner = transformRunners.get(resourceSpec.pipelineId);
		expect(
			runner !== undefined,
			`${resourceSpec.resourceSpecId} declares unsupported pipeline ${resourceSpec.pipelineId}.`,
		);
		const inputs = await collectTransformInputs(resourceSpec);
		const transformedOutputs = runner(resourceSpec, inputs, context);
		const declaredOutputIds = new Set(
			resourceSpec.outputs.map((output) => output.resourceId),
		);
		for (const output of transformedOutputs) {
			expect(
				declaredOutputIds.has(output.id),
				`${resourceSpec.resourceSpecId} produced undeclared output ${output.id}.`,
			);
		}
		const outputs = withLookupIndexOutputs(
			resourceSpec,
			manifest,
			transformedOutputs,
		);
		for (const output of outputs) {
			const encodedOutput = encodedResourceOutput(output);
			const logicalText = output.logicalText ?? output.text;
			const lines = logicalText.split(/\r?\n/u);
			const nonEmptyLineCount = lines
				.map((line) => line.trim())
				.filter((line) => line.length > 0).length;
			payloadsById.set(output.id, {
				id: output.id,
				kind: output.kind,
				path: encodedOutput.path,
				declaredPath: output.path,
				sourcePath: resourceSpec.resourceSpecId,
				text: encodedOutput.text,
				resourceText: logicalText,
				resourceTextByteLength: Buffer.byteLength(output.text, "utf8"),
				logicalResourceTextByteLength: Buffer.byteLength(logicalText, "utf8"),
				logicalLineCount: logicalText.length === 0 ? 0 : lines.length,
				logicalNonEmptyLineCount: nonEmptyLineCount,
				logicalRecordCount: output.logicalRowCount ?? nonEmptyLineCount,
				sharedStorageResourceIds: output.sharedStorageResourceIds ?? [
					output.id,
				],
				encoded: encodedOutput.encoding,
				byteLength: Buffer.byteLength(encodedOutput.text, "utf8"),
				lineCount:
					output.text.length === 0 ? 0 : output.text.split(/\r?\n/u).length,
				nonEmptyLineCount:
					output.text.length === 0
						? 0
						: output.text
								.split(/\r?\n/u)
								.filter((line) => line.trim().length > 0).length,
				checksum: sha256(encodedOutput.text),
				sizeClass: sizeClass(Buffer.byteLength(encodedOutput.text, "utf8")),
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
			payload.declaredPath === resource.path,
			`${packSpec.packageName} resource ${resource.id} path mismatch.`,
		);
		resource.path = payload.path;
		payloads.push(payload);
	}
	return payloads;
}

function encodedResourceOutput(output) {
	if (output.lookupIndex === true) {
		return { path: output.path, text: output.text, encoding: "utf8" };
	}
	const compress =
		output.path.endsWith(GZIP_BASE64_RESOURCE_SUFFIX) ||
		Buffer.byteLength(output.text, "utf8") >= AUTO_COMPRESS_RESOURCE_BYTES;
	if (!compress) {
		return { path: output.path, text: output.text, encoding: "utf8" };
	}
	return {
		path: output.path.endsWith(GZIP_BASE64_RESOURCE_SUFFIX)
			? output.path
			: `${output.path}${GZIP_BASE64_RESOURCE_SUFFIX}`,
		text: `${gzipSync(Buffer.from(output.text, "utf8")).toString("base64")}\n`,
		encoding: "gzip-base64",
	};
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
			logicalResourceTextByteLength: payload.logicalResourceTextByteLength,
			logicalLineCount: payload.logicalLineCount,
			logicalNonEmptyLineCount: payload.logicalNonEmptyLineCount,
			logicalRecordCount: payload.logicalRecordCount,
			sharedStorageResourceIds: payload.sharedStorageResourceIds,
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

function physicalPayloads(payloads) {
	const byPath = new Map();
	for (const payload of payloads) {
		const existing = byPath.get(payload.path);
		if (existing === undefined) {
			byPath.set(payload.path, payload);
			continue;
		}
		expect(
			existing.text === payload.text &&
				existing.checksum === payload.checksum &&
				existing.byteLength === payload.byteLength &&
				existing.encoded === payload.encoded,
			`Shared textpack storage path ${payload.path} has divergent physical payloads.`,
		);
	}
	return [...byPath.values()];
}

function physicalPayloadByteLength(payloads) {
	return physicalPayloads(payloads).reduce(
		(total, payload) => total + payload.byteLength,
		0,
	);
}

function capabilitySlots(manifest) {
	return [...manifest.capabilitySlots]
		.map((slot) => ({
			slot: slot.slot,
			status: slot.status,
			tier: slot.tier,
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

const capabilityStatusOrder = [
	"not-applicable",
	"unsupported",
	"planned",
	"profiled",
	"sampled",
	"artifact-backed",
	"task-supported",
	"feature-complete",
];
const structuralReadinessSlots = new Set(["foundation", "core"]);

function capabilityStatusSupportsReadiness(slot, status) {
	return (
		["task-supported", "feature-complete"].includes(status) ||
		(structuralReadinessSlots.has(slot) && status === "profiled")
	);
}

function uniqueValues(values) {
	return [...new Set(values)];
}

function mergeDistributionCapabilities(values) {
	const output = {};
	for (const value of values) {
		for (const [key, item] of Object.entries(value ?? {})) {
			if (typeof item === "boolean") {
				output[key] = Boolean(output[key]) || item;
				continue;
			}
			const existing = output[key];
			if (typeof existing !== "string") {
				output[key] = item;
				continue;
			}
			expect(
				existing === item,
				`Cannot merge conflicting ${key} capability values ${existing} and ${item} within one slot.`,
			);
		}
	}
	return output;
}

function distributionBindingKey(binding) {
	return [
		binding.role,
		binding.resourceId,
		binding.schemaId,
		binding.required === true ? "required" : "optional",
	].join("\u0000");
}

function mergeDistributionCapabilitySlots(manifests) {
	const ranks = new Map(
		capabilityStatusOrder.map((status, index) => [status, index]),
	);
	const slots = new Map();
	for (const manifest of manifests) {
		for (const slot of manifest.capabilitySlots) {
			const existing = slots.get(slot.slot);
			if (existing === undefined) {
				slots.set(slot.slot, cloneJson(slot));
				continue;
			}
			const bindings = new Map(
				[...(existing.bindings ?? []), ...(slot.bindings ?? [])].map(
					(binding) => [distributionBindingKey(binding), binding],
				),
			);
			const capabilities = mergeDistributionCapabilities([
				existing.capabilities,
				slot.capabilities,
			]);
			const existingRank = ranks.get(existing.status) ?? 0;
			const nextRank = ranks.get(slot.status) ?? 0;
			const resourceIds = uniqueValues([
				...(existing.resourceIds ?? []),
				...(slot.resourceIds ?? []),
			]);
			const artifactIds = uniqueValues([
				...(existing.artifactIds ?? []),
				...(slot.artifactIds ?? []),
			]);
			const prerequisites = uniqueValues([
				...(existing.prerequisites ?? []),
				...(slot.prerequisites ?? []),
			]);
			const notes = uniqueValues([
				...(existing.notes ?? []),
				...(slot.notes ?? []),
			]);
			slots.set(slot.slot, {
				slot: slot.slot,
				status: nextRank > existingRank ? slot.status : existing.status,
				tier: higherCapabilityTier(existing.tier, slot.tier),
				...(resourceIds.length === 0 ? {} : { resourceIds }),
				...(artifactIds.length === 0 ? {} : { artifactIds }),
				...(bindings.size === 0
					? {}
					: {
							bindings: [...bindings.values()].sort((left, right) =>
								distributionBindingKey(left).localeCompare(
									distributionBindingKey(right),
								),
							),
						}),
				...(prerequisites.length === 0 ? {} : { prerequisites }),
				...(existing.readerRequired === true || slot.readerRequired === true
					? { readerRequired: true }
					: {}),
				...(notes.length === 0 ? {} : { notes }),
				...(Object.keys(capabilities).length === 0 ? {} : { capabilities }),
			});
		}
	}
	return [...slots.values()].sort((left, right) =>
		left.slot.localeCompare(right.slot),
	);
}

function flattenDistributionPack(pack, packageByName) {
	const componentPacks = pack.components
		.filter((component) => component.role === "required")
		.map((component) => packageByName.get(component.packageName));
	expect(
		componentPacks.every((component) => component !== undefined),
		`${pack.packageName} has a missing distribution input.`,
	);
	expect(
		componentPacks.every((component) => !isCompositePack(component)),
		`${pack.packageName} distribution inputs must be concrete build units.`,
	);
	const resources = new Map();
	const payloads = new Map();
	const artifacts = new Map();
	const gapNotes = new Map();
	for (const note of pack.manifest.gapNotes ?? []) {
		gapNotes.set(note.id, note);
	}
	const materialized = componentPacks.some(
		(component) => component.payloads.length > 0,
	);
	for (const component of componentPacks) {
		for (const resource of component.manifest.resources) {
			expect(
				!resources.has(resource.id),
				`${pack.packageName} distribution inputs duplicate resource ${resource.id}.`,
			);
			resources.set(resource.id, resource);
		}
		for (const payload of component.payloads) {
			expect(
				!payloads.has(payload.id),
				`${pack.packageName} distribution inputs duplicate payload ${payload.id}.`,
			);
			payloads.set(payload.id, payload);
		}
		for (const artifact of component.manifest.artifacts ?? []) {
			const existing = artifacts.get(artifact.artifactId);
			expect(
				existing === undefined || stableJson(existing) === stableJson(artifact),
				`${pack.packageName} distribution inputs conflict on artifact ${artifact.artifactId}.`,
			);
			artifacts.set(artifact.artifactId, artifact);
		}
		for (const note of component.manifest.gapNotes ?? []) {
			gapNotes.set(note.id, note);
		}
	}
	if (materialized) {
		expect(
			resources.size === payloads.size,
			`${pack.packageName} flattened resource and payload counts differ.`,
		);
	}
	const manifest = cloneJson(pack.manifest);
	delete manifest.components;
	manifest.resources = [...resources.values()];
	manifest.capabilitySlots = mergeDistributionCapabilitySlots([
		pack.manifest,
		...componentPacks.map((component) => component.manifest),
	]);
	if (artifacts.size > 0) manifest.artifacts = [...artifacts.values()];
	else delete manifest.artifacts;
	if (gapNotes.size > 0) manifest.gapNotes = [...gapNotes.values()];
	else delete manifest.gapNotes;
	manifest.citations = uniqueValues([
		...(pack.manifest.citations ?? []),
		...componentPacks.flatMap(
			(component) => component.manifest.citations ?? [],
		),
		...[...resources.values()].flatMap((resource) => resource.citations ?? []),
	]);
	pack.distribution = true;
	pack.manifest = manifest;
	pack.payloads = [...payloads.values()];
	pack.resourceStats = resourceStats(pack.payloads);
	pack.npmShippedSizeBytes = physicalPayloadByteLength(pack.payloads);
	pack.capabilitySlots = capabilitySlots(manifest);
	pack.resourceSpecIds = uniqueValues(
		componentPacks.flatMap((component) => component.resourceSpecIds),
	);
	return pack;
}

function isDistributionPack(pack) {
	return pack.distribution === true;
}

function knownGaps(packSpec, manifest) {
	const gaps = [];
	if (packSpec.packClass === "language-composite") {
		const hasRequiredLanguageSlots = languageDistributionRequiredSlots.every(
			(slot) =>
				manifest.capabilitySlots.some(
					(candidate) =>
						candidate.slot === slot &&
						capabilityStatusSupportsReadiness(slot, candidate.status),
				),
		);
		if (!hasRequiredLanguageSlots) {
			gaps.push(
				"generated language distribution has incomplete ordinary task-supported slot coverage",
			);
		}
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

async function collectContext(options = {}) {
	const materializeResources = options.materializeResources !== false;
	const lock = await readJson(LOCK_PATH);
	const lockfileChecksum = await forgeInputChecksum(lock);
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
	assertGenerationChronology(lock.generatedAt, snapshots);
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
	await Promise.all(
		resourceSpecs.map((resourceSpec) =>
			validateResourceLineage(resourceSpec, snapshotById, lock.generatedAt),
		),
	);
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
		resourceSpecById,
		snapshotById,
	};
	validateActiveSourcePolicies(baseContext);
	const packs = [];
	const allPackSpecs = catalogs.flatMap((catalog) =>
		catalog.packs.map((pack) => ({
			...pack,
			buildUnitId: buildUnitIdForPackageName(pack.packageName),
			catalogSourceIds: catalog.sourceIds,
			catalogSnapshotIds: catalog.snapshotIds,
			specPath: catalog.specPath,
		})),
	);
	const buildUnitSpecById = new Map();
	for (const buildUnit of allPackSpecs) {
		expect(
			!buildUnitSpecById.has(buildUnit.buildUnitId),
			`Duplicate internal build unit id ${buildUnit.buildUnitId}.`,
		);
		buildUnitSpecById.set(buildUnit.buildUnitId, buildUnit);
	}
	const compositeSpecs = await Promise.all(
		(lock.compositeSpecPaths ?? []).map((compositeSpecPath) =>
			readJson(compositeSpecPath).then((spec) => ({
				...spec,
				specPath: compositeSpecPath,
			})),
		),
	);
	const distributionInputPackageNames = new Set(
		compositeSpecs
			.filter((spec) => DISTRIBUTION_PACKAGE_NAMES.has(spec.packageName))
			.flatMap((spec) =>
				spec.buildUnits.map((selection) => {
					const buildUnit = buildUnitSpecById.get(selection.buildUnitId);
					expect(
						buildUnit !== undefined,
						`${spec.packageName} references unknown build unit ${selection.buildUnitId}.`,
					);
					return buildUnit.packageName;
				}),
			),
	);
	for (const packSpec of allPackSpecs) {
		const normalizedPackSpec = {
			...packSpec,
			generationMode: "source-backed",
		};
		validatePackSpec(normalizedPackSpec, resourceSpecById);
		const manifest = manifestFor(packSpec, baseContext);
		const packageJson = {
			name: normalizedPackSpec.packageName,
			version: manifest.version,
			description: normalizedPackSpec.description,
			license: manifest.license,
		};
		expect(
			packageJson.name === normalizedPackSpec.packageName,
			`${normalizedPackSpec.packageName} build unit id does not match its manifest packageName.`,
		);
		expect(
			manifest.packageName === normalizedPackSpec.packageName,
			`${normalizedPackSpec.packageName} manifest packageName must match pack spec.`,
		);
		expect(
			packageJson.version === manifest.version,
			`${normalizedPackSpec.packageName} package version must match manifest version.`,
		);
		const payloads =
			materializeResources &&
			distributionInputPackageNames.has(normalizedPackSpec.packageName)
				? await collectResourcePayloads(
						normalizedPackSpec,
						manifest,
						resourceSpecById,
						baseContext,
					)
				: [];
		const stats = materializeResources ? resourceStats(payloads) : [];
		const npmShippedSizeBytes = physicalPayloadByteLength(payloads);
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
				licenseExpression: manifest.license,
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
			description: packageJson.description,
			generationMode: normalizedPackSpec.generationMode,
			knownGaps: knownGaps(normalizedPackSpec, manifest),
			licenseExpression:
				manifest.license ?? packageJson.license ?? "UNLICENSED",
			licenseEvidenceFiles,
			manifest,
			npmShippedSizeBytes,
			packageId: packageId(packageJson.name),
			packageName: packageJson.name,
			packageVersion: packageJson.version,
			packClass: normalizedPackSpec.packClass,
			policySurface: "default",
			payloads,
			publishable: publishability.publishable,
			publishability,
			publishabilityEvidence: normalizedPackSpec.publishabilityEvidence,
			resourceStats: stats,
			resourceSpecIds: normalizedPackSpec.resourceSpecIds ?? [],
			specPath: normalizedPackSpec.specPath,
			sourceIds,
			snapshotIds,
			supportLevel: normalizedPackSpec.supportLevel,
		});
	}
	for (const spec of compositeSpecs) {
		validateCompositeSpec(spec, buildUnitSpecById);
		const manifest = compositeManifestFor(spec, baseContext);
		const selectedBuildUnits = spec.buildUnits.map((selection) =>
			buildUnitSpecById.get(selection.buildUnitId),
		);
		const compositeSourceIds = uniqueValues(
			selectedBuildUnits.flatMap(
				(buildUnit) => buildUnit.sourceIds ?? buildUnit.catalogSourceIds,
			),
		);
		const compositeSnapshotIds = uniqueValues(
			selectedBuildUnits.flatMap(
				(buildUnit) => buildUnit.snapshotIds ?? buildUnit.catalogSnapshotIds,
			),
		);
		const components = buildUnitComponents(spec, buildUnitSpecById);
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
				licenseExpression: manifest.license,
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
			buildUnits: spec.buildUnits,
			components,
			description: spec.description,
			generationMode: spec.mode,
			knownGaps: knownGaps(spec, manifest),
			licenseExpression: manifest.license,
			licenseEvidenceFiles: localLicenseEvidenceFilesForIds(
				compositeSourceIds,
				compositeSnapshotIds,
				baseContext,
			),
			display: spec.display,
			manifest,
			npmShippedSizeBytes: 0,
			packageDir: spec.packageDir,
			packageId: packageId(spec.packageName),
			packageName: spec.packageName,
			packageVersion: spec.version,
			packClass: spec.packClass,
			policySurface: spec.policySurface ?? "default",
			payloads: [],
			publishabilityEvidence: spec.publishabilityEvidence,
			resourceStats: [],
			resourceSpecIds: [],
			sourceIds: compositeSourceIds,
			snapshotIds: compositeSnapshotIds,
			specPath: spec.specPath,
			supportLevel: spec.supportLevel,
		};
		const publishability = assertPublishabilityRequest(
			{
				...spec,
				generationMode: spec.mode,
				sourceIds: compositeSourceIds,
				snapshotIds: compositeSnapshotIds,
			},
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
	for (const packageName of DISTRIBUTION_PACKAGE_NAMES) {
		const distribution = packageByName.get(packageName);
		expect(distribution !== undefined, `Missing distribution ${packageName}.`);
		flattenDistributionPack(distribution, packageByName);
	}
	if (materializeResources) validateDistributionStorageBudgets(context);
	if (!materializeResources) {
		for (const pack of context.packs.filter(isDistributionPack)) {
			const evaluation = await readJson(
				`${pack.packageDir}/EVALUATION.generated.json`,
			);
			expect(
				evaluation.packageName === pack.packageName &&
					Array.isArray(evaluation.records),
				`${pack.packageName} has invalid generated evaluation evidence.`,
			);
			pack.evaluationRecords = evaluation.records;
			assertTaskSupportedDistributionEvaluation(pack, evaluation.records);
			assertDeclaredConformanceEvaluation(pack, evaluation.records);
		}
	}
	for (const pack of context.packs.filter(isDistributionPack)) {
		const generatedFiles = expectedGeneratedFilesForPack(pack);
		pack.fileDigests = [];
		pack.generatedFiles = generatedFiles;
		pack.outputChecksum = sha256(
			stableJson({
				packageName: pack.packageName,
				packageVersion: pack.packageVersion,
				generatedFiles,
			}),
		);
	}
	const languageDistributionReadiness =
		languageDistributionReadinessFor(context);
	validateDeveloperFacingDistributionPublishability(
		context,
		languageDistributionReadiness,
	);
	return context;
}

async function writeGenerated(relative, text) {
	await mkdir(path.dirname(path.join(ROOT, relative)), { recursive: true });
	await writeFile(path.join(ROOT, relative), text);
}

async function generatedOutputs(options = {}) {
	const includePackages = options.includePackages !== false;
	const context = await collectContext({
		materializeResources: includePackages,
	});
	const packageOutputSets = [];
	if (includePackages) {
		for (const pack of context.packs.filter(isDistributionPack)) {
			const packageOutputs = await packageOutputsFor(pack, context);
			const prefix = `${pack.packageDir}/`;
			pack.fileDigests = [...packageOutputs.entries()]
				.map(([relative, value]) => ({
					path: relative.slice(prefix.length),
					byteLength: Buffer.byteLength(value, "utf8"),
					checksum: sha256(value),
				}))
				.sort((left, right) => left.path.localeCompare(right.path));
			pack.generatedFiles = pack.fileDigests.map((file) => file.path);
			pack.outputChecksum = sha256(stableJson(pack.fileDigests));
			packageOutputSets.push({ pack, packageOutputs });
		}
	}
	const inventory = inventoryFor(context);
	const languageDistributionReadiness =
		languageDistributionReadinessFor(context);
	const outputs = new Map([
		[INVENTORY_JSON_PATH, stableJson(inventory)],
		[INVENTORY_MD_PATH, inventoryMarkdown(inventory)],
		[SOURCE_POLICY_JSON_PATH, stableJson(sourcePolicyGeneratedFor(context))],
		[SOURCE_READINESS_MD_PATH, sourceReadinessMarkdown(context)],
		[
			LANGUAGE_DISTRIBUTION_READINESS_JSON_PATH,
			stableJson(languageDistributionReadiness),
		],
		[
			LANGUAGE_DISTRIBUTION_READINESS_MD_PATH,
			languageDistributionReadinessMarkdown(languageDistributionReadiness),
		],
		[SIZE_REPORT_PATH, stableJson(sizeReportFor(context))],
	]);
	for (const { pack, packageOutputs } of packageOutputSets) {
		for (const [relative, value] of packageOutputs) {
			outputs.set(relative, value);
		}
		outputs.set(
			`${pack.packageDir}/.textpack-generated.json`,
			stableJson(markerFor(pack, context)),
		);
	}
	return outputs;
}

async function build(filter) {
	const outputs = await generatedOutputs({ includePackages: true });
	if (filter === undefined) {
		await cleanStaleTextpackPackageDirs(generatedPackageDirs(outputs));
		await cleanStaleTextpackPackageFiles(outputs);
	}
	for (const [relative, text] of outputs) {
		if (
			filter === undefined ||
			(filter === "reports" && !relative.startsWith("packages/textpacks/")) ||
			(filter === "inventory" && relative.startsWith("docs/textpacks/")) ||
			(filter === "size" && relative === SIZE_REPORT_PATH)
		) {
			await writeGenerated(relative, text);
		}
	}
}

async function drift() {
	const context = await collectContext({
		materializeResources: false,
	});
	const languageDistributionReadiness =
		languageDistributionReadinessFor(context);
	const inventory = await readJson(INVENTORY_JSON_PATH);
	const outputs = new Map([
		[INVENTORY_MD_PATH, inventoryMarkdown(inventory)],
		[SOURCE_POLICY_JSON_PATH, stableJson(sourcePolicyGeneratedFor(context))],
		[SOURCE_READINESS_MD_PATH, sourceReadinessMarkdown(context)],
		[
			LANGUAGE_DISTRIBUTION_READINESS_JSON_PATH,
			stableJson(languageDistributionReadiness),
		],
		[
			LANGUAGE_DISTRIBUTION_READINESS_MD_PATH,
			languageDistributionReadinessMarkdown(languageDistributionReadiness),
		],
	]);
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
	const verifiedFileCount = await verifyGeneratedPackageFiles(
		context.lockfileChecksum,
	);
	console.log(
		`Textpack forge drift OK (${outputs.size} reports, ${verifiedFileCount} package files).`,
	);
}

async function licenseAudit() {
	const context = await collectContext({
		materializeResources: false,
	});
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
		`Textpack forge license audit OK (${context.sourcePolicies.length} policy sources, ${context.sources.length} active sources, ${context.packs.filter((pack) => !isDistributionPack(pack)).length} internal build units, ${context.packs.filter(isDistributionPack).length} distributions).`,
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
		LANGUAGE_DISTRIBUTION_READINESS_JSON_PATH,
		LANGUAGE_DISTRIBUTION_READINESS_MD_PATH,
		SIZE_REPORT_PATH,
		...(lock.compositeSpecPaths ?? []),
	];
	for (const relative of required) {
		if (!(await fileExists(relative))) fail(`${relative} is missing.`);
	}
	await licenseAudit();
	await drift();
}

async function acquire(options = {}) {
	const {
		acquiredCount,
		alreadyCurrentCount,
		skippedLocalDerivativeCount,
		skippedUnselectedCount,
	} = await acquireFromForgeLock({
		lockPath: LOCK_PATH,
		readJson,
		collectContext,
		all: options.all,
		snapshotDataPath,
		sha256Bytes,
	});
	console.log(
		`Textpack forge acquired ${acquiredCount} snapshot files; ${alreadyCurrentCount} already current; skipped ${skippedLocalDerivativeCount} local derivatives and ${skippedUnselectedCount} unselected files.`,
	);
}

async function snapshotUpdate() {
	const snapshotCount = await updateSnapshotsFromForgeLock({
		lockPath: LOCK_PATH,
		readJson,
		writeJson,
		collectContext,
		snapshotDataPath,
		sha256Bytes,
		snapshotAggregateChecksum,
	});
	console.log(`Textpack forge updated ${snapshotCount} snapshot descriptors.`);
}

async function main() {
	const command = process.argv[2] ?? "help";
	if (command === "acquire") {
		await acquire({ all: process.argv.includes("--all") });
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
	if (command === "reports") {
		await build("reports");
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
		"reports",
		"size",
		"drift",
		"license-audit",
		"verify",
		"snapshot-update",
	].join(", ");
	fail(`Usage: node tools/textpack-forge/cli.mjs <${commands}>`);
}

await main();
