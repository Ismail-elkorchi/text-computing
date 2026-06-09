import { capabilities } from "./capabilities.js";
import { jsonEquals } from "./internal/json.js";
import type {
	ResourceKind,
	ResourceQuery,
	TextPack,
	TextPackModality,
	TextPackResource,
	TextPackTargets,
} from "./types.js";

function asStringSet(
	value: string | readonly string[] | undefined,
): Set<string> | undefined {
	if (value === undefined) return undefined;
	return new Set(Array.isArray(value) ? value : [value]);
}

function asKindSet(
	value: ResourceKind | readonly ResourceKind[] | undefined,
): Set<string> | undefined {
	if (value === undefined) return undefined;
	return new Set(Array.isArray(value) ? value : [value]);
}

function asModalitySet(
	value: TextPackModality | readonly TextPackModality[] | undefined,
): Set<string> | undefined {
	if (value === undefined) return undefined;
	return new Set(Array.isArray(value) ? value : [value]);
}

function matchesSet(value: string, query: Set<string> | undefined): boolean {
	return query === undefined || query.has(value);
}

function matchesAny(
	values: readonly string[] | undefined,
	query: Set<string> | undefined,
): boolean {
	if (query === undefined) return true;
	if (values === undefined || values.length === 0) return false;
	return values.some((value) => query.has(value));
}

function targetsForResource(
	pack: TextPack,
	resource: TextPackResource,
): TextPackTargets {
	return resource.targets ?? pack.manifest.targets;
}

function capabilityPresent(
	pack: TextPack,
	name: NonNullable<ResourceQuery["capability"]>,
): boolean {
	const value = capabilities(pack)[name];
	return value !== undefined && value !== false && value !== "none";
}

function metadataMatches(
	resource: TextPackResource,
	query: Readonly<Record<string, unknown>> | undefined,
): boolean {
	if (query === undefined) return true;
	if (resource.metadata === undefined || resource.metadata === null)
		return false;
	if (
		typeof resource.metadata !== "object" ||
		Array.isArray(resource.metadata)
	) {
		return false;
	}
	for (const [key, expected] of Object.entries(query)) {
		if (
			!jsonEquals((resource.metadata as Record<string, unknown>)[key], expected)
		) {
			return false;
		}
	}
	return true;
}

export function listResources(
	pack: TextPack,
	query: ResourceQuery = {},
): TextPackResource[] {
	const ids = asStringSet(query.id);
	const kinds = asKindSet(query.kind);
	const packageIds = asStringSet(query.packageId);
	const packageNames = asStringSet(query.packageName);
	const languages = asStringSet(query.languages);
	const scripts = asStringSet(query.scripts);
	const regions = asStringSet(query.regions);
	const domains = asStringSet(query.domains);
	const periods = asStringSet(query.periods);
	const orthographies = asStringSet(query.orthographies);
	const modalities = asModalitySet(query.modalities);

	return pack.manifest.resources.filter((resource) => {
		const targets = targetsForResource(pack, resource);
		return (
			matchesSet(resource.id, ids) &&
			matchesSet(resource.kind, kinds) &&
			matchesSet(pack.manifest.id, packageIds) &&
			matchesSet(pack.manifest.packageName, packageNames) &&
			matchesAny(targets.languages, languages) &&
			matchesAny(targets.scripts, scripts) &&
			matchesAny(targets.regions, regions) &&
			matchesAny(targets.domains, domains) &&
			matchesAny(targets.periods, periods) &&
			matchesAny(targets.orthographies, orthographies) &&
			matchesAny(targets.modalities, modalities) &&
			(query.capability === undefined ||
				capabilityPresent(pack, query.capability)) &&
			metadataMatches(resource, query.metadata)
		);
	});
}
