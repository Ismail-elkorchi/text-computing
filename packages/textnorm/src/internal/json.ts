export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return isPlainRecord(value);
}

export function assertJsonValue(
	value: unknown,
	path = "$",
): asserts value is JsonValue {
	if (value === null) return;
	const valueType = typeof value;
	if (valueType === "string" || valueType === "boolean") return;
	if (valueType === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${path} must be I-JSON safe: number is not finite.`);
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((entry, index) => {
			assertJsonValue(entry, `${path}[${index}]`);
		});
		return;
	}
	if (isPlainRecord(value)) {
		for (const [key, entry] of Object.entries(value).sort(([a], [b]) =>
			a.localeCompare(b),
		)) {
			assertJsonValue(entry, `${path}.${key}`);
		}
		return;
	}
	throw new TypeError(`${path} must be I-JSON safe.`);
}

export function stableJsonClone<T extends JsonValue>(value: T): T {
	assertJsonValue(value);
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonClone(entry)) as unknown as T;
	}
	if (isPlainRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, stableJsonClone(entry as JsonValue)]),
		) as T;
	}
	return value;
}

export function stableStringify(value: unknown): string {
	assertJsonValue(value);
	return JSON.stringify(stableJsonClone(value as JsonValue));
}
