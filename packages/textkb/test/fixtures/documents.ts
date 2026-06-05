import type {
	Annotation,
	Evidence,
	TextDocument,
} from "@ismail-elkorchi/textdoc";

const evidence: Evidence = {
	mode: "manual",
	exactness: "E1",
	producer: "textkb-test",
	packageName: "@ismail-elkorchi/textkb",
	packageVersion: "0.1.0",
	inputViewIds: ["raw"],
};

function span(text: string, surface: string) {
	const start = text.indexOf(surface);
	return {
		start,
		end: start + surface.length,
		unit: "utf16-code-unit" as const,
	};
}

function tokenAnnotations(text: string): Record<string, Annotation> {
	const annotations: Record<string, Annotation> = {};
	let index = 0;
	for (const match of text.matchAll(/\p{Letter}[\p{Letter}-]*/gu)) {
		const surface = match[0];
		const start = match.index ?? 0;
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
			value: {
				index,
				text: surface,
				lemma: surface.toLowerCase(),
			},
			features: {
				pos: surface.toLowerCase() === "contract" ? "noun" : "other",
			},
			evidence,
		};
		index += 1;
	}
	return annotations;
}

export function fixtureDocument(): TextDocument {
	const text = "Acme signed a contract in Paris. The contract is an agreement.";
	const acme = span(text, "Acme");
	const contract = span(text, "contract");
	return {
		id: "doc-kb",
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
					producer: "textkb-test",
				},
			},
		},
		spanMaps: {},
		layers: {
			"entity.mention": {
				id: "entity.mention",
				type: "entity.mention",
				viewId: "raw",
				annotations: {
					"ent-acme": {
						id: "ent-acme",
						layer: "entity.mention",
						type: "entity.organization",
						spans: [{ viewId: "raw", span: acme }],
						value: { text: "Acme" },
						features: { source: "fixture" },
						evidence,
						alternatives: [
							{
								value: { text: "ACME" },
								evidence,
								score: { kind: "rank", value: 2 },
							},
						],
					},
				},
			},
			"term.candidate": {
				id: "term.candidate",
				type: "term.candidate",
				viewId: "raw",
				annotations: {
					"term-contract": {
						id: "term-contract",
						layer: "term.candidate",
						type: "term.candidate",
						spans: [{ viewId: "raw", span: contract }],
						value: { text: "contract" },
						evidence,
					},
				},
			},
			"token.word": {
				id: "token.word",
				type: "token.word",
				viewId: "raw",
				annotations: tokenAnnotations(text),
			},
		},
		graphs: {},
		metadata: { domain: "legal" },
	};
}

export function badSpanDocument(): TextDocument {
	const doc = fixtureDocument();
	const annotation = doc.layers["entity.mention"]?.annotations["ent-acme"];
	if (annotation === undefined) return doc;
	return {
		...doc,
		layers: {
			...doc.layers,
			"entity.mention": {
				...doc.layers["entity.mention"],
				id: "entity.mention",
				type: "entity.mention",
				annotations: {
					"ent-acme": {
						...annotation,
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
