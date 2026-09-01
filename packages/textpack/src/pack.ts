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

function assertOptionalNonNegativeInteger(value: unknown, path: string): void {
	if (
		value !== undefined &&
		(typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
	) {
		throw new TypeError(`${path} must be a non-negative safe integer.`);
	}
}

function normalizeFileBackedResource(
	manifest: TextPackManifest,
	descriptor: TextPackManifest["resources"][number],
	resourceId: string,
	value: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
	const path = `resources.${resourceId}`;
	if (typeof value.path !== "string" || value.path.length === 0) {
		throw new TypeError(`${path}.path must be a non-empty string.`);
	}
	if (descriptor.path !== undefined && descriptor.path !== value.path) {
		throw new TypeError(
			`${path}.path must match its manifest descriptor path.`,
		);
	}
	if (value.encoding !== "utf8" && value.encoding !== "gzip-base64") {
		throw new TypeError(`${path}.encoding must be utf8 or gzip-base64.`);
	}
	if (typeof value.checksum !== "string" || value.checksum.length === 0) {
		throw new TypeError(`${path}.checksum must be a non-empty string.`);
	}
	assertOptionalNonNegativeInteger(value.byteLength, `${path}.byteLength`);
	if (value.byteLength === undefined) {
		throw new TypeError(`${path}.byteLength must be provided.`);
	}
	assertOptionalNonNegativeInteger(
		value.resourceTextByteLength,
		`${path}.resourceTextByteLength`,
	);
	assertOptionalNonNegativeInteger(value.lineCount, `${path}.lineCount`);
	assertOptionalNonNegativeInteger(
		value.nonEmptyLineCount,
		`${path}.nonEmptyLineCount`,
	);
	if (
		value.packageRoot !== undefined &&
		(typeof value.packageRoot !== "string" || value.packageRoot.length === 0)
	) {
		throw new TypeError(`${path}.packageRoot must be a non-empty string.`);
	}
	if (value.packageName !== undefined) {
		if (
			typeof value.packageName !== "string" ||
			value.packageName.length === 0
		) {
			throw new TypeError(`${path}.packageName must be a non-empty string.`);
		}
		const owners = new Set([
			manifest.packageName,
			...(manifest.components ?? []).map((component) => component.packageName),
		]);
		if (!owners.has(value.packageName)) {
			throw new TypeError(
				`${path}.packageName must identify the manifest package or a declared component package.`,
			);
		}
	}
	return Object.freeze({ ...value });
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
	const descriptorsById = new Map(
		manifest.resources.map((resource) => [resource.id, resource]),
	);
	const actualIds = Object.keys(resources).sort();
	const declared = new Set(declaredIds);
	const normalizedResources: Record<string, unknown> = Object.create(null);
	for (const id of declaredIds) {
		if (!hasOwn(resources, id)) {
			throw new TypeError(`resources is missing declared resource ${id}.`);
		}
		if (resources[id] === undefined) {
			throw new TypeError(`resources.${id} must not be undefined.`);
		}
		const value = resources[id];
		if (isPlainRecord(value) && value.kind === "file-backed-resource") {
			const descriptor = descriptorsById.get(id);
			if (descriptor === undefined) {
				throw new TypeError(`resources.${id} has no manifest descriptor.`);
			}
			normalizedResources[id] = normalizeFileBackedResource(
				manifest,
				descriptor,
				id,
				value,
			);
		} else {
			normalizedResources[id] = value;
		}
	}
	for (const id of actualIds) {
		if (!declared.has(id)) {
			throw new TypeError(`resources declares undeclared resource ${id}.`);
		}
	}
	return freezeRecord(normalizedResources);
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
		throw new TypeError("loadPack requires standard textpack module exports.");
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
