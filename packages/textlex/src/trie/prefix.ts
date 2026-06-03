export interface PrefixIndex {
	readonly keys: readonly string[];
}

export function buildPrefixIndex(keys: Iterable<string>): PrefixIndex {
	return Object.freeze({
		keys: Object.freeze(
			[...new Set(keys)].sort((left, right) => left.localeCompare(right)),
		),
	});
}

export function lookupPrefixIndex(
	index: PrefixIndex,
	prefix: string,
): readonly string[] {
	return Object.freeze(index.keys.filter((key) => key.startsWith(prefix)));
}
