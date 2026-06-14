import type { TextDocument } from "@ismail-elkorchi/textdoc";
import {
	listResources,
	openResourceJson,
	openResourceTable,
	openResourceText,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
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
}

export interface QualityProfileFromPackOptions
	extends QualityResourcesFromPackOptions {
	readonly resourceId?: string;
}

function idSet(values: readonly string[] | undefined): ReadonlySet<string> {
	return new Set(values ?? []);
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
	const ids = idSet(options.resourceIds);
	const resources = listResources(pack, {
		schemaId: options.schemaIds ?? [
			"textquality.profile.v1",
			"textquality.evidence.v1",
		],
	})
		.filter((resource) => ids.size === 0 || ids.has(resource.id))
		.sort((left, right) => left.id.localeCompare(right.id));
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
	const resourceIds =
		options.resourceId === undefined
			? options.resourceIds
			: [options.resourceId];
	const resources = await qualityResourcesFromPack(pack, {
		...(options.reader !== undefined ? { reader: options.reader } : {}),
		...(resourceIds !== undefined ? { resourceIds } : {}),
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
