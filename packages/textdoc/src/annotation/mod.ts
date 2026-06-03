import type { TextDocument } from "../document/mod.ts";
import { compareAnnotations } from "../internal/compare.ts";
import { fail } from "../internal/error.ts";
import {
	isFiniteNumber,
	isNonEmptyString,
	isRecord,
	isStringArray,
} from "../internal/guards.ts";
import {
	orderedRecord,
	removeRecordValue,
	replaceRecordValue,
} from "../internal/records.ts";
import type { AnnotationLayer } from "../layer/mod.ts";
import type { SpanRef } from "../span/mod.ts";
import { isSpanRef } from "../span/mod.ts";

export type EvidenceMode =
	| "algorithm"
	| "rule"
	| "lexicon"
	| "gazetteer"
	| "fst"
	| "grammar"
	| "statistical"
	| "corpus"
	| "search"
	| "kb"
	| "manual"
	| "composite";

export type Exactness = "E0" | "E1" | "E2" | "E3";

export interface Evidence {
	readonly mode: EvidenceMode;
	readonly exactness: Exactness;
	readonly producer: string;
	readonly packageName: string;
	readonly packageVersion: string;
	readonly resourceIds?: readonly string[];
	readonly ruleIds?: readonly string[];
	readonly fstIds?: readonly string[];
	readonly grammarIds?: readonly string[];
	readonly statisticalModelIds?: readonly string[];
	readonly corpusIds?: readonly string[];
	readonly kbIds?: readonly string[];
	readonly inputViewIds: readonly string[];
	readonly optionsHash?: string;
}

export interface Score {
	readonly kind:
		| "cost"
		| "probability"
		| "logprob"
		| "margin"
		| "rank"
		| "weight"
		| "association";
	readonly value: number;
	readonly scale?: string;
}

export interface AnnotationAlternative<T = unknown> {
	readonly value?: T;
	readonly features?: Readonly<Record<string, unknown>>;
	readonly evidence: Evidence;
	readonly score?: Score;
}

export interface Annotation<T = unknown> {
	readonly id: string;
	readonly layer: string;
	readonly type: string;
	readonly spans: readonly SpanRef[];
	readonly value?: T;
	readonly features?: Readonly<Record<string, unknown>>;
	readonly evidence: Evidence;
	readonly alternatives?: readonly AnnotationAlternative<T>[];
}

export interface RemoveAnnotationOptions {
	readonly danglingGraphReferences?: "reject" | "remove";
}

export interface MergeAnnotationOptions {
	readonly onDuplicateId?: "reject" | "replace";
}

const evidenceModes: readonly EvidenceMode[] = [
	"algorithm",
	"rule",
	"lexicon",
	"gazetteer",
	"fst",
	"grammar",
	"statistical",
	"corpus",
	"search",
	"kb",
	"manual",
	"composite",
];

const exactnessValues: readonly Exactness[] = ["E0", "E1", "E2", "E3"];

const scoreKinds: readonly Score["kind"][] = [
	"cost",
	"probability",
	"logprob",
	"margin",
	"rank",
	"weight",
	"association",
];

export function isEvidence(value: unknown): value is Evidence {
	return (
		isRecord(value) &&
		typeof value.mode === "string" &&
		evidenceModes.includes(value.mode as EvidenceMode) &&
		typeof value.exactness === "string" &&
		exactnessValues.includes(value.exactness as Exactness) &&
		isNonEmptyString(value.producer) &&
		isNonEmptyString(value.packageName) &&
		isNonEmptyString(value.packageVersion) &&
		Array.isArray(value.inputViewIds) &&
		value.inputViewIds.every((entry) => isNonEmptyString(entry)) &&
		(value.resourceIds === undefined || isStringArray(value.resourceIds)) &&
		(value.ruleIds === undefined || isStringArray(value.ruleIds)) &&
		(value.fstIds === undefined || isStringArray(value.fstIds)) &&
		(value.grammarIds === undefined || isStringArray(value.grammarIds)) &&
		(value.statisticalModelIds === undefined ||
			isStringArray(value.statisticalModelIds)) &&
		(value.corpusIds === undefined || isStringArray(value.corpusIds)) &&
		(value.kbIds === undefined || isStringArray(value.kbIds)) &&
		(value.optionsHash === undefined || isNonEmptyString(value.optionsHash))
	);
}

export function isScore(value: unknown): value is Score {
	return (
		isRecord(value) &&
		typeof value.kind === "string" &&
		scoreKinds.includes(value.kind as Score["kind"]) &&
		isFiniteNumber(value.value) &&
		(value.scale === undefined || isNonEmptyString(value.scale))
	);
}

export function isAnnotationAlternative(
	value: unknown,
): value is AnnotationAlternative {
	return (
		isRecord(value) &&
		isEvidence(value.evidence) &&
		(value.features === undefined || isRecord(value.features)) &&
		(value.score === undefined || isScore(value.score))
	);
}

export function isAnnotation(value: unknown): value is Annotation {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.layer) &&
		isNonEmptyString(value.type) &&
		Array.isArray(value.spans) &&
		value.spans.every((entry) => isSpanRef(entry)) &&
		isEvidence(value.evidence) &&
		(value.features === undefined || isRecord(value.features)) &&
		(value.alternatives === undefined ||
			(Array.isArray(value.alternatives) &&
				value.alternatives.every((entry) => isAnnotationAlternative(entry))))
	);
}

function assertAnnotation<T>(annotation: Annotation<T>): void {
	if (!isAnnotation(annotation)) {
		fail(
			"TEXTDOC_INVALID_ANNOTATION",
			"annotation must satisfy the final Annotation contract",
		);
	}
}

function annotationLayerIds(
	doc: TextDocument,
	annotationId: string,
): readonly string[] {
	return Object.values(doc.layers)
		.filter((layer) => Object.hasOwn(layer.annotations, annotationId))
		.map((layer) => layer.id)
		.sort((left, right) => left.localeCompare(right));
}

function assertAnnotationIdIsAvailable(
	doc: TextDocument,
	annotation: Annotation,
): void {
	const layerIds = annotationLayerIds(doc, annotation.id);
	if (layerIds.length > 0) {
		fail("TEXTDOC_DUPLICATE_ID", `annotation already exists: ${annotation.id}`);
	}
}

function assertAnnotationIdIsUnambiguousForUpdate(
	doc: TextDocument,
	annotation: Annotation,
): void {
	const layerIds = annotationLayerIds(doc, annotation.id);
	const otherLayerIds = layerIds.filter(
		(layerId) => layerId !== annotation.layer,
	);
	if (otherLayerIds.length > 0) {
		fail(
			"TEXTDOC_DUPLICATE_ID",
			`annotation id exists in another layer: ${annotation.id}`,
		);
	}
}

function layerWithAnnotation<T>(
	layer: AnnotationLayer,
	annotation: Annotation<T>,
	mode: "add" | "replace",
): AnnotationLayer {
	const annotations =
		mode === "add"
			? orderedRecord({
					...layer.annotations,
					[annotation.id]: annotation as Annotation,
				})
			: replaceRecordValue(
					layer.annotations,
					annotation.id,
					annotation as Annotation,
					"annotation",
				);
	if (mode === "add" && Object.hasOwn(layer.annotations, annotation.id)) {
		fail("TEXTDOC_DUPLICATE_ID", `annotation already exists: ${annotation.id}`);
	}
	return { ...layer, annotations };
}

export function addAnnotation<T>(
	doc: TextDocument,
	annotation: Annotation<T>,
): TextDocument {
	assertAnnotation(annotation);
	const layer = doc.layers[annotation.layer];
	if (layer === undefined) {
		fail(
			"TEXTDOC_LAYER_MISSING",
			`annotation layer is missing: ${annotation.layer}`,
		);
	}
	assertAnnotationIdIsAvailable(doc, annotation as Annotation);
	return {
		...doc,
		layers: orderedRecord({
			...doc.layers,
			[annotation.layer]: layerWithAnnotation(layer, annotation, "add"),
		}),
	};
}

export function updateAnnotation<T>(
	doc: TextDocument,
	annotation: Annotation<T>,
): TextDocument {
	assertAnnotation(annotation);
	const layer = doc.layers[annotation.layer];
	if (layer === undefined) {
		fail(
			"TEXTDOC_LAYER_MISSING",
			`annotation layer is missing: ${annotation.layer}`,
		);
	}
	assertAnnotationIdIsUnambiguousForUpdate(doc, annotation as Annotation);
	return {
		...doc,
		layers: orderedRecord({
			...doc.layers,
			[annotation.layer]: layerWithAnnotation(layer, annotation, "replace"),
		}),
	};
}

function graphReferencesAnnotation(
	doc: TextDocument,
	annotationId: string,
): boolean {
	for (const graph of Object.values(doc.graphs)) {
		if (
			Object.values(graph.nodes).some(
				(node) => node.annotationId === annotationId,
			)
		)
			return true;
		if (
			Object.values(graph.edges).some(
				(edge) => edge.annotationId === annotationId,
			)
		)
			return true;
	}
	return false;
}

function removeGraphReferences(
	doc: TextDocument,
	annotationId: string,
): TextDocument {
	const graphs = orderedRecord(
		Object.fromEntries(
			Object.entries(doc.graphs).map(([graphId, graph]) => {
				const nodes = orderedRecord(
					Object.fromEntries(
						Object.entries(graph.nodes).filter(
							([, node]) => node.annotationId !== annotationId,
						),
					),
				);
				const edges = orderedRecord(
					Object.fromEntries(
						Object.entries(graph.edges).filter(
							([, edge]) =>
								edge.annotationId !== annotationId &&
								nodes[edge.source] !== undefined &&
								nodes[edge.target] !== undefined,
						),
					),
				);
				return [graphId, { ...graph, nodes, edges }];
			}),
		),
	);
	return { ...doc, graphs };
}

export function removeAnnotation(
	doc: TextDocument,
	annotationId: string,
	options: RemoveAnnotationOptions = {},
): TextDocument {
	if (!isNonEmptyString(annotationId)) {
		fail(
			"TEXTDOC_INVALID_ANNOTATION_ID",
			"annotation id must be a non-empty string",
		);
	}
	const danglingGraphReferences = options.danglingGraphReferences ?? "reject";
	const layerIds = annotationLayerIds(doc, annotationId);
	if (layerIds.length === 0) {
		fail("TEXTDOC_MISSING_ID", `annotation does not exist: ${annotationId}`);
	}
	if (layerIds.length > 1) {
		fail(
			"TEXTDOC_DUPLICATE_ID",
			`annotation id exists in multiple layers: ${annotationId}`,
		);
	}
	if (
		danglingGraphReferences === "reject" &&
		graphReferencesAnnotation(doc, annotationId)
	) {
		fail(
			"TEXTDOC_DANGLING_GRAPH_REFERENCE",
			`annotation is referenced by a graph: ${annotationId}`,
		);
	}

	const layers = orderedRecord(
		Object.fromEntries(
			Object.entries(doc.layers).map(([layerId, layer]) => {
				if (Object.hasOwn(layer.annotations, annotationId)) {
					return [
						layerId,
						{
							...layer,
							annotations: removeRecordValue(
								layer.annotations,
								annotationId,
								"annotation",
							),
						},
					];
				}
				return [layerId, layer];
			}),
		),
	);
	const updated = { ...doc, layers };
	return danglingGraphReferences === "remove"
		? removeGraphReferences(updated, annotationId)
		: updated;
}

export function mergeAnnotations<T>(
	doc: TextDocument,
	annotations: readonly Annotation<T>[],
	options: MergeAnnotationOptions = {},
): TextDocument {
	const onDuplicateId = options.onDuplicateId ?? "reject";
	const sorted = [...annotations].sort((left, right) =>
		compareAnnotations(left as Annotation, right as Annotation),
	);
	let result = doc;
	for (const annotation of sorted) {
		const layer = result.layers[annotation.layer];
		if (
			layer !== undefined &&
			Object.hasOwn(layer.annotations, annotation.id)
		) {
			if (onDuplicateId === "replace") {
				result = updateAnnotation(result, annotation);
				continue;
			}
			fail(
				"TEXTDOC_DUPLICATE_ID",
				`annotation already exists: ${annotation.id}`,
			);
		}
		result = addAnnotation(result, annotation);
	}
	return result;
}

export * from "./values.ts";
