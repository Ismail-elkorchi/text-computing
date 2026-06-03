import type { Annotation } from "../annotation/mod.ts";
import { isAnnotation } from "../annotation/mod.ts";
import type { TextDocument } from "../document/mod.ts";
import { fail } from "../internal/error.ts";
import { isNonEmptyString, isRecord } from "../internal/guards.ts";
import { insertRecordValue, orderedRecord } from "../internal/records.ts";

export interface AnnotationLayer<T = unknown> {
	readonly id: string;
	readonly type: string;
	readonly viewId?: string;
	readonly annotations: Readonly<Record<string, Annotation<T>>>;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export function isAnnotationLayer(value: unknown): value is AnnotationLayer {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.type) &&
		(value.viewId === undefined || isNonEmptyString(value.viewId)) &&
		isRecord(value.annotations) &&
		Object.entries(value.annotations).every(
			([id, annotation]) =>
				id === (annotation as Annotation).id && isAnnotation(annotation),
		) &&
		(value.metadata === undefined || isRecord(value.metadata))
	);
}

function normalizeLayer<T>(layer: AnnotationLayer<T>): AnnotationLayer<T> {
	if (!isAnnotationLayer(layer)) {
		fail(
			"TEXTDOC_INVALID_LAYER",
			"layer must satisfy the final AnnotationLayer contract",
		);
	}
	if (
		Object.values(layer.annotations).some(
			(annotation) => annotation.layer !== layer.id,
		)
	) {
		fail(
			"TEXTDOC_LAYER_ANNOTATION_MISMATCH",
			`layer contains an annotation for another layer: ${layer.id}`,
		);
	}
	return { ...layer, annotations: orderedRecord(layer.annotations) };
}

export function addLayer<T>(
	doc: TextDocument,
	layer: AnnotationLayer<T>,
): TextDocument {
	const normalized = normalizeLayer(layer);
	if (
		normalized.viewId !== undefined &&
		doc.views[normalized.viewId] === undefined
	) {
		fail(
			"TEXTDOC_LAYER_VIEW_MISSING",
			`layer view is missing: ${normalized.viewId}`,
		);
	}
	for (const annotation of Object.values(normalized.annotations)) {
		if (
			Object.values(doc.layers).some((existingLayer) =>
				Object.hasOwn(existingLayer.annotations, annotation.id),
			)
		) {
			fail(
				"TEXTDOC_DUPLICATE_ID",
				`annotation already exists: ${annotation.id}`,
			);
		}
	}
	return {
		...doc,
		layers: insertRecordValue(
			doc.layers,
			normalized.id,
			normalized as AnnotationLayer,
			"layer",
		),
	};
}
