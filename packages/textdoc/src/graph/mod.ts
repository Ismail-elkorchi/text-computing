import type { TextDocument } from "../document/mod.ts";
import { fail } from "../internal/error.ts";
import { isNonEmptyString, isRecord } from "../internal/guards.ts";
import { insertRecordValue, orderedRecord } from "../internal/records.ts";

export type AnnotationGraphKind =
	| "dependency"
	| "parse"
	| "coreference"
	| "link"
	| "term"
	| "quality"
	| "alignment"
	| "custom";

export interface AnnotationGraphNode {
	readonly id: string;
	readonly annotationId: string;
	readonly layerId?: string;
	readonly label?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AnnotationGraphEdge {
	readonly id: string;
	readonly source: string;
	readonly target: string;
	readonly relation: string;
	readonly annotationId?: string;
	readonly layerId?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AnnotationGraph {
	readonly id: string;
	readonly kind: AnnotationGraphKind | string;
	readonly nodes: Readonly<Record<string, AnnotationGraphNode>>;
	readonly edges: Readonly<Record<string, AnnotationGraphEdge>>;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export function isAnnotationGraphNode(
	value: unknown,
): value is AnnotationGraphNode {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.annotationId) &&
		(value.layerId === undefined || isNonEmptyString(value.layerId)) &&
		(value.label === undefined || isNonEmptyString(value.label)) &&
		(value.metadata === undefined || isRecord(value.metadata))
	);
}

export function isAnnotationGraphEdge(
	value: unknown,
): value is AnnotationGraphEdge {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.source) &&
		isNonEmptyString(value.target) &&
		isNonEmptyString(value.relation) &&
		(value.annotationId === undefined ||
			isNonEmptyString(value.annotationId)) &&
		(value.layerId === undefined || isNonEmptyString(value.layerId)) &&
		(value.metadata === undefined || isRecord(value.metadata))
	);
}

export function isAnnotationGraph(value: unknown): value is AnnotationGraph {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.kind) &&
		isRecord(value.nodes) &&
		Object.entries(value.nodes).every(
			([id, node]) =>
				id === (node as AnnotationGraphNode).id && isAnnotationGraphNode(node),
		) &&
		isRecord(value.edges) &&
		Object.entries(value.edges).every(
			([id, edge]) =>
				id === (edge as AnnotationGraphEdge).id && isAnnotationGraphEdge(edge),
		) &&
		(value.metadata === undefined || isRecord(value.metadata))
	);
}

function annotationExists(doc: TextDocument, annotationId: string): boolean {
	return Object.values(doc.layers).some(
		(layer) => layer.annotations[annotationId] !== undefined,
	);
}

function normalizeGraph(
	doc: TextDocument,
	graph: AnnotationGraph,
): AnnotationGraph {
	if (!isAnnotationGraph(graph)) {
		fail(
			"TEXTDOC_INVALID_GRAPH",
			"graph must satisfy the final AnnotationGraph contract",
		);
	}
	for (const node of Object.values(graph.nodes)) {
		if (!annotationExists(doc, node.annotationId)) {
			fail(
				"TEXTDOC_GRAPH_ANNOTATION_MISSING",
				`graph node annotation is missing: ${node.annotationId}`,
			);
		}
		if (node.layerId !== undefined && doc.layers[node.layerId] === undefined) {
			fail(
				"TEXTDOC_GRAPH_LAYER_MISSING",
				`graph node layer is missing: ${node.layerId}`,
			);
		}
	}
	for (const edge of Object.values(graph.edges)) {
		if (
			graph.nodes[edge.source] === undefined ||
			graph.nodes[edge.target] === undefined
		) {
			fail(
				"TEXTDOC_GRAPH_EDGE_ENDPOINT_MISSING",
				`graph edge endpoint is missing: ${edge.id}`,
			);
		}
		if (
			edge.annotationId !== undefined &&
			!annotationExists(doc, edge.annotationId)
		) {
			fail(
				"TEXTDOC_GRAPH_ANNOTATION_MISSING",
				`graph edge annotation is missing: ${edge.annotationId}`,
			);
		}
		if (edge.layerId !== undefined && doc.layers[edge.layerId] === undefined) {
			fail(
				"TEXTDOC_GRAPH_LAYER_MISSING",
				`graph edge layer is missing: ${edge.layerId}`,
			);
		}
	}
	return {
		...graph,
		nodes: orderedRecord(graph.nodes),
		edges: orderedRecord(graph.edges),
	};
}

export function addGraph(
	doc: TextDocument,
	graph: AnnotationGraph,
): TextDocument {
	const normalized = normalizeGraph(doc, graph);
	return {
		...doc,
		graphs: insertRecordValue(doc.graphs, normalized.id, normalized, "graph"),
	};
}
