export function deepFreeze<T>(value: T): Readonly<T> {
	if (value === null || typeof value !== "object") return value as Readonly<T>;
	if (Object.isFrozen(value)) return value as Readonly<T>;
	if (Array.isArray(value)) {
		for (const entry of value) deepFreeze(entry);
		return Object.freeze(value) as Readonly<T>;
	}
	for (const entry of Object.values(value as Record<string, unknown>)) {
		deepFreeze(entry);
	}
	return Object.freeze(value) as Readonly<T>;
}
