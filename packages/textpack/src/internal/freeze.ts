import { isPlainRecord } from "./json.js";

export function deepFreezeJson<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const item of value) deepFreezeJson(item);
		return Object.freeze(value) as T;
	}
	if (isPlainRecord(value)) {
		for (const item of Object.values(value)) deepFreezeJson(item);
		return Object.freeze(value) as T;
	}
	return value;
}

export function freezeRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	return Object.freeze({ ...record });
}
