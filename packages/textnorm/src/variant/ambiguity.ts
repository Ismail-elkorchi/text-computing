import { spanKey } from "../internal/ids.js";
import type { NormalizationCandidate } from "../normalize/types.js";
import { sortCandidates } from "../spell/rank.js";

export interface AmbiguityGroup {
	readonly sourceKey: string;
	readonly candidates: readonly NormalizationCandidate[];
}

export function ambiguityGroups(
	candidates: readonly NormalizationCandidate[],
): readonly AmbiguityGroup[] {
	const groups = new Map<string, NormalizationCandidate[]>();
	for (const candidate of sortCandidates(candidates)) {
		const key = spanKey(candidate.source);
		groups.set(key, [...(groups.get(key) ?? []), candidate]);
	}
	return Object.freeze(
		[...groups.entries()]
			.filter(([, values]) => values.length > 1)
			.map(([sourceKey, values]) =>
				Object.freeze({ sourceKey, candidates: sortCandidates(values) }),
			),
	);
}
