import { freezeRecord } from "./internal/freeze.js";
import { isPlainRecord } from "./internal/json.js";
import { validateManifest } from "./manifest.js";
import type { PackResourceMap, TextPack, TextPackManifest } from "./types.js";

type PackModule = {
	readonly manifest: unknown;
	readonly resources: unknown;
};

function hasOwn(
	record: Readonly<Record<string, unknown>>,
	key: string,
): boolean {
	return Object.hasOwn(record, key);
}

function normalizeResourceMap(
	manifest: TextPackManifest,
	resources: unknown,
): PackResourceMap {
	if (!isPlainRecord(resources)) {
		throw new TypeError(
			"resources must be a plain object keyed by textpack resource id.",
		);
	}
	const declaredIds = manifest.resources.map((resource) => resource.id).sort();
	const actualIds = Object.keys(resources).sort();
	const declared = new Set(declaredIds);
	for (const id of declaredIds) {
		if (!hasOwn(resources, id)) {
			throw new TypeError(`resources is missing declared resource ${id}.`);
		}
		if (resources[id] === undefined) {
			throw new TypeError(`resources.${id} must not be undefined.`);
		}
	}
	for (const id of actualIds) {
		if (!declared.has(id)) {
			throw new TypeError(`resources declares undeclared resource ${id}.`);
		}
	}
	return freezeRecord(resources);
}

export function createPack(
	manifest: TextPackManifest,
	resources: PackResourceMap,
): TextPack {
	const normalizedManifest = validateManifest(manifest);
	const normalizedResources = normalizeResourceMap(
		normalizedManifest,
		resources,
	);
	return Object.freeze({
		manifest: normalizedManifest,
		resources: normalizedResources,
	});
}

function readModuleCandidate(module: unknown): PackModule {
	if (!isPlainRecord(module)) {
		throw new TypeError("loadPack requires a module object.");
	}
	const defaultValue = module.default;
	const candidate =
		isPlainRecord(defaultValue) &&
		hasOwn(defaultValue, "manifest") &&
		hasOwn(defaultValue, "resources")
			? defaultValue
			: module;
	if (!isPlainRecord(candidate)) {
		throw new TypeError("loadPack requires final textpack module exports.");
	}
	if (!hasOwn(candidate, "manifest") || !hasOwn(candidate, "resources")) {
		throw new TypeError("loadPack requires manifest and resources exports.");
	}
	return {
		manifest: candidate.manifest,
		resources: candidate.resources,
	};
}

export async function loadPack(module: unknown): Promise<TextPack> {
	const candidate = readModuleCandidate(module);
	return createPack(
		validateManifest(candidate.manifest),
		candidate.resources as PackResourceMap,
	);
}

export function getResource<T>(pack: TextPack, id: string): T {
	if (!hasOwn(pack.resources, id)) {
		throw new TypeError(`Textpack resource ${id} is not present.`);
	}
	return pack.resources[id] as T;
}
