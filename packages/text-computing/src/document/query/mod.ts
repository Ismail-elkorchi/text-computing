import type { Annotation, Evidence } from "../annotation/mod.ts";
import type { TextDocument } from "../document/mod.ts";
import { compareAnnotations } from "../internal/compare.ts";
import { fail } from "../internal/error.ts";
import { isRecord } from "../internal/guards.ts";
import type { Span, SpanRef } from "../span/mod.ts";
import { isSpan } from "../span/mod.ts";

export type SpanQueryRelation = "overlaps" | "contains" | "within" | "exact";

export interface AnnotationSpanQuery {
	readonly viewId?: string;
	readonly span: Span;
	readonly relation?: SpanQueryRelation;
}

export interface AnnotationEvidenceQuery {
	readonly mode?: Evidence["mode"];
	readonly exactness?: Evidence["exactness"];
	readonly producer?: string;
	readonly packageName?: string;
	readonly resourceId?: string;
	readonly ruleId?: string;
	readonly corpusId?: string;
	readonly kbId?: string;
	readonly inputViewId?: string;
}

export interface AnnotationGraphQuery {
	readonly graphId?: string;
	readonly relation?: string;
	readonly nodeId?: string;
	readonly edgeId?: string;
	readonly connectedToAnnotationId?: string;
	readonly direction?: "source" | "target" | "any";
}

export interface AnnotationQuery {
	readonly layer?: string | readonly string[];
	readonly type?: string | readonly string[];
	readonly span?: AnnotationSpanQuery;
	readonly features?: Readonly<Record<string, unknown>>;
	readonly evidence?: AnnotationEvidenceQuery;
	readonly graph?: AnnotationGraphQuery;
	readonly order?: "document" | "id";
}

function toSet(
	value: string | readonly string[] | undefined,
): ReadonlySet<string> | undefined {
	if (value === undefined) return undefined;
	return new Set(typeof value === "string" ? [value] : value);
}

function spanRelationMatches(
	ref: SpanRef,
	query: AnnotationSpanQuery,
): boolean {
	if (query.viewId !== undefined && ref.viewId !== query.viewId) return false;
	if (ref.span.unit !== query.span.unit) return false;
	const relation = query.relation ?? "overlaps";
	if (relation === "exact") {
		return (
			ref.span.start === query.span.start && ref.span.end === query.span.end
		);
	}
	if (relation === "contains") {
		return ref.span.start <= query.span.start && ref.span.end >= query.span.end;
	}
	if (relation === "within") {
		return ref.span.start >= query.span.start && ref.span.end <= query.span.end;
	}
	return ref.span.start < query.span.end && query.span.start < ref.span.end;
}

function featureMatches(
	annotation: Annotation,
	features: Readonly<Record<string, unknown>> | undefined,
): boolean {
	if (features === undefined) return true;
	if (annotation.features === undefined) return false;
	return Object.entries(features).every(([key, expected]) =>
		Object.is(annotation.features?.[key], expected),
	);
}

function evidenceMatches(
	evidence: Evidence,
	query: AnnotationEvidenceQuery | undefined,
): boolean {
	if (query === undefined) return true;
	return (
		(query.mode === undefined || evidence.mode === query.mode) &&
		(query.exactness === undefined || evidence.exactness === query.exactness) &&
		(query.producer === undefined || evidence.producer === query.producer) &&
		(query.packageName === undefined ||
			evidence.packageName === query.packageName) &&
		(query.resourceId === undefined ||
			evidence.resourceIds?.includes(query.resourceId) === true) &&
		(query.ruleId === undefined ||
			evidence.ruleIds?.includes(query.ruleId) === true) &&
		(query.corpusId === undefined ||
			evidence.corpusIds?.includes(query.corpusId) === true) &&
		(query.kbId === undefined ||
			evidence.kbIds?.includes(query.kbId) === true) &&
		(query.inputViewId === undefined ||
			evidence.inputViewIds.includes(query.inputViewId))
	);
}

function graphMatches(
	doc: TextDocument,
	annotation: Annotation,
	query: AnnotationGraphQuery | undefined,
): boolean {
	if (query === undefined) return true;
	for (const graph of Object.values(doc.graphs)) {
		if (query.graphId !== undefined && graph.id !== query.graphId) continue;
		if (query.edgeId !== undefined) {
			const edge = graph.edges[query.edgeId];
			if (edge === undefined) continue;
			if (edge.annotationId === annotation.id) return true;
			const sourceNode = graph.nodes[edge.source];
			const targetNode = graph.nodes[edge.target];
			if (
				query.direction !== "target" &&
				sourceNode?.annotationId === annotation.id
			)
				return true;
			if (
				query.direction !== "source" &&
				targetNode?.annotationId === annotation.id
			)
				return true;
			continue;
		}
		if (query.nodeId !== undefined) {
			const node = graph.nodes[query.nodeId];
			if (node?.annotationId === annotation.id) return true;
			continue;
		}
		for (const edge of Object.values(graph.edges)) {
			if (query.relation !== undefined && edge.relation !== query.relation)
				continue;
			const sourceNode = graph.nodes[edge.source];
			const targetNode = graph.nodes[edge.target];
			const connectedMatches =
				query.connectedToAnnotationId === undefined ||
				sourceNode?.annotationId === query.connectedToAnnotationId ||
				targetNode?.annotationId === query.connectedToAnnotationId ||
				edge.annotationId === query.connectedToAnnotationId;
			if (!connectedMatches) continue;
			if (edge.annotationId === annotation.id) return true;
			if (
				query.direction !== "target" &&
				sourceNode?.annotationId === annotation.id
			)
				return true;
			if (
				query.direction !== "source" &&
				targetNode?.annotationId === annotation.id
			)
				return true;
		}
	}
	return false;
}

export function selectAnnotations(
	doc: TextDocument,
	query: AnnotationQuery = {},
): Annotation[] {
	if (query.span !== undefined && !isSpan(query.span.span)) {
		fail(
			"TEXTDOC_INVALID_QUERY",
			"annotation query span must satisfy the final Span contract",
		);
	}
	if (query.features !== undefined && !isRecord(query.features)) {
		fail("TEXTDOC_INVALID_QUERY", "annotation query features must be a record");
	}
	const layerFilter = toSet(query.layer);
	const typeFilter = toSet(query.type);
	const results: Annotation[] = [];
	for (const layer of Object.values(doc.layers)) {
		if (layerFilter !== undefined && !layerFilter.has(layer.id)) continue;
		for (const annotation of Object.values(layer.annotations)) {
			if (typeFilter !== undefined && !typeFilter.has(annotation.type))
				continue;
			if (
				query.span !== undefined &&
				!annotation.spans.some((ref) =>
					spanRelationMatches(ref, query.span as AnnotationSpanQuery),
				)
			) {
				continue;
			}
			if (!featureMatches(annotation, query.features)) continue;
			if (!evidenceMatches(annotation.evidence, query.evidence)) continue;
			if (!graphMatches(doc, annotation, query.graph)) continue;
			results.push(annotation);
		}
	}
	const order = query.order ?? "document";
	return results.sort(
		order === "id"
			? (left, right) => left.id.localeCompare(right.id)
			: compareAnnotations,
	);
}
