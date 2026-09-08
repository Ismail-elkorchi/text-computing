export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

export function isPlainRecord(
	value: unknown,
): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

function assertFiniteJsonNumber(value: number, path: string): void {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${path} must be a finite JSON number.`);
	}
}

export function assertJsonValue(
	value: unknown,
	path = "value",
): asserts value is JsonValue {
	if (value === null) return;
	if (typeof value === "string" || typeof value === "boolean") return;
	if (typeof value === "number") {
		assertFiniteJsonNumber(value, path);
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`);
		}
		return;
	}
	if (isPlainRecord(value)) {
		for (const [key, entry] of Object.entries(value)) {
			if (entry === undefined) {
				throw new TypeError(`${path}.${key} must not be undefined.`);
			}
			assertJsonValue(entry, `${path}.${key}`);
		}
		return;
	}
	throw new TypeError(`${path} must be an I-JSON value.`);
}

export function assertJsonRecord(
	value: unknown,
	path: string,
): asserts value is Readonly<Record<string, JsonValue>> {
	if (!isPlainRecord(value)) {
		throw new TypeError(`${path} must be a plain I-JSON object.`);
	}
	assertJsonValue(value, path);
}
