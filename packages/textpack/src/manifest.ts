import { deepFreezeJson } from "./internal/freeze.js";
import { assertJsonValue, isPlainRecord } from "./internal/json.js";
import {
	type ResourceKind,
	resourceKinds,
	type TextPackArtifactChecksum,
	type TextPackArtifactDescriptor,
	type TextPackArtifactExpectedFile,
	type TextPackArtifactPolicy,
	type TextPackArtifactRetrieval,
	type TextPackCapabilities,
	type TextPackCapabilityName,
	type TextPackCapabilitySlot,
	type TextPackCapabilitySlotStatus,
	type TextPackComponent,
	type TextPackDependency,
	type TextPackGapNote,
	type TextPackGeneratedInfo,
	type TextPackManifest,
	type TextPackModality,
	type TextPackResource,
	type TextPackTargets,
	textPackModalities,
} from "./types.js";

const resourceKindSet = new Set<string>(resourceKinds);
const modalitySet = new Set<string>(textPackModalities);
const targetKeys = [
	"languages",
	"scripts",
	"regions",
	"domains",
	"periods",
	"orthographies",
	"modalities",
] as const;

const capabilityLevels = {
	segmentation: ["none", "default", "profile", "dictionary", "fst", "rules"],
	normalization: ["none", "unicode", "lexicon", "rules", "fst", "statistical"],
	morphology: [
		"none",
		"lookup",
		"paradigm-table",
		"rules",
		"fst",
		"statistical",
	],
	tagging: ["none", "rules", "statistical", "hybrid"],
	parsing: ["none", "rules", "statistical", "hybrid"],
	extraction: ["none", "gazetteer", "rules", "statistical", "hybrid"],
	search: ["none", "analyzer", "index-profile"],
	terminology: ["none", "lexicon", "corpus", "kb"],
} as const satisfies Record<
	Exclude<TextPackCapabilityName, "historical" | "noisyText" | "parallel">,
	readonly string[]
>;

const booleanCapabilityKeys = new Set(["historical", "noisyText", "parallel"]);
const componentRoles = new Set(["required", "optional", "excluded"]);
const componentLicensePolicies = new Set([
	"default",
	"allow-attribution",
	"allow-share-alike",
	"allow-copyleft",
	"local-only",
]);
const componentCapabilityPolicies = new Set([
	"contributes-default",
	"available-optional",
	"documentation-only",
]);
const artifactPolicies = new Set(["none", "locked", "fetch-explicit"]);
const artifactProfiles = new Set(["research", "full", "local"]);
const artifactChecksumAlgorithms = new Set(["sha1", "sha256", "sha512"]);
const artifactRedistributionPolicies = new Set([
	"redistributable",
	"redistributable-with-attribution",
	"derived-only",
	"local-only",
	"blocked",
]);
const artifactRetrievalKinds = new Set([
	"https",
	"s3",
	"huggingface",
	"local",
	"manual",
]);
const capabilitySlotStatuses = new Set([
	"unsupported",
	"planned",
	"profiled",
	"sampled",
	"artifact-backed",
	"task-supported",
	"feature-complete",
	"not-applicable",
]);
const gapNoteStatuses = new Set([
	"unsupported",
	"planned",
	"artifact-backed",
	"not-applicable",
]);

function rejectUnknownKeys(
	record: Readonly<Record<string, unknown>>,
	allowedKeys: ReadonlySet<string>,
	path: string,
): void {
	for (const key of Object.keys(record)) {
		if (!allowedKeys.has(key)) {
			throw new TypeError(`${path}.${key} is not a final textpack field.`);
		}
	}
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isPlainRecord(value))
		throw new TypeError(`${path} must be a plain object.`);
	return value;
}

function readRequiredString(
	record: Readonly<Record<string, unknown>>,
	key: string,
	path: string,
): string {
	const value = record[key];
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${path}.${key} must be a non-empty string.`);
	}
	return value;
}

function readOptionalString(
	record: Readonly<Record<string, unknown>>,
	key: string,
	path: string,
): string | undefined {
	const value = record[key];
	if (value === undefined) return undefined;
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${path}.${key} must be a non-empty string.`);
	}
	return value;
}

function readRequiredNumber(
	record: Readonly<Record<string, unknown>>,
	key: string,
	path: string,
): number {
	const value = record[key];
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		throw new TypeError(`${path}.${key} must be a non-negative integer.`);
	}
	return value;
}

function readEnum<T extends string>(
	record: Readonly<Record<string, unknown>>,
	key: string,
	path: string,
	allowed: ReadonlySet<string>,
): T {
	const value = record[key];
	if (typeof value !== "string" || !allowed.has(value)) {
		throw new TypeError(
			`${path}.${key} must be one of ${[...allowed].join(", ")}.`,
		);
	}
	return value as T;
}

function readOptionalEnum<T extends string>(
	record: Readonly<Record<string, unknown>>,
	key: string,
	path: string,
	allowed: ReadonlySet<string>,
): T | undefined {
	const value = record[key];
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !allowed.has(value)) {
		throw new TypeError(
			`${path}.${key} must be one of ${[...allowed].join(", ")}.`,
		);
	}
	return value as T;
}

function readStringArray(
	value: unknown,
	path: string,
): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	if (value.length === 0) {
		throw new TypeError(`${path} must contain at least one item.`);
	}
	const seen = new Set<string>();
	const strings = value.map((entry, index) => {
		if (typeof entry !== "string" || entry.trim().length === 0) {
			throw new TypeError(`${path}[${index}] must be a non-empty string.`);
		}
		if (seen.has(entry)) {
			throw new TypeError(`${path}[${index}] duplicates value ${entry}.`);
		}
		seen.add(entry);
		return entry;
	});
	return Object.freeze(strings);
}

function readModalities(
	value: unknown,
	path: string,
): readonly TextPackModality[] | undefined {
	const strings = readStringArray(value, path);
	if (strings === undefined) return undefined;
	for (const modality of strings) {
		if (!modalitySet.has(modality)) {
			throw new TypeError(`${path} contains unsupported modality ${modality}.`);
		}
	}
	return strings as readonly TextPackModality[];
}

function validateTargets(value: unknown, path: string): TextPackTargets {
	const record = requireRecord(value, path);
	for (const key of Object.keys(record)) {
		if (!targetKeys.includes(key as (typeof targetKeys)[number])) {
			throw new TypeError(
				`${path}.${key} is not a final textpack target field.`,
			);
		}
	}
	const targets: {
		languages?: readonly string[];
		scripts?: readonly string[];
		regions?: readonly string[];
		domains?: readonly string[];
		periods?: readonly string[];
		orthographies?: readonly string[];
		modalities?: readonly TextPackModality[];
	} = {};
	const languages = readStringArray(record.languages, `${path}.languages`);
	const scripts = readStringArray(record.scripts, `${path}.scripts`);
	const regions = readStringArray(record.regions, `${path}.regions`);
	const domains = readStringArray(record.domains, `${path}.domains`);
	const periods = readStringArray(record.periods, `${path}.periods`);
	const orthographies = readStringArray(
		record.orthographies,
		`${path}.orthographies`,
	);
	const modalities = readModalities(record.modalities, `${path}.modalities`);
	if (languages !== undefined) targets.languages = languages;
	if (scripts !== undefined) targets.scripts = scripts;
	if (regions !== undefined) targets.regions = regions;
	if (domains !== undefined) targets.domains = domains;
	if (periods !== undefined) targets.periods = periods;
	if (orthographies !== undefined) targets.orthographies = orthographies;
	if (modalities !== undefined) targets.modalities = modalities;
	return Object.freeze(targets);
}

function validateResourceKind(value: unknown, path: string): ResourceKind {
	if (typeof value !== "string" || !resourceKindSet.has(value)) {
		throw new TypeError(`${path} must be a final ResourceKind.`);
	}
	return value as ResourceKind;
}

function validateStringRecord(
	value: unknown,
	path: string,
): Readonly<Record<string, string>> {
	const record = requireRecord(value, path);
	const output: Record<string, string> = {};
	for (const [key, item] of Object.entries(record).sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		if (typeof item !== "string" || item.trim().length === 0) {
			throw new TypeError(`${path}.${key} must be a non-empty string.`);
		}
		output[key] = item;
	}
	return Object.freeze(output);
}

function validateDependency(value: unknown, path: string): TextPackDependency {
	const record = requireRecord(value, path);
	rejectUnknownKeys(
		record,
		new Set(["id", "packageName", "version", "optional"]),
		path,
	);
	const dependency: {
		id: string;
		packageName?: string;
		version?: string;
		optional?: boolean;
	} = {
		id: readRequiredString(record, "id", path),
	};
	const packageName = readOptionalString(record, "packageName", path);
	const version = readOptionalString(record, "version", path);
	if (packageName !== undefined) dependency.packageName = packageName;
	if (version !== undefined) dependency.version = version;
	if (record.optional !== undefined) {
		if (typeof record.optional !== "boolean") {
			throw new TypeError(`${path}.optional must be a boolean.`);
		}
		dependency.optional = record.optional;
	}
	return Object.freeze(dependency);
}

function validateDependencies(
	value: unknown,
	path: string,
): readonly TextPackDependency[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	return Object.freeze(
		value.map((entry, index) => validateDependency(entry, `${path}[${index}]`)),
	);
}

function validateResource(value: unknown, path: string): TextPackResource {
	const record = requireRecord(value, path);
	rejectUnknownKeys(
		record,
		new Set([
			"id",
			"kind",
			"name",
			"path",
			"format",
			"mediaType",
			"targets",
			"license",
			"citations",
			"dependencies",
			"metadata",
		]),
		path,
	);
	const metadata = record.metadata;
	if (metadata !== undefined) assertJsonValue(metadata, `${path}.metadata`);
	const citations = readStringArray(record.citations, `${path}.citations`);
	const dependencies = validateDependencies(
		record.dependencies,
		`${path}.dependencies`,
	);
	const targets =
		record.targets === undefined
			? undefined
			: validateTargets(record.targets, `${path}.targets`);
	const resource: {
		id: string;
		kind: ResourceKind;
		name?: string;
		path?: string;
		format?: string;
		mediaType?: string;
		targets?: TextPackTargets;
		license?: string;
		citations?: readonly string[];
		dependencies?: readonly TextPackDependency[];
		metadata?: unknown;
	} = {
		id: readRequiredString(record, "id", path),
		kind: validateResourceKind(record.kind, `${path}.kind`),
	};
	const name = readOptionalString(record, "name", path);
	const resourcePath = readOptionalString(record, "path", path);
	const format = readOptionalString(record, "format", path);
	const mediaType = readOptionalString(record, "mediaType", path);
	const license = readOptionalString(record, "license", path);
	if (name !== undefined) resource.name = name;
	if (resourcePath !== undefined) resource.path = resourcePath;
	if (format !== undefined) resource.format = format;
	if (mediaType !== undefined) resource.mediaType = mediaType;
	if (targets !== undefined) resource.targets = targets;
	if (license !== undefined) resource.license = license;
	if (citations !== undefined) resource.citations = citations;
	if (dependencies !== undefined) resource.dependencies = dependencies;
	if (metadata !== undefined) resource.metadata = metadata;
	return deepFreezeJson(resource);
}

function validateResources(
	value: unknown,
	path: string,
): readonly TextPackResource[] {
	if (!Array.isArray(value)) {
		throw new TypeError(`${path} must be a resource descriptor array.`);
	}
	const ids = new Set<string>();
	const resources = value.map((entry, index) => {
		const resource = validateResource(entry, `${path}[${index}]`);
		if (ids.has(resource.id)) {
			throw new TypeError(
				`${path}[${index}].id duplicates resource id ${resource.id}.`,
			);
		}
		ids.add(resource.id);
		return resource;
	});
	return Object.freeze(resources);
}

function validateComponents(
	value: unknown,
	path: string,
): readonly TextPackComponent[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	return Object.freeze(
		value.map((entry, index) => {
			const itemPath = `${path}[${index}]`;
			const record = requireRecord(entry, itemPath);
			rejectUnknownKeys(
				record,
				new Set([
					"packageName",
					"versionRange",
					"role",
					"reason",
					"licensePolicy",
					"capabilityPolicy",
					"artifactPolicy",
				]),
				itemPath,
			);
			const reason = readOptionalString(record, "reason", itemPath);
			const artifactPolicy = readOptionalEnum<TextPackArtifactPolicy>(
				record,
				"artifactPolicy",
				itemPath,
				artifactPolicies,
			);
			const component = {
				packageName: readRequiredString(record, "packageName", itemPath),
				versionRange: readRequiredString(record, "versionRange", itemPath),
				role: readEnum<TextPackComponent["role"]>(
					record,
					"role",
					itemPath,
					componentRoles,
				),
				licensePolicy: readEnum<TextPackComponent["licensePolicy"]>(
					record,
					"licensePolicy",
					itemPath,
					componentLicensePolicies,
				),
				capabilityPolicy: readEnum<TextPackComponent["capabilityPolicy"]>(
					record,
					"capabilityPolicy",
					itemPath,
					componentCapabilityPolicies,
				),
				...(reason === undefined ? {} : { reason }),
				...(artifactPolicy === undefined ? {} : { artifactPolicy }),
			} satisfies TextPackComponent;
			return Object.freeze(component);
		}),
	);
}

function validateArtifactChecksum(
	value: unknown,
	path: string,
): TextPackArtifactChecksum {
	const record = requireRecord(value, path);
	rejectUnknownKeys(record, new Set(["algorithm", "value"]), path);
	return Object.freeze({
		algorithm: readEnum<TextPackArtifactChecksum["algorithm"]>(
			record,
			"algorithm",
			path,
			artifactChecksumAlgorithms,
		),
		value: readRequiredString(record, "value", path),
	});
}

function validateArtifactRetrieval(
	value: unknown,
	path: string,
): TextPackArtifactRetrieval {
	const record = requireRecord(value, path);
	rejectUnknownKeys(record, new Set(["kind", "uri", "instructions"]), path);
	const retrieval: {
		kind: TextPackArtifactRetrieval["kind"];
		uri?: string;
		instructions?: string;
	} = {
		kind: readEnum(record, "kind", path, artifactRetrievalKinds),
	};
	const uri = readOptionalString(record, "uri", path);
	const instructions = readOptionalString(record, "instructions", path);
	if (uri !== undefined) retrieval.uri = uri;
	if (instructions !== undefined) retrieval.instructions = instructions;
	return Object.freeze(retrieval);
}

function validateArtifactExpectedFile(
	value: unknown,
	path: string,
): TextPackArtifactExpectedFile {
	const record = requireRecord(value, path);
	rejectUnknownKeys(record, new Set(["path", "sizeBytes", "checksum"]), path);
	const expected: {
		path: string;
		sizeBytes?: number;
		checksum?: string;
	} = {
		path: readRequiredString(record, "path", path),
	};
	if (record.sizeBytes !== undefined) {
		expected.sizeBytes = readRequiredNumber(record, "sizeBytes", path);
	}
	const checksum = readOptionalString(record, "checksum", path);
	if (checksum !== undefined) expected.checksum = checksum;
	return Object.freeze(expected);
}

function validateArtifacts(
	value: unknown,
	path: string,
): readonly TextPackArtifactDescriptor[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	return Object.freeze(
		value.map((entry, index) => {
			const itemPath = `${path}[${index}]`;
			const record = requireRecord(entry, itemPath);
			rejectUnknownKeys(
				record,
				new Set([
					"artifactId",
					"sourceIds",
					"version",
					"profile",
					"sizeBytes",
					"mediaType",
					"compression",
					"checksum",
					"licenseExpression",
					"redistributionPolicy",
					"retrieval",
					"cacheKey",
					"expectedFiles",
				]),
				itemPath,
			);
			const compression = readOptionalEnum<
				NonNullable<TextPackArtifactDescriptor["compression"]>
			>(
				record,
				"compression",
				itemPath,
				new Set(["gzip", "bzip2", "zstd", "zip", "tar"]),
			);
			const artifact: {
				artifactId: string;
				sourceIds: readonly string[];
				version: string;
				profile: TextPackArtifactDescriptor["profile"];
				sizeBytes: number;
				mediaType: string;
				compression?: NonNullable<TextPackArtifactDescriptor["compression"]>;
				checksum: TextPackArtifactChecksum;
				licenseExpression: string;
				redistributionPolicy: TextPackArtifactDescriptor["redistributionPolicy"];
				retrieval: TextPackArtifactRetrieval;
				cacheKey: string;
				expectedFiles: readonly TextPackArtifactExpectedFile[];
			} = {
				artifactId: readRequiredString(record, "artifactId", itemPath),
				sourceIds: (() => {
					const sourceIds = readStringArray(
						record.sourceIds,
						`${itemPath}.sourceIds`,
					);
					if (sourceIds === undefined) {
						throw new TypeError(`${itemPath}.sourceIds must be an array.`);
					}
					return sourceIds;
				})(),
				version: readRequiredString(record, "version", itemPath),
				profile: readEnum(record, "profile", itemPath, artifactProfiles),
				sizeBytes: readRequiredNumber(record, "sizeBytes", itemPath),
				mediaType: readRequiredString(record, "mediaType", itemPath),
				checksum: validateArtifactChecksum(
					record.checksum,
					`${itemPath}.checksum`,
				),
				licenseExpression: readRequiredString(
					record,
					"licenseExpression",
					itemPath,
				),
				redistributionPolicy: readEnum(
					record,
					"redistributionPolicy",
					itemPath,
					artifactRedistributionPolicies,
				),
				retrieval: validateArtifactRetrieval(
					record.retrieval,
					`${itemPath}.retrieval`,
				),
				cacheKey: readRequiredString(record, "cacheKey", itemPath),
				expectedFiles: Array.isArray(record.expectedFiles)
					? Object.freeze(
							record.expectedFiles.map((file, fileIndex) =>
								validateArtifactExpectedFile(
									file,
									`${itemPath}.expectedFiles[${fileIndex}]`,
								),
							),
						)
					: (() => {
							throw new TypeError(
								`${itemPath}.expectedFiles must be an array.`,
							);
						})(),
			};
			if (compression !== undefined) artifact.compression = compression;
			return deepFreezeJson(artifact);
		}),
	);
}

function validateCapabilitySlots(
	value: unknown,
	path: string,
): readonly TextPackCapabilitySlot[] {
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	const ids = new Set<string>();
	const slots = value.map((entry, index) => {
		const itemPath = `${path}[${index}]`;
		const record = requireRecord(entry, itemPath);
		rejectUnknownKeys(
			record,
			new Set([
				"slot",
				"status",
				"resourceIds",
				"artifactIds",
				"notes",
				"capabilities",
			]),
			itemPath,
		);
		const slot: {
			slot: string;
			status: TextPackCapabilitySlotStatus;
			resourceIds?: readonly string[];
			artifactIds?: readonly string[];
			notes?: readonly string[];
			capabilities?: TextPackCapabilities;
		} = {
			slot: readRequiredString(record, "slot", itemPath),
			status: readEnum(record, "status", itemPath, capabilitySlotStatuses),
		};
		if (ids.has(slot.slot)) {
			throw new TypeError(`${itemPath}.slot duplicates slot ${slot.slot}.`);
		}
		ids.add(slot.slot);
		const resourceIds = readStringArray(
			record.resourceIds,
			`${itemPath}.resourceIds`,
		);
		const artifactIds = readStringArray(
			record.artifactIds,
			`${itemPath}.artifactIds`,
		);
		const notes = readStringArray(record.notes, `${itemPath}.notes`);
		const capabilities =
			record.capabilities === undefined
				? undefined
				: validateCapabilities(record.capabilities, `${itemPath}.capabilities`);
		if (resourceIds !== undefined) slot.resourceIds = resourceIds;
		if (artifactIds !== undefined) slot.artifactIds = artifactIds;
		if (notes !== undefined) slot.notes = notes;
		if (capabilities !== undefined) slot.capabilities = capabilities;
		return Object.freeze(slot);
	});
	return Object.freeze(slots);
}

function validateGapNotes(
	value: unknown,
	path: string,
): readonly TextPackGapNote[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	return Object.freeze(
		value.map((entry, index) => {
			const itemPath = `${path}[${index}]`;
			const record = requireRecord(entry, itemPath);
			rejectUnknownKeys(
				record,
				new Set(["id", "slot", "runtimeSurface", "status", "message"]),
				itemPath,
			);
			const note: {
				id: string;
				slot?: string;
				runtimeSurface?: string;
				status: TextPackGapNote["status"];
				message: string;
			} = {
				id: readRequiredString(record, "id", itemPath),
				status: readEnum(record, "status", itemPath, gapNoteStatuses),
				message: readRequiredString(record, "message", itemPath),
			};
			const slot = readOptionalString(record, "slot", itemPath);
			const runtimeSurface = readOptionalString(
				record,
				"runtimeSurface",
				itemPath,
			);
			if (slot !== undefined) note.slot = slot;
			if (runtimeSurface !== undefined) note.runtimeSurface = runtimeSurface;
			return Object.freeze(note);
		}),
	);
}

function validateGeneratedInfo(
	value: unknown,
	path: string,
): TextPackGeneratedInfo | undefined {
	if (value === undefined) return undefined;
	const record = requireRecord(value, path);
	rejectUnknownKeys(
		record,
		new Set([
			"forgeVersion",
			"lockfileChecksum",
			"generatedAt",
			"generatorCommand",
		]),
		path,
	);
	return Object.freeze({
		forgeVersion: readRequiredString(record, "forgeVersion", path),
		lockfileChecksum: readRequiredString(record, "lockfileChecksum", path),
		generatedAt: readRequiredString(record, "generatedAt", path),
		generatorCommand: readRequiredString(record, "generatorCommand", path),
	});
}

function validateCapabilities(
	value: unknown,
	path: string,
): TextPackCapabilities {
	const record = requireRecord(value, path);
	const output: Record<string, string | boolean> = {};
	for (const [key, item] of Object.entries(record).sort(([left], [right]) =>
		left.localeCompare(right),
	)) {
		if (booleanCapabilityKeys.has(key)) {
			if (typeof item !== "boolean") {
				throw new TypeError(`${path}.${key} must be a boolean.`);
			}
			output[key] = item;
			continue;
		}
		const allowed = capabilityLevels[key as keyof typeof capabilityLevels];
		if (allowed === undefined) {
			throw new TypeError(`${path}.${key} is not a final capability key.`);
		}
		if (
			typeof item !== "string" ||
			!(allowed as readonly string[]).includes(item)
		) {
			throw new TypeError(
				`${path}.${key} must be one of ${allowed.join(", ")}.`,
			);
		}
		output[key] = item;
	}
	return Object.freeze(output) as TextPackCapabilities;
}

function validateOptionalCitations(
	value: unknown,
	path: string,
): readonly string[] | undefined {
	return readStringArray(value, path);
}

function validateManifestReferences(
	resources: readonly TextPackResource[],
	artifacts: readonly TextPackArtifactDescriptor[] | undefined,
	capabilitySlots: readonly TextPackCapabilitySlot[],
	gapNotes: readonly TextPackGapNote[] | undefined,
): void {
	const resourceIds = new Set(resources.map((resource) => resource.id));
	const artifactIds = new Set(
		(artifacts ?? []).map((artifact) => artifact.artifactId),
	);
	const slotIds = new Set(capabilitySlots.map((slot) => slot.slot));
	for (const slot of capabilitySlots) {
		for (const resourceId of slot.resourceIds ?? []) {
			if (!resourceIds.has(resourceId)) {
				throw new TypeError(
					`manifest.capabilitySlots.${slot.slot} references unknown resource ${resourceId}.`,
				);
			}
		}
		for (const artifactId of slot.artifactIds ?? []) {
			if (!artifactIds.has(artifactId)) {
				throw new TypeError(
					`manifest.capabilitySlots.${slot.slot} references unknown artifact ${artifactId}.`,
				);
			}
		}
	}
	for (const note of gapNotes ?? []) {
		if (note.slot !== undefined && !slotIds.has(note.slot)) {
			throw new TypeError(
				`manifest.gapNotes.${note.id} references unknown slot ${note.slot}.`,
			);
		}
	}
}

export function validateManifest(manifest: unknown): TextPackManifest {
	const record = requireRecord(manifest, "manifest");
	rejectUnknownKeys(
		record,
		new Set([
			"schemaVersion",
			"id",
			"name",
			"version",
			"packageName",
			"targets",
			"engines",
			"resources",
			"components",
			"artifacts",
			"capabilitySlots",
			"gapNotes",
			"license",
			"citations",
			"generated",
		]),
		"manifest",
	);
	if (record.schemaVersion !== "1") {
		throw new TypeError("manifest.schemaVersion must be 1.");
	}
	const resources = validateResources(record.resources, "manifest.resources");
	const components = validateComponents(
		record.components,
		"manifest.components",
	);
	const artifacts = validateArtifacts(record.artifacts, "manifest.artifacts");
	const gapNotes = validateGapNotes(record.gapNotes, "manifest.gapNotes");
	const citations = validateOptionalCitations(
		record.citations,
		"manifest.citations",
	);
	const generated = validateGeneratedInfo(
		record.generated,
		"manifest.generated",
	);
	const capabilitySlots = validateCapabilitySlots(
		record.capabilitySlots,
		"manifest.capabilitySlots",
	);
	validateManifestReferences(resources, artifacts, capabilitySlots, gapNotes);
	const output: {
		schemaVersion: "1";
		id: string;
		name: string;
		version: string;
		packageName: string;
		targets: TextPackTargets;
		engines: Readonly<Record<string, string>>;
		resources: readonly TextPackResource[];
		components?: readonly TextPackComponent[];
		artifacts?: readonly TextPackArtifactDescriptor[];
		capabilitySlots: readonly TextPackCapabilitySlot[];
		gapNotes?: readonly TextPackGapNote[];
		license?: string;
		citations?: readonly string[];
		generated?: TextPackGeneratedInfo;
	} = {
		schemaVersion: "1",
		id: readRequiredString(record, "id", "manifest"),
		name: readRequiredString(record, "name", "manifest"),
		version: readRequiredString(record, "version", "manifest"),
		packageName: readRequiredString(record, "packageName", "manifest"),
		targets: validateTargets(record.targets, "manifest.targets"),
		engines: validateStringRecord(record.engines, "manifest.engines"),
		resources,
		capabilitySlots,
	};
	const license = readOptionalString(record, "license", "manifest");
	if (components !== undefined) output.components = components;
	if (artifacts !== undefined) output.artifacts = artifacts;
	if (gapNotes !== undefined) output.gapNotes = gapNotes;
	if (license !== undefined) output.license = license;
	if (citations !== undefined) output.citations = citations;
	if (generated !== undefined) output.generated = generated;
	return deepFreezeJson(output);
}
