import type { TextDocument } from "@ismail-elkorchi/textdoc";
import {
	openResourceJson,
	openResourceTable,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
	type TextPackTaskResourceBindingRole,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";
import {
	analyzeDocumentQuality,
	type DocumentQualityOptions,
	type QualityProfile,
	type QualityReport,
} from "./internal/core.js";

export type TextQualityPackResourcePayload =
	| { readonly type: "json"; readonly value: unknown }
	| { readonly type: "table"; readonly value: TextPackMaterializedTable }
	| { readonly type: "text"; readonly value: string };

export interface TextQualityPackResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly payload: TextQualityPackResourcePayload;
}

export interface QualityResourcesFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
}

export interface QualityProfileFromPackOptions
	extends QualityResourcesFromPackOptions {
	readonly resourceId?: string;
}

function resourcesById(
	pack: TextPack,
	resourceIds: readonly string[],
): readonly TextPackResource[] {
	const byId = new Map(
		pack.manifest.resources.map((resource) => [resource.id, resource]),
	);
	return Object.freeze(
		resourceIds.map((resourceId) => {
			const resource = byId.get(resourceId);
			if (resource === undefined) {
				throw new TypeError(
					`Textpack ${pack.manifest.packageName} is missing bound resource ${resourceId}.`,
				);
			}
			return resource;
		}),
	);
}

function isJson(resource: TextPackResource): boolean {
	const format = resource.format ?? "";
	return format === "json" || format.endsWith("+json");
}

function isTable(resource: TextPackResource): boolean {
	const format = resource.format ?? "";
	return format.includes("tsv") || format.includes("tab-separated-values");
}

async function materializeQualityResource(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextQualityPackResource> {
	if (isJson(resource)) {
		return Object.freeze({
			id: resource.id,
			descriptor: resource,
			payload: Object.freeze({
				type: "json" as const,
				value: await openResourceJson(pack, resource.id, reader),
			}),
		});
	}
	if (isTable(resource)) {
		return Object.freeze({
			id: resource.id,
			descriptor: resource,
			payload: Object.freeze({
				type: "table" as const,
				value: await openResourceTable(pack, resource.id, reader),
			}),
		});
	}
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		payload: Object.freeze({
			type: "text" as const,
			value: await openResourceText(pack, resource.id, reader),
		}),
	});
}

export async function qualityResourcesFromPack(
	pack: TextPack,
	options: QualityResourcesFromPackOptions = {},
): Promise<readonly TextQualityPackResource[]> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: options.slot ?? "quality",
		schemaId: options.schemaIds ?? [
			"textquality.profile.v1",
			"textquality.evidence.v1",
		],
		...(options.role === undefined ? {} : { role: options.role }),
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	const resources = resourcesById(pack, resourceIds);
	return Promise.all(
		resources.map((resource) =>
			materializeQualityResource(pack, resource, options.reader),
		),
	);
}

function recordValue(
	value: unknown,
): Readonly<Record<string, unknown>> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Readonly<Record<string, unknown>>)
		: undefined;
}

function qualityProfileFromResource(
	resource: TextQualityPackResource,
): QualityProfile {
	if (resource.payload.type !== "json") {
		throw new TypeError(`${resource.id} is not a JSON quality profile.`);
	}
	const value = recordValue(resource.payload.value);
	if (value === undefined || value.kind !== "quality-profile") {
		throw new TypeError(`${resource.id} is not a quality-profile resource.`);
	}
	const thresholds: Record<string, number> = {};
	if (Array.isArray(value.thresholds)) {
		for (const threshold of value.thresholds) {
			const record = recordValue(threshold);
			const name =
				typeof record?.name === "string"
					? record.name
					: typeof record?.metricId === "string"
						? record.metricId
						: undefined;
			const numberValue =
				typeof record?.value === "number" ? record.value : undefined;
			if (name !== undefined && numberValue !== undefined) {
				thresholds[name] = numberValue;
			}
		}
	}
	return Object.freeze({
		id:
			typeof value.profileId === "string" && value.profileId.length > 0
				? value.profileId
				: resource.id,
		...(typeof value.languageTag === "string"
			? { expectedLanguages: [value.languageTag] }
			: {}),
		...(typeof value.script === "string"
			? { expectedScripts: [value.script] }
			: {}),
		thresholds,
		resourceIds: [resource.id],
		metadata: {
			resourceId: resource.id,
			schemaId: "textquality.profile.v1",
		},
	});
}

export async function qualityProfileFromPack(
	pack: TextPack,
	options: QualityProfileFromPackOptions = {},
): Promise<QualityProfile> {
	const profileBinding = requireSingleTaskResourceBinding(pack, {
		slot: options.slot ?? "quality",
		schemaId: "textquality.profile.v1",
		role: options.role ?? "quality",
		...(options.resourceId === undefined
			? options.resourceIds === undefined
				? {}
				: { resourceIds: options.resourceIds }
			: { resourceId: options.resourceId }),
	});
	const resources = await qualityResourcesFromPack(pack, {
		...(options.reader !== undefined ? { reader: options.reader } : {}),
		resourceIds: [profileBinding.resourceId],
		schemaIds: ["textquality.profile.v1"],
	});
	const resource = resources[0];
	if (resource === undefined) {
		throw new TypeError("No textquality.profile.v1 resource is present.");
	}
	return qualityProfileFromResource(resource);
}

export async function analyzeDocumentQualityFromPack(
	pack: TextPack,
	doc: TextDocument,
	options: QualityProfileFromPackOptions & {
		readonly analysis?: DocumentQualityOptions;
	} = {},
): Promise<QualityReport> {
	const profile = await qualityProfileFromPack(pack, options);
	return analyzeDocumentQuality(doc, {
		...options.analysis,
		profile,
		producer: options.analysis?.producer ?? pack.manifest.packageName,
	});
}
