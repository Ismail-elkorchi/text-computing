import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

import { nfkcCaseFold } from "../../../packages/textfacts/src/casefold/mod.ts";

export const LOOKUP_INDEX_SCHEMA_ID = "textpack.lookup-index.v1";
export const LOOKUP_INDEX_MAX_COMPRESSED_SIZE_RATIO = 0.8;
export const LOOKUP_INDEX_MIN_SOURCE_GZIP_BASE64_BYTES = 512 * 1024;

const keyColumnsBySchemaId = new Map([
	[
		"textlex.lexicon.rows.v1",
		new Set(["form", "forms", "lemma", "lexicalForm", "surface", "word"]),
	],
	[
		"textlex.morphology.rows.v1",
		new Set([
			"diacritizedForm",
			"form",
			"lemma",
			"lexicalForm",
			"stem",
			"surface",
		]),
	],
	[
		"textkb.knowledge-base.rows.v1",
		new Set([
			"alias",
			"entryId",
			"entityId",
			"label",
			"lemma",
			"senseId",
			"sourceId",
			"synsetId",
			"targetId",
		]),
	],
]);

export function normalizedLookupIndexKey(value) {
	return nfkcCaseFold(value);
}

export function lookupIndexResourceId(sourceResourceId) {
	return `${sourceResourceId}-lookup-index`;
}

export function lookupIndexPath(sourcePath) {
	const uncompressedPath = sourcePath.endsWith(".gz.b64")
		? sourcePath.slice(0, -7)
		: sourcePath;
	return uncompressedPath.replace(/(?:\.[^./]+)?$/u, ".lookup-index.tsv");
}

export function sourceTextChecksum(text) {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function indexedColumnEntries(columns, schemaId, lookupKeyColumns) {
	const names = keyColumnsBySchemaId.get(schemaId);
	if (names === undefined) return [];
	const indexesByName = new Map(columns.map((name, index) => [name, index]));
	return lookupKeyColumns.map((name) => {
		if (!names.has(name)) {
			throw new Error(`${schemaId} does not support lookup key column ${name}`);
		}
		const index = indexesByName.get(name);
		if (index === undefined) {
			throw new Error(`lookup source is missing declared key column ${name}`);
		}
		return { name, index, split: name === "forms" };
	});
}

function codeUnitCompare(left, right) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function packedUnsigned(value) {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(
			`lookup-index coordinate ${value} is not an unsigned safe integer`,
		);
	}
	return value.toString(36);
}

function packRowSpans(spans) {
	let previousStart = 0;
	let previousOrder = 0;
	return spans
		.map((span, index) => {
			const start = index === 0 ? span.start : span.start - previousStart;
			const order = index === 0 ? span.order : span.order - previousOrder;
			previousStart = span.start;
			previousOrder = span.order;
			return [start, span.length, order].map(packedUnsigned).join(",");
		})
		.join(";");
}

function gzipBase64ByteLength(text) {
	return Buffer.byteLength(
		`${gzipSync(Buffer.from(text, "utf8")).toString("base64")}\n`,
		"utf8",
	);
}

export function buildLookupIndex(sourceText, schemaId, lookupKeyColumns) {
	const headerEnd = sourceText.indexOf("\n");
	if (headerEnd === -1) return undefined;
	const rawHeader = sourceText.slice(0, headerEnd);
	const header = rawHeader.endsWith("\r") ? rawHeader.slice(0, -1) : rawHeader;
	const columns = header.split("\t");
	const indexedColumns = indexedColumnEntries(
		columns,
		schemaId,
		lookupKeyColumns,
	);
	if (indexedColumns.length === 0) return undefined;

	const spansByKey = new Map();
	let rowStart = headerEnd + 1;
	let rowOrder = 0;
	while (rowStart < sourceText.length) {
		const newline = sourceText.indexOf("\n", rowStart);
		const rowEnd = newline === -1 ? sourceText.length : newline;
		const rawRow = sourceText.slice(rowStart, rowEnd);
		const row = rawRow.endsWith("\r") ? rawRow.slice(0, -1) : rawRow;
		if (row.length > 0) {
			const cells = row.split("\t");
			const keys = new Set();
			for (const column of indexedColumns) {
				const value = cells[column.index] ?? "";
				const values = column.split ? value.split(/[|, ]/u) : [value];
				for (const candidate of values) {
					if (candidate.length === 0) continue;
					const key = normalizedLookupIndexKey(candidate);
					if (key.length > 0) keys.add(key);
				}
			}
			for (const key of keys) {
				const spans = spansByKey.get(key);
				const span = { start: rowStart, length: row.length, order: rowOrder };
				if (spans === undefined) spansByKey.set(key, [span]);
				else spans.push(span);
			}
			rowOrder += 1;
		}
		if (newline === -1) break;
		rowStart = newline + 1;
	}
	const rows = [...spansByKey]
		.sort(([left], [right]) => codeUnitCompare(left, right))
		.map(([key, spans]) => [key, packRowSpans(spans)]);
	const text = `${[["normalizedKey", "rowSpans"], ...rows]
		.map((row) => row.join("\t"))
		.join("\n")}\n`;
	return {
		text,
		recordCount: rows.length,
		spanCount: [...spansByKey.values()].reduce(
			(total, spans) => total + spans.length,
			0,
		),
		keyColumns: indexedColumns.map((column) => column.name),
	};
}

export function lookupIndexMetadata({
	sourceResourceId,
	sourceResourceSchemaId,
	sourceText,
	indexText,
	keyColumns,
	recordCount,
	spanCount,
}) {
	const indexedResourceGzipBase64ByteLength = gzipBase64ByteLength(sourceText);
	const lookupIndexGzipBase64ByteLength = gzipBase64ByteLength(indexText);
	return {
		indexFormat: "normalized-key-packed-row-spans-v1",
		indexedResourceId: sourceResourceId,
		indexedResourceSchemaId: sourceResourceSchemaId,
		indexedResourceTextChecksum: sourceTextChecksum(sourceText),
		indexedResourceGzipBase64ByteLength,
		lookupIndexGzipBase64ByteLength,
		compressedSizeRatio: Number(
			(
				lookupIndexGzipBase64ByteLength / indexedResourceGzipBase64ByteLength
			).toFixed(6),
		),
		coordinateUnit: "utf16-code-unit",
		offsetBasis: "uncompressed-resource-text",
		keyNormalization: "NFKC-casefold-Unicode-17",
		keyOrdering: "unicode-code-unit",
		keyColumns,
		recordCount,
		spanCount,
	};
}

export function assertLookupIndexIntegrity({
	indexText,
	sourceText,
	schemaId,
	metadata,
	label = "lookup index",
}) {
	if (metadata.indexedResourceSchemaId !== schemaId) {
		throw new Error(
			`${label} metadata indexedResourceSchemaId is stale or invalid`,
		);
	}
	if (
		metadata.indexedResourceGzipBase64ByteLength >=
			LOOKUP_INDEX_MIN_SOURCE_GZIP_BASE64_BYTES &&
		(metadata.compressedSizeRatio > LOOKUP_INDEX_MAX_COMPRESSED_SIZE_RATIO ||
			metadata.lookupIndexGzipBase64ByteLength >=
				metadata.indexedResourceGzipBase64ByteLength)
	) {
		throw new Error(`${label} does not satisfy the compact-index size gate`);
	}
	const expected = buildLookupIndex(sourceText, schemaId, metadata.keyColumns);
	if (expected === undefined) {
		throw new Error(`${label} source has no supported lookup key columns`);
	}
	const expectedMetadata = lookupIndexMetadata({
		sourceResourceId: metadata.indexedResourceId,
		sourceResourceSchemaId: schemaId,
		sourceText,
		indexText: expected.text,
		keyColumns: expected.keyColumns,
		recordCount: expected.recordCount,
		spanCount: expected.spanCount,
	});
	if (indexText !== expected.text) {
		throw new Error(`${label} rows do not match their indexed source text`);
	}
	for (const [key, value] of Object.entries(expectedMetadata)) {
		if (JSON.stringify(metadata[key]) !== JSON.stringify(value)) {
			throw new Error(`${label} metadata ${key} is stale or invalid`);
		}
	}
}
