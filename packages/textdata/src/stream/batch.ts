export async function* batchRecords<T>(
	records: AsyncIterable<T> | Iterable<T>,
	size: number,
): AsyncIterable<readonly T[]> {
	if (!Number.isInteger(size) || size <= 0) {
		throw new Error("batch size must be a positive integer");
	}
	let batch: T[] = [];
	for await (const record of records) {
		batch.push(record);
		if (batch.length === size) {
			yield batch;
			batch = [];
		}
	}
	if (batch.length > 0) yield batch;
}
