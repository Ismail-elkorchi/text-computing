import {
	listResources,
	openResourceTable,
	type ResourceKind,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";

export interface TextDataRowsFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
}

export interface TextDataTableResource {
	readonly id: string;
	readonly kind: ResourceKind;
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
	kinds: readonly ResourceKind[],
	resourceIds: readonly string[] | undefined,
): readonly TextPackResource[] {
	const ids = resourceIdSet(resourceIds);
	return listResources(pack, { kind: kinds })
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
		kind: resource.kind,
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
		selectedResources(pack, ["corpus"], options.resourceIds).map((resource) =>
			tableResourceFromPack(pack, resource, options.reader),
		),
	);
}

export async function parallelRowsFromPack(
	pack: TextPack,
	options: TextDataRowsFromPackOptions = {},
): Promise<readonly TextDataTableResource[]> {
	return Promise.all(
		selectedResources(
			pack,
			["alignment-table", "translation-memory"],
			options.resourceIds,
		).map((resource) => tableResourceFromPack(pack, resource, options.reader)),
	);
}
