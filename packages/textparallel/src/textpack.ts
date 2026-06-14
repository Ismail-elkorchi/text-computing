import {
	listResources,
	openResourceTable,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";

export interface ParallelRowsFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
}

export interface ParallelTableResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly columns: readonly string[];
	readonly rows: TextPackMaterializedTable["rows"];
}

function idSet(values: readonly string[] | undefined): ReadonlySet<string> {
	return new Set(values ?? []);
}

async function parallelTableFromPack(
	pack: TextPack,
	resource: TextPackResource,
	reader: TextPackResourceReader | undefined,
): Promise<ParallelTableResource> {
	const table = await openResourceTable(pack, resource.id, reader);
	return Object.freeze({
		id: resource.id,
		descriptor: resource,
		columns: table.columns,
		rows: table.rows,
	});
}

export async function parallelTablesFromPack(
	pack: TextPack,
	options: ParallelRowsFromPackOptions = {},
): Promise<readonly ParallelTableResource[]> {
	const ids = idSet(options.resourceIds);
	const resources = listResources(pack, {
		kind: ["alignment-table", "translation-memory"],
	})
		.filter((resource) => ids.size === 0 || ids.has(resource.id))
		.sort((left, right) => left.id.localeCompare(right.id));
	return Promise.all(
		resources.map((resource) =>
			parallelTableFromPack(pack, resource, options.reader),
		),
	);
}
