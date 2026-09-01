import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

import { nfkcCaseFold } from "../../../packages/textfacts/src/casefold/mod.ts";

export const LOOKUP_INDEX_SCHEMA_ID = "textpack.lookup-index.v1";
export const LOOKUP_INDEX_FORMAT = "normalized-key-bucketed-rows-v1";
export const LOOKUP_INDEX_MAGIC = "textpack.lookup-index.bucketed-rows.v1";
export const LOOKUP_INDEX_STORAGE_FORMAT = "textpack-indexed-table-v1";

const TARGET_SOURCE_BYTES_PER_BUCKET = 16 * 1024;
const MAX_BUCKET_COUNT = 16_384;
export const LOOKUP_INDEX_MAX_STORE_SIZE_RATIO = 1.3;
export const LOOKUP_INDEX_MAX_BUCKET_BYTES = 512 * 1024;
export const LOOKUP_INDEX_MAX_FIXED_OVERHEAD_BYTES = 32 * 1024;

function storageBudgetByteLength(sourceByteLength) {
	return Math.ceil(
		Math.max(
			sourceByteLength * LOOKUP_INDEX_MAX_STORE_SIZE_RATIO,
			sourceByteLength + LOOKUP_INDEX_MAX_FIXED_OVERHEAD_BYTES,
		),
	);
}

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
			"root",
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

function sha256(text) {
	return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

export function sourceTextChecksum(text) {
	return sha256(text);
}

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
	return uncompressedPath.replace(/(?:\.[^./]+)?$/u, ".lookup-index.v1.txt");
}

function bucketCountFor(sourceText) {
	const required = Math.max(
		1,
		Math.ceil(
			Buffer.byteLength(sourceText, "utf8") / TARGET_SOURCE_BYTES_PER_BUCKET,
		),
	);
	let count = 1;
	while (count < required && count < MAX_BUCKET_COUNT) count *= 2;
	return Math.min(count, MAX_BUCKET_COUNT);
}

function packedUnsigned(value) {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`lookup-index integer ${value} is not unsigned and safe`);
	}
	return value.toString(36);
}

function unpackedUnsigned(value, label) {
	if (!/^[0-9a-z]+$/u.test(value)) {
		throw new Error(`${label} is not a packed unsigned integer`);
	}
	const parsed = Number.parseInt(value, 36);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new Error(`${label} is not a safe packed unsigned integer`);
	}
	return parsed;
}

function indexedColumnEntries(
	columns,
	schemaId,
	lookupKeyColumns,
	emptyKeyColumns,
) {
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
		return {
			name,
			index,
			split: name === "forms",
			allowEmpty: emptyKeyColumns.has(name),
		};
	});
}

function codeUnitCompare(left, right) {
	return left < right ? -1 : left > right ? 1 : 0;
}

function sourceRows(sourceText) {
	const headerEnd = sourceText.indexOf("\n");
	if (headerEnd === -1) return undefined;
	const rawHeader = sourceText.slice(0, headerEnd);
	const header = rawHeader.endsWith("\r") ? rawHeader.slice(0, -1) : rawHeader;
	const columns = header.split("\t");
	if (
		columns.length === 0 ||
		columns.some((column) => column.length === 0) ||
		new Set(columns).size !== columns.length
	) {
		throw new Error(
			"lookup source header must contain unique non-empty columns",
		);
	}
	const rows = [];
	let start = headerEnd + 1;
	while (start < sourceText.length) {
		const newline = sourceText.indexOf("\n", start);
		const end = newline === -1 ? sourceText.length : newline;
		const raw = sourceText.slice(start, end);
		const row = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
		if (row.length > 0) {
			const cells = row.split("\t");
			if (cells.length !== columns.length) {
				throw new Error(
					`lookup source row ${rows.length} has ${cells.length} cells; expected ${columns.length}`,
				);
			}
			rows.push({ order: rows.length, row, cells });
		}
		if (newline === -1) break;
		start = newline + 1;
	}
	const canonical = `${columns.join("\t")}\n${rows.map((row) => row.row).join("\n")}${rows.length === 0 ? "" : "\n"}`;
	if (sourceText !== canonical) {
		throw new Error(
			"lookup source must be a canonical LF-delimited TSV with one final newline",
		);
	}
	return { columns, rows };
}

function scopedKey(column, candidate) {
	if (
		candidate.includes("\u0000") ||
		candidate.includes("\t") ||
		candidate.includes("\r") ||
		candidate.includes("\n")
	) {
		throw new Error(
			`lookup key column ${column} contains a forbidden delimiter`,
		);
	}
	return `${column}\u0000${normalizedLookupIndexKey(candidate)}`;
}

function keyOrdersForRows(rows, indexedColumns, patternColumns) {
	const ordersByKey = new Map();
	const normalizedKeyByRawKey = new Map();
	for (const row of rows) {
		const rowKeys = new Set();
		for (const column of indexedColumns) {
			const rawValue = row.cells[column.index] ?? "";
			const candidates = column.split ? rawValue.split(/[|, ]/u) : [rawValue];
			for (const candidate of candidates) {
				if (
					(candidate.length === 0 && !column.allowEmpty) ||
					candidate === "-"
				) {
					continue;
				}
				const key = scopedKey(column.name, candidate);
				if (key.endsWith("\u0000") && !column.allowEmpty) continue;
				rowKeys.add(key);
				if (patternColumns.has(column.name)) {
					normalizedKeyByRawKey.set(
						`${column.name}\u0000${candidate}`,
						key.slice(key.indexOf("\u0000") + 1),
					);
				}
			}
		}
		for (const key of rowKeys) {
			const orders = ordersByKey.get(key);
			if (orders === undefined) ordersByKey.set(key, [row.order]);
			else orders.push(row.order);
		}
	}
	return { ordersByKey, normalizedKeyByRawKey };
}

function packedOrderDeltas(orders) {
	let previous = 0;
	return orders
		.map((order, index) => {
			const packed = packedUnsigned(index === 0 ? order : order - previous);
			previous = order;
			return packed;
		})
		.join(",");
}

function bucketTextPayload(text, offset) {
	const encoded =
		text.length === 0
			? ""
			: gzipSync(Buffer.from(text, "utf8")).toString("base64");
	return {
		encoded,
		descriptor: {
			offset,
			length: encoded.length,
			textByteLength: Buffer.byteLength(text, "utf8"),
			textChecksum: sha256(text),
		},
	};
}

function buildBucketedContainer(
	sourceText,
	columns,
	rows,
	ordersByKey,
	normalizedKeyByRawKey,
	patternColumnNames,
	requestedBucketCount = bucketCountFor(sourceText),
) {
	const bucketCount = Math.max(
		1,
		Math.min(requestedBucketCount, rows.length, ordersByKey.size),
	);
	const sortedKeyEntries = [...ordersByKey].sort(([left], [right]) =>
		codeUnitCompare(left, right),
	);
	const keyEntryBuckets = Array.from({ length: bucketCount }, (_, bucket) =>
		sortedKeyEntries.slice(
			Math.floor((bucket * sortedKeyEntries.length) / bucketCount),
			Math.floor(((bucket + 1) * sortedKeyEntries.length) / bucketCount),
		),
	);
	const keyLines = keyEntryBuckets.map((entries) =>
		entries.map(([key, orders]) => `${key}\t${packedOrderDeltas(orders)}`),
	);
	const rowLines = Array.from({ length: bucketCount }, (_, bucket) =>
		rows
			.slice(
				Math.floor((bucket * rows.length) / bucketCount),
				Math.floor(((bucket + 1) * rows.length) / bucketCount),
			)
			.map((row) => row.row),
	);
	const keyTexts = keyLines.map((lines) =>
		lines.length === 0 ? "" : `${lines.join("\n")}\n`,
	);
	const rowTexts = rowLines.map((lines) =>
		lines.length === 0 ? "" : `${lines.join("\n")}\n`,
	);
	const fuzzyLinesByColumnAndLength = new Map();
	for (const scopedKey of ordersByKey.keys()) {
		const separator = scopedKey.indexOf("\u0000");
		const column = scopedKey.slice(0, separator);
		if (column !== "alias" && column !== "label") continue;
		const key = scopedKey.slice(separator + 1);
		const codePointLength = [...key].length;
		const fuzzyKey = `${column}\u0000${packedUnsigned(codePointLength)}`;
		const line = key;
		const lines = fuzzyLinesByColumnAndLength.get(fuzzyKey);
		if (lines === undefined) fuzzyLinesByColumnAndLength.set(fuzzyKey, [line]);
		else lines.push(line);
	}
	const fuzzyEntries = [...fuzzyLinesByColumnAndLength]
		.map(([key, lines]) => {
			const separator = key.indexOf("\u0000");
			return {
				column: key.slice(0, separator),
				codePointLength: unpackedUnsigned(
					key.slice(separator + 1),
					"fuzzy key length",
				),
				text: `${lines.sort(codeUnitCompare).join("\n")}\n`,
			};
		})
		.sort(
			(left, right) =>
				codeUnitCompare(left.column, right.column) ||
				left.codePointLength - right.codePointLength,
		);
	const patternLinesByColumnAndLength = new Map();
	for (const [scopedKey, normalizedKey] of normalizedKeyByRawKey) {
		const separator = scopedKey.indexOf("\u0000");
		const column = scopedKey.slice(0, separator);
		if (!patternColumnNames.has(column)) continue;
		const key = scopedKey.slice(separator + 1);
		const codePointLength = [...key].length;
		const patternKey = `${column}\u0000${packedUnsigned(codePointLength)}`;
		const line = `${key}\t${normalizedKey === key ? "" : normalizedKey}`;
		const lines = patternLinesByColumnAndLength.get(patternKey);
		if (lines === undefined) {
			patternLinesByColumnAndLength.set(patternKey, [line]);
		} else {
			lines.push(line);
		}
	}
	const patternEntries = [...patternLinesByColumnAndLength]
		.map(([key, lines]) => {
			const separator = key.indexOf("\u0000");
			return {
				column: key.slice(0, separator),
				codePointLength: unpackedUnsigned(
					key.slice(separator + 1),
					"pattern key length",
				),
				text: `${lines.sort(codeUnitCompare).join("\n")}\n`,
			};
		})
		.sort(
			(left, right) =>
				codeUnitCompare(left.column, right.column) ||
				left.codePointLength - right.codePointLength,
		);
	let offset = 0;
	const payloads = [];
	const encodeAll = (texts) =>
		texts.map((text) => {
			const payload = bucketTextPayload(text, offset);
			offset += payload.encoded.length;
			payloads.push(payload.encoded);
			return payload.descriptor;
		});
	const keyBuckets = encodeAll(keyTexts).map((descriptor, index) => ({
		firstKey: keyEntryBuckets[index][0][0],
		lastKey: keyEntryBuckets[index].at(-1)[0],
		...descriptor,
	}));
	const rowBuckets = encodeAll(rowTexts).map((descriptor, index) => {
		const firstRowOrder = Math.floor((index * rows.length) / bucketCount);
		return {
			firstRowOrder,
			rowCount:
				Math.floor(((index + 1) * rows.length) / bucketCount) - firstRowOrder,
			...descriptor,
		};
	});
	const fuzzyBuckets = encodeAll(fuzzyEntries.map((entry) => entry.text)).map(
		(descriptor, index) => ({
			column: fuzzyEntries[index].column,
			codePointLength: fuzzyEntries[index].codePointLength,
			...descriptor,
		}),
	);
	const patternBuckets = encodeAll(
		patternEntries.map((entry) => entry.text),
	).map((descriptor, index) => ({
		column: patternEntries[index].column,
		codePointLength: patternEntries[index].codePointLength,
		...descriptor,
	}));
	const directory = {
		bucketCount,
		sourceColumns: columns,
		sourceRowCount: rows.length,
		keyBuckets,
		rowBuckets,
		fuzzyBuckets,
		patternBuckets,
	};
	const maximumBucketByteLength = Math.max(
		0,
		...[...keyBuckets, ...rowBuckets, ...fuzzyBuckets, ...patternBuckets].map(
			(descriptor) => descriptor.length,
		),
	);
	const text = `${LOOKUP_INDEX_MAGIC}\n${JSON.stringify(directory)}\n${payloads.join("")}`;
	const shippedByteLength = Buffer.byteLength(text, "utf8");
	const sourceByteLength = Buffer.byteLength(sourceText, "utf8");
	const storageSizeRatio = shippedByteLength / sourceByteLength;
	if (shippedByteLength > storageBudgetByteLength(sourceByteLength)) {
		if (bucketCount > 1) {
			return buildBucketedContainer(
				sourceText,
				columns,
				rows,
				ordersByKey,
				normalizedKeyByRawKey,
				patternColumnNames,
				Math.floor(bucketCount / 2),
			);
		}
		throw new Error(
			`lookup index storage ratio ${storageSizeRatio.toFixed(3)} exceeds ${LOOKUP_INDEX_MAX_STORE_SIZE_RATIO.toFixed(2)}`,
		);
	}
	if (maximumBucketByteLength > LOOKUP_INDEX_MAX_BUCKET_BYTES) {
		throw new Error(
			`lookup index bucket ${maximumBucketByteLength} exceeds ${LOOKUP_INDEX_MAX_BUCKET_BYTES} bytes`,
		);
	}
	return {
		bucketCount,
		directory,
		maximumBucketByteLength,
		storageSizeRatio,
		text,
	};
}

export function buildLookupIndex(
	sourceText,
	schemaId,
	lookupKeyColumns,
	options = {},
) {
	const source = sourceRows(sourceText);
	if (source === undefined) return undefined;
	const emptyKeyColumns = new Set(options.emptyKeyColumns ?? []);
	for (const column of emptyKeyColumns) {
		if (!lookupKeyColumns.includes(column)) {
			throw new Error(
				`lookup empty-key column ${column} is not a declared lookup key column`,
			);
		}
	}
	const patternColumns = new Set(options.patternColumns ?? []);
	for (const column of patternColumns) {
		if (!lookupKeyColumns.includes(column)) {
			throw new Error(
				`lookup pattern column ${column} is not a declared lookup key column`,
			);
		}
	}
	const indexedColumns = indexedColumnEntries(
		source.columns,
		schemaId,
		lookupKeyColumns,
		emptyKeyColumns,
	);
	if (indexedColumns.length === 0 || source.rows.length === 0) return undefined;
	const { ordersByKey, normalizedKeyByRawKey } = keyOrdersForRows(
		source.rows,
		indexedColumns,
		patternColumns,
	);
	if (ordersByKey.size === 0) return undefined;
	const container = buildBucketedContainer(
		sourceText,
		source.columns,
		source.rows,
		ordersByKey,
		normalizedKeyByRawKey,
		patternColumns,
	);
	return {
		text: container.text,
		bucketCount: container.bucketCount,
		sourceRowCount: source.rows.length,
		recordCount: ordersByKey.size,
		rowReferenceCount: [...ordersByKey.values()].reduce(
			(total, orders) => total + orders.length,
			0,
		),
		keyColumns: indexedColumns.map((column) => column.name),
		emptyKeyColumns: [...emptyKeyColumns].sort(codeUnitCompare),
		fuzzyColumns: [
			...new Set(
				container.directory.fuzzyBuckets.map((bucket) => bucket.column),
			),
		].sort(codeUnitCompare),
		patternColumns: [
			...new Set(
				container.directory.patternBuckets.map((bucket) => bucket.column),
			),
		].sort(codeUnitCompare),
		maximumBucketByteLength: container.maximumBucketByteLength,
		storageSizeRatio: container.storageSizeRatio,
	};
}

function parseContainerDirectory(indexText, label = "lookup index") {
	const magicEnd = indexText.indexOf("\n");
	const directoryEnd =
		magicEnd === -1 ? -1 : indexText.indexOf("\n", magicEnd + 1);
	if (
		magicEnd === -1 ||
		directoryEnd === -1 ||
		indexText.slice(0, magicEnd) !== LOOKUP_INDEX_MAGIC
	) {
		throw new Error(`${label} has an invalid v1 header`);
	}
	let directory;
	try {
		directory = JSON.parse(indexText.slice(magicEnd + 1, directoryEnd));
	} catch {
		throw new Error(`${label} has an invalid v1 directory`);
	}
	if (
		directory === null ||
		typeof directory !== "object" ||
		!Number.isSafeInteger(directory.bucketCount) ||
		directory.bucketCount <= 0 ||
		!Number.isSafeInteger(directory.sourceRowCount) ||
		directory.sourceRowCount <= 0 ||
		!Array.isArray(directory.sourceColumns) ||
		directory.sourceColumns.length === 0 ||
		directory.sourceColumns.some(
			(column) => typeof column !== "string" || column.length === 0,
		) ||
		new Set(directory.sourceColumns).size !== directory.sourceColumns.length ||
		!Array.isArray(directory.keyBuckets) ||
		directory.keyBuckets.length !== directory.bucketCount ||
		!Array.isArray(directory.rowBuckets) ||
		directory.rowBuckets.length !== directory.bucketCount ||
		!Array.isArray(directory.fuzzyBuckets) ||
		!Array.isArray(directory.patternBuckets)
	) {
		throw new Error(`${label} has an invalid v1 directory shape`);
	}
	return { dataStart: directoryEnd + 1, directory };
}

function decodedBucket(indexText, dataStart, descriptor, label) {
	if (
		descriptor === null ||
		typeof descriptor !== "object" ||
		!Number.isSafeInteger(descriptor.offset) ||
		descriptor.offset < 0 ||
		!Number.isSafeInteger(descriptor.length) ||
		descriptor.length < 0 ||
		!Number.isSafeInteger(descriptor.textByteLength) ||
		descriptor.textByteLength < 0 ||
		typeof descriptor.textChecksum !== "string" ||
		!/^sha256:[0-9a-f]{64}$/u.test(descriptor.textChecksum) ||
		dataStart + descriptor.offset + descriptor.length > indexText.length
	) {
		throw new Error(`${label} descriptor is invalid`);
	}
	const encoded = indexText.slice(
		dataStart + descriptor.offset,
		dataStart + descriptor.offset + descriptor.length,
	);
	if (
		encoded.length > 0 &&
		!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
			encoded,
		)
	) {
		throw new Error(`${label} payload is not base64`);
	}
	let text;
	try {
		text =
			encoded.length === 0
				? ""
				: gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
	} catch {
		throw new Error(`${label} payload is not valid gzip`);
	}
	if (
		Buffer.byteLength(text, "utf8") !== descriptor.textByteLength ||
		sha256(text) !== descriptor.textChecksum
	) {
		throw new Error(`${label} payload integrity is invalid`);
	}
	return text;
}

export function lookupIndexSourceText(indexText, label = "lookup index") {
	const { dataStart, directory } = parseContainerDirectory(indexText, label);
	const rows = [];
	for (const [bucket, descriptor] of directory.rowBuckets.entries()) {
		if (
			!Number.isSafeInteger(descriptor.firstRowOrder) ||
			descriptor.firstRowOrder !== rows.length ||
			!Number.isSafeInteger(descriptor.rowCount) ||
			descriptor.rowCount < 0
		) {
			throw new Error(`${label} row bucket ${bucket} range is invalid`);
		}
		const text = decodedBucket(
			indexText,
			dataStart,
			descriptor,
			`${label} row bucket ${bucket}`,
		);
		const bucketRows = text.length === 0 ? [] : text.slice(0, -1).split("\n");
		if (
			(text.length > 0 && !text.endsWith("\n")) ||
			bucketRows.length !== descriptor.rowCount ||
			bucketRows.some(
				(row) => row.split("\t").length !== directory.sourceColumns.length,
			)
		) {
			throw new Error(`${label} row bucket ${bucket} contents are invalid`);
		}
		rows.push(...bucketRows);
	}
	if (rows.length !== directory.sourceRowCount) {
		throw new Error(`${label} row buckets do not cover the source rows`);
	}
	return `${directory.sourceColumns.join("\t")}\n${rows.join("\n")}\n`;
}

function assertContainerIntegrity(indexText, metadata, label) {
	const { dataStart, directory } = parseContainerDirectory(indexText, label);
	if (
		directory.bucketCount !== metadata.bucketCount ||
		directory.sourceRowCount !== metadata.sourceRowCount
	) {
		throw new Error(`${label} directory disagrees with metadata`);
	}
	const rows = new Map();
	for (const [bucket, descriptor] of directory.rowBuckets.entries()) {
		const text = decodedBucket(
			indexText,
			dataStart,
			descriptor,
			`${label} row bucket ${bucket}`,
		);
		let rowOffset = 0;
		for (const line of text.split("\n")) {
			if (line.length === 0) continue;
			const order = descriptor.firstRowOrder + rowOffset;
			rowOffset += 1;
			if (
				descriptor.firstRowOrder !==
					Math.floor(
						(bucket * metadata.sourceRowCount) / directory.bucketCount,
					) ||
				rows.has(order)
			) {
				throw new Error(`${label} row bucket assignment is invalid`);
			}
			const cells = line.split("\t");
			if (cells.length !== directory.sourceColumns.length) {
				throw new Error(`${label} row ${order} has an invalid column count`);
			}
			rows.set(order, line);
		}
		if (rowOffset !== descriptor.rowCount) {
			throw new Error(`${label} row bucket ${bucket} count is invalid`);
		}
	}
	if (
		rows.size !== metadata.sourceRowCount ||
		[...rows.keys()]
			.sort((left, right) => left - right)
			.some((order, index) => order !== index)
	) {
		throw new Error(`${label} row buckets do not cover the source rows`);
	}
	let recordCount = 0;
	let rowReferenceCount = 0;
	const seenKeys = new Set();
	let previousLastKey;
	for (const [bucket, descriptor] of directory.keyBuckets.entries()) {
		if (
			typeof descriptor.firstKey !== "string" ||
			typeof descriptor.lastKey !== "string" ||
			descriptor.firstKey.length === 0 ||
			descriptor.lastKey.length === 0 ||
			codeUnitCompare(descriptor.firstKey, descriptor.lastKey) > 0 ||
			(previousLastKey !== undefined &&
				codeUnitCompare(previousLastKey, descriptor.firstKey) >= 0)
		) {
			throw new Error(`${label} key bucket ${bucket} range is invalid`);
		}
		previousLastKey = descriptor.lastKey;
		const text = decodedBucket(
			indexText,
			dataStart,
			descriptor,
			`${label} key bucket ${bucket}`,
		);
		let bucketFirstKey;
		let bucketLastKey;
		for (const line of text.split("\n")) {
			if (line.length === 0) continue;
			const tab = line.indexOf("\t");
			if (tab < 0 || line.indexOf("\t", tab + 1) !== -1) {
				throw new Error(`${label} key bucket ${bucket} is malformed`);
			}
			const key = line.slice(0, tab);
			if (
				bucketLastKey !== undefined &&
				codeUnitCompare(bucketLastKey, key) >= 0
			) {
				throw new Error(`${label} key bucket ${bucket} is not strictly sorted`);
			}
			bucketFirstKey ??= key;
			bucketLastKey = key;
			const separator = key.indexOf("\u0000");
			if (
				separator <= 0 ||
				key.indexOf("\u0000", separator + 1) !== -1 ||
				!metadata.keyColumns.includes(key.slice(0, separator)) ||
				codeUnitCompare(key, descriptor.firstKey) < 0 ||
				codeUnitCompare(key, descriptor.lastKey) > 0 ||
				seenKeys.has(key)
			) {
				throw new Error(`${label} scoped key is invalid`);
			}
			seenKeys.add(key);
			const deltas = line
				.slice(tab + 1)
				.split(",")
				.map((value) => unpackedUnsigned(value, `${label} key row order`));
			let previousOrder = 0;
			const orders = deltas.map((delta, index) => {
				const order = index === 0 ? delta : previousOrder + delta;
				previousOrder = order;
				return order;
			});
			if (
				orders.length === 0 ||
				orders.some(
					(order, index) =>
						!rows.has(order) ||
						(index > 0 && order <= (orders[index - 1] ?? -1)),
				)
			) {
				throw new Error(`${label} scoped key row orders are invalid`);
			}
			recordCount += 1;
			rowReferenceCount += orders.length;
		}
		if (
			bucketFirstKey !== descriptor.firstKey ||
			bucketLastKey !== descriptor.lastKey
		) {
			throw new Error(`${label} key bucket ${bucket} range is stale`);
		}
	}
	if (
		recordCount !== metadata.recordCount ||
		rowReferenceCount !== metadata.rowReferenceCount
	) {
		throw new Error(`${label} key counts disagree with metadata`);
	}
}

export function lookupIndexMetadata({
	sourceResourceId,
	sourceResourceSchemaId,
	sourceText,
	indexText,
	keyColumns,
	emptyKeyColumns = [],
	fuzzyColumns = [],
	patternColumns = [],
	recordCount,
	rowReferenceCount,
}) {
	const { directory } = parseContainerDirectory(indexText);
	const descriptors = [
		...directory.keyBuckets,
		...directory.rowBuckets,
		...directory.fuzzyBuckets,
		...directory.patternBuckets,
	];
	const indexedResourceTextByteLength = Buffer.byteLength(sourceText, "utf8");
	const lookupIndexShippedByteLength = Buffer.byteLength(indexText, "utf8");
	const firstNewline = indexText.indexOf("\n");
	const secondNewline = indexText.indexOf("\n", firstNewline + 1);
	if (firstNewline < 0 || secondNewline < 0) {
		throw new Error("lookup index has no readable header");
	}
	const lookupIndexHeader = indexText.slice(0, secondNewline + 1);
	return {
		indexFormat: LOOKUP_INDEX_FORMAT,
		indexedResourceId: sourceResourceId,
		indexedResourceSchemaId: sourceResourceSchemaId,
		indexedResourceTextChecksum: sourceTextChecksum(sourceText),
		keyNormalization: "NFKC-casefold-Unicode-17",
		keyColumns,
		emptyKeyColumns,
		fuzzyColumns,
		patternColumns,
		bucketCount: directory.bucketCount,
		sourceRowCount: directory.sourceRowCount,
		recordCount,
		rowReferenceCount,
		indexedResourceTextByteLength,
		lookupIndexShippedByteLength,
		lookupIndexHeaderByteLength: Buffer.byteLength(lookupIndexHeader, "utf8"),
		lookupIndexHeaderChecksum: sha256(lookupIndexHeader),
		storageBudgetByteLength: storageBudgetByteLength(
			indexedResourceTextByteLength,
		),
		storageSizeRatio:
			lookupIndexShippedByteLength / indexedResourceTextByteLength,
		maximumBucketByteLength: Math.max(
			0,
			...descriptors.map((descriptor) => descriptor.length),
		),
	};
}

export function assertLookupIndexIntegrity({
	indexText,
	sourceText,
	schemaId,
	metadata,
	label = "lookup index",
}) {
	const firstNewline = indexText.indexOf("\n");
	const secondNewline = indexText.indexOf("\n", firstNewline + 1);
	const header = indexText.slice(0, secondNewline + 1);
	if (
		metadata.indexFormat !== LOOKUP_INDEX_FORMAT ||
		metadata.indexedResourceSchemaId !== schemaId
	) {
		throw new Error(`${label} metadata schema/format is stale or invalid`);
	}
	assertContainerIntegrity(indexText, metadata, label);
	if (
		lookupIndexSourceText(indexText, label) !== sourceText ||
		metadata.lookupIndexShippedByteLength > metadata.storageBudgetByteLength ||
		!Number.isSafeInteger(metadata.lookupIndexHeaderByteLength) ||
		metadata.lookupIndexHeaderByteLength <= 0 ||
		metadata.lookupIndexHeaderByteLength >=
			metadata.lookupIndexShippedByteLength ||
		typeof metadata.lookupIndexHeaderChecksum !== "string" ||
		!/^sha256:[0-9a-f]{64}$/u.test(metadata.lookupIndexHeaderChecksum) ||
		Buffer.byteLength(header, "utf8") !==
			metadata.lookupIndexHeaderByteLength ||
		sha256(header) !== metadata.lookupIndexHeaderChecksum ||
		metadata.maximumBucketByteLength > LOOKUP_INDEX_MAX_BUCKET_BYTES
	) {
		throw new Error(
			`${label} physical storage limits or source view are invalid`,
		);
	}
	const expected = buildLookupIndex(sourceText, schemaId, metadata.keyColumns, {
		emptyKeyColumns: metadata.emptyKeyColumns,
		patternColumns: metadata.patternColumns,
	});
	if (expected === undefined) {
		throw new Error(`${label} source has no supported lookup key columns`);
	}
	const expectedMetadata = lookupIndexMetadata({
		sourceResourceId: metadata.indexedResourceId,
		sourceResourceSchemaId: schemaId,
		sourceText,
		indexText: expected.text,
		keyColumns: expected.keyColumns,
		emptyKeyColumns: expected.emptyKeyColumns,
		fuzzyColumns: expected.fuzzyColumns,
		patternColumns: expected.patternColumns,
		recordCount: expected.recordCount,
		rowReferenceCount: expected.rowReferenceCount,
	});
	if (indexText !== expected.text) {
		throw new Error(`${label} buckets do not match their indexed source text`);
	}
	for (const [key, value] of Object.entries(expectedMetadata)) {
		if (JSON.stringify(metadata[key]) !== JSON.stringify(value)) {
			throw new Error(`${label} metadata ${key} is stale or invalid`);
		}
	}
}
