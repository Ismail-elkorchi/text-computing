import { fail } from "./errors.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.prototype.toString.call(value) === "[object Object]"
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
			fail("TEXTCORPUS_JSON_STRING", `${path} contains a lone high surrogate`);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			fail("TEXTCORPUS_JSON_STRING", `${path} contains a lone low surrogate`);
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
			fail("TEXTCORPUS_JSON_NUMBER", `${path} must be finite`);
		}
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`);
		}
		return;
	}
	if (isRecord(value)) {
		for (const key of Object.keys(value)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValue(value[key], `${path}.${key}`);
		}
		return;
	}
	fail("TEXTCORPUS_JSON_VALUE", `${path} must be an I-JSON value`);
}

export function stableJsonClone<T extends JsonValue>(value: T): T {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonClone(entry)) as unknown as T;
	}
	const sorted: Record<string, JsonValue> = {};
	const record = value as { readonly [key: string]: JsonValue };
	for (const key of Object.keys(record).sort()) {
		sorted[key] = stableJsonClone(record[key] as JsonValue);
	}
	return sorted as T;
}

export function assertJsonObject(
	value: unknown,
	path = "$",
): asserts value is JsonObject {
	assertJsonValue(value, path);
	if (!isRecord(value)) {
		fail("TEXTCORPUS_JSON_OBJECT", `${path} must be a JSON object`);
	}
}

export function stableStringify(value: JsonValue): string {
	return JSON.stringify(stableJsonClone(value));
}

export function metadataClone(
	value: Readonly<Record<string, unknown>> | undefined,
	path: string,
): Record<string, unknown> {
	const record = value ?? {};
	assertJsonObject(record, path);
	return stableJsonClone(record) as Record<string, unknown>;
}
