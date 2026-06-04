import type {
	Annotation,
	Evidence,
	TextDocument,
} from "@ismail-elkorchi/textdoc";

const evidence: Evidence = {
	mode: "algorithm",
	exactness: "E1",
	producer: "textsearch-test",
	packageName: "@ismail-elkorchi/textsearch",
	packageVersion: "0.1.0",
	inputViewIds: ["raw"],
};

function tokenAnnotations(text: string): Record<string, Annotation> {
	const annotations: Record<string, Annotation> = {};
	let position = 0;
	for (const match of text.matchAll(/\p{Letter}[\p{Letter}-]*/gu)) {
		const surface = match[0];
		const start = match.index ?? 0;
		annotations[`tok-${position}`] = {
			id: `tok-${position}`,
			layer: "tokens",
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
			value: {
				index: position,
				text: surface,
				lemma: surface.toLowerCase(),
			},
			evidence,
		};
		position += 1;
	}
	return annotations;
}

export function makeDocument(
	id: string,
	text: string,
	metadata: Record<string, unknown>,
): TextDocument {
	return {
		id,
		sources: {
			source: {
				id: "source",
				text,
				inputKind: "string",
				wellFormed: true,
			},
		},
		views: {
			raw: {
				id: "raw",
				kind: "raw",
				text,
				transform: {
					kind: "raw-input",
					producer: "textsearch-test",
				},
			},
		},
		spanMaps: {},
		layers: {
			tokens: {
				id: "tokens",
				type: "token.word",
				viewId: "raw",
				annotations: tokenAnnotations(text),
			},
		},
		graphs: {},
		metadata,
	};
}

export function fixtureDocuments(): TextDocument[] {
	return [
		makeDocument("doc-a", "Contract terms protect legal rights.", {
			domain: "legal",
			year: 2021,
			importance: 2,
		}),
		makeDocument("doc-b", "Legal contract review finds contract clauses.", {
			domain: "legal",
			year: 2022,
			importance: 5,
		}),
		makeDocument("doc-c", "Archive search finds historical letters.", {
			domain: "history",
			year: 1890,
			importance: 1,
		}),
	];
}

export function badSpanDocument(): TextDocument {
	const doc = makeDocument("bad-span", "😀 token", { domain: "emoji" });
	const first = doc.layers.tokens?.annotations["tok-0"];
	if (first === undefined) return doc;
	return {
		...doc,
		layers: {
			tokens: {
				...doc.layers.tokens,
				id: "tokens",
				type: "token.word",
				annotations: {
					...doc.layers.tokens?.annotations,
					"tok-0": {
						...first,
						value: { index: 0 },
						spans: [
							{
								viewId: "raw",
								span: { start: 0, end: 1, unit: "grapheme" },
							},
						],
					},
				},
			},
		},
	};
}
