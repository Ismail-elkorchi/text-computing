import type { DatasetRecord } from "../dataset/mod.js";
import {
	assertFinalDocument,
	createTextDocument,
	textDataEvidence,
	withAnnotation,
	withLayer,
} from "../internal/document.js";
import { inputOrderId } from "../internal/ids.js";
import { splitLines, textOffsetsForTokens } from "../internal/text.js";
import {
	assertTransition,
	parseSequenceLabel,
	type SequenceLabelScheme,
} from "./scheme.js";

export interface IobToken {
	readonly token: string;
	readonly label: string;
}

export interface IobSentence {
	readonly id: string;
	readonly tokens: readonly IobToken[];
}

export function parseIob(
	text: string,
	scheme: SequenceLabelScheme = "BIO",
): readonly IobSentence[] {
	const sentences: IobSentence[] = [];
	let tokens: IobToken[] = [];
	let ordinal = 0;
	function flush(): void {
		if (tokens.length === 0) return;
		sentences.push({ id: inputOrderId("sentence", ordinal), tokens });
		ordinal += 1;
		tokens = [];
	}
	for (const line of splitLines(text)) {
		if (line.trim() === "") {
			flush();
			continue;
		}
		const [token, label] = line.trim().split(/\s+/);
		if (token === undefined || label === undefined) continue;
		tokens.push({ token, label });
	}
	flush();
	for (const sentence of sentences) {
		let previous: ReturnType<typeof parseSequenceLabel> | undefined;
		for (const token of sentence.tokens) {
			const current = parseSequenceLabel(token.label);
			assertTransition(previous, current, scheme);
			previous = current;
		}
	}
	return sentences;
}

export function iobSentenceToRecord(
	sentence: IobSentence,
	index: number,
	scheme: SequenceLabelScheme = "BIO",
): DatasetRecord {
	const tokens = sentence.tokens.map((token) => token.token);
	const offsets = textOffsetsForTokens(tokens);
	const text = tokens.join(" ");
	let document = createTextDocument(text, `doc:${sentence.id}`, {
		metadata: { format: "iob", scheme },
	});
	document = withLayer(document, {
		id: "tokens",
		type: "token.word",
		viewId: "raw",
		annotations: {},
	});
	document = withLayer(document, {
		id: "entities",
		type: "entity",
		viewId: "raw",
		annotations: {},
	});
	for (
		let tokenIndex = 0;
		tokenIndex < sentence.tokens.length;
		tokenIndex += 1
	) {
		const token = sentence.tokens[tokenIndex];
		if (token === undefined) continue;
		const start = offsets[tokenIndex] ?? 0;
		document = withAnnotation(document, {
			id: `token:${sentence.id}:${tokenIndex + 1}`,
			layer: "tokens",
			type: "token.word",
			spans: [
				{
					viewId: "raw",
					span: {
						start,
						end: start + token.token.length,
						unit: "utf16-code-unit",
					},
				},
			],
			value: { index: tokenIndex, text: token.token, label: token.label },
			evidence: textDataEvidence(),
		});
	}
	let entityStart: number | undefined;
	let entityType: string | undefined;
	let entityOrdinal = 0;
	function closeEntity(endTokenIndex: number): void {
		if (entityStart === undefined || entityType === undefined) return;
		const start = offsets[entityStart] ?? 0;
		const endToken = sentence.tokens[endTokenIndex - 1];
		const end =
			(offsets[endTokenIndex - 1] ?? start) + (endToken?.token.length ?? 0);
		entityOrdinal += 1;
		document = withAnnotation(document, {
			id: `entity:${sentence.id}:${entityOrdinal}`,
			layer: "entities",
			type: `entity.${entityType}`,
			spans: [{ viewId: "raw", span: { start, end, unit: "utf16-code-unit" } }],
			value: {
				type: entityType,
				text: text.slice(start, end),
				tokenStart: entityStart,
				tokenEnd: endTokenIndex,
			},
			evidence: textDataEvidence(),
		});
		entityStart = undefined;
		entityType = undefined;
	}
	for (
		let tokenIndex = 0;
		tokenIndex < sentence.tokens.length;
		tokenIndex += 1
	) {
		const parsed = parseSequenceLabel(
			sentence.tokens[tokenIndex]?.label ?? "O",
		);
		if (parsed.prefix === "O") {
			closeEntity(tokenIndex);
			continue;
		}
		if (parsed.prefix === "B" || parsed.prefix === "U") {
			closeEntity(tokenIndex);
			entityStart = tokenIndex;
			entityType = parsed.type;
			if (parsed.prefix === "U") closeEntity(tokenIndex + 1);
			continue;
		}
		if (parsed.prefix === "L") closeEntity(tokenIndex + 1);
	}
	closeEntity(sentence.tokens.length);
	return {
		id: sentence.id || inputOrderId("record", index),
		text,
		document: assertFinalDocument(document),
		labels: [...new Set(sentence.tokens.map((token) => token.label))],
		fields: { format: "iob", scheme },
	};
}
