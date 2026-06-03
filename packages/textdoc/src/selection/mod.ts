import type { Annotation, AnnotationAlternative } from "../annotation/mod.ts";
import { fail } from "../internal/error.ts";

export interface SelectionPolicy {
	readonly scoreKind?:
		| "cost"
		| "probability"
		| "logprob"
		| "margin"
		| "rank"
		| "weight"
		| "association";
	readonly order?: "ascending" | "descending";
	readonly tieBreak?: "input-order" | "stable-json";
}

function alternativeKey<T>(alternative: AnnotationAlternative<T>): string {
	return JSON.stringify({
		value: alternative.value ?? null,
		features: alternative.features ?? null,
		evidence: alternative.evidence,
		score: alternative.score ?? null,
	});
}

export function rankAnnotationAlternatives<T>(
	annotation: Annotation<T>,
	policy: SelectionPolicy = {},
): readonly AnnotationAlternative<T>[] {
	const alternatives = annotation.alternatives ?? [];
	const order =
		policy.order ??
		(policy.scoreKind === "cost" || policy.scoreKind === "rank"
			? "ascending"
			: "descending");
	const scoreKind = policy.scoreKind;
	const tieBreak = policy.tieBreak ?? "stable-json";
	return [...alternatives].sort((left, right) => {
		const leftScore =
			scoreKind === undefined || left.score?.kind === scoreKind
				? left.score?.value
				: undefined;
		const rightScore =
			scoreKind === undefined || right.score?.kind === scoreKind
				? right.score?.value
				: undefined;
		if (
			leftScore !== undefined &&
			rightScore !== undefined &&
			leftScore !== rightScore
		) {
			return order === "ascending"
				? leftScore - rightScore
				: rightScore - leftScore;
		}
		if (leftScore !== undefined) return -1;
		if (rightScore !== undefined) return 1;
		if (tieBreak === "input-order") return 0;
		return alternativeKey(left).localeCompare(alternativeKey(right));
	});
}

export function selectAlternative<T>(
	annotation: Annotation<T>,
	policy: SelectionPolicy = {},
): Annotation<T> {
	const selected = rankAnnotationAlternatives(annotation, policy)[0];
	if (selected === undefined) return annotation;
	const remaining = (annotation.alternatives ?? []).filter(
		(alternative) => alternative !== selected,
	);
	return {
		...annotation,
		...(selected.value !== undefined ? { value: selected.value } : {}),
		...(selected.features !== undefined ? { features: selected.features } : {}),
		evidence: selected.evidence,
		alternatives: remaining,
	};
}

export function requireSelectedAlternative<T>(
	annotation: Annotation<T>,
	policy: SelectionPolicy = {},
): Annotation<T> {
	if ((annotation.alternatives ?? []).length === 0) {
		fail(
			"TEXTDOC_NO_ALTERNATIVES",
			`annotation has no alternatives: ${annotation.id}`,
		);
	}
	return selectAlternative(annotation, policy);
}
