import type { SpanRef } from "@ismail-elkorchi/textdoc";
import type { NormalizationCandidate } from "../normalize/types.js";
import { stableHashValue } from "./stable.js";

export function idPart(value: string): string {
	return (
		value
			.normalize("NFKD")
			.replace(/[^\dA-Za-z._:-]+/gu, "-")
			.replace(/^-+|-+$/gu, "")
			.slice(0, 64) || "x"
	);
}

export function spanKey(ref: SpanRef): string {
	return `${ref.viewId}:${ref.span.unit}:${ref.span.start}:${ref.span.end}`;
}

export function candidateId(
	candidate: NormalizationCandidate,
	rank = 0,
): string {
	return `textnorm:${idPart(candidate.kind)}:${idPart(candidate.source.viewId)}:${candidate.source.span.start}-${candidate.source.span.end}:${stableHashValue(
		{
			candidate: candidate.candidate,
			evidence: candidate.evidence,
			rank,
		},
	).slice(0, 16)}`;
}

export function spanMapId(
	sourceViewId: string,
	targetViewId: string,
	seed: unknown,
): string {
	return `${idPart(targetViewId)}:span-map:${stableHashValue({
		sourceViewId,
		targetViewId,
		seed,
	}).slice(0, 12)}`;
}
