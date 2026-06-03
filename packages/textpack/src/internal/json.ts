export function isPlainRecord(
	value: unknown,
): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export function assertJsonValue(value: unknown, path: string): void {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${path} must be a finite JSON number.`);
		}
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`);
		}
		return;
	}
	if (isPlainRecord(value)) {
		for (const [key, item] of Object.entries(value)) {
			assertJsonValue(key, `${path}.key`);
			assertJsonValue(item, `${path}.${key}`);
		}
		return;
	}
	throw new TypeError(`${path} must be an I-JSON value.`);
}

export function stableJson(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableJson(item)).join(",")}]`;
	}
	if (!isPlainRecord(value)) {
		throw new TypeError("Stable JSON can only serialize plain JSON objects.");
	}
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
		.join(",")}}`;
}

export function jsonEquals(left: unknown, right: unknown): boolean {
	assertJsonValue(left, "left");
	assertJsonValue(right, "right");
	return stableJson(left) === stableJson(right);
}
