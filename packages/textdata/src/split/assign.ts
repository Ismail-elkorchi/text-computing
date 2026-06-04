import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { compareCodePointStrings } from "../internal/compare.js";

export interface WeightedItem<T> {
	readonly key: string;
	readonly value: T;
}

export function stableShuffle<T>(
	items: readonly WeightedItem<T>[],
	seed: string,
): readonly WeightedItem<T>[] {
	return [...items].sort((left, right) => {
		const leftHash = stableHash64(`${seed}\u0000${left.key}`);
		const rightHash = stableHash64(`${seed}\u0000${right.key}`);
		return (
			compareCodePointStrings(leftHash, rightHash) ||
			compareCodePointStrings(left.key, right.key)
		);
	});
}
