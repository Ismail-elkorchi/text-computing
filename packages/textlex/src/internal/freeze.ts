import { isPlainRecord } from "./json.js";

export function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const entry of value) deepFreeze(entry);
		return Object.freeze(value) as T;
	}
	if (isPlainRecord(value)) {
		for (const entry of Object.values(value)) deepFreeze(entry);
		return Object.freeze(value) as T;
	}
	return value;
}

export function orderedRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	const output: Record<string, T> = {};
	for (const key of Object.keys(record).sort((left, right) =>
		left.localeCompare(right),
	)) {
		const value = record[key];
		if (value !== undefined) output[key] = value;
	}
	return Object.freeze(output);
}
