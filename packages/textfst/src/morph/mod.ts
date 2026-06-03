import { type ApplyOptions, applyDown, applyUp } from "../apply/mod.js";
import type { Fst, SpanRef } from "../automaton/mod.js";

export interface MorphFstResult {
	readonly surface: string;
	readonly analysis: string;
	readonly lemma?: string | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly weight?: number | undefined;
	readonly spans?: readonly SpanRef[] | undefined;
}

export interface MorphAnalyzeOptions extends ApplyOptions {}
export interface MorphGenerateOptions extends ApplyOptions {}

export interface ParsedAnalysis {
	readonly analysis: string;
	readonly lemma?: string | undefined;
	readonly tags?: readonly string[] | undefined;
}

export function parseAnalysis(analysis: string): ParsedAnalysis {
	const [lemma, ...tags] = analysis
		.split("+")
		.filter((part) => part.length > 0);
	return Object.freeze({
		analysis,
		lemma,
		tags: tags.length === 0 ? undefined : Object.freeze(tags),
	});
}

export function analyzeWord(
	fst: Fst,
	word: string,
	options: MorphAnalyzeOptions = {},
): MorphFstResult[] {
	return applyUp(fst, word, {
		...options,
		includeSpans: options.includeSpans,
	}).map((result) => {
		const parsed = parseAnalysis(result.input);
		return Object.freeze({
			surface: word,
			analysis: result.input,
			lemma: parsed.lemma,
			tags: parsed.tags,
			weight: result.weight,
			spans: result.spans,
		});
	});
}

export function generateWord(
	fst: Fst,
	analysis: string,
	options: MorphGenerateOptions = {},
): MorphFstResult[] {
	const parsed = parseAnalysis(analysis);
	return applyDown(fst, analysis, {
		...options,
		includeSpans: options.includeSpans,
	}).map((result) =>
		Object.freeze({
			surface: result.output,
			analysis,
			lemma: parsed.lemma,
			tags: parsed.tags,
			weight: result.weight,
			spans: result.spans,
		}),
	);
}
