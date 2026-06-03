import {
	addLayer,
	createDocument,
	selectAnnotations,
	toTextDocJson,
} from "../../src/mod.ts";

const doc = createDocument(new TextEncoder().encode("Browser text"), {
	id: "doc:browser",
});
const withLayer = addLayer(doc, {
	id: "tokens",
	type: "token.word",
	viewId: "raw",
	annotations: {},
});

if (withLayer.id !== "doc:browser") {
	throw new Error("Browser createDocument mismatch");
}

if (selectAnnotations(withLayer, { layer: "tokens" }).length !== 0) {
	throw new Error("Browser selectAnnotations mismatch");
}

if (toTextDocJson(withLayer).views.raw?.text !== "Browser text") {
	throw new Error("Browser serialization mismatch");
}
