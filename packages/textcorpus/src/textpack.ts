import {
	corpusRowsFromPack,
	type TextDataRowsFromPackOptions,
} from "@ismail-elkorchi/textdata";
import { createDocument, type TextDocument } from "@ismail-elkorchi/textdoc";
import type {
	TextPack,
	TextPackMaterializedTableRow,
	TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import { createCorpusFromDataset } from "./store/corpus.js";
import type {
	CorpusDataset,
	CorpusOptions,
	TextCorpus,
} from "./store/types.js";

export interface CorpusDocumentsFromPackOptions
	extends Omit<TextDataRowsFromPackOptions, "reader"> {
	readonly reader?: TextPackResourceReader;
	readonly maxDocuments: number;
}

export interface TextCorpusFromPackOptions
	extends CorpusDocumentsFromPackOptions {
	readonly corpus?: CorpusOptions;
}

function maxDocumentsLimit(value: number): number {
	if (!Number.isInteger(value) || value <= 0) {
		throw new TypeError("maxDocuments must be a positive integer.");
	}
	return value;
}

function rowText(
	row: TextPackMaterializedTableRow,
	resourceId: string,
): string {
	const text = row.text;
	if (text === undefined) {
		throw new TypeError(
			`Corpus resource ${resourceId} row is missing required text column.`,
		);
	}
	return text;
}

function sourceRowId(
	row: TextPackMaterializedTableRow,
	rowIndex: number,
): string {
	return (
		row.documentId ??
		row.sentenceId ??
		row.id ??
		String(rowIndex + 1).padStart(8, "0")
	);
}

function rowMetadata(
	pack: TextPack,
	resourceId: string,
	row: TextPackMaterializedTableRow,
	rowIndex: number,
): Record<string, unknown> {
	const metadata: Record<string, unknown> = {
		packageName: pack.manifest.packageName,
		packId: pack.manifest.id,
		resourceId,
		rowIndex,
		sourceRowId: sourceRowId(row, rowIndex),
	};
	for (const [key, value] of Object.entries(row)) {
		if (key !== "text") metadata[key] = value;
	}
	return metadata;
}

export async function corpusDocumentsFromPack(
	pack: TextPack,
	options: CorpusDocumentsFromPackOptions,
): Promise<readonly TextDocument[]> {
	const limit = maxDocumentsLimit(options.maxDocuments);
	const tables = await corpusRowsFromPack(pack, {
		...(options.resourceIds === undefined
			? {}
			: { resourceIds: options.resourceIds }),
		...(options.schemaIds === undefined
			? {}
			: { schemaIds: options.schemaIds }),
		...(options.reader === undefined ? {} : { reader: options.reader }),
	});
	const documents: TextDocument[] = [];
	for (const table of tables) {
		for (const [rowIndex, row] of table.rows.entries()) {
			if (documents.length >= limit) return Object.freeze(documents);
			const sourceId = sourceRowId(row, rowIndex);
			documents.push(
				createDocument(rowText(row, table.id), {
					id: `${table.id}:${sourceId}`,
					metadata: rowMetadata(pack, table.id, row, rowIndex),
					sourceMetadata: {
						packageName: pack.manifest.packageName,
						packId: pack.manifest.id,
						resourceId: table.id,
						rowIndex,
						sourceRowId: sourceId,
					},
				}),
			);
		}
	}
	return Object.freeze(documents);
}

export async function corpusDatasetFromPack(
	pack: TextPack,
	options: CorpusDocumentsFromPackOptions,
): Promise<CorpusDataset> {
	const documents = await corpusDocumentsFromPack(pack, options);
	return Object.freeze({
		id: `${pack.manifest.id}:corpus`,
		metadata: {
			packageName: pack.manifest.packageName,
			packId: pack.manifest.id,
			maxDocuments: options.maxDocuments,
			documentCount: documents.length,
		},
		records: documents,
	});
}

export async function textCorpusFromPack(
	pack: TextPack,
	options: TextCorpusFromPackOptions,
): Promise<TextCorpus> {
	const dataset = await corpusDatasetFromPack(pack, options);
	return createCorpusFromDataset(dataset, {
		tokenSource: "whitespace",
		strict: false,
		...(options.corpus ?? {}),
	});
}
