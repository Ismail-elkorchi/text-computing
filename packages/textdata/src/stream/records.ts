import type { TextDataset } from "../dataset/mod.js";

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
	return (
		typeof value === "object" && value !== null && Symbol.asyncIterator in value
	);
}

export async function* streamRecords<T>(
	dataset: TextDataset<T>,
): AsyncIterable<T> {
	if (isAsyncIterable<T>(dataset.records)) {
		for await (const record of dataset.records) yield record;
		return;
	}
	for (const record of dataset.records) yield record;
}

export async function collectRecords<T>(dataset: TextDataset<T>): Promise<T[]> {
	const records: T[] = [];
	for await (const record of streamRecords(dataset)) records.push(record);
	return records;
}
