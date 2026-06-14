import type { ParallelRecord } from "@ismail-elkorchi/textdata";
import {
	listResources,
	openResourceTable,
	type TextPack,
	type TextPackMaterializedTable,
	type TextPackResource,
	type TextPackResourceReader,
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
	readonly targetLanguage?: string;
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
		schemaId: options.schemaIds ?? [
			"textparallel.alignment.v1",
			"textparallel.alignment.rows.v1",
		],
	})
		.filter((resource) => ids.size === 0 || ids.has(resource.id))
		.sort((left, right) => left.id.localeCompare(right.id));
	const tables = await Promise.all(
		resources.map((resource) =>
			parallelTableFromPack(pack, resource, options.reader),
		),
	);
	if (options.targetLanguage === undefined) return tables;
	return Object.freeze(
		tables.map((table) =>
			Object.freeze({
				...table,
				rows: Object.freeze(
					table.rows.filter(
						(row) => row.targetLanguageTag === options.targetLanguage,
					),
				),
			}),
		),
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
