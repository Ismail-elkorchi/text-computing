import { deepFreeze } from "../internal/freeze.js";

export interface DoubleArrayTrie {
	readonly keys: readonly string[];
	readonly base: readonly number[];
	readonly check: readonly number[];
}

export function buildDoubleArrayTrie(keys: Iterable<string>): DoubleArrayTrie {
	const sortedKeys = Object.freeze(
		[...new Set(keys)].sort((left, right) => left.localeCompare(right)),
	);
	const base = [0];
	const check = [-1];
	const nodeIds = new Map<string, number>([["", 0]]);
	for (const key of sortedKeys) {
		let prefix = "";
		for (const char of Array.from(key)) {
			const next = `${prefix}${char}`;
			if (!nodeIds.has(next)) {
				const id = nodeIds.size;
				nodeIds.set(next, id);
				base[id] = char.codePointAt(0) ?? 0;
				check[id] = nodeIds.get(prefix) ?? 0;
			}
			prefix = next;
		}
	}
	return deepFreeze({
		keys: sortedKeys,
		base: Object.freeze(base),
		check: Object.freeze(check),
	});
}

export function hasDoubleArrayTrieKey(
	trie: DoubleArrayTrie,
	key: string,
): boolean {
	return trie.keys.includes(key);
}
