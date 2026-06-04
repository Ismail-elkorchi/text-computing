import type { Span } from "@ismail-elkorchi/textdoc";
import { segmentWords } from "@ismail-elkorchi/textfacts/segment";
import { utf16Span } from "./spans.js";

interface TextfactsSpan {
	readonly startCU: number;
	readonly endCU: number;
}

export interface TokenSpan {
	readonly text: string;
	readonly span: Span;
}

function isWordLike(value: string): boolean {
	return /[\p{Letter}\p{Number}]/u.test(value);
}

export function wordTokenSpans(text: string): readonly TokenSpan[] {
	const spans = [...segmentWords(text)] as readonly TextfactsSpan[];
	const tokens = spans
		.filter((span) => span.endCU > span.startCU)
		.map((span) => ({
			text: text.slice(span.startCU, span.endCU),
			span: utf16Span(span.startCU, span.endCU),
		}))
		.filter((token) => isWordLike(token.text));
	if (tokens.length > 0 || text.length === 0) return Object.freeze(tokens);
	return Object.freeze(
		[...text.matchAll(/\S+/gu)].map((match) =>
			Object.freeze({
				text: match[0],
				span: utf16Span(match.index, match.index + match[0].length),
			}),
		),
	);
}

export function collapseRepeatedCharacters(
	text: string,
	maxRun: number,
): string {
	let output = "";
	let previous = "";
	let run = 0;
	for (const char of text) {
		if (char === previous) {
			run += 1;
		} else {
			previous = char;
			run = 1;
		}
		if (run <= maxRun) output += char;
	}
	return output;
}
