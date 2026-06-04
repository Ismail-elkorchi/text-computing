import {
	type Annotation,
	type AnnotationLayer,
	addLayer,
	type TextDocument,
} from "@ismail-elkorchi/textdoc";
import { candidateId } from "../internal/ids.js";
import type {
	AnnotatedNormalizationResult,
	AnnotateNormalizationOptions,
	NormalizationCandidate,
	NormalizationViewResult,
	TextNormAnnotationValue,
} from "../normalize/types.js";

function resourcesFor(
	candidate: NormalizationCandidate,
): readonly string[] | undefined {
	return candidate.evidence.resourceIds?.length
		? candidate.evidence.resourceIds
		: undefined;
}

export function annotationValueForCandidate(
	candidate: NormalizationCandidate,
	chosen: boolean,
): TextNormAnnotationValue {
	const resources = resourcesFor(candidate);
	return Object.freeze({
		candidate: candidate.candidate,
		kind: candidate.kind,
		mode: candidate.kind,
		chosen,
		...(resources !== undefined ? { resources } : {}),
		...(candidate.score !== undefined ? { score: candidate.score } : {}),
		editSummary: Object.freeze({
			sourceViewId: candidate.source.viewId,
			start: candidate.source.span.start,
			end: candidate.source.span.end,
			unit: candidate.source.span.unit,
		}),
	});
}

export function annotateNormalization(
	doc: TextDocument,
	result: NormalizationViewResult,
	options: AnnotateNormalizationOptions = {},
): AnnotatedNormalizationResult {
	const layerId =
		options.layerId ?? `${result.view.id}:normalization-decisions`;
	const annotations: Annotation<TextNormAnnotationValue>[] =
		result.candidates.map((candidate, index) =>
			Object.freeze({
				id: candidateId(candidate, index),
				layer: layerId,
				type: options.annotationType ?? "view.normalization-decision",
				spans: Object.freeze([candidate.source]),
				value: annotationValueForCandidate(candidate, true),
				evidence: candidate.evidence,
				...(result.candidates.length > 1
					? {
							alternatives: Object.freeze(
								result.candidates
									.filter(
										(other) =>
											other !== candidate &&
											other.source.viewId === candidate.source.viewId &&
											other.source.span.start === candidate.source.span.start &&
											other.source.span.end === candidate.source.span.end,
									)
									.map((other) =>
										Object.freeze({
											value: annotationValueForCandidate(other, false),
											evidence: other.evidence,
											...(other.score !== undefined
												? { score: other.score }
												: {}),
										}),
									),
							),
						}
					: {}),
			}),
		);
	const layer: AnnotationLayer<TextNormAnnotationValue> = Object.freeze({
		id: layerId,
		type: options.layerType ?? "view.normalization",
		viewId: result.view.id,
		annotations: Object.freeze(
			Object.fromEntries(
				annotations.map((annotation) => [annotation.id, annotation]),
			),
		),
	});
	return Object.freeze({
		...result,
		document: addLayer(doc, layer),
		layer,
		annotations: Object.freeze(annotations),
	});
}
