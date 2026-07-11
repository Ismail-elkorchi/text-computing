interface IndexedTableDescriptor {
	readonly id: string;
	readonly kind: "morphology";
	readonly path: string;
	readonly format: "textpack-indexed-table-v2";
	readonly schemaId: "textlex.morphology.rows.v1";
	readonly metadata: Readonly<Record<string, unknown>>;
}

interface IndexedTableIndexDescriptor {
	readonly id: string;
	readonly kind: "dataset";
	readonly path: string;
	readonly format: "textpack-indexed-table-v2";
	readonly schemaId: "textpack.lookup-index.v2";
	readonly metadata: Readonly<Record<string, unknown>>;
}

export interface IndexedMorphologyTableFixture {
	readonly source: IndexedTableDescriptor;
	readonly index: IndexedTableIndexDescriptor;
	readonly resources: Readonly<Record<string, string>>;
}

async function sha256(text: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text),
	);
	return `sha256:${[...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")}`;
}

async function gzipBase64(text: string): Promise<string> {
	const compressed = new Uint8Array(
		await new Response(
			new Blob([text]).stream().pipeThrough(new CompressionStream("gzip")),
		).arrayBuffer(),
	);
	let binary = "";
	for (const byte of compressed) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function normalizeKey(value: string): string {
	return value.normalize("NFKC").toLowerCase();
}

export async function indexedMorphologyTableFixture(
	resourceId: string,
	text: string,
	keyColumns: readonly string[],
): Promise<IndexedMorphologyTableFixture> {
	const lines = text.split("\n");
	if (lines.at(-1) !== "") {
		throw new TypeError("Indexed table fixtures must end with a newline.");
	}
	const columns = (lines[0] ?? "").split("\t");
	const rowLines = lines.slice(1, -1);
	const columnIndexes = keyColumns.map((column) => {
		const index = columns.indexOf(column);
		if (index < 0) throw new TypeError(`Missing indexed column ${column}.`);
		return { column, index };
	});
	const ordersByKey = new Map<string, number[]>();
	for (const [rowOrder, row] of rowLines.entries()) {
		const cells = row.split("\t");
		if (cells.length !== columns.length) {
			throw new TypeError(`Malformed indexed fixture row ${String(rowOrder)}.`);
		}
		for (const { column, index } of columnIndexes) {
			const value = cells[index] ?? "";
			if (value.length === 0 || value === "-") continue;
			const scopedKey = `${column}\u0000${normalizeKey(value)}`;
			const orders = ordersByKey.get(scopedKey) ?? [];
			if (orders.at(-1) !== rowOrder) orders.push(rowOrder);
			ordersByKey.set(scopedKey, orders);
		}
	}
	const keyRows = [...ordersByKey]
		.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
		.map(([key, orders]) => {
			let previous = 0;
			const deltas = orders.map((order, index) => {
				const delta = index === 0 ? order : order - previous;
				previous = order;
				return delta.toString(36);
			});
			return `${key}\t${deltas.join(",")}`;
		});
	if (keyRows.length === 0 || rowLines.length === 0) {
		throw new TypeError("Indexed table fixtures must contain keyed rows.");
	}
	const keyText = `${keyRows.join("\n")}\n`;
	const rowText = `${rowLines.join("\n")}\n`;
	const keyEncoded = await gzipBase64(keyText);
	const rowEncoded = await gzipBase64(rowText);
	const bucketDescriptor = async (
		offset: number,
		encoded: string,
		raw: string,
	) => ({
		offset,
		length: encoded.length,
		textByteLength: new TextEncoder().encode(raw).byteLength,
		textChecksum: await sha256(raw),
	});
	const directory = {
		bucketCount: 1,
		sourceRowCount: rowLines.length,
		sourceColumns: columns,
		keyBuckets: [
			{
				firstKey: keyRows[0]?.slice(0, keyRows[0].indexOf("\t")),
				lastKey: keyRows.at(-1)?.slice(0, keyRows.at(-1)?.indexOf("\t")),
				...(await bucketDescriptor(0, keyEncoded, keyText)),
			},
		],
		rowBuckets: [
			{
				firstRowOrder: 0,
				rowCount: rowLines.length,
				...(await bucketDescriptor(keyEncoded.length, rowEncoded, rowText)),
			},
		],
		fuzzyBuckets: [],
		patternBuckets: [],
	};
	const indexText = `textpack.lookup-index.bucketed-rows.v2\n${JSON.stringify(directory)}\n${keyEncoded}${rowEncoded}`;
	const sourceByteLength = new TextEncoder().encode(text).byteLength;
	const shippedByteLength = new TextEncoder().encode(indexText).byteLength;
	const indexResourceId = `${resourceId}-lookup-index`;
	const path = `resources/${resourceId}.lookup-index.v2.txt`;
	return {
		source: {
			id: resourceId,
			kind: "morphology",
			path,
			format: "textpack-indexed-table-v2",
			schemaId: "textlex.morphology.rows.v1",
			metadata: { lookupIndexResourceId: indexResourceId },
		},
		index: {
			id: indexResourceId,
			kind: "dataset",
			path,
			format: "textpack-indexed-table-v2",
			schemaId: "textpack.lookup-index.v2",
			metadata: {
				indexFormat: "normalized-key-bucketed-rows-v2",
				indexedResourceId: resourceId,
				indexedResourceSchemaId: "textlex.morphology.rows.v1",
				indexedResourceTextChecksum: await sha256(text),
				keyNormalization: "NFKC-casefold-Unicode-17",
				keyColumns,
				emptyKeyColumns: [],
				fuzzyColumns: [],
				patternColumns: [],
				bucketCount: 1,
				sourceRowCount: rowLines.length,
				recordCount: ordersByKey.size,
				rowReferenceCount: [...ordersByKey.values()].reduce(
					(total, orders) => total + orders.length,
					0,
				),
				indexedResourceTextByteLength: sourceByteLength,
				lookupIndexShippedByteLength: shippedByteLength,
				storageBudgetByteLength: Math.max(
					Math.ceil(sourceByteLength * 1.3),
					sourceByteLength + 32 * 1024,
				),
				storageSizeRatio: shippedByteLength / sourceByteLength,
				maximumBucketByteLength: Math.max(keyEncoded.length, rowEncoded.length),
			},
		},
		resources: {
			[resourceId]: indexText,
			[indexResourceId]: indexText,
		},
	};
}
