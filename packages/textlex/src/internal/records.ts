import { isPlainRecord } from "./json.js";

export function requireNonEmptyString(value: unknown, path: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(`${path} must be a non-empty string.`);
	}
	return value;
}

export function optionalString(
	value: unknown,
	path: string,
): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(`${path} must be a non-empty string when present.`);
	}
	return value;
}

export function optionalStringArray(
	value: unknown,
	path: string,
): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (
		!Array.isArray(value) ||
		value.some((entry) => typeof entry !== "string" || entry.length === 0)
	) {
		throw new TypeError(`${path} must be a string array when present.`);
	}
	return Object.freeze([...value]);
}

export function requirePlainRecord(
	value: unknown,
	path: string,
): Record<string, unknown> {
	if (!isPlainRecord(value)) {
		throw new TypeError(`${path} must be a plain object.`);
	}
	return value;
}
