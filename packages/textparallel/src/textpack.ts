import type { ParallelRecord } from "@ismail-elkorchi/textdata";
import {
	capabilityResourceIdsFromBindings,
	openResourceTable,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
	type TextPackTaskResourceBindingRole,
} from "@ismail-elkorchi/textpack";
import {
	createParallelCorpus,
	type ParallelCorpus,
	parallelDocumentsFromRecords,
} from "./internal/core.js";

export interface ParallelRowsFromPackOptions {
	readonly reader?: TextPackResourceReader;
	readonly resourceIds?: readonly string[];
	readonly schemaIds?: readonly string[];
	readonly slot?: string;
	readonly role?: TextPackTaskResourceBindingRole;
	readonly targetLanguage?: string;
	readonly maxRows?: number;
}

export interface ParallelTableResource {
	readonly id: string;
	readonly descriptor: TextPackResource;
	readonly columns: readonly string[];
	readonly rows: TextPackMaterializedTable["rows"];
}

export interface ParallelLinkRow {
	readonly id: string;
	readonly sourceSentenceId: string;
	readonly targetSentenceId: string;
	readonly sourceLanguageTag?: string;
	readonly targetLanguageTag?: string;
	readonly sourceText?: string;
	readonly targetText?: string;
	readonly resourceId: string;
}

function rowLimit(value: number | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isInteger(value) || value <= 0) {
		throw new TypeError("maxRows must be a positive integer.");
	}
	return value;
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
	const limit = rowLimit(options.maxRows);
	const resourceIds = capabilityResourceIdsFromBindings(pack, {
		slot: options.slot ?? "parallel",
		ownerPackage: "@ismail-elkorchi/textparallel",
		schemaId: options.schemaIds ?? [
			"textparallel.alignment.v1",
			"textparallel.alignment.rows.v1",
		],
		...(options.role === undefined ? {} : { role: options.role }),
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
	});
	const resources = resourcesById(pack, resourceIds);
	const tables = await Promise.all(
		resources.map((resource) =>
			parallelTableFromPack(pack, resource, options.reader),
		),
	);
	if (options.targetLanguage === undefined && limit === undefined)
		return tables;
	let remaining = limit ?? Number.POSITIVE_INFINITY;
	return Object.freeze(
		tables.map((table) => {
			const filteredRows =
				options.targetLanguage === undefined
					? table.rows
					: table.rows.filter(
							(row) => row.targetLanguageTag === options.targetLanguage,
						);
			const rows = filteredRows.slice(0, remaining);
			remaining -= rows.length;
			return Object.freeze({
				...table,
				rows: Object.freeze(rows),
			});
		}),
	);
}

export async function parallelLinkRowsFromPack(
	pack: TextPack,
	options: ParallelRowsFromPackOptions = {},
): Promise<readonly ParallelLinkRow[]> {
	const rows: ParallelLinkRow[] = [];
	for (const table of await parallelTablesFromPack(pack, options)) {
		for (const row of table.rows) {
			const sourceSentenceId = row.sourceSentenceId;
			const targetSentenceId = row.targetSentenceId;
			if (sourceSentenceId === undefined || targetSentenceId === undefined) {
				continue;
			}
			rows.push(
				Object.freeze({
					id: `${table.id}:${sourceSentenceId}:${targetSentenceId}`,
					sourceSentenceId,
					targetSentenceId,
					...(row.sourceLanguageTag !== undefined
						? { sourceLanguageTag: row.sourceLanguageTag }
						: {}),
					...(row.targetLanguageTag !== undefined
						? { targetLanguageTag: row.targetLanguageTag }
						: {}),
					...(row.sourceText !== undefined
						? { sourceText: row.sourceText }
						: {}),
					...(row.targetText !== undefined
						? { targetText: row.targetText }
						: {}),
					resourceId: table.id,
				}),
			);
		}
	}
	return Object.freeze(
		rows.sort((left, right) => left.id.localeCompare(right.id)),
	);
}

export async function parallelCorpusFromPack(
	pack: TextPack,
	options: ParallelRowsFromPackOptions & { readonly corpusId?: string } = {},
): Promise<ParallelCorpus> {
	const records: ParallelRecord[] = [];
	for (const row of await parallelLinkRowsFromPack(pack, options)) {
		if (row.sourceText === undefined || row.targetText === undefined) continue;
		records.push({
			id: row.id,
			sourceText: row.sourceText,
			targetText: row.targetText,
			...(row.sourceLanguageTag !== undefined
				? { sourceLanguage: row.sourceLanguageTag }
				: {}),
			...(row.targetLanguageTag !== undefined
				? { targetLanguage: row.targetLanguageTag }
				: {}),
			metadata: {
				sourceSentenceId: row.sourceSentenceId,
				targetSentenceId: row.targetSentenceId,
				resourceId: row.resourceId,
			},
		});
	}
	return createParallelCorpus(parallelDocumentsFromRecords(records), {
		id: options.corpusId ?? `${pack.manifest.id}:parallel-corpus`,
		...(pack.manifest.targets.languages?.[0] !== undefined
			? { sourceLanguage: pack.manifest.targets.languages[0] }
			: {}),
		...(options.targetLanguage !== undefined
			? { targetLanguage: options.targetLanguage }
			: {}),
	});
}
