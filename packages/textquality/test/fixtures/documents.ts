import {
	type Annotation,
	addLayer,
	createDocument,
	type Evidence,
	type TextDocument,
} from "@ismail-elkorchi/textdoc";

export const evidence: Evidence = {
	mode: "manual",
	exactness: "E1",
	producer: "textquality-test",
	packageName: "@ismail-elkorchi/textquality",
	packageVersion: "0.1.0",
	inputViewIds: ["raw"],
};

function tokenAnnotations(text: string): Record<string, Annotation> {
	const annotations: Record<string, Annotation> = {};
	let index = 0;
	for (const match of text.matchAll(/\p{Letter}[\p{Letter}\d-]*/gu)) {
		const surface = match[0];
		const start = match.index;
		annotations[`tok-${index}`] = {
			id: `tok-${index}`,
			layer: "token.word",
			type: "token.word",
			spans: [
				{
					viewId: "raw",
					span: {
						start,
						end: start + surface.length,
						unit: "utf16-code-unit",
					},
				},
			],
			value: { index, text: surface },
			evidence,
		};
		index += 1;
	}
	return annotations;
}

export function noisyDocument(): TextDocument {
	const text =
		"Acme  Corpppp!!!\nqual-\nity\nFooter line\nFooter line\nA1pha\u200b";
	let doc = createDocument(text, { id: "doc-quality" });
	doc = addLayer(doc, {
		id: "token.word",
		type: "token.word",
		viewId: "raw",
		annotations: tokenAnnotations(text),
	});
	doc = addLayer(doc, {
		id: "annotation.empty",
		type: "custom.empty",
		viewId: "raw",
		annotations: {},
	});
	return doc;
}

export function conflictingAnnotationDocument(): TextDocument {
	const text = "Alpha beta";
	return {
		...createDocument(text, { id: "doc-conflict" }),
		layers: {
			"token.word": {
				id: "token.word",
				type: "token.word",
				viewId: "raw",
				annotations: {
					a: {
						id: "a",
						layer: "token.word",
						type: "token.word",
						spans: [
							{
								viewId: "raw",
								span: { start: 0, end: 5, unit: "utf16-code-unit" },
							},
						],
						value: { text: "Alpha" },
						evidence,
					},
					b: {
						id: "b",
						layer: "token.word",
						type: "token.word",
						spans: [
							{
								viewId: "raw",
								span: { start: 3, end: 9, unit: "utf16-code-unit" },
							},
						],
						value: { text: "ha bet" },
						evidence,
					},
				},
			},
			"segment.custom": {
				id: "segment.custom",
				type: "segment.custom",
				viewId: "raw",
				annotations: {
					scalar: {
						id: "scalar",
						layer: "segment.custom",
						type: "segment.custom",
						spans: [
							{
								viewId: "raw",
								span: { start: 0, end: 5, unit: "unicode-scalar" },
							},
						],
						evidence,
					},
				},
			},
		},
	};
}
