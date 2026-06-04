import type {
	Annotation,
	AnnotationLayer,
	TextDocument,
} from "@ismail-elkorchi/textdoc";

const evidence = {
	mode: "algorithm",
	exactness: "E1",
	producer: "textcorpus-test",
	packageName: "@ismail-elkorchi/textcorpus",
	packageVersion: "0.1.0",
	inputViewIds: ["raw"],
} as const;

export interface FixtureToken {
	text: string;
	lemma?: string;
}

export function token(
	text: string,
	lemma = text.toLocaleLowerCase("und"),
): FixtureToken {
	return { text, lemma };
}

export function makeDocument(
	id: string,
	text: string,
	tokens: readonly FixtureToken[],
	metadata: Record<string, unknown>,
): TextDocument {
	let offset = 0;
	const annotations: Record<string, Annotation> = {};
	for (const [index, fixtureToken] of tokens.entries()) {
		const start = text.indexOf(fixtureToken.text, offset);
		if (start < 0) {
			throw new Error(`token not found in fixture text: ${fixtureToken.text}`);
		}
		const end = start + fixtureToken.text.length;
		offset = end;
		const annotation: Annotation = {
			id: `tok-${index}`,
			layer: "tokens",
			type: "token.word",
			spans: [
				{
					viewId: "raw",
					span: { start, end, unit: "utf16-code-unit" },
				},
			],
			value: {
				index,
				text: fixtureToken.text,
				...(fixtureToken.lemma !== undefined
					? { lemma: fixtureToken.lemma }
					: {}),
			},
			evidence,
		};
		annotations[annotation.id] = annotation;
	}
	const layer: AnnotationLayer = {
		id: "tokens",
		type: "token.word",
		viewId: "raw",
		annotations,
	};
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
					producer: "textcorpus-test",
				},
			},
		},
		spanMaps: {},
		layers: { tokens: layer },
		graphs: {},
		metadata,
	};
}

export function fixtureDocuments(): TextDocument[] {
	return [
		makeDocument(
			"doc-a",
			"Contract terms govern the legal contract.",
			[
				token("Contract", "contract"),
				token("terms", "term"),
				token("govern", "govern"),
				token("the", "the"),
				token("legal", "legal"),
				token("contract", "contract"),
				token(".", "."),
			],
			{ year: "2020", domain: "legal", author: "a" },
		),
		makeDocument(
			"doc-b",
			"Legal terms define the contract terms.",
			[
				token("Legal", "legal"),
				token("terms", "term"),
				token("define", "define"),
				token("the", "the"),
				token("contract", "contract"),
				token("terms", "term"),
				token(".", "."),
			],
			{ year: "2021", domain: "legal", author: "b" },
		),
		makeDocument(
			"doc-c",
			"Historical contract terms changed slowly.",
			[
				token("Historical", "historical"),
				token("contract", "contract"),
				token("terms", "term"),
				token("changed", "change"),
				token("slowly", "slowly"),
				token(".", "."),
			],
			{ year: "2022", domain: "history", author: "c" },
		),
	];
}
