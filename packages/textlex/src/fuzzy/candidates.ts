import { boundedEditDistance } from "./edit-distance.js";

export interface FuzzyCandidate {
	readonly key: string;
	readonly distance: number;
	readonly score: number;
}

export interface FuzzyCandidateOptions {
	readonly maxDistance?: number;
	readonly maxCandidates?: number;
}

export function fuzzyCandidates(
	query: string,
	keys: Iterable<string>,
	options: FuzzyCandidateOptions = {},
): FuzzyCandidate[] {
	const maxDistance = options.maxDistance ?? 1;
	const maxCandidates = options.maxCandidates ?? 64;
	const candidates: FuzzyCandidate[] = [];
	for (const key of keys) {
		const distance = boundedEditDistance(query, key, maxDistance);
		if (distance === undefined) continue;
		candidates.push({
			key,
			distance,
			score: 1 / (1 + distance),
		});
	}
	return candidates
		.sort(
			(left, right) =>
				left.distance - right.distance || left.key.localeCompare(right.key),
		)
		.slice(0, maxCandidates);
}
