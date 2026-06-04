export async function* mapRecords<T, U>(
	records: AsyncIterable<T> | Iterable<T>,
	mapper: (record: T, index: number) => U | Promise<U>,
): AsyncIterable<U> {
	let index = 0;
	for await (const record of records) {
		yield mapper(record, index);
		index += 1;
	}
}

export async function* filterRecords<T>(
	records: AsyncIterable<T> | Iterable<T>,
	predicate: (record: T, index: number) => boolean | Promise<boolean>,
): AsyncIterable<T> {
	let index = 0;
	for await (const record of records) {
		if (await predicate(record, index)) yield record;
		index += 1;
	}
}
