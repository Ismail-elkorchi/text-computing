import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import type {
	ResourceKind,
	TextPack,
	TextPackCapabilityName,
	TextPackResource,
} from "@ismail-elkorchi/textpack";
import {
	resourceKinds,
	capabilities as summarizeTextPackCapabilities,
} from "@ismail-elkorchi/textpack";
import { compareText, uniqueSorted } from "../internal/compare.js";
import { fail } from "../internal/errors.js";
import type { JsonValue } from "../internal/json.js";
import { assertJsonValue, stableJsonStringify } from "../internal/json.js";
import type { ProcessorRequirement } from "../processor/types.js";

export interface PipelineResourceEntry {
	readonly id: string;
	readonly kind: ResourceKind;
	readonly packId?: string;
	readonly packageName?: string;
	readonly packageVersion?: string;
	readonly descriptor?: TextPackResource;
	readonly value?: unknown;
	readonly citations?: readonly string[];
	readonly capabilities?: readonly string[];
	readonly fingerprint?: string;
}

export interface PipelineResourceRegistry {
	readonly packs: readonly TextPack[];
	readonly resources: readonly PipelineResourceEntry[];
	readonly capabilities: readonly string[];
	findResources(
		requirement: ProcessorRequirement,
	): readonly PipelineResourceEntry[];
	hasRequirement(requirement: ProcessorRequirement): boolean;
	fingerprint(): JsonValue;
}

export interface CreatePipelineResourceRegistryOptions {
	readonly packs?: readonly TextPack[];
	readonly resources?: readonly PipelineResourceEntry[];
	readonly capabilities?: readonly string[];
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

function activeCapabilities(pack: TextPack): readonly string[] {
	const values: string[] = [];
	for (const [name, value] of Object.entries(
		summarizeTextPackCapabilities(pack),
	).sort(([left], [right]) => compareText(left, right))) {
		if (value === false || value === "none" || value === undefined) continue;
		values.push(name);
		if (value === true) values.push(`${name}:true`);
		else values.push(`${name}:${value}`);
	}
	return uniqueSorted(values);
}

function valueFingerprint(value: unknown, path: string): string {
	if (value instanceof ArrayBuffer) {
		return stableHash64(`bytes:${bytesHex(new Uint8Array(value))}`);
	}
	if (ArrayBuffer.isView(value)) {
		return stableHash64(
			`bytes:${bytesHex(
				new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
			)}`,
		);
	}
	assertJsonValue(value, path);
	return stableHash64(stableJsonStringify(value));
}

function bytesHex(bytes: Uint8Array): string {
	let output = "";
	for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
	return output;
}

function normalizeEntry(entry: PipelineResourceEntry): PipelineResourceEntry {
	if (!isNonEmptyString(entry.id)) {
		fail("TEXTPIPELINE_INVALID_RESOURCE", "resource id must be non-empty.");
	}
	if (!resourceKinds.includes(entry.kind)) {
		fail(
			"TEXTPIPELINE_INVALID_RESOURCE",
			"resource kind must be a final ResourceKind.",
		);
	}
	const fingerprint =
		entry.fingerprint ??
		(entry.value === undefined
			? stableHash64(
					stableJsonStringify({
						id: entry.id,
						kind: entry.kind,
						packId: entry.packId ?? null,
						packageName: entry.packageName ?? null,
						packageVersion: entry.packageVersion ?? null,
						descriptor:
							entry.descriptor === undefined
								? null
								: (entry.descriptor as unknown as JsonValue),
					}),
				)
			: valueFingerprint(entry.value, `resources.${entry.id}.value`));
	return Object.freeze({
		...entry,
		...(entry.citations === undefined
			? {}
			: { citations: Object.freeze([...entry.citations]) }),
		...(entry.capabilities === undefined
			? {}
			: { capabilities: uniqueSorted(entry.capabilities) }),
		fingerprint,
	});
}

function entriesFromPack(pack: TextPack): readonly PipelineResourceEntry[] {
	const packCapabilities = activeCapabilities(pack);
	return pack.manifest.resources.map((descriptor) =>
		normalizeEntry({
			id: descriptor.id,
			kind: descriptor.kind,
			packId: pack.manifest.id,
			packageName: pack.manifest.packageName,
			packageVersion: pack.manifest.version,
			descriptor,
			value: pack.resources[descriptor.id],
			...(descriptor.citations !== undefined
				? { citations: descriptor.citations }
				: pack.manifest.citations === undefined
					? {}
					: { citations: pack.manifest.citations }),
			capabilities: packCapabilities,
		}),
	);
}

function capabilitySet(
	capabilities: readonly string[],
	resources: readonly PipelineResourceEntry[],
): readonly string[] {
	const values = [...capabilities];
	for (const resource of resources) {
		values.push(...(resource.capabilities ?? []));
	}
	return uniqueSorted(values.filter(isNonEmptyString));
}

export function createPipelineResourceRegistry(
	options: CreatePipelineResourceRegistryOptions = {},
): PipelineResourceRegistry {
	const packs = Object.freeze([...(options.packs ?? [])]);
	const resources = Object.freeze(
		[
			...packs.flatMap((pack) => entriesFromPack(pack)),
			...(options.resources ?? []).map(normalizeEntry),
		].sort((left, right) => {
			const kindComparison = compareText(left.kind, right.kind);
			if (kindComparison !== 0) return kindComparison;
			return compareText(left.id, right.id);
		}),
	);
	const capabilities = capabilitySet(options.capabilities ?? [], resources);
	return Object.freeze({
		packs,
		resources,
		capabilities,
		findResources(requirement: ProcessorRequirement) {
			return Object.freeze(
				resources.filter((resource) => {
					if (
						requirement.resourceKind !== undefined &&
						resource.kind !== requirement.resourceKind
					) {
						return false;
					}
					if (
						requirement.capability !== undefined &&
						!capabilities.includes(requirement.capability)
					) {
						return false;
					}
					return true;
				}),
			);
		},
		hasRequirement(requirement: ProcessorRequirement) {
			const resourceOk =
				requirement.resourceKind === undefined ||
				resources.some(
					(resource) => resource.kind === requirement.resourceKind,
				);
			const capabilityOk =
				requirement.capability === undefined ||
				capabilities.includes(requirement.capability);
			return resourceOk && capabilityOk;
		},
		fingerprint() {
			return {
				packs: packs.map((pack) => ({
					id: pack.manifest.id,
					packageName: pack.manifest.packageName,
					version: pack.manifest.version,
					capabilities: activeCapabilities(pack),
				})),
				resources: resources.map((resource) => ({
					id: resource.id,
					kind: resource.kind,
					packId: resource.packId ?? null,
					packageName: resource.packageName ?? null,
					packageVersion: resource.packageVersion ?? null,
					fingerprint: resource.fingerprint ?? null,
				})),
				capabilities,
			};
		},
	});
}

export function resourceRequirement(
	resourceKind: ResourceKind,
	capability?: TextPackCapabilityName | string,
): ProcessorRequirement {
	return Object.freeze({
		resourceKind,
		...(capability === undefined ? {} : { capability }),
	});
}
