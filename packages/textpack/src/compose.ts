import { mergeCapabilities } from "./capabilities.js";
import { createPack } from "./pack.js";
import type {
	PackComposeOptions,
	PackResourceMap,
	TextPack,
	TextPackArtifactDescriptor,
	TextPackCapabilitySlot,
	TextPackComponent,
	TextPackManifest,
	TextPackResource,
	TextPackTargets,
} from "./types.js";
import { textPackCapabilityTiers } from "./types.js";

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

function orderPacks(
	packs: readonly TextPack[],
	precedence: readonly string[] | undefined,
): readonly TextPack[] {
	if (precedence === undefined) return packs;
	const rank = new Map(precedence.map((id, index) => [id, index]));
	return packs
		.map((pack, index) => ({ pack, index }))
		.sort((left, right) => {
			const leftRank =
				rank.get(left.pack.manifest.id) ?? Number.MAX_SAFE_INTEGER;
			const rightRank =
				rank.get(right.pack.manifest.id) ?? Number.MAX_SAFE_INTEGER;
			return leftRank - rightRank || left.index - right.index;
		})
		.map(({ pack }) => pack);
}

function mergeResources(
	packs: readonly TextPack[],
	conflictPolicy: "error" | "first" | "last",
): { descriptors: readonly TextPackResource[]; resources: PackResourceMap } {
	const descriptors = new Map<string, TextPackResource>();
	const resources: Record<string, unknown> = Object.create(null);
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

function mergeComponents(
	packs: readonly TextPack[],
): readonly TextPackComponent[] {
	const directComponents = new Map<string, TextPackComponent>();
	for (const pack of packs) {
		const directComponent: TextPackComponent = Object.freeze({
			packageName: pack.manifest.packageName,
			versionRange: pack.manifest.version,
			role: "required",
			licensePolicy: "default",
			capabilityPolicy: "contributes-default",
			artifactPolicy: "none",
		});
		const existing = directComponents.get(pack.manifest.packageName);
		if (
			existing !== undefined &&
			existing.versionRange !== directComponent.versionRange
		) {
			throw new TypeError(
				`Cannot compose conflicting direct component versions for ${pack.manifest.packageName}.`,
			);
		}
		directComponents.set(pack.manifest.packageName, directComponent);
	}
	const components = new Map<string, TextPackComponent>(directComponents);
	const componentReasons = new Map<string, Set<string>>();
	for (const pack of packs) {
		for (const component of pack.manifest.components ?? []) {
			if (directComponents.has(component.packageName)) {
				if (component.role === "excluded") {
					throw new TypeError(
						`Cannot compose directly supplied component ${component.packageName} because ${pack.manifest.packageName} explicitly excludes it.`,
					);
				}
				continue;
			}
			const normalized = Object.freeze({
				...component,
				artifactPolicy: component.artifactPolicy ?? "none",
			});
			const existing = components.get(component.packageName);
			if (
				existing !== undefined &&
				(existing.versionRange !== normalized.versionRange ||
					existing.role !== normalized.role ||
					existing.licensePolicy !== normalized.licensePolicy ||
					existing.capabilityPolicy !== normalized.capabilityPolicy ||
					existing.artifactPolicy !== normalized.artifactPolicy)
			) {
				throw new TypeError(
					`Cannot compose conflicting component policy for ${component.packageName}.`,
				);
			}
			if (normalized.reason !== undefined) {
				const reasons =
					componentReasons.get(component.packageName) ?? new Set();
				reasons.add(normalized.reason);
				componentReasons.set(component.packageName, reasons);
			}
			components.set(component.packageName, normalized);
		}
	}
	return Object.freeze(
		[...components.values()]
			.map((component) => {
				const reasons = [
					...(componentReasons.get(component.packageName) ?? []),
				].sort((left, right) => left.localeCompare(right));
				return Object.freeze({
					...component,
					...(reasons.length === 0 ? {} : { reason: reasons.join("; ") }),
				});
			})
			.sort((left, right) => left.packageName.localeCompare(right.packageName)),
	);
}

function mergeArtifacts(
	packs: readonly TextPack[],
): readonly TextPackArtifactDescriptor[] | undefined {
	const artifacts = new Map<string, TextPackArtifactDescriptor>();
	for (const pack of packs) {
		for (const artifact of pack.manifest.artifacts ?? []) {
			const existing = artifacts.get(artifact.artifactId);
			if (
				existing !== undefined &&
				(existing.version !== artifact.version ||
					existing.checksum.value !== artifact.checksum.value)
			) {
				throw new TypeError(
					`Cannot compose incompatible artifact ${artifact.artifactId}.`,
				);
			}
			artifacts.set(artifact.artifactId, artifact);
		}
	}
	const values = [...artifacts.values()].sort((left, right) =>
		left.artifactId.localeCompare(right.artifactId),
	);
	return values.length === 0 ? undefined : Object.freeze(values);
}

function mergeCapabilitySlots(
	packs: readonly TextPack[],
): readonly TextPackCapabilitySlot[] {
	const statusOrder = [
		"not-applicable",
		"unsupported",
		"planned",
		"profiled",
		"sampled",
		"artifact-backed",
		"task-supported",
		"feature-complete",
	] as const;
	const statusRank = new Map(
		statusOrder.map((status, index) => [status, index]),
	);
	const tierRank = new Map(
		textPackCapabilityTiers.map((tier, index) => [tier, index]),
	);
	const slots = new Map<string, TextPackCapabilitySlot>();
	const isRunnable = (slot: TextPackCapabilitySlot) =>
		slot.status === "task-supported" || slot.status === "feature-complete";
	for (const pack of packs) {
		for (const slot of pack.manifest.capabilitySlots) {
			const existing = slots.get(slot.slot);
			if (existing === undefined) {
				slots.set(slot.slot, slot);
				continue;
			}
			const contributions = [existing, slot] as const;
			const hasRunnableContribution = contributions.some(isRunnable);
			const executableContributions = hasRunnableContribution
				? contributions.filter(isRunnable)
				: contributions;
			const resourceIds = unique(
				executableContributions.flatMap((candidate) => [
					...(candidate.resourceIds ?? []),
				]),
			);
			const artifactIds = unique(
				executableContributions.flatMap((candidate) => [
					...(candidate.artifactIds ?? []),
				]),
			);
			const bindings = uniqueBindings(
				executableContributions.flatMap((candidate) => [
					...(candidate.bindings ?? []),
				]),
			);
			const prerequisites = unique([
				...(existing.prerequisites ?? []),
				...(slot.prerequisites ?? []),
			]);
			const notes = unique([...(existing.notes ?? []), ...(slot.notes ?? [])]);
			const capabilities = mergeCapabilities(
				contributions.flatMap((candidate) =>
					candidate.capabilities === undefined ||
					(hasRunnableContribution && !isRunnable(candidate))
						? []
						: [candidate.capabilities],
				),
			);
			const existingRank = statusRank.get(existing.status) ?? 0;
			const nextRank = statusRank.get(slot.status) ?? 0;
			const existingTierRank = tierRank.get(existing.tier) ?? 0;
			const nextTierRank = tierRank.get(slot.tier) ?? 0;
			slots.set(slot.slot, {
				slot: slot.slot,
				status: nextRank > existingRank ? slot.status : existing.status,
				tier: nextTierRank > existingTierRank ? slot.tier : existing.tier,
				...(resourceIds.length === 0 ? {} : { resourceIds }),
				...(artifactIds.length === 0 ? {} : { artifactIds }),
				...(bindings.length === 0 ? {} : { bindings }),
				...(prerequisites.length === 0 ? {} : { prerequisites }),
				...(executableContributions.some(
					(candidate) => candidate.readerRequired === true,
				)
					? { readerRequired: true }
					: {}),
				...(notes.length === 0 ? {} : { notes }),
				...(Object.keys(capabilities).length === 0 ? {} : { capabilities }),
			});
		}
	}
	return Object.freeze(
		[...slots.values()].sort((left, right) =>
			left.slot.localeCompare(right.slot),
		),
	);
}

function uniqueBindings(
	values: readonly NonNullable<TextPackCapabilitySlot["bindings"]>[number][],
) {
	const output = new Map<
		string,
		NonNullable<TextPackCapabilitySlot["bindings"]>[number]
	>();
	for (const binding of values) {
		const key = [binding.ownerPackage, binding.role, binding.resourceId].join(
			"\u0000",
		);
		const existing = output.get(key);
		if (existing !== undefined && existing.schemaId !== binding.schemaId) {
			throw new TypeError(
				`Cannot compose conflicting binding schemas for ${binding.ownerPackage} ${binding.role} ${binding.resourceId}.`,
			);
		}
		output.set(
			key,
			Object.freeze({
				...binding,
				required: existing?.required === true || binding.required,
			}),
		);
	}
	return [...output.values()].sort(
		(left, right) =>
			left.ownerPackage.localeCompare(right.ownerPackage) ||
			left.role.localeCompare(right.role) ||
			left.resourceId.localeCompare(right.resourceId) ||
			left.schemaId.localeCompare(right.schemaId) ||
			Number(right.required) - Number(left.required),
	);
}

function mergeGapNotes(packs: readonly TextPack[]) {
	const notes = packs.flatMap((pack) => [...(pack.manifest.gapNotes ?? [])]);
	return notes.length === 0 ? undefined : Object.freeze(notes);
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
	const citations = mergeCitations(orderedPacks, options);
	const license = options.license ?? mergePackageLicense(orderedPacks);
	const artifacts = mergeArtifacts(orderedPacks);
	const gapNotes = mergeGapNotes(orderedPacks);
	const manifest: TextPackManifest = {
		schemaVersion: "1",
		id: options.id ?? `composite:${stableHash(packIds)}`,
		name: options.name ?? `Composite textpack ${packIds}`,
		version: options.version ?? "0.0.0",
		packageName: options.packageName ?? "@ismail-elkorchi/textpack-composite",
		targets: unionTargets(orderedPacks),
		engines: mergeEngines(orderedPacks),
		resources: merged.descriptors,
		components: mergeComponents(orderedPacks),
		...(artifacts === undefined ? {} : { artifacts }),
		capabilitySlots: mergeCapabilitySlots(orderedPacks),
		...(gapNotes === undefined ? {} : { gapNotes }),
		...(license === undefined ? {} : { license }),
		...(citations === undefined ? {} : { citations }),
	};
	return createPack(manifest, merged.resources);
}
