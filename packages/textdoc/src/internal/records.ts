import { fail } from "./error.ts";

export function orderedRecord<T>(
	record: Readonly<Record<string, T>>,
): Record<string, T> {
	const result: Record<string, T> = {};
	for (const key of Object.keys(record).sort()) {
		const value = record[key];
		if (value !== undefined) result[key] = value;
	}
	return result;
}

export function insertRecordValue<T>(
	record: Readonly<Record<string, T>>,
	id: string,
	value: T,
	label: string,
): Record<string, T> {
	if (Object.hasOwn(record, id)) {
		fail("TEXTDOC_DUPLICATE_ID", `${label} already exists: ${id}`);
	}
	return orderedRecord({ ...record, [id]: value });
}

export function replaceRecordValue<T>(
	record: Readonly<Record<string, T>>,
	id: string,
	value: T,
	label: string,
): Record<string, T> {
	if (!Object.hasOwn(record, id)) {
		fail("TEXTDOC_MISSING_ID", `${label} does not exist: ${id}`);
	}
	return orderedRecord({ ...record, [id]: value });
}

export function removeRecordValue<T>(
	record: Readonly<Record<string, T>>,
	id: string,
	label: string,
): Record<string, T> {
	if (!Object.hasOwn(record, id)) {
		fail("TEXTDOC_MISSING_ID", `${label} does not exist: ${id}`);
	}
	const result: Record<string, T> = {};
	for (const key of Object.keys(record).sort()) {
		if (key !== id) {
			const value = record[key];
			if (value !== undefined) result[key] = value;
		}
	}
	return result;
}
