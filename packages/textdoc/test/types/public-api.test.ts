import type {
	Annotation,
	AnnotationGraph,
	AnnotationLayer,
	Span,
	SpanMap,
	TextDocument,
	TextView,
} from "../../src/mod.ts";
import { addViewWithSpanMap, createDocument } from "../../src/mod.ts";

const document: TextDocument = createDocument("type test");
const span: Span = { start: 0, end: 4, unit: "utf16-code-unit" };
const view: TextView = document.views.raw as TextView;
const spanMap: SpanMap = {
	id: "raw-to-normalized",
	sourceViewId: "raw",
	targetViewId: "normalized",
	entries: [
		{
			source: span,
			target: span,
			relation: "identity",
		},
	],
};
const layer: AnnotationLayer = {
	id: "tokens",
	type: "token.word",
	annotations: {},
};
const annotation: Annotation<{ text: string }> = {
	id: "token:1",
	layer: "tokens",
	type: "token.word",
	spans: [{ viewId: view.id, span }],
	value: { text: "type" },
	evidence: {
		mode: "algorithm",
		exactness: "E1",
		producer: "type-test",
		packageName: "@ismail-elkorchi/textdoc",
		packageVersion: "0.1.0",
		inputViewIds: [view.id],
	},
};
const graph: AnnotationGraph = {
	id: "dependency",
	kind: "dependency",
	nodes: { n1: { id: "n1", annotationId: annotation.id, layerId: layer.id } },
	edges: {},
};

void addViewWithSpanMap(
	document,
	{
		id: "normalized",
		kind: "normalized",
		text: view.text,
		sourceViewId: view.id,
		spanMapId: spanMap.id,
		transform: {
			kind: "normalization",
			producer: "@ismail-elkorchi/textdoc",
			sourceViewId: view.id,
		},
	},
	spanMap,
);
void [document, span, view, spanMap, layer, annotation, graph];
