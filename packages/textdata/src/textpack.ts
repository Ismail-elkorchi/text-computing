import {
	listResources,
	openResourceTable,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";

export interface TextDataRowsFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
}

export interface TextDataTableResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly columns: readonly string[];
	readonly rows: TextPackMaterializedTable["rows"];
}

function resourceIdSet(
	resourceIds: readonly string[] | undefined,
): ReadonlySet<string> {
	return new Set(resourceIds ?? []);
}

function selectedResources(
	pack: TextPack,
	schemaIds: readonly string[],
	resourceIds: readonly string[] | undefined,
): readonly TextPackResource[] {
	const ids = resourceIdSet(resourceIds);
	return listResources(pack, { schemaId: schemaIds })
		.filter((resource) => ids.size === 0 || ids.has(resource.id))
		.sort((left, right) => left.id.localeCompare(right.id));
}

async function tableResourceFromPack(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<TextDataTableResource> {
	const table = await openResourceTable(pack, resource.id, reader);
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		columns: table.columns,
		rows: table.rows,
	});
}

export async function corpusRowsFromPack(
	pack: TextPack,
	options: TextDataRowsFromPackOptions = {},
): Promise<readonly TextDataTableResource[]> {
	return Promise.all(
		selectedResources(
			pack,
			options.schemaIds ?? ["textdata.corpus.rows.v1"],
			options.resourceIds,
		).map((resource) => tableResourceFromPack(pack, resource, options.reader)),
	);
}
