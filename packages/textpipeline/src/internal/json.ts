export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export function assertJsonValue(
	value: unknown,
	path = "value",
	seen: Set<object> = new Set(),
): asserts value is JsonValue {
	if (value === null) return;
	const type = typeof value;
	if (type === "string" || type === "boolean") return;
	if (type === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${path} must be a finite JSON number.`);
		}
		return;
	}
	if (Array.isArray(value)) {
		if (seen.has(value)) throw new TypeError(`${path} must not be cyclic.`);
		seen.add(value);
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`, seen);
		}
		seen.delete(value);
		return;
	}
	if (isPlainJsonObject(value)) {
		if (seen.has(value)) throw new TypeError(`${path} must not be cyclic.`);
		seen.add(value);
		for (const [key, item] of Object.entries(value)) {
			assertJsonValue(item, `${path}.${key}`, seen);
		}
		seen.delete(value);
		return;
	}
	throw new TypeError(`${path} must be an I-JSON value.`);
}

export function stableJsonClone(value: JsonValue): JsonValue {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) return Object.freeze(value.map(stableJsonClone));
	const output: Record<string, JsonValue> = {};
	const record = value as { readonly [key: string]: JsonValue };
	for (const key of Object.keys(value).sort()) {
		output[key] = stableJsonClone(record[key] as JsonValue);
	}
	return Object.freeze(output);
}

export function stableJsonStringify(value: JsonValue): string {
	assertJsonValue(value);
	return JSON.stringify(stableJsonClone(value));
}

export function assertOptionalJsonValue(
	value: unknown,
	path: string,
): asserts value is JsonValue | undefined {
	if (value !== undefined) assertJsonValue(value, path);
}
