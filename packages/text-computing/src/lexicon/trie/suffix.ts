export interface SuffixIndex {
	readonly keys: readonly string[];
}

export function buildSuffixIndex(keys: Iterable<string>): SuffixIndex {
	return Object.freeze({
		keys: Object.freeze(
			[...new Set(keys)].sort((left, right) => left.localeCompare(right)),
		),
	});
}

export function lookupSuffixIndex(
	index: SuffixIndex,
	suffix: string,
): readonly string[] {
	return Object.freeze(index.keys.filter((key) => key.endsWith(suffix)));
}
