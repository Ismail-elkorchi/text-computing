import type { NormalizationCandidate } from "../normalize/types.js";

const kindRank: Readonly<Record<NormalizationCandidate["kind"], number>> =
	Object.freeze({
		spelling: 0,
		historical: 1,
		ocr: 2,
		dialect: 3,
		transliteration: 4,
		punctuation: 5,
		spacing: 6,
		casing: 7,
	});

function scoreRank(candidate: NormalizationCandidate): number {
	const score = candidate.score;
	if (score === undefined) return 0;
	if (
		score.kind === "probability" ||
		score.kind === "weight" ||
		score.kind === "association"
	) {
		return -score.value;
	}
	return score.value;
}

export function compareNormalizationCandidates(
	left: NormalizationCandidate,
	right: NormalizationCandidate,
): number {
	return (
		left.source.viewId.localeCompare(right.source.viewId) ||
		left.source.span.start - right.source.span.start ||
		left.source.span.end - right.source.span.end ||
		kindRank[left.kind] - kindRank[right.kind] ||
		scoreRank(left) - scoreRank(right) ||
		left.candidate.localeCompare(right.candidate) ||
		JSON.stringify(left.evidence.resourceIds ?? []).localeCompare(
			JSON.stringify(right.evidence.resourceIds ?? []),
		) ||
		JSON.stringify(left.evidence.ruleIds ?? []).localeCompare(
			JSON.stringify(right.evidence.ruleIds ?? []),
		) ||
		JSON.stringify(left.evidence.fstIds ?? []).localeCompare(
			JSON.stringify(right.evidence.fstIds ?? []),
		)
	);
}

export function sortCandidates(
	candidates: readonly NormalizationCandidate[],
): readonly NormalizationCandidate[] {
	const seen = new Set<string>();
	const unique: NormalizationCandidate[] = [];
	for (const candidate of [...candidates].sort(
		compareNormalizationCandidates,
	)) {
		const key = `${candidate.source.viewId}\u0000${candidate.source.span.start}\u0000${candidate.source.span.end}\u0000${candidate.kind}\u0000${candidate.candidate}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(candidate);
	}
	return Object.freeze(unique.map((candidate) => Object.freeze(candidate)));
}
