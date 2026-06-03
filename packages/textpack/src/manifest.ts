import { deepFreezeJson } from "./internal/freeze.js";
import { assertJsonValue, isPlainRecord } from "./internal/json.js";
import {
	type ResourceKind,
	resourceKinds,
	type TextPackCapabilities,
	type TextPackCapabilityName,
	type TextPackDependency,
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
	morphology: ["none", "lookup", "rules", "fst", "statistical"],
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

function dedupe(values: readonly string[]): readonly string[] {
	return [...new Set(values)];
}

function readStringArray(
	value: unknown,
	path: string,
): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	const strings = value.map((entry, index) => {
		if (typeof entry !== "string" || entry.trim().length === 0) {
			throw new TypeError(`${path}[${index}] must be a non-empty string.`);
		}
		return entry;
	});
	return Object.freeze(dedupe(strings));
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

function validateResourceKinds(
	value: unknown,
	path: string,
): readonly ResourceKind[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new TypeError(`${path} must be a non-empty ResourceKind array.`);
	}
	return Object.freeze(
		dedupe(
			value.map((entry, index) =>
				validateResourceKind(entry, `${path}[${index}]`),
			),
		),
	) as readonly ResourceKind[];
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
	if (!Array.isArray(value) || value.length === 0) {
		throw new TypeError(
			`${path} must be a non-empty resource descriptor array.`,
		);
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

export function validateManifest(manifest: unknown): TextPackManifest {
	const record = requireRecord(manifest, "manifest");
	rejectUnknownKeys(
		record,
		new Set([
			"id",
			"name",
			"version",
			"packageName",
			"kind",
			"targets",
			"engines",
			"resources",
			"dependencies",
			"capabilities",
			"license",
			"citations",
		]),
		"manifest",
	);
	const kind = validateResourceKinds(record.kind, "manifest.kind");
	const resources = validateResources(record.resources, "manifest.resources");
	const declaredKinds = new Set(kind);
	const actualKinds = new Set(resources.map((resource) => resource.kind));
	for (const resource of resources) {
		if (!declaredKinds.has(resource.kind)) {
			throw new TypeError(
				`manifest.kind must include resource kind ${resource.kind} declared by ${resource.id}.`,
			);
		}
	}
	for (const declaredKind of declaredKinds) {
		if (!actualKinds.has(declaredKind)) {
			throw new TypeError(
				`manifest.kind includes ${declaredKind} but no resource declares that kind.`,
			);
		}
	}
	const dependencies = validateDependencies(
		record.dependencies,
		"manifest.dependencies",
	);
	const citations = validateOptionalCitations(
		record.citations,
		"manifest.citations",
	);
	const output: {
		id: string;
		name: string;
		version: string;
		packageName: string;
		kind: readonly ResourceKind[];
		targets: TextPackTargets;
		engines: Readonly<Record<string, string>>;
		resources: readonly TextPackResource[];
		dependencies?: readonly TextPackDependency[];
		capabilities: TextPackCapabilities;
		license?: string;
		citations?: readonly string[];
	} = {
		id: readRequiredString(record, "id", "manifest"),
		name: readRequiredString(record, "name", "manifest"),
		version: readRequiredString(record, "version", "manifest"),
		packageName: readRequiredString(record, "packageName", "manifest"),
		kind,
		targets: validateTargets(record.targets, "manifest.targets"),
		engines: validateStringRecord(record.engines, "manifest.engines"),
		resources,
		capabilities: validateCapabilities(
			record.capabilities,
			"manifest.capabilities",
		),
	};
	const license = readOptionalString(record, "license", "manifest");
	if (dependencies !== undefined) output.dependencies = dependencies;
	if (license !== undefined) output.license = license;
	if (citations !== undefined) output.citations = citations;
	return deepFreezeJson(output);
}
