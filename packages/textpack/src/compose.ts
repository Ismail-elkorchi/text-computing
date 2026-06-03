import { mergeCapabilities } from "./capabilities.js";
import { createPack } from "./pack.js";
import {
	type PackComposeOptions,
	type PackResourceMap,
	type ResourceKind,
	resourceKinds,
	type TextPack,
	type TextPackDependency,
	type TextPackManifest,
	type TextPackResource,
	type TextPackTargets,
} from "./types.js";

function stableHash(value: string): string {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

function unique(values: readonly string[]): readonly string[] {
	return [...new Set(values)];
}

function unionTargets(packs: readonly TextPack[]): TextPackTargets {
	const fields = [
		"languages",
		"scripts",
		"regions",
		"domains",
		"periods",
		"orthographies",
		"modalities",
	] as const;
	const output: Record<string, readonly string[]> = {};
	for (const field of fields) {
		const values = unique(
			packs.flatMap((pack) => [
				...((pack.manifest.targets[field] as readonly string[] | undefined) ??
					[]),
			]),
		);
		if (values.length > 0) output[field] = values;
	}
	return Object.freeze(output) as TextPackTargets;
}

function mergeEngines(
	packs: readonly TextPack[],
): Readonly<Record<string, string>> {
	const output: Record<string, string> = {};
	for (const pack of packs) {
		for (const [name, version] of Object.entries(pack.manifest.engines)) {
			const existing = output[name];
			if (existing !== undefined && existing !== version) {
				throw new TypeError(
					`Cannot compose incompatible engine ${name} ranges.`,
				);
			}
			output[name] = version;
		}
	}
	return Object.freeze(output);
}

function mergeDependencies(
	packs: readonly TextPack[],
): readonly TextPackDependency[] | undefined {
	const map = new Map<string, TextPackDependency>();
	for (const pack of packs) {
		for (const dependency of pack.manifest.dependencies ?? []) {
			const key = dependency.packageName ?? dependency.id;
			const existing = map.get(key);
			if (existing !== undefined && existing.version !== dependency.version) {
				throw new TypeError(`Cannot compose incompatible dependency ${key}.`);
			}
			map.set(key, {
				...dependency,
				optional: Boolean(existing?.optional) && Boolean(dependency.optional),
			});
		}
	}
	const values = [...map.values()].sort((left, right) =>
		left.id.localeCompare(right.id),
	);
	return values.length === 0 ? undefined : Object.freeze(values);
}

function orderPacks(
	packs: readonly TextPack[],
	precedence: readonly string[] | undefined,
): readonly TextPack[] {
	if (precedence === undefined) return packs;
	const rank = new Map(precedence.map((id, index) => [id, index]));
	return [...packs].sort((left, right) => {
		const leftRank = rank.get(left.manifest.id) ?? Number.MAX_SAFE_INTEGER;
		const rightRank = rank.get(right.manifest.id) ?? Number.MAX_SAFE_INTEGER;
		return (
			leftRank - rightRank || left.manifest.id.localeCompare(right.manifest.id)
		);
	});
}

function mergeResources(
	packs: readonly TextPack[],
	conflictPolicy: "error" | "first" | "last",
): { descriptors: readonly TextPackResource[]; resources: PackResourceMap } {
	const descriptors = new Map<string, TextPackResource>();
	const resources: Record<string, unknown> = {};
	for (const pack of packs) {
		for (const descriptor of pack.manifest.resources) {
			if (descriptors.has(descriptor.id)) {
				if (conflictPolicy === "error") {
					throw new TypeError(
						`Cannot compose duplicate resource id ${descriptor.id}.`,
					);
				}
				if (conflictPolicy === "first") continue;
			}
			descriptors.set(descriptor.id, descriptor);
			resources[descriptor.id] = pack.resources[descriptor.id];
		}
	}
	return {
		descriptors: Object.freeze([...descriptors.values()]),
		resources: Object.freeze(resources),
	};
}

function descriptorKinds(
	resources: readonly TextPackResource[],
): readonly ResourceKind[] {
	const found = new Set(resources.map((resource) => resource.kind));
	return resourceKinds.filter((kind) => found.has(kind));
}

function mergePackageLicense(packs: readonly TextPack[]): string | undefined {
	const licenses = unique(
		packs.flatMap((pack) =>
			pack.manifest.license ? [pack.manifest.license] : [],
		),
	);
	return licenses.length === 1 ? licenses[0] : undefined;
}

function mergeCitations(
	packs: readonly TextPack[],
	options: PackComposeOptions,
): readonly string[] | undefined {
	const citations = unique([
		...(options.citations ?? []),
		...packs.flatMap((pack) => [...(pack.manifest.citations ?? [])]),
		...packs.flatMap((pack) =>
			pack.manifest.resources.flatMap((resource) => [
				...(resource.citations ?? []),
			]),
		),
	]);
	return citations.length === 0 ? undefined : Object.freeze(citations);
}

export function composePacks(
	packs: readonly TextPack[],
	options: PackComposeOptions = {},
): TextPack {
	if (packs.length === 0) {
		throw new TypeError("composePacks requires at least one pack.");
	}
	const orderedPacks = orderPacks(packs, options.precedence);
	const merged = mergeResources(
		orderedPacks,
		options.conflictPolicy ?? "error",
	);
	const packIds = orderedPacks.map((pack) => pack.manifest.id).join(",");
	const dependencies = mergeDependencies(orderedPacks);
	const citations = mergeCitations(orderedPacks, options);
	const license = options.license ?? mergePackageLicense(orderedPacks);
	const manifest: TextPackManifest = {
		id: options.id ?? `composite:${stableHash(packIds)}`,
		name: options.name ?? `Composite textpack ${packIds}`,
		version: options.version ?? "0.0.0",
		packageName: options.packageName ?? "@ismail-elkorchi/textpack-composite",
		kind: descriptorKinds(merged.descriptors),
		targets: unionTargets(orderedPacks),
		engines: mergeEngines(orderedPacks),
		resources: merged.descriptors,
		...(dependencies === undefined ? {} : { dependencies }),
		capabilities: mergeCapabilities(
			orderedPacks.map((pack) => pack.manifest.capabilities),
		),
		...(license === undefined ? {} : { license }),
		...(citations === undefined ? {} : { citations }),
	};
	return createPack(manifest, merged.resources);
}
