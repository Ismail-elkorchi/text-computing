import {
	openResourceText,
	resourceTextChecksum,
	type TextPackResourceReader,
} from "./materialize.js";
import type { TextPack, TextPackResource } from "./types.js";

export const lookupIndexSchemaId = "textpack.lookup-index.v1" as const;
export const lookupIndexFormat = "normalized-key-bucketed-rows-v1" as const;
export const lookupIndexStorageFormat = "textpack-indexed-table-v1" as const;

export interface TextPackLookupIndexRow {
	readonly rowOrder: number;
	readonly values: Readonly<Record<string, string>>;
}

export interface TextPackLookupIndex {
	readonly indexResourceId: string;
	readonly sourceResourceId: string;
	readonly sourceColumns: readonly string[];
	readonly keyColumns: readonly string[];
	/** Materializes every logical source row in stable source order. */
	readonly allRows: () => Promise<readonly TextPackLookupIndexRow[]>;
	/** Reconstructs the canonical logical TSV view stored by the indexed table. */
	readonly sourceText: () => Promise<string>;
	readonly normalizedKeyCodePointLengths: (column: string) => readonly number[];
	readonly rowsForNormalizedKey: (
		column: string,
		key: string,
	) => Promise<readonly TextPackLookupIndexRow[]>;
	readonly rowsForNormalizedKeyWithinEditDistance: (
		column: string,
		key: string,
		maxDistance: number,
	) => Promise<readonly TextPackLookupIndexRow[]>;
	readonly rowsForKeyPattern: (
		column: string,
		key: string,
		mode: "prefix" | "suffix" | "fuzzy",
		maxDistance?: number,
	) => Promise<readonly TextPackLookupIndexRow[]>;
}

interface LookupIndexMetadata {
	readonly indexFormat: typeof lookupIndexFormat;
	readonly indexedResourceId: string;
	readonly indexedResourceSchemaId: string;
	readonly indexedResourceTextChecksum: string;
	readonly keyNormalization: "NFKC-casefold-Unicode-17";
	readonly keyColumns: readonly string[];
	readonly emptyKeyColumns: readonly string[];
	readonly fuzzyColumns: readonly string[];
	readonly patternColumns: readonly string[];
	readonly bucketCount: number;
	readonly sourceRowCount: number;
	readonly recordCount: number;
	readonly rowReferenceCount: number;
	readonly indexedResourceTextByteLength: number;
	readonly lookupIndexShippedByteLength: number;
	readonly storageBudgetByteLength: number;
	readonly storageSizeRatio: number;
	readonly maximumBucketByteLength: number;
}

interface BucketDescriptor {
	readonly offset: number;
	readonly length: number;
	readonly textByteLength: number;
	readonly textChecksum: string;
}

interface KeyBucketDescriptor extends BucketDescriptor {
	readonly firstKey: string;
	readonly lastKey: string;
}

interface RowBucketDescriptor extends BucketDescriptor {
	readonly firstRowOrder: number;
	readonly rowCount: number;
}

interface FuzzyBucketDescriptor extends BucketDescriptor {
	readonly column: string;
	readonly codePointLength: number;
}

interface LookupIndexDirectory {
	readonly bucketCount: number;
	readonly sourceRowCount: number;
	readonly sourceColumns: readonly string[];
	readonly keyBuckets: readonly KeyBucketDescriptor[];
	readonly rowBuckets: readonly RowBucketDescriptor[];
	readonly fuzzyBuckets: readonly FuzzyBucketDescriptor[];
	readonly patternBuckets: readonly FuzzyBucketDescriptor[];
}

interface PackLookupIndexCache {
	readonly defaultReader: Map<string, Promise<TextPackLookupIndex>>;
	readonly readers: WeakMap<
		TextPackResourceReader,
		Map<string, Promise<TextPackLookupIndex>>
	>;
}

const lookupIndexCaches = new WeakMap<object, PackLookupIndexCache>();
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function hasLookupDelimiter(value: string): boolean {
	return (
		value.includes("\u0000") ||
		value.includes("\t") ||
		value.includes("\r") ||
		value.includes("\n")
	);
}

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

function positiveSafeInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function stringArray(value: unknown): readonly string[] | undefined {
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.some((entry) => typeof entry !== "string" || entry.length === 0) ||
		new Set(value).size !== value.length
	) {
		return undefined;
	}
	return Object.freeze([...value]);
}

function possiblyEmptyStringArray(
	value: unknown,
): readonly string[] | undefined {
	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string" || entry.length === 0) ||
		new Set(value).size !== value.length
	) {
		return undefined;
	}
	return Object.freeze([...value]);
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
	const sourceMetadata = record(source.metadata);
	const keyColumns = stringArray(metadata?.keyColumns);
	const emptyKeyColumns = possiblyEmptyStringArray(metadata?.emptyKeyColumns);
	const fuzzyColumns = possiblyEmptyStringArray(metadata?.fuzzyColumns);
	const patternColumns = possiblyEmptyStringArray(metadata?.patternColumns);
	if (
		metadata?.indexFormat !== lookupIndexFormat ||
		index.format !== lookupIndexStorageFormat ||
		source.format !== lookupIndexStorageFormat ||
		index.path === undefined ||
		index.path !== source.path ||
		index.license !== source.license ||
		JSON.stringify(index.citations ?? []) !==
			JSON.stringify(source.citations ?? []) ||
		sourceMetadata?.lookupIndexResourceId !== index.id ||
		metadata.indexedResourceId !== source.id ||
		metadata.indexedResourceSchemaId !== source.schemaId ||
		typeof metadata.indexedResourceTextChecksum !== "string" ||
		!/^sha256:[0-9a-f]{64}$/u.test(metadata.indexedResourceTextChecksum) ||
		metadata.keyNormalization !== "NFKC-casefold-Unicode-17" ||
		keyColumns === undefined ||
		emptyKeyColumns === undefined ||
		fuzzyColumns === undefined ||
		patternColumns === undefined ||
		emptyKeyColumns.some((column) => !keyColumns.includes(column)) ||
		fuzzyColumns.some((column) => !keyColumns.includes(column)) ||
		patternColumns.some((column) => !keyColumns.includes(column)) ||
		!positiveSafeInteger(metadata.bucketCount) ||
		!positiveSafeInteger(metadata.sourceRowCount) ||
		!positiveSafeInteger(metadata.recordCount) ||
		!positiveSafeInteger(metadata.rowReferenceCount) ||
		!positiveSafeInteger(metadata.indexedResourceTextByteLength) ||
		!positiveSafeInteger(metadata.lookupIndexShippedByteLength) ||
		!positiveSafeInteger(metadata.storageBudgetByteLength) ||
		metadata.lookupIndexShippedByteLength > metadata.storageBudgetByteLength ||
		typeof metadata.storageSizeRatio !== "number" ||
		!Number.isFinite(metadata.storageSizeRatio) ||
		metadata.storageSizeRatio <= 0 ||
		!positiveSafeInteger(metadata.maximumBucketByteLength)
	) {
		throw new TypeError(
			`Textpack lookup index ${index.id} has invalid or stale metadata for ${source.id}.`,
		);
	}
	return Object.freeze({
		indexFormat: lookupIndexFormat,
		indexedResourceId: source.id,
		indexedResourceSchemaId: source.schemaId ?? "",
		indexedResourceTextChecksum: metadata.indexedResourceTextChecksum,
		keyNormalization: "NFKC-casefold-Unicode-17",
		keyColumns,
		emptyKeyColumns,
		fuzzyColumns,
		patternColumns,
		bucketCount: metadata.bucketCount,
		sourceRowCount: metadata.sourceRowCount,
		recordCount: metadata.recordCount,
		rowReferenceCount: metadata.rowReferenceCount,
		indexedResourceTextByteLength: metadata.indexedResourceTextByteLength,
		lookupIndexShippedByteLength: metadata.lookupIndexShippedByteLength,
		storageBudgetByteLength: metadata.storageBudgetByteLength,
		storageSizeRatio: metadata.storageSizeRatio,
		maximumBucketByteLength: metadata.maximumBucketByteLength,
	});
}

function bucketDescriptor(value: unknown, label: string): BucketDescriptor {
	const descriptor = record(value);
	if (
		descriptor === undefined ||
		!nonNegativeSafeInteger(descriptor.offset) ||
		!nonNegativeSafeInteger(descriptor.length) ||
		!nonNegativeSafeInteger(descriptor.textByteLength) ||
		typeof descriptor.textChecksum !== "string" ||
		!/^sha256:[0-9a-f]{64}$/u.test(descriptor.textChecksum)
	) {
		throw new TypeError(`${label} is invalid.`);
	}
	return Object.freeze({
		offset: descriptor.offset,
		length: descriptor.length,
		textByteLength: descriptor.textByteLength,
		textChecksum: descriptor.textChecksum,
	});
}

function keyBucketDescriptors(
	value: unknown,
	bucketCount: number,
	label: string,
): readonly KeyBucketDescriptor[] {
	if (!Array.isArray(value) || value.length !== bucketCount) {
		throw new TypeError(`${label} must contain ${bucketCount} buckets.`);
	}
	let previousLastKey: string | undefined;
	return Object.freeze(
		value.map((entry, index) => {
			const descriptor = record(entry);
			if (
				descriptor === undefined ||
				typeof descriptor.firstKey !== "string" ||
				typeof descriptor.lastKey !== "string" ||
				descriptor.firstKey.length === 0 ||
				descriptor.lastKey.length === 0 ||
				descriptor.firstKey > descriptor.lastKey ||
				(previousLastKey !== undefined &&
					previousLastKey >= descriptor.firstKey)
			) {
				throw new TypeError(`${label}[${String(index)}] has an invalid range.`);
			}
			previousLastKey = descriptor.lastKey;
			return Object.freeze({
				firstKey: descriptor.firstKey,
				lastKey: descriptor.lastKey,
				...bucketDescriptor(entry, `${label}[${String(index)}]`),
			});
		}),
	);
}

function rowBucketDescriptors(
	value: unknown,
	bucketCount: number,
	sourceRowCount: number,
	label: string,
): readonly RowBucketDescriptor[] {
	if (!Array.isArray(value) || value.length !== bucketCount) {
		throw new TypeError(`${label} must contain ${bucketCount} buckets.`);
	}
	let nextRowOrder = 0;
	const descriptors = value.map((entry, index) => {
		const descriptor = record(entry);
		if (
			descriptor === undefined ||
			!nonNegativeSafeInteger(descriptor.firstRowOrder) ||
			!positiveSafeInteger(descriptor.rowCount) ||
			descriptor.firstRowOrder !== nextRowOrder
		) {
			throw new TypeError(`${label}[${String(index)}] has an invalid range.`);
		}
		nextRowOrder += descriptor.rowCount;
		return Object.freeze({
			firstRowOrder: descriptor.firstRowOrder,
			rowCount: descriptor.rowCount,
			...bucketDescriptor(entry, `${label}[${String(index)}]`),
		});
	});
	if (nextRowOrder !== sourceRowCount) {
		throw new TypeError(`${label} does not cover every source row.`);
	}
	return Object.freeze(descriptors);
}

function fuzzyBucketDescriptors(
	value: unknown,
	allowedColumns: readonly string[],
	label: string,
): readonly FuzzyBucketDescriptor[] {
	if (!Array.isArray(value)) {
		throw new TypeError(`${label} must be an array.`);
	}
	const seen = new Set<string>();
	return Object.freeze(
		value.map((entry, index) => {
			const descriptor = record(entry);
			if (
				descriptor === undefined ||
				typeof descriptor.column !== "string" ||
				!allowedColumns.includes(descriptor.column) ||
				!nonNegativeSafeInteger(descriptor.codePointLength)
			) {
				throw new TypeError(`${label}[${String(index)}] is invalid.`);
			}
			const key = `${descriptor.column}\u0000${String(descriptor.codePointLength)}`;
			if (seen.has(key)) {
				throw new TypeError(
					`${label} contains duplicate column/length buckets.`,
				);
			}
			seen.add(key);
			return Object.freeze({
				column: descriptor.column,
				codePointLength: descriptor.codePointLength,
				...bucketDescriptor(entry, `${label}[${String(index)}]`),
			});
		}),
	);
}

function parseIndexFile(
	indexText: string,
	metadata: LookupIndexMetadata,
	indexResourceId: string,
): {
	readonly dataStart: number;
	readonly directory: LookupIndexDirectory;
} {
	const magicEnd = indexText.indexOf("\n");
	const directoryEnd =
		magicEnd === -1 ? -1 : indexText.indexOf("\n", magicEnd + 1);
	if (
		magicEnd === -1 ||
		directoryEnd === -1 ||
		indexText.slice(0, magicEnd).replace(/\r$/u, "") !==
			`textpack.lookup-index.bucketed-rows.v1`
	) {
		throw new TypeError(
			`Textpack lookup index ${indexResourceId} has an invalid v1 header.`,
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(indexText.slice(magicEnd + 1, directoryEnd));
	} catch {
		throw new TypeError(
			`Textpack lookup index ${indexResourceId} has an invalid directory.`,
		);
	}
	const directory = record(parsed);
	const sourceColumns = stringArray(directory?.sourceColumns);
	if (
		directory === undefined ||
		directory.bucketCount !== metadata.bucketCount ||
		directory.sourceRowCount !== metadata.sourceRowCount ||
		sourceColumns === undefined
	) {
		throw new TypeError(
			`Textpack lookup index ${indexResourceId} directory disagrees with its metadata.`,
		);
	}
	const keyBuckets = keyBucketDescriptors(
		directory.keyBuckets,
		metadata.bucketCount,
		`${indexResourceId}.keyBuckets`,
	);
	const rowBuckets = rowBucketDescriptors(
		directory.rowBuckets,
		metadata.bucketCount,
		metadata.sourceRowCount,
		`${indexResourceId}.rowBuckets`,
	);
	const fuzzyBuckets = fuzzyBucketDescriptors(
		directory.fuzzyBuckets,
		metadata.fuzzyColumns,
		`${indexResourceId}.fuzzyBuckets`,
	);
	const patternBuckets = fuzzyBucketDescriptors(
		directory.patternBuckets,
		metadata.patternColumns,
		`${indexResourceId}.patternBuckets`,
	);
	const dataStart = directoryEnd + 1;
	for (const descriptor of [
		...keyBuckets,
		...rowBuckets,
		...fuzzyBuckets,
		...patternBuckets,
	]) {
		if (dataStart + descriptor.offset + descriptor.length > indexText.length) {
			throw new TypeError(
				`Textpack lookup index ${indexResourceId} bucket range is invalid.`,
			);
		}
	}
	return {
		dataStart,
		directory: Object.freeze({
			bucketCount: metadata.bucketCount,
			sourceRowCount: metadata.sourceRowCount,
			sourceColumns,
			keyBuckets,
			rowBuckets,
			fuzzyBuckets,
			patternBuckets,
		}),
	};
}

function base64Bytes(value: string): Uint8Array {
	if (
		!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
			value,
		)
	) {
		throw new TypeError("Textpack lookup index bucket is not valid base64.");
	}
	const decode = globalThis.atob;
	if (typeof decode !== "function") {
		throw new TypeError("Base64 decoding is not available in this runtime.");
	}
	const binary = decode(value);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

function arrayBufferForBytes(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
	if (typeof DecompressionStream !== "function") {
		throw new TypeError(
			"gzip decoding requires a runtime with DecompressionStream.",
		);
	}
	const stream = new Blob([arrayBufferForBytes(bytes)])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function openBucketText(
	indexText: string,
	dataStart: number,
	descriptor: BucketDescriptor,
	label: string,
): Promise<string> {
	if (descriptor.length === 0) {
		if (descriptor.textByteLength !== 0) {
			throw new TypeError(`${label} has inconsistent empty metadata.`);
		}
		return "";
	}
	const encoded = indexText.slice(
		dataStart + descriptor.offset,
		dataStart + descriptor.offset + descriptor.length,
	);
	const decoded = await gunzip(base64Bytes(encoded));
	if (decoded.byteLength !== descriptor.textByteLength) {
		throw new TypeError(
			`${label} decoded byte length mismatch: expected ${descriptor.textByteLength}, got ${decoded.byteLength}.`,
		);
	}
	const text = utf8Decoder.decode(decoded);
	if ((await resourceTextChecksum(text)) !== descriptor.textChecksum) {
		throw new TypeError(`${label} checksum mismatch.`);
	}
	return text;
}

function unsignedBase36(value: string, label: string): number {
	if (!/^[0-9a-z]+$/u.test(value)) {
		throw new TypeError(`${label} is not a packed unsigned integer.`);
	}
	const parsed = Number.parseInt(value, 36);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new TypeError(`${label} is not a safe packed unsigned integer.`);
	}
	return parsed;
}

function keyBucketRows(text: string): ReadonlyMap<string, readonly number[]> {
	const rows = new Map<string, readonly number[]>();
	if (text.length === 0) return rows;
	let previousKey: string | undefined;
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const tab = line.indexOf("\t");
		if (tab < 0 || line.indexOf("\t", tab + 1) !== -1) {
			throw new TypeError("Textpack lookup key bucket row is malformed.");
		}
		const key = line.slice(0, tab);
		const packedOrders = line.slice(tab + 1);
		if (rows.has(key) || packedOrders.length === 0) {
			throw new TypeError("Textpack lookup key bucket contains invalid keys.");
		}
		if (previousKey !== undefined && previousKey >= key) {
			throw new TypeError(
				"Textpack lookup key bucket keys must be strictly increasing.",
			);
		}
		previousKey = key;
		let previousOrder = 0;
		const orders = packedOrders.split(",").map((value, index) => {
			const delta = unsignedBase36(value, "lookup row-order delta");
			const order = index === 0 ? delta : previousOrder + delta;
			previousOrder = order;
			return order;
		});
		if (
			orders.some(
				(value, index) => index > 0 && value <= (orders[index - 1] ?? -1),
			)
		) {
			throw new TypeError(
				"Textpack lookup key bucket row orders must be unique and increasing.",
			);
		}
		rows.set(key, Object.freeze(orders));
	}
	return rows;
}

function catalogKeys(text: string): readonly string[] {
	const keys: string[] = [];
	if (text.length === 0) return Object.freeze(keys);
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		if (
			hasLookupDelimiter(line) ||
			(keys.length > 0 && (keys.at(-1) ?? "") >= line)
		) {
			throw new TypeError(
				"Textpack lookup catalog keys must be valid and strictly increasing.",
			);
		}
		keys.push(line);
	}
	return Object.freeze(keys);
}

function patternCatalog(text: string): ReadonlyMap<string, string> {
	const normalizedByRaw = new Map<string, string>();
	if (text.length === 0) return normalizedByRaw;
	let previousRaw: string | undefined;
	for (const line of text.split("\n")) {
		if (line.length === 0) continue;
		const tab = line.indexOf("\t");
		if (tab < 0 || line.indexOf("\t", tab + 1) !== -1) {
			throw new TypeError("Textpack lookup pattern catalog row is malformed.");
		}
		const raw = line.slice(0, tab);
		const normalized = line.slice(tab + 1) || raw;
		if (
			hasLookupDelimiter(raw) ||
			hasLookupDelimiter(normalized) ||
			(previousRaw !== undefined && previousRaw >= raw)
		) {
			throw new TypeError(
				"Textpack lookup pattern keys must be valid and strictly increasing.",
			);
		}
		previousRaw = raw;
		normalizedByRaw.set(raw, normalized);
	}
	return normalizedByRaw;
}

function boundedEditDistance(
	left: string,
	right: string,
	maxDistance: number,
): number | undefined {
	const leftChars = Array.from(left);
	const rightChars = Array.from(right);
	if (Math.abs(leftChars.length - rightChars.length) > maxDistance) {
		return undefined;
	}
	let previous = Array.from(
		{ length: rightChars.length + 1 },
		(_value, index) => index,
	);
	for (let leftIndex = 0; leftIndex < leftChars.length; leftIndex += 1) {
		const current = [leftIndex + 1];
		let rowMin = current[0] ?? 0;
		for (let rightIndex = 0; rightIndex < rightChars.length; rightIndex += 1) {
			const cost = leftChars[leftIndex] === rightChars[rightIndex] ? 0 : 1;
			const value = Math.min(
				(current[rightIndex] ?? 0) + 1,
				(previous[rightIndex + 1] ?? 0) + 1,
				(previous[rightIndex] ?? 0) + cost,
			);
			current[rightIndex + 1] = value;
			rowMin = Math.min(rowMin, value);
		}
		if (rowMin > maxDistance) return undefined;
		previous = current;
	}
	const distance = previous[rightChars.length] ?? 0;
	return distance <= maxDistance ? distance : undefined;
}

function rowBucketRows(
	text: string,
	sourceColumns: readonly string[],
	descriptor: RowBucketDescriptor,
): ReadonlyMap<number, TextPackLookupIndexRow> {
	const rows = new Map<number, TextPackLookupIndexRow>();
	if (text.length > 0 && !text.endsWith("\n")) {
		throw new TypeError("Textpack lookup row bucket must end with a newline.");
	}
	const lines = text.length === 0 ? [] : text.slice(0, -1).split("\n");
	if (lines.length !== descriptor.rowCount) {
		throw new TypeError("Textpack lookup row bucket count is invalid.");
	}
	for (const [offset, line] of lines.entries()) {
		const cells = line.split("\t");
		const rowOrder = descriptor.firstRowOrder + offset;
		if (cells.length !== sourceColumns.length) {
			throw new TypeError("Textpack lookup row bucket row is malformed.");
		}
		rows.set(
			rowOrder,
			Object.freeze({
				rowOrder,
				values: Object.freeze(
					Object.fromEntries(
						sourceColumns.map((column, index) => [column, cells[index] ?? ""]),
					),
				),
			}),
		);
	}
	return rows;
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
	// The v1 store is self-contained. Targeted lookups read its physical payload
	// once and decompress only the selected key and row buckets.
	const indexText = await openResourceText(pack, index.id, reader);
	const { dataStart, directory } = parseIndexFile(
		indexText,
		metadata,
		indexResourceId,
	);
	if (
		new TextEncoder().encode(indexText).byteLength !==
			metadata.lookupIndexShippedByteLength ||
		Math.max(
			0,
			...[
				...directory.keyBuckets,
				...directory.rowBuckets,
				...directory.fuzzyBuckets,
				...directory.patternBuckets,
			].map((descriptor) => descriptor.length),
		) !== metadata.maximumBucketByteLength
	) {
		throw new TypeError(
			`Textpack lookup index ${indexResourceId} physical metadata is stale.`,
		);
	}
	const keyBucketCache = new Map<
		number,
		Promise<ReadonlyMap<string, readonly number[]>>
	>();
	const rowBucketCache = new Map<
		number,
		Promise<ReadonlyMap<number, TextPackLookupIndexRow>>
	>();
	const fuzzyBucketCache = new Map<number, Promise<readonly string[]>>();
	const patternBucketCache = new Map<
		number,
		Promise<ReadonlyMap<string, string>>
	>();
	const openKeyBucket = (bucket: number) => {
		let pending = keyBucketCache.get(bucket);
		if (pending !== undefined) return pending;
		const descriptor = directory.keyBuckets[bucket];
		if (descriptor === undefined) {
			throw new TypeError(`Textpack lookup key bucket ${bucket} is absent.`);
		}
		pending = openBucketText(
			indexText,
			dataStart,
			descriptor,
			`${indexResourceId}.keyBuckets[${String(bucket)}]`,
		).then(keyBucketRows);
		keyBucketCache.set(bucket, pending);
		void pending.catch(() => {
			if (keyBucketCache.get(bucket) === pending) keyBucketCache.delete(bucket);
		});
		return pending;
	};
	const openRowBucket = (bucket: number) => {
		let pending = rowBucketCache.get(bucket);
		if (pending !== undefined) return pending;
		const descriptor = directory.rowBuckets[bucket];
		if (descriptor === undefined) {
			throw new TypeError(`Textpack lookup row bucket ${bucket} is absent.`);
		}
		pending = openBucketText(
			indexText,
			dataStart,
			descriptor,
			`${indexResourceId}.rowBuckets[${String(bucket)}]`,
		).then((text) => rowBucketRows(text, directory.sourceColumns, descriptor));
		rowBucketCache.set(bucket, pending);
		void pending.catch(() => {
			if (rowBucketCache.get(bucket) === pending) rowBucketCache.delete(bucket);
		});
		return pending;
	};
	const openFuzzyBucket = (bucket: number) => {
		let pending = fuzzyBucketCache.get(bucket);
		if (pending !== undefined) return pending;
		const descriptor = directory.fuzzyBuckets[bucket];
		if (descriptor === undefined) {
			throw new TypeError(`Textpack lookup fuzzy bucket ${bucket} is absent.`);
		}
		pending = openBucketText(
			indexText,
			dataStart,
			descriptor,
			`${indexResourceId}.fuzzyBuckets[${String(bucket)}]`,
		).then(catalogKeys);
		fuzzyBucketCache.set(bucket, pending);
		void pending.catch(() => {
			if (fuzzyBucketCache.get(bucket) === pending) {
				fuzzyBucketCache.delete(bucket);
			}
		});
		return pending;
	};
	const openPatternBucket = (bucket: number) => {
		let pending = patternBucketCache.get(bucket);
		if (pending !== undefined) return pending;
		const descriptor = directory.patternBuckets[bucket];
		if (descriptor === undefined) {
			throw new TypeError(
				`Textpack lookup pattern bucket ${bucket} is absent.`,
			);
		}
		pending = openBucketText(
			indexText,
			dataStart,
			descriptor,
			`${indexResourceId}.patternBuckets[${String(bucket)}]`,
		).then(patternCatalog);
		patternBucketCache.set(bucket, pending);
		void pending.catch(() => {
			if (patternBucketCache.get(bucket) === pending) {
				patternBucketCache.delete(bucket);
			}
		});
		return pending;
	};
	const rowBucketNumber = (rowOrder: number) => {
		if (rowOrder < 0 || rowOrder >= metadata.sourceRowCount) return -1;
		let low = 0;
		let high = directory.rowBuckets.length - 1;
		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			const descriptor = directory.rowBuckets[middle];
			if (descriptor === undefined) return -1;
			if (rowOrder < descriptor.firstRowOrder) high = middle - 1;
			else if (rowOrder >= descriptor.firstRowOrder + descriptor.rowCount) {
				low = middle + 1;
			} else return middle;
		}
		return -1;
	};
	const keyBucketNumber = (scopedKey: string) => {
		let low = 0;
		let high = directory.keyBuckets.length - 1;
		while (low <= high) {
			const middle = Math.floor((low + high) / 2);
			const descriptor = directory.keyBuckets[middle];
			if (descriptor === undefined) return -1;
			if (scopedKey < descriptor.firstKey) high = middle - 1;
			else if (scopedKey > descriptor.lastKey) low = middle + 1;
			else return middle;
		}
		return -1;
	};
	const rowsForOrders = async (
		rowOrdersInput: readonly number[],
	): Promise<readonly TextPackLookupIndexRow[]> => {
		const rowOrders = [...new Set(rowOrdersInput)].sort(
			(left, right) => left - right,
		);
		if (rowOrders.length === 0) return Object.freeze([]);
		const bucketsForRows = rowOrders.map((rowOrder) =>
			rowBucketNumber(rowOrder),
		);
		if (bucketsForRows.some((bucket) => bucket < 0)) {
			throw new TypeError(
				`Textpack lookup index ${indexResourceId} references an invalid source row.`,
			);
		}
		const bucketNumbers = [...new Set(bucketsForRows)];
		const bucketEntries = await Promise.all(
			bucketNumbers.map(
				async (bucket) => [bucket, await openRowBucket(bucket)] as const,
			),
		);
		const buckets = new Map(bucketEntries);
		const rows = rowOrders.map((rowOrder, index) =>
			buckets.get(bucketsForRows[index] ?? -1)?.get(rowOrder),
		);
		if (rows.some((row) => row === undefined)) {
			throw new TypeError(
				`Textpack lookup index ${indexResourceId} references a missing source row.`,
			);
		}
		return Object.freeze(rows as readonly TextPackLookupIndexRow[]);
	};
	let allRowsPromise: Promise<readonly TextPackLookupIndexRow[]> | undefined;
	const allRows = () => {
		allRowsPromise ??= Promise.all(
			directory.rowBuckets.map((_descriptor, bucket) => openRowBucket(bucket)),
		).then((buckets) => {
			const rows = buckets
				.flatMap((bucket) => [...bucket.values()])
				.sort((left, right) => left.rowOrder - right.rowOrder);
			if (
				rows.length !== metadata.sourceRowCount ||
				rows.some((row, index) => row.rowOrder !== index)
			) {
				throw new TypeError(
					`Textpack lookup index ${indexResourceId} does not cover its logical source rows.`,
				);
			}
			return Object.freeze(rows);
		});
		void allRowsPromise.catch(() => {
			allRowsPromise = undefined;
		});
		return allRowsPromise;
	};
	let sourceTextPromise: Promise<string> | undefined;
	const sourceText = () => {
		sourceTextPromise ??= allRows().then(async (rows) => {
			const text = `${directory.sourceColumns.join("\t")}\n${rows
				.map((row) =>
					directory.sourceColumns
						.map((column) => row.values[column] ?? "")
						.join("\t"),
				)
				.join("\n")}\n`;
			if (
				new TextEncoder().encode(text).byteLength !==
					metadata.indexedResourceTextByteLength ||
				(await resourceTextChecksum(text)) !==
					metadata.indexedResourceTextChecksum
			) {
				throw new TypeError(
					`Textpack lookup index ${indexResourceId} logical source checksum mismatch.`,
				);
			}
			return text;
		});
		void sourceTextPromise.catch(() => {
			sourceTextPromise = undefined;
		});
		return sourceTextPromise;
	};
	const rowsForNormalizedKey = (column: string, key: string) => {
		if (!metadata.keyColumns.includes(column)) {
			throw new TypeError(
				`Textpack lookup index ${indexResourceId} does not index column ${column}.`,
			);
		}
		if (hasLookupDelimiter(key)) {
			throw new TypeError(
				"Textpack lookup index key must not contain TSV delimiters.",
			);
		}
		const scopedKey = `${column}\u0000${key}`;
		return (async () => {
			const bucket = keyBucketNumber(scopedKey);
			if (bucket < 0) return Object.freeze([]);
			const keyRows = await openKeyBucket(bucket);
			return rowsForOrders(keyRows.get(scopedKey) ?? []);
		})();
	};
	const rowsForNormalizedKeys = async (
		column: string,
		keys: ReadonlySet<string>,
	) => {
		const rows = (
			await Promise.all(
				[...keys].map((candidate) => rowsForNormalizedKey(column, candidate)),
			)
		).flat();
		return Object.freeze(
			[...new Map(rows.map((row) => [row.rowOrder, row])).values()].sort(
				(left, right) => left.rowOrder - right.rowOrder,
			),
		);
	};
	const rowsForNormalizedKeyWithinEditDistance = (
		column: string,
		key: string,
		maxDistance: number,
	) => {
		if (!Number.isSafeInteger(maxDistance) || maxDistance < 0) {
			throw new TypeError("maxDistance must be a non-negative safe integer.");
		}
		if (maxDistance === 0) return rowsForNormalizedKey(column, key);
		if (!metadata.fuzzyColumns.includes(column)) {
			throw new TypeError(
				`Textpack lookup index ${indexResourceId} has no fuzzy index for column ${column}.`,
			);
		}
		if (hasLookupDelimiter(key)) {
			throw new TypeError(
				"Textpack lookup index key must not contain TSV delimiters.",
			);
		}
		return (async () => {
			const keyLength = Array.from(key).length;
			const selected = directory.fuzzyBuckets
				.map((descriptor, index) => ({ descriptor, index }))
				.filter(
					({ descriptor }) =>
						descriptor.column === column &&
						Math.abs(descriptor.codePointLength - keyLength) <= maxDistance,
				);
			const matchingKeys = new Set<string>();
			for (const { index: bucket } of selected) {
				for (const candidate of await openFuzzyBucket(bucket)) {
					if (boundedEditDistance(key, candidate, maxDistance) === undefined) {
						continue;
					}
					matchingKeys.add(candidate);
				}
			}
			return rowsForNormalizedKeys(column, matchingKeys);
		})();
	};
	const rowsForKeyPattern = (
		column: string,
		key: string,
		mode: "prefix" | "suffix" | "fuzzy",
		maxDistance = 1,
	) => {
		if (!metadata.patternColumns.includes(column)) {
			throw new TypeError(
				`Textpack lookup index ${indexResourceId} has no raw candidate index for column ${column}.`,
			);
		}
		if (hasLookupDelimiter(key)) {
			throw new TypeError(
				"Textpack lookup index key must not contain TSV delimiters.",
			);
		}
		if (!Number.isSafeInteger(maxDistance) || maxDistance < 0) {
			throw new TypeError("maxDistance must be a non-negative safe integer.");
		}
		return (async () => {
			const keyLength = Array.from(key).length;
			const selected = directory.patternBuckets
				.map((descriptor, index) => ({ descriptor, index }))
				.filter(({ descriptor }) => {
					if (descriptor.column !== column) return false;
					return mode === "fuzzy"
						? Math.abs(descriptor.codePointLength - keyLength) <= maxDistance
						: descriptor.codePointLength >= keyLength;
				});
			const matchingKeys = new Set<string>();
			for (const { index: bucket } of selected) {
				for (const [candidate, normalized] of await openPatternBucket(bucket)) {
					const matches =
						mode === "prefix"
							? candidate.startsWith(key)
							: mode === "suffix"
								? candidate.endsWith(key)
								: boundedEditDistance(key, candidate, maxDistance) !==
									undefined;
					if (!matches) continue;
					matchingKeys.add(normalized);
				}
			}
			return rowsForNormalizedKeys(column, matchingKeys);
		})();
	};
	return Object.freeze({
		indexResourceId,
		sourceResourceId,
		sourceColumns: directory.sourceColumns,
		keyColumns: metadata.keyColumns,
		allRows,
		sourceText,
		normalizedKeyCodePointLengths(column: string) {
			if (!metadata.fuzzyColumns.includes(column)) return Object.freeze([]);
			return Object.freeze(
				[
					...new Set(
						directory.fuzzyBuckets
							.filter((descriptor) => descriptor.column === column)
							.map((descriptor) => descriptor.codePointLength),
					),
				].sort((left, right) => left - right),
			);
		},
		rowsForNormalizedKey,
		rowsForNormalizedKeyWithinEditDistance,
		rowsForKeyPattern,
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
