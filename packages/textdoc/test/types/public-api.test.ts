import type {
	Annotation,
	AnnotationGraph,
	AnnotationLayer,
	Span,
	TextDocument,
	TextView,
} from "../../src/mod.ts";
import { createDocument } from "../../src/mod.ts";

const document: TextDocument = createDocument("type test");
const span: Span = { start: 0, end: 4, unit: "utf16-code-unit" };
const view: TextView = document.views.raw as TextView;
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

void [document, span, view, layer, annotation, graph];
