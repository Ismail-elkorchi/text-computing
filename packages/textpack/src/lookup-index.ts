import {
	openResourceText,
	resourceTextChecksum,
	type TextPackResourceReader,
} from "./materialize.js";
import type { TextPack, TextPackResource } from "./types.js";

export const lookupIndexSchemaId = "textpack.lookup-index.v1" as const;

export interface TextPackLookupIndexRow {
	readonly rowStart: number;
	readonly rowLength: number;
	readonly rowOrder: number;
}

export interface TextPackLookupIndex {
	readonly indexResourceId: string;
	readonly sourceResourceId: string;
	readonly sourceColumns: readonly string[];
	readonly sourceText: string;
	readonly materializeRow: (
		row: TextPackLookupIndexRow,
	) => Readonly<Record<string, string>>;
	readonly rowsForNormalizedKey: (
		key: string,
	) => readonly TextPackLookupIndexRow[];
}

interface LookupIndexMetadata {
	readonly indexFormat: "normalized-key-packed-row-spans-v1";
	readonly keyOrdering: "unicode-code-unit";
	readonly indexedResourceId: string;
	readonly indexedResourceSchemaId: string;
	readonly indexedResourceTextChecksum: string;
}

interface PackLookupIndexCache {
	readonly defaultReader: Map<string, Promise<TextPackLookupIndex>>;
	readonly readers: WeakMap<
		TextPackResourceReader,
		Map<string, Promise<TextPackLookupIndex>>
	>;
}

const lookupIndexCaches = new WeakMap<object, PackLookupIndexCache>();

function lookupIndexCache(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
): Map<string, Promise<TextPackLookupIndex>> {
	let packCache = lookupIndexCaches.get(pack);
	if (packCache === undefined) {
		packCache = { defaultReader: new Map(), readers: new WeakMap() };
		lookupIndexCaches.set(pack, packCache);
	}
	if (reader === undefined) return packCache.defaultReader;
	let cache = packCache.readers.get(reader);
	if (cache === undefined) {
		cache = new Map();
		packCache.readers.set(reader, cache);
	}
	return cache;
}

function resource(pack: TextPack, resourceId: string): TextPackResource {
	const descriptor = pack.manifest.resources.find(
		(candidate) => candidate.id === resourceId,
	);
	if (descriptor === undefined) {
		throw new TypeError(`Textpack resource ${resourceId} is not declared.`);
	}
	return descriptor;
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Readonly<Record<string, unknown>>)
		: undefined;
}

function lookupIndexMetadata(
	index: TextPackResource,
	source: TextPackResource,
): LookupIndexMetadata {
	if (index.schemaId !== lookupIndexSchemaId) {
		throw new TypeError(
			`Textpack lookup index ${index.id} must use ${lookupIndexSchemaId}.`,
		);
	}
	const metadata = record(index.metadata);
	if (
		metadata?.indexFormat !== "normalized-key-packed-row-spans-v1" ||
		metadata.coordinateUnit !== "utf16-code-unit" ||
		metadata.offsetBasis !== "uncompressed-resource-text" ||
		metadata.keyNormalization !== "NFKC-casefold-Unicode-17" ||
		metadata.keyOrdering !== "unicode-code-unit" ||
		metadata.indexedResourceId !== source.id ||
		metadata.indexedResourceSchemaId !== source.schemaId ||
		typeof metadata.indexedResourceTextChecksum !== "string" ||
		!/^sha256:[0-9a-f]{64}$/u.test(metadata.indexedResourceTextChecksum)
	) {
		throw new TypeError(
			`Textpack lookup index ${index.id} has invalid or stale metadata for ${source.id}.`,
		);
	}
	return {
		indexFormat: metadata.indexFormat,
		keyOrdering: metadata.keyOrdering,
		indexedResourceId: source.id,
		indexedResourceSchemaId: source.schemaId ?? "",
		indexedResourceTextChecksum: metadata.indexedResourceTextChecksum,
	};
}

function lineEnd(text: string, start: number): number {
	const newline = text.indexOf("\n", start);
	return newline === -1 ? text.length : newline;
}

function lineStartAt(
	text: string,
	position: number,
	dataStart: number,
): number {
	if (position <= dataStart) return dataStart;
	return Math.max(dataStart, text.lastIndexOf("\n", position - 1) + 1);
}

function lineKey(text: string, start: number): string {
	const tab = text.indexOf("\t", start);
	const end = lineEnd(text, start);
	if (tab === -1 || tab >= end) {
		throw new TypeError("Textpack lookup index row is malformed.");
	}
	return text.slice(start, tab);
}

function compareLookupKeys(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function lowerBoundLine(text: string, dataStart: number, key: string): number {
	let low = dataStart;
	let high = text.length;
	while (low < high) {
		const middle = low + Math.floor((high - low) / 2);
		const start = lineStartAt(text, middle, dataStart);
		const candidate = lineKey(text, start);
		if (compareLookupKeys(candidate, key) < 0) {
			low = Math.min(text.length, lineEnd(text, start) + 1);
		} else {
			high = start;
		}
	}
	return low;
}

function checkedRow(
	rowStart: number,
	rowLength: number,
	rowOrder: number,
	sourceText: string,
): TextPackLookupIndexRow {
	const headerEnd = sourceText.indexOf("\n");
	const rowEnd = rowStart + rowLength;
	const endsAtRowBoundary =
		rowEnd === sourceText.length ||
		sourceText[rowEnd] === "\n" ||
		sourceText.slice(rowEnd, rowEnd + 2) === "\r\n";
	if (
		!Number.isSafeInteger(rowStart) ||
		!Number.isSafeInteger(rowLength) ||
		!Number.isSafeInteger(rowOrder) ||
		rowStart < 0 ||
		rowLength <= 0 ||
		rowOrder < 0 ||
		headerEnd < 0 ||
		rowStart <= headerEnd ||
		sourceText[rowStart - 1] !== "\n" ||
		rowEnd > sourceText.length ||
		!endsAtRowBoundary ||
		sourceText.slice(rowStart, rowStart + rowLength).includes("\n")
	) {
		throw new TypeError("Textpack lookup index row span is invalid.");
	}
	return Object.freeze({ rowStart, rowLength, rowOrder });
}

function unsignedBase36(value: string): number {
	if (!/^[0-9a-z]+$/u.test(value)) {
		throw new TypeError("Textpack packed lookup index integer is invalid.");
	}
	const parsed = Number.parseInt(value, 36);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new TypeError("Textpack packed lookup index integer is unsafe.");
	}
	return parsed;
}

function parsePackedIndexRow(
	indexText: string,
	start: number,
	sourceText: string,
): readonly TextPackLookupIndexRow[] {
	const cells = indexText.slice(start, lineEnd(indexText, start)).split("\t");
	if (cells.length !== 2 || cells[1]?.length === 0) {
		throw new TypeError(
			"Textpack packed lookup index row must contain a key and row spans.",
		);
	}
	const rows: TextPackLookupIndexRow[] = [];
	let previousStart = 0;
	let previousOrder = 0;
	for (const [index, encoded] of (cells[1] ?? "").split(";").entries()) {
		const values = encoded.split(",");
		if (values.length !== 3) {
			throw new TypeError(
				"Textpack packed lookup index span must contain three integers.",
			);
		}
		const encodedStart = unsignedBase36(values[0] ?? "");
		const rowLength = unsignedBase36(values[1] ?? "");
		const encodedOrder = unsignedBase36(values[2] ?? "");
		const rowStart = index === 0 ? encodedStart : previousStart + encodedStart;
		const rowOrder = index === 0 ? encodedOrder : previousOrder + encodedOrder;
		if (index > 0 && (rowStart <= previousStart || rowOrder <= previousOrder)) {
			throw new TypeError(
				"Textpack packed lookup index deltas must preserve source order.",
			);
		}
		rows.push(checkedRow(rowStart, rowLength, rowOrder, sourceText));
		previousStart = rowStart;
		previousOrder = rowOrder;
	}
	return Object.freeze(rows);
}

function rowsForNormalizedKey(
	indexText: string,
	dataStart: number,
	sourceText: string,
	key: string,
): readonly TextPackLookupIndexRow[] {
	if (/[\t\r\n]/u.test(key)) {
		throw new TypeError(
			"Textpack lookup index key must not contain TSV delimiters.",
		);
	}
	if (key.length === 0 || dataStart >= indexText.length)
		return Object.freeze([]);
	const rows: TextPackLookupIndexRow[] = [];
	let start = lowerBoundLine(indexText, dataStart, key);
	while (start < indexText.length && lineKey(indexText, start) === key) {
		rows.push(...parsePackedIndexRow(indexText, start, sourceText));
		start = Math.min(indexText.length, lineEnd(indexText, start) + 1);
	}
	return Object.freeze(
		rows.sort((left, right) => left.rowOrder - right.rowOrder),
	);
}

async function materializeLookupIndex(
	pack: TextPack,
	sourceResourceId: string,
	indexResourceId: string,
	reader: TextPackResourceReader | undefined,
): Promise<TextPackLookupIndex> {
	const source = resource(pack, sourceResourceId);
	const index = resource(pack, indexResourceId);
	const metadata = lookupIndexMetadata(index, source);
	const [sourceText, indexText] = await Promise.all([
		openResourceText(pack, source.id, reader),
		openResourceText(pack, index.id, reader),
	]);
	const checksum = await resourceTextChecksum(sourceText);
	if (checksum !== metadata.indexedResourceTextChecksum) {
		throw new TypeError(
			`Textpack lookup index ${index.id} source checksum mismatch for ${source.id}: expected ${metadata.indexedResourceTextChecksum}, got ${checksum}.`,
		);
	}
	const headerEnd = indexText.indexOf("\n");
	const header = indexText.slice(0, headerEnd).replace(/\r$/u, "");
	if (header !== "normalizedKey\trowSpans") {
		throw new TypeError(
			`Textpack lookup index ${index.id} has an invalid header.`,
		);
	}
	const sourceHeaderEnd = sourceText.indexOf("\n");
	if (sourceHeaderEnd === -1) {
		throw new TypeError(
			`Indexed textpack resource ${source.id} has no header.`,
		);
	}
	const sourceColumns = Object.freeze(
		sourceText.slice(0, sourceHeaderEnd).replace(/\r$/u, "").split("\t"),
	);
	const dataStart = headerEnd + 1;
	return Object.freeze({
		indexResourceId,
		sourceResourceId,
		sourceColumns,
		sourceText,
		materializeRow(row: TextPackLookupIndexRow) {
			const cells = sourceText
				.slice(row.rowStart, row.rowStart + row.rowLength)
				.replace(/\r$/u, "")
				.split("\t");
			return Object.freeze(
				Object.fromEntries(
					sourceColumns.flatMap((column, columnIndex) =>
						column.length === 0 ? [] : [[column, cells[columnIndex] ?? ""]],
					),
				),
			);
		},
		rowsForNormalizedKey: (key: string) =>
			rowsForNormalizedKey(indexText, dataStart, sourceText, key),
	});
}

export function openResourceLookupIndex(
	pack: TextPack,
	sourceResourceId: string,
	indexResourceId: string,
	reader?: TextPackResourceReader,
): Promise<TextPackLookupIndex> {
	const cache = lookupIndexCache(pack, reader);
	const key = `${sourceResourceId}\u0000${indexResourceId}`;
	const cached = cache.get(key);
	if (cached !== undefined) return cached;
	const pending = materializeLookupIndex(
		pack,
		sourceResourceId,
		indexResourceId,
		reader,
	);
	cache.set(key, pending);
	void pending.catch(() => {
		if (cache.get(key) === pending) cache.delete(key);
	});
	return pending;
}
