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

export type TextNormPackResourcePayload =
	| { readonly type: "json"; readonly value: unknown }
	| { readonly type: "table"; readonly value: TextPackMaterializedTable }
	| { readonly type: "text"; readonly value: string };

export interface TextNormPackResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly payload: TextNormPackResourcePayload;
}

export interface TextNormResourcesFromPackOptions {
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

async function materializeNormalizationResource(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextNormPackResource> {
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

export async function normalizationResourcesFromPack(
	pack: TextPack,
	options: TextNormResourcesFromPackOptions = {},
): Promise<readonly TextNormPackResource[]> {
	const ids = idSet(options.resourceIds);
	const resources = listResources(pack, {
		schemaId: options.schemaIds ?? ["textnorm.profile.v1", "textnorm.rules.v1"],
	})
		.filter((resource) => ids.size === 0 || ids.has(resource.id))
		.sort((left, right) => left.id.localeCompare(right.id));
	return Promise.all(
		resources.map((resource) =>
			materializeNormalizationResource(pack, resource, options.reader),
		),
	);
}
