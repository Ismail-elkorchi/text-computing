import { deepFreeze } from "../internal/freeze.js";

export interface MinimalPerfectHashMap {
	readonly keys: readonly string[];
	readonly size: number;
	readonly assignments: Readonly<Record<string, number>>;
}

export function buildMinimalPerfectHashMap(
	keys: Iterable<string>,
): MinimalPerfectHashMap {
	const sortedKeys = Object.freeze(
		[...new Set(keys)].sort((left, right) => left.localeCompare(right)),
	);
	const assignments: Record<string, number> = {};
	for (let index = 0; index < sortedKeys.length; index += 1) {
		const key = sortedKeys[index];
		if (key !== undefined) assignments[key] = index;
	}
	return deepFreeze({
		keys: sortedKeys,
		size: sortedKeys.length,
		assignments,
	});
}

export function getMinimalPerfectHash(
	map: MinimalPerfectHashMap,
	key: string,
): number | undefined {
	return map.assignments[key];
}
