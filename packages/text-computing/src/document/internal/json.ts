import { fail } from "./error.ts";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	if (Object.prototype.toString.call(value) !== "[object Object]") {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	if (prototype === null) return true;
	const objectConstructor = (prototype as { readonly constructor?: unknown })
		.constructor;
	return (
		typeof objectConstructor === "function" &&
		Function.prototype.toString.call(objectConstructor) ===
			Function.prototype.toString.call(Object)
	);
}

function assertJsonString(value: string, path: string): void {
	for (let index = 0; index < value.length; ) {
		const codeUnit = value.charCodeAt(index);
		if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				index += 2;
				continue;
			}
			fail(
				"TEXTDOC_JSON_ILL_FORMED_STRING",
				`${path} contains a lone high surrogate`,
			);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			fail(
				"TEXTDOC_JSON_ILL_FORMED_STRING",
				`${path} contains a lone low surrogate`,
			);
		}
		index += 1;
	}
}

export function assertJsonValue(
	value: unknown,
	path = "$",
): asserts value is JsonValue {
	if (value === null || typeof value === "boolean") return;
	if (typeof value === "string") {
		assertJsonString(value, path);
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			fail("TEXTDOC_JSON_NON_FINITE_NUMBER", `${path} must be a finite number`);
		}
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`);
		}
		return;
	}
	if (isPlainJsonObject(value)) {
		for (const key of Object.keys(value)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValue(value[key], `${path}.${key}`);
		}
		return;
	}
	fail(
		"TEXTDOC_JSON_UNSUPPORTED_VALUE",
		`${path} contains unsupported JSON value ${typeof value}`,
	);
}

export function stableJsonClone(value: JsonValue): JsonValue {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonClone(entry));
	}
	const sorted: Record<string, JsonValue> = {};
	const record = value as { readonly [key: string]: JsonValue };
	for (const key of Object.keys(record).sort()) {
		sorted[key] = stableJsonClone(record[key] as JsonValue);
	}
	return sorted;
}
