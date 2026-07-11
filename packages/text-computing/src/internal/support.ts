import type { TextPack } from "@ismail-elkorchi/textpack";
import type {
	TextComputingPackInspection,
	TextComputingResourceInspection,
	TextComputingSupportReport,
} from "./types.js";

export function inspectResources(
	resources: readonly TextPack["manifest"]["resources"][number][],
): readonly TextComputingResourceInspection[] {
	return Object.freeze(
		resources.map((resource) =>
			Object.freeze({
				id: resource.id,
				kind: resource.kind,
				...(resource.schemaId === undefined
					? {}
					: { schemaId: resource.schemaId }),
				...(resource.path === undefined ? {} : { path: resource.path }),
			}),
		),
	);
}

export function inspectSchemaResources(
	pack: TextPack,
	schemaIds: readonly string[],
): readonly TextComputingResourceInspection[] {
	const schemaIdSet = new Set(schemaIds);
	return inspectResources(
		pack.manifest.resources
			.filter(
				(resource) =>
					resource.schemaId !== undefined && schemaIdSet.has(resource.schemaId),
			)
			.sort((left, right) => left.id.localeCompare(right.id)),
	);
}

export function supportReport(pack: TextPack): TextComputingSupportReport {
	return Object.freeze({
		packageName: pack.manifest.packageName,
		packId: pack.manifest.id,
		version: pack.manifest.version,
		languages: Object.freeze([...(pack.manifest.targets.languages ?? [])]),
		scripts: Object.freeze([...(pack.manifest.targets.scripts ?? [])]),
		slots: Object.freeze(
			pack.manifest.capabilitySlots.map((slot) =>
				Object.freeze({
					slot: slot.slot,
					status: slot.status,
					tier: slot.tier,
					resourceIds: Object.freeze([...(slot.resourceIds ?? [])]),
					artifactIds: Object.freeze([...(slot.artifactIds ?? [])]),
					readerRequired: slot.readerRequired ?? false,
					capabilities: Object.freeze({ ...(slot.capabilities ?? {}) }),
					notes: Object.freeze([...(slot.notes ?? [])]),
				}),
			),
		),
		resourceCount: pack.manifest.resources.length,
		componentCount: pack.manifest.components?.length ?? 0,
		gapNotes: Object.freeze(
			(pack.manifest.gapNotes ?? []).map((note) => note.message),
		),
	});
}

export function inspectionReport(pack: TextPack): TextComputingPackInspection {
	return Object.freeze({
		...supportReport(pack),
		resources: inspectResources(pack.manifest.resources),
	});
}
