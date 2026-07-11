import { frequency } from "../frequency/mod.js";
import { compareNumbers, compareStrings } from "../internal/compare.js";
import { logLikelihood } from "../internal/math.js";
import type { TextCorpus } from "../store/types.js";

export type KeynessMeasure = "log-likelihood" | "difference" | "ratio";

export interface KeynessOptions {
	measure?: KeynessMeasure;
	minCount?: number;
	limit?: number;
}

export interface KeynessItem {
	item: string;
	focusCount: number;
	referenceCount: number;
	focusRelativeFrequency: number;
	referenceRelativeFrequency: number;
	measure: KeynessMeasure;
	score: number;
}

function sortKeyness(left: KeynessItem, right: KeynessItem): number {
	const score = compareNumbers(right.score, left.score);
	if (score !== 0) return score;
	return compareStrings(left.item, right.item);
}

export function keyness(
	focus: TextCorpus,
	reference: TextCorpus,
	options: KeynessOptions = {},
): KeynessItem[] {
	const allFocusFreq = frequency(focus, { minCount: 1 });
	const focusFreq = allFocusFreq.filter(
		(item) => item.count >= (options.minCount ?? 1),
	);
	const referenceFreq = frequency(reference, { minCount: 1 });
	const referenceMap = new Map(referenceFreq.map((item) => [item.item, item]));
	const focusTotal = allFocusFreq.reduce((sum, item) => sum + item.count, 0);
	const referenceTotal = referenceFreq.reduce(
		(sum, item) => sum + item.count,
		0,
	);
	const measure = options.measure ?? "log-likelihood";
	return focusFreq
		.map((item) => {
			const referenceItem = referenceMap.get(item.item);
			const referenceCount = referenceItem?.count ?? 0;
			const focusRelativeFrequency =
				focusTotal === 0 ? 0 : item.count / focusTotal;
			const referenceRelativeFrequency =
				referenceTotal === 0 ? 0 : referenceCount / referenceTotal;
			const score =
				measure === "difference"
					? focusRelativeFrequency - referenceRelativeFrequency
					: measure === "ratio"
						? (item.count + 0.5) /
							(focusTotal + 1) /
							((referenceCount + 0.5) / (referenceTotal + 1))
						: logLikelihood(
								item.count,
								focusTotal,
								referenceCount,
								referenceTotal,
							);
			return {
				item: item.item,
				focusCount: item.count,
				referenceCount,
				focusRelativeFrequency,
				referenceRelativeFrequency,
				measure,
				score: Number.isFinite(score) ? score : 0,
			};
		})
		.sort(sortKeyness)
		.slice(0, options.limit);
}
