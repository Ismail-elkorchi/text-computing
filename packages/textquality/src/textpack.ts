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
