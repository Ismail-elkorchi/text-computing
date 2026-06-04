import { orderedEntries, orderedRecord } from "./compare.js";
import { fail } from "./errors.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

export function assertJsonValue(
	value: unknown,
	path = "$",
	seen = new WeakSet<object>(),
): asserts value is JsonValue {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			fail("TEXTDATA_INVALID_JSON", `non-finite number at ${path}`);
		}
		return;
	}
	if (Array.isArray(value)) {
		if (seen.has(value)) fail("TEXTDATA_INVALID_JSON", `cycle at ${path}`);
		seen.add(value);
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`, seen);
		}
		seen.delete(value);
		return;
	}
	if (isPlainObject(value)) {
		if (seen.has(value)) fail("TEXTDATA_INVALID_JSON", `cycle at ${path}`);
		seen.add(value);
		for (const [key, entry] of Object.entries(value)) {
			if (entry === undefined) {
				fail("TEXTDATA_INVALID_JSON", `undefined at ${path}.${key}`);
			}
			assertJsonValue(entry, `${path}.${key}`, seen);
		}
		seen.delete(value);
		return;
	}
	fail("TEXTDATA_INVALID_JSON", `non-json value at ${path}`);
}

export function assertJsonObject(
	value: unknown,
	path = "$",
): asserts value is JsonObject {
	assertJsonValue(value, path);
	if (!isPlainObject(value)) {
		fail("TEXTDATA_INVALID_JSON", `json object required at ${path}`);
	}
}

export function stableJsonClone<T extends JsonValue>(value: T): T {
	assertJsonValue(value);
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonClone(entry)) as unknown as T;
	}
	if (typeof value === "object" && value !== null) {
		if (Array.isArray(value)) return value as T;
		return orderedRecord(
			Object.fromEntries(
				orderedEntries(value as Readonly<Record<string, JsonValue>>).map(
					([key, entry]) => [key, stableJsonClone(entry)],
				),
			),
		) as T;
	}
	return value;
}

export function stableJsonStringify(value: unknown): string {
	assertJsonValue(value);
	return JSON.stringify(stableJsonClone(value));
}

export function optionalJsonObject(
	value: Readonly<Record<string, unknown>> | undefined,
): JsonObject {
	if (value === undefined) return {};
	assertJsonObject(value);
	return stableJsonClone(value);
}
