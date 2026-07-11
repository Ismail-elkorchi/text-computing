import { createHash } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import {
	assertLookupIndexIntegrity,
	LOOKUP_INDEX_SCHEMA_ID,
	LOOKUP_INDEX_STORAGE_FORMAT,
	lookupIndexSourceText,
} from "./lookup-index.mjs";
import {
	assertWikidataExtractLineage,
	compositePolicySurfaces,
} from "./policy.mjs";
import {
	assertWordnetSemanticIntegrity,
	parseWordnetTsvTables,
} from "./wordnet-lmf.mjs";

const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const GENERATED_BY = "tools/textpack-forge";
const GZIP_BASE64_RESOURCE_SUFFIX = ".gz.b64";
const INVENTORY_JSON_PATH = "docs/textpacks/generated-inventory.json";
const SIZE_REPORT_PATH = "tools/textpack-forge/reports/size-report.json";
const DISTRIBUTION_PACKAGE_NAMES = new Set([
	"@ismail-elkorchi/textpack-ar",
	"@ismail-elkorchi/textpack-en",
	"@ismail-elkorchi/textpack-fr",
]);

function assert(condition, message, details) {
	if (condition) return;
	throw new Error(details === undefined ? message : `${message}\n${details}`);
}

const expect = assert;

function assertRelativePath(value, label) {
	assert(typeof value === "string" && value.length > 0, `${label} is empty.`);
	assert(!path.isAbsolute(value), `${label} must be relative.`);
	assert(!value.includes(".."), `${label} must not traverse upward.`);
	assert(!value.includes("\\"), `${label} must use forward slashes.`);
}

function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256Bytes(bytes) {
	return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function sha256(text) {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function sortJson(value) {
	if (Array.isArray(value)) return value.map((entry) => sortJson(entry));
	if (value === null || typeof value !== "object") return value;
	const output = {};
	for (const key of Object.keys(value).sort())
		output[key] = sortJson(value[key]);
	return output;
}

function stableJson(value) {
	return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function sorted(values) {
	return [...values].sort((left, right) => left.localeCompare(right));
}

async function readJson(relative) {
	return JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
}

function posixRelative(filePath) {
	return filePath.split(path.sep).join("/");
}

export function validateResourceSpec(resourceSpec) {
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
		assert(resourceSpec[key] !== undefined, `Resource spec is missing ${key}.`);
	}
	assert(
		resourceSpec.schemaVersion === "1",
		`${resourceSpec.resourceSpecId} schemaVersion must be 1.`,
	);
	assert(
		Array.isArray(resourceSpec.inputFiles) &&
			resourceSpec.inputFiles.length > 0,
		`${resourceSpec.resourceSpecId} inputFiles must be a non-empty array.`,
	);
	assert(
		Array.isArray(resourceSpec.outputs) && resourceSpec.outputs.length > 0,
		`${resourceSpec.resourceSpecId} outputs must be a non-empty array.`,
	);
	for (const inputFile of resourceSpec.inputFiles) {
		assertRelativePath(
			inputFile.path,
			`${resourceSpec.resourceSpecId} input file path`,
		);
		assert(
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
		assert(
			output.path.startsWith("resources/"),
			`${resourceSpec.resourceSpecId} output ${output.path} must live under resources/.`,
		);
		if (output.lookupKeyColumns !== undefined) {
			assert(
				Array.isArray(output.lookupKeyColumns) &&
					output.lookupKeyColumns.length > 0 &&
					new Set(output.lookupKeyColumns).size ===
						output.lookupKeyColumns.length &&
					output.lookupKeyColumns.every(
						(column) => typeof column === "string" && column.length > 0,
					),
				`${resourceSpec.resourceSpecId} output ${output.resourceId} lookupKeyColumns must be unique non-empty strings.`,
			);
		}
		if (output.lookupEmptyKeyColumns !== undefined) {
			assert(
				Array.isArray(output.lookupEmptyKeyColumns) &&
					output.lookupEmptyKeyColumns.length > 0 &&
					new Set(output.lookupEmptyKeyColumns).size ===
						output.lookupEmptyKeyColumns.length &&
					output.lookupEmptyKeyColumns.every(
						(column) =>
							typeof column === "string" &&
							column.length > 0 &&
							output.lookupKeyColumns?.includes(column),
					),
				`${resourceSpec.resourceSpecId} output ${output.resourceId} lookupEmptyKeyColumns must be a non-empty subset of lookupKeyColumns.`,
			);
		}
		if (output.lookupPatternColumns !== undefined) {
			assert(
				Array.isArray(output.lookupPatternColumns) &&
					output.lookupPatternColumns.length > 0 &&
					new Set(output.lookupPatternColumns).size ===
						output.lookupPatternColumns.length &&
					output.lookupPatternColumns.every(
						(column) =>
							typeof column === "string" &&
							column.length > 0 &&
							output.lookupKeyColumns?.includes(column),
					),
				`${resourceSpec.resourceSpecId} output ${output.resourceId} lookupPatternColumns must be a non-empty subset of lookupKeyColumns.`,
			);
		}
	}
}

export function validateSourceCatalog(sources) {
	const sourceById = new Map();
	for (const source of sources) {
		assert(
			source.schemaVersion === "1",
			`${source.sourceId} schemaVersion must be 1.`,
		);
		assert(
			Array.isArray(source.licenseEvidence) &&
				source.licenseEvidence.length > 0 &&
				source.licenseEvidence.every(
					(url) => typeof url === "string" && url.startsWith("https://"),
				),
			`${source.sourceId} licenseEvidence must contain HTTPS URLs.`,
		);
		assert(
			!sourceById.has(source.sourceId),
			`Duplicate source id ${source.sourceId}.`,
		);
		assert(
			source.reviewState !== "blocked",
			`${source.sourceId} is blocked and cannot be used by generated packs.`,
		);
		assert(
			source.redistributionPolicy !== "blocked",
			`${source.sourceId} has blocked redistribution policy.`,
		);
		sourceById.set(source.sourceId, source);
	}
	return sourceById;
}

export function validateSnapshotCatalog(snapshots, sourceById) {
	const snapshotById = new Map();
	for (const snapshot of snapshots) {
		assert(
			snapshot.schemaVersion === "1",
			`${snapshot.snapshotId} schemaVersion must be 1.`,
		);
		assert(
			!snapshotById.has(snapshot.snapshotId),
			`Duplicate snapshot id ${snapshot.snapshotId}.`,
		);
		assert(
			sourceById.has(snapshot.sourceId),
			`${snapshot.snapshotId} references unknown source ${snapshot.sourceId}.`,
		);
		snapshotById.set(snapshot.snapshotId, snapshot);
	}
	return snapshotById;
}

export function validateResourceSourceGraph(
	resourceSpec,
	sourceById,
	snapshotById,
) {
	for (const sourceId of resourceSpec.sourceIds) {
		assert(
			sourceById.has(sourceId),
			`${resourceSpec.resourceSpecId} references unknown source ${sourceId}.`,
		);
	}
	for (const snapshotId of resourceSpec.snapshotIds) {
		const snapshot = snapshotById.get(snapshotId);
		assert(
			snapshot !== undefined,
			`${resourceSpec.resourceSpecId} references unknown snapshot ${snapshotId}.`,
		);
		assert(
			resourceSpec.sourceIds.includes(snapshot.sourceId),
			`${resourceSpec.resourceSpecId} snapshot ${snapshotId} comes from undeclared source ${snapshot.sourceId}.`,
		);
	}
	for (const inputFile of resourceSpec.inputFiles) {
		assert(
			resourceSpec.snapshotIds.includes(inputFile.snapshotId),
			`${resourceSpec.resourceSpecId} input ${inputFile.path} uses undeclared snapshot ${inputFile.snapshotId}.`,
		);
		const snapshot = snapshotById.get(inputFile.snapshotId);
		assert(
			snapshot !== undefined,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} references unknown snapshot ${inputFile.snapshotId}.`,
		);
		const snapshotFile = snapshot.files?.find(
			(candidate) => candidate.path === inputFile.path,
		);
		assert(
			snapshotFile !== undefined,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} is not declared by snapshot ${inputFile.snapshotId}.`,
		);
		assert(
			snapshotFile.checksum === inputFile.checksum,
			`${resourceSpec.resourceSpecId} input ${inputFile.path} checksum does not match snapshot descriptor.`,
			`expected ${snapshotFile.checksum}\nactual   ${inputFile.checksum}`,
		);
	}
}

export function isCompositePack(pack) {
	return pack.packClass === "language-composite";
}

export function validatePackSpec(packSpec, resourceSpecById) {
	for (const key of ["packageName", "packClass", "supportLevel"]) {
		expect(
			typeof packSpec[key] === "string" && packSpec[key].length > 0,
			`Pack spec is missing ${key}.`,
		);
	}
	expect(
		!isCompositePack(packSpec),
		`${packSpec.packageName} language distributions must be declared in tools/textpack-forge/composites, not in build-unit catalogs.`,
	);
	expect(
		typeof packSpec.description === "string" && packSpec.description.length > 0,
		`${packSpec.packageName} description is required.`,
	);
	expect(
		Array.isArray(packSpec.resourceSpecIds) &&
			packSpec.resourceSpecIds.length > 0,
		`${packSpec.packageName} packs must declare resourceSpecIds.`,
	);
	expect(
		Array.isArray(packSpec.manifest?.resources) &&
			packSpec.manifest.resources.length > 0,
		`${packSpec.packageName} internal build unit must declare at least one resource.`,
	);
	for (const resource of packSpec.manifest.resources) {
		expect(
			typeof resource.schemaId === "string" && resource.schemaId.length > 0,
			`${packSpec.packageName} resource ${resource.id} must declare schemaId.`,
		);
		expect(
			!isRecord(resource.metadata) ||
				resource.metadata.canonicalSchema === undefined,
			`${packSpec.packageName} resource ${resource.id} must use schemaId, not metadata.canonicalSchema.`,
		);
	}
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

export async function validateResourceLineage(
	resourceSpec,
	snapshotById,
	generatedAt,
) {
	if (resourceSpec.pipelineId !== "wikidata-main-artifact") return;
	const metadataInput = resourceSpec.inputFiles.find((inputFile) =>
		inputFile.path.endsWith("-extract-metadata.json"),
	);
	expect(
		metadataInput !== undefined,
		`${resourceSpec.resourceSpecId} must declare extract lineage metadata.`,
	);
	const bytes = await readFile(path.join(ROOT, metadataInput.path));
	expect(
		sha256Bytes(bytes) === metadataInput.checksum,
		`${resourceSpec.resourceSpecId} extract lineage metadata checksum mismatch.`,
	);
	const snapshot = snapshotById.get(metadataInput.snapshotId);
	expect(
		snapshot !== undefined,
		`${resourceSpec.resourceSpecId} extract lineage snapshot is missing.`,
	);
	assertWikidataExtractLineage({
		metadata: JSON.parse(bytes.toString("utf8")),
		snapshot,
		generatedAt,
		label: resourceSpec.resourceSpecId,
	});
}

export function buildUnitIdForPackageName(packageName) {
	const prefix = "@ismail-elkorchi/textpack-";
	expect(
		packageName.startsWith(prefix),
		`Internal build unit key ${packageName} must start with ${prefix}.`,
	);
	return packageName.slice(prefix.length);
}

export function buildUnitComponents(spec, buildUnitSpecById) {
	return spec.buildUnits.map((selection) => {
		const buildUnit = buildUnitSpecById.get(selection.buildUnitId);
		expect(
			buildUnit !== undefined,
			`${spec.packageName} references unknown build unit ${selection.buildUnitId}.`,
		);
		return {
			packageName: buildUnit.packageName,
			versionRange: buildUnit.manifest.version,
			role: "required",
			reason: selection.reason,
			licensePolicy: selection.licensePolicy,
			capabilityPolicy: "contributes-default",
			artifactPolicy: "none",
		};
	});
}

export function validateCompositeSpec(spec, buildUnitSpecById) {
	for (const key of [
		"packageName",
		"packageDir",
		"name",
		"description",
		"version",
		"packClass",
		"supportLevel",
		"display",
		"targets",
		"buildUnits",
		"capabilitySlots",
		"license",
		"citations",
	]) {
		expect(spec[key] !== undefined, `Composite spec is missing ${key}.`);
	}
	expect(
		spec.mode === "source-backed",
		`${spec.packageName} distribution mode ${spec.mode} is unsupported.`,
	);
	expect(
		isCompositePack(spec),
		`${spec.packageName} packClass must be language-composite.`,
	);
	expect(
		DISTRIBUTION_PACKAGE_NAMES.has(spec.packageName),
		`${spec.packageName} is not one of the supported public language distributions.`,
	);
	expect(
		compositePolicySurfaces.has(spec.policySurface ?? "default"),
		`${spec.packageName} policySurface must be default or license-inclusive.`,
	);
	assertRelativePath(spec.packageDir, `${spec.packageName} packageDir`);
	expect(
		typeof spec.display.languageName === "string" &&
			spec.display.languageName.length > 0,
		`${spec.packageName} display.languageName must be a non-empty string.`,
	);
	expect(
		Array.isArray(spec.buildUnits) && spec.buildUnits.length > 0,
		`${spec.packageName} must select at least one build unit.`,
	);
	const selectedBuildUnitIds = new Set(
		spec.buildUnits.map((buildUnit) => buildUnit.buildUnitId),
	);
	expect(
		selectedBuildUnitIds.size === spec.buildUnits.length,
		`${spec.packageName} must not select a build unit more than once.`,
	);
	for (const buildUnit of spec.buildUnits) {
		expect(
			buildUnitSpecById.has(buildUnit.buildUnitId),
			`${spec.packageName} references unknown build unit ${buildUnit.buildUnitId}.`,
		);
	}
}

export function generatedPackageDirs(outputs) {
	return new Set(
		[...outputs.keys()]
			.filter((relative) => relative.startsWith("packages/textpacks/"))
			.map((relative) => relative.split("/").slice(0, 3).join("/")),
	);
}

export async function cleanStaleTextpackPackageDirs(expectedPackageDirs) {
	const textpacksDir = path.join(ROOT, "packages/textpacks");
	let entries;
	try {
		entries = await readdir(textpacksDir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const relative = `packages/textpacks/${entry.name}`;
		if (expectedPackageDirs.has(relative)) continue;
		const markerPath = path.join(
			textpacksDir,
			entry.name,
			".textpack-generated.json",
		);
		let marker;
		try {
			marker = JSON.parse(await readFile(markerPath, "utf8"));
		} catch {
			continue;
		}
		if (marker.generatedBy !== GENERATED_BY) continue;
		await rm(path.join(textpacksDir, entry.name), {
			recursive: true,
			force: true,
		});
	}
}

async function listFilesRecursive(dirPath, files) {
	let entries;
	try {
		entries = await readdir(dirPath, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const entryPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			await listFilesRecursive(entryPath, files);
			continue;
		}
		if (entry.isFile()) files.push(entryPath);
	}
}

async function generatedResourceText(packageDir, resource) {
	const bytes = await readFile(path.join(ROOT, packageDir, resource.path));
	if (
		resource.format === LOOKUP_INDEX_STORAGE_FORMAT &&
		resource.schemaId !== LOOKUP_INDEX_SCHEMA_ID
	) {
		return lookupIndexSourceText(
			bytes.toString("utf8"),
			`${resource.id} indexed table`,
		);
	}
	if (resource.path.endsWith(GZIP_BASE64_RESOURCE_SUFFIX)) {
		return gunzipSync(
			Buffer.from(bytes.toString("utf8").trim(), "base64"),
		).toString("utf8");
	}
	if (resource.path.endsWith(".gz")) {
		return gunzipSync(bytes).toString("utf8");
	}
	return bytes.toString("utf8");
}

async function verifyGeneratedWordnetIntegrity(packageDir, manifest) {
	const resourcesById = new Map(
		manifest.resources.map((resource) => [resource.id, resource]),
	);
	for (const prefix of ["wordnet-ar", "wordnet-en"]) {
		const resourceIds = {
			lexicalEntries: `${prefix}-lexical-entries`,
			senses: `${prefix}-senses`,
			synsets: `${prefix}-synsets`,
			relations: `${prefix}-relations`,
			quality: `${prefix}-quality`,
		};
		if (!resourcesById.has(resourceIds.lexicalEntries)) continue;
		for (const resourceId of Object.values(resourceIds)) {
			expect(
				resourcesById.has(resourceId),
				`${manifest.packageName} is missing required ${resourceId}.`,
			);
		}
		const [lexicalEntriesText, sensesText, synsetsText, relationsText] =
			await Promise.all(
				[
					resourceIds.lexicalEntries,
					resourceIds.senses,
					resourceIds.synsets,
					resourceIds.relations,
				].map((resourceId) =>
					generatedResourceText(packageDir, resourcesById.get(resourceId)),
				),
			);
		const tables = parseWordnetTsvTables({
			lexicalEntriesText,
			sensesText,
			synsetsText,
			relationsText,
		});
		assertWordnetSemanticIntegrity(tables, `${manifest.packageName} ${prefix}`);
		const quality = JSON.parse(
			await generatedResourceText(
				packageDir,
				resourcesById.get(resourceIds.quality),
			),
		);
		expect(
			quality.lexicalEntryCount === tables.lexicalEntryRows.length &&
				quality.senseCount === tables.senseRows.length &&
				quality.synsetCount === tables.synsetRows.length &&
				quality.relationCount === tables.relationRows.length,
			`${manifest.packageName} ${prefix} quality counts do not match its resources.`,
		);
		expect(
			quality.lexicalEntrySemanticIntegrityRatio === 1 &&
				quality.senseSemanticIntegrityRatio === 1,
			`${manifest.packageName} ${prefix} lacks passing semantic integrity evidence.`,
		);
	}
}

async function verifyGeneratedLookupIndexes(packageDir, manifest) {
	const resourcesById = new Map(
		manifest.resources.map((resource) => [resource.id, resource]),
	);
	const boundIndexIds = new Set(
		manifest.capabilitySlots.flatMap((slot) =>
			(slot.bindings ?? [])
				.filter((binding) => binding.role === "index")
				.map((binding) => binding.resourceId),
		),
	);
	for (const indexResource of manifest.resources.filter(
		(resource) => resource.schemaId === LOOKUP_INDEX_SCHEMA_ID,
	)) {
		const metadata = indexResource.metadata;
		expect(
			isRecord(metadata),
			`${manifest.packageName} ${indexResource.id} is missing index metadata.`,
		);
		const sourceResource = resourcesById.get(metadata.indexedResourceId);
		expect(
			sourceResource !== undefined,
			`${manifest.packageName} ${indexResource.id} references a missing indexed resource.`,
		);
		expect(
			sourceResource.schemaId === metadata.indexedResourceSchemaId,
			`${manifest.packageName} ${indexResource.id} indexed resource schema is stale.`,
		);
		expect(
			indexResource.format === LOOKUP_INDEX_STORAGE_FORMAT &&
				sourceResource.format === LOOKUP_INDEX_STORAGE_FORMAT &&
				indexResource.path === sourceResource.path &&
				indexResource.license === sourceResource.license &&
				JSON.stringify(indexResource.citations ?? []) ===
					JSON.stringify(sourceResource.citations ?? []) &&
				sourceResource.metadata?.lookupIndexResourceId === indexResource.id,
			`${manifest.packageName} ${indexResource.id} must share one provenance-identical indexed-table payload with ${sourceResource.id}.`,
		);
		expect(
			boundIndexIds.has(indexResource.id),
			`${manifest.packageName} ${indexResource.id} lacks a capability binding with role index.`,
		);
		const [indexText, sourceText] = await Promise.all([
			generatedResourceText(packageDir, indexResource),
			generatedResourceText(packageDir, sourceResource),
		]);
		assertLookupIndexIntegrity({
			indexText,
			sourceText,
			schemaId: sourceResource.schemaId,
			metadata,
			label: `${manifest.packageName} ${indexResource.id}`,
		});
	}
}

export async function cleanStaleTextpackPackageFiles(outputs) {
	const expectedFiles = new Set(outputs.keys());
	for (const packageDir of generatedPackageDirs(outputs)) {
		const absolutePackageDir = path.join(ROOT, packageDir);
		const files = [];
		await listFilesRecursive(absolutePackageDir, files);
		for (const filePath of files) {
			const relative = posixRelative(path.relative(ROOT, filePath));
			if (expectedFiles.has(relative)) continue;
			await rm(filePath, { force: true });
		}
	}
}

export async function verifyGeneratedPackageFiles(expectedInputChecksum) {
	const inventory = await readJson(INVENTORY_JSON_PATH);
	expect(
		stableJson(
			sorted((inventory.packages ?? []).map((entry) => entry.packageName)),
		) === stableJson(sorted(DISTRIBUTION_PACKAGE_NAMES)),
		"Generated inventory must contain exactly the language distributions.",
	);
	const sizeReport = await readJson(SIZE_REPORT_PATH);
	const sizeByPackage = new Map(
		(sizeReport.packages ?? []).map((entry) => [entry.packageName, entry]),
	);
	const expectedDirs = new Set();
	let verifiedFileCount = 0;
	for (const entry of inventory.packages ?? []) {
		const packageDir = `packages/textpacks/${entry.packageId}`;
		expectedDirs.add(packageDir);
		const marker = await readJson(`${packageDir}/.textpack-generated.json`);
		expect(
			marker.generatedBy === GENERATED_BY,
			`${packageDir} is missing forge ownership metadata.`,
		);
		expect(
			marker.packageName === entry.packageName,
			`${packageDir} marker package name mismatch.`,
		);
		expect(
			marker.lockfileChecksum === expectedInputChecksum,
			`${packageDir} was generated from stale forge inputs.`,
			`expected ${expectedInputChecksum}\nactual   ${marker.lockfileChecksum}`,
		);
		expect(
			stableJson(marker.fileDigests) === stableJson(entry.fileDigests),
			`${packageDir} inventory file digests are stale.`,
		);
		expect(
			stableJson(marker.generatedFiles) ===
				stableJson(marker.fileDigests.map((file) => file.path)),
			`${packageDir} marker generated file list is stale.`,
		);
		const outputChecksum = sha256(stableJson(marker.fileDigests));
		expect(
			marker.outputChecksum === outputChecksum &&
				entry.outputChecksum === outputChecksum,
			`${packageDir} output checksum is stale.`,
		);
		for (const file of marker.fileDigests) {
			const bytes = await readFile(path.join(ROOT, packageDir, file.path));
			expect(
				bytes.byteLength === file.byteLength,
				`${packageDir}/${file.path} byte length mismatch.`,
			);
			expect(
				sha256Bytes(bytes) === file.checksum,
				`${packageDir}/${file.path} checksum mismatch.`,
			);
			verifiedFileCount += 1;
		}
		const manifest = await readJson(`${packageDir}/pack.manifest.json`);
		await verifyGeneratedWordnetIntegrity(packageDir, manifest);
		await verifyGeneratedLookupIndexes(packageDir, manifest);
		const actualFiles = [];
		await listFilesRecursive(path.join(ROOT, packageDir), actualFiles);
		const generatedFiles = actualFiles
			.map((filePath) =>
				posixRelative(path.relative(path.join(ROOT, packageDir), filePath)),
			)
			.filter(
				(relative) =>
					relative !== ".textpack-generated.json" &&
					!relative.startsWith("dist/"),
			)
			.sort((left, right) => left.localeCompare(right));
		expect(
			stableJson(generatedFiles) === stableJson(marker.generatedFiles),
			`${packageDir} contains stale or missing generated files.`,
		);
		const resourceBytes = marker.fileDigests
			.filter((file) => file.path.startsWith("resources/"))
			.reduce((total, file) => total + file.byteLength, 0);
		const reportedSize = sizeByPackage.get(entry.packageName);
		expect(
			reportedSize?.npmShippedSizeBytes === resourceBytes,
			`${packageDir} size report does not match generated resources.`,
		);
		expect(
			resourceBytes <= sizeReport.limits.distributionPackageBytes,
			`${packageDir} exceeds the generated distribution package size budget.`,
		);
		expect(
			reportedSize.outputChecksum === outputChecksum,
			`${packageDir} size report output checksum is stale.`,
		);
	}
	const aggregateResourceBytes = [...sizeByPackage.values()].reduce(
		(total, report) => total + report.npmShippedSizeBytes,
		0,
	);
	expect(
		aggregateResourceBytes <= sizeReport.limits.distributionAggregateBytes,
		"Generated distributions exceed the aggregate physical storage budget.",
	);
	const textpacksDir = path.join(ROOT, "packages/textpacks");
	const actualDirs = new Set(
		(await readdir(textpacksDir, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => `packages/textpacks/${entry.name}`),
	);
	expect(
		stableJson(sorted(actualDirs)) === stableJson(sorted(expectedDirs)),
		"Generated textpack directory inventory is stale.",
	);
	return verifiedFileCount;
}
