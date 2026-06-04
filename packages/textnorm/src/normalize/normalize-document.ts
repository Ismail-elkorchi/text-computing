import type { TextDocument, TextViewKind } from "@ismail-elkorchi/textdoc";
import { normalize as unicodeNormalize } from "@ismail-elkorchi/textfacts/normalize";
import { assertSpanWithinView } from "../internal/spans.js";
import { sortCandidates } from "../spell/rank.js";
import { createNormalizedView } from "../view/create-view.js";
import { computeEditScript } from "../view/edit-script.js";
import { candidateNormalizations } from "./candidates.js";
import { resolveTextNormOptions } from "./options.js";
import type {
	EditOperation,
	NormalizationCandidate,
	NormalizationViewResult,
	TextNormOptions,
} from "./types.js";

function overlaps(
	left: NormalizationCandidate,
	right: NormalizationCandidate,
): boolean {
	return (
		left.source.viewId === right.source.viewId &&
		left.source.span.start < right.source.span.end &&
		right.source.span.start < left.source.span.end
	);
}

function chosenCandidates(
	candidates: readonly NormalizationCandidate[],
	policy: NonNullable<TextNormOptions["overlapPolicy"]>,
): readonly NormalizationCandidate[] {
	if (policy === "diagnostic-only") return Object.freeze([]);
	if (policy === "all") return sortCandidates(candidates);
	const ordered =
		policy === "longest"
			? [...candidates].sort(
					(left, right) =>
						right.source.span.end -
						right.source.span.start -
						(left.source.span.end - left.source.span.start),
				)
			: policy === "shortest"
				? [...candidates].sort(
						(left, right) =>
							left.source.span.end -
							left.source.span.start -
							(right.source.span.end - right.source.span.start),
					)
				: [...sortCandidates(candidates)];
	const chosen: NormalizationCandidate[] = [];
	for (const candidate of ordered) {
		if (chosen.some((entry) => overlaps(entry, candidate))) continue;
		chosen.push(candidate);
	}
	return sortCandidates(chosen);
}

function editsFromCandidates(
	source: string,
	candidates: readonly NormalizationCandidate[],
): EditOperation[] {
	const operations: EditOperation[] = [];
	let sourceCursor = 0;
	let targetCursor = 0;
	for (const candidate of candidates) {
		const start = candidate.source.span.start;
		const end = candidate.source.span.end;
		if (start > sourceCursor) {
			const text = source.slice(sourceCursor, start);
			operations.push({
				kind: "equal",
				sourceStart: sourceCursor,
				sourceEnd: start,
				targetStart: targetCursor,
				targetEnd: targetCursor + text.length,
				sourceText: text,
				targetText: text,
				relation: "identity",
			});
			targetCursor += text.length;
		}
		const sourceText = source.slice(start, end);
		operations.push({
			kind:
				sourceText.length === 0
					? "insert"
					: candidate.candidate.length === 0
						? "delete"
						: "replace",
			sourceStart: start,
			sourceEnd: end,
			targetStart: targetCursor,
			targetEnd: targetCursor + candidate.candidate.length,
			sourceText,
			targetText: candidate.candidate,
			...(candidate.score?.kind === "cost"
				? { cost: candidate.score.value }
				: {}),
		});
		sourceCursor = end;
		targetCursor += candidate.candidate.length;
	}
	if (sourceCursor < source.length) {
		const text = source.slice(sourceCursor);
		operations.push({
			kind: "equal",
			sourceStart: sourceCursor,
			sourceEnd: source.length,
			targetStart: targetCursor,
			targetEnd: targetCursor + text.length,
			sourceText: text,
			targetText: text,
			relation: "identity",
		});
	}
	return operations;
}

function resultFromOperations(
	doc: TextDocument,
	sourceViewId: string,
	targetViewId: string,
	targetViewKind: TextViewKind,
	spanMapId: string | undefined,
	operations: readonly EditOperation[],
	candidates: readonly NormalizationCandidate[],
	optionsHash: string,
): NormalizationViewResult {
	const sourceView = doc.views[sourceViewId];
	if (sourceView === undefined)
		throw new TypeError(`missing source view: ${sourceViewId}`);
	const target = operations.map((operation) => operation.targetText).join("");
	const result = createNormalizedView(
		doc,
		Object.freeze({
			source: sourceView.text,
			target,
			sourceUnit: "utf16-code-unit",
			targetUnit: "utf16-code-unit",
			operations: Object.freeze(
				operations.map((operation) => Object.freeze(operation)),
			),
		}),
		{
			sourceViewId,
			targetViewId,
			targetViewKind,
			...(spanMapId !== undefined ? { spanMapId } : {}),
			optionsHash,
		},
	);
	return Object.freeze({ ...result, candidates: Object.freeze(candidates) });
}

export function normalizeDocument(
	doc: TextDocument,
	options: TextNormOptions,
): NormalizationViewResult {
	const resolved = resolveTextNormOptions(doc, options);
	const candidates = candidateNormalizations(doc, resolved);
	for (const candidate of candidates) {
		assertSpanWithinView(
			resolved.sourceView,
			candidate.source.span,
			"normalization candidate",
		);
	}
	const chosen = chosenCandidates(candidates, resolved.overlapPolicy);
	if (resolved.unicodeForm !== undefined && chosen.length === 0) {
		const target = unicodeNormalize(
			resolved.sourceView.text,
			resolved.unicodeForm,
		);
		const result = createNormalizedView(
			doc,
			computeEditScript(resolved.sourceView.text, target),
			{
				sourceViewId: resolved.sourceView.id,
				targetViewId: resolved.targetViewId,
				targetViewKind: resolved.targetViewKind,
				...(resolved.spanMapId !== undefined
					? { spanMapId: resolved.spanMapId }
					: {}),
				algorithm: `unicode-${resolved.unicodeForm}`,
				optionsHash: resolved.optionsHash,
			},
		);
		return Object.freeze({ ...result, candidates });
	}
	return resultFromOperations(
		doc,
		resolved.sourceView.id,
		resolved.targetViewId,
		resolved.targetViewKind,
		resolved.spanMapId,
		editsFromCandidates(resolved.sourceView.text, chosen),
		resolved.retainRejectedCandidates ? candidates : chosen,
		resolved.optionsHash,
	);
}
