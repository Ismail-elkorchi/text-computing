import {
	epsilon,
	type Fst,
	type FstArc,
	type SpanRef,
} from "../automaton/mod.js";
import { combineWeights, compareWeights } from "../weight/mod.js";

export interface ApplyOptions {
	readonly maxDepth?: number | undefined;
	readonly maxResults?: number | undefined;
	readonly allowPartial?: boolean | undefined;
	readonly includeSpans?: boolean | undefined;
}

export interface FstPathArc {
	readonly arc: FstArc;
	readonly sourceStart: number;
	readonly sourceEnd: number;
	readonly targetStart: number;
	readonly targetEnd: number;
}

export interface FstResult {
	readonly input: string;
	readonly output: string;
	readonly consumed: number;
	readonly path: readonly FstPathArc[];
	readonly rank: number;
	readonly weight?: number | undefined;
	readonly spans?: readonly SpanRef[] | undefined;
}

export interface HyphenationResult {
	readonly word: string;
	readonly hyphenated: string;
	readonly pieces: readonly string[];
	readonly breaks: readonly number[];
	readonly weight?: number | undefined;
}

export interface SyllabificationResult {
	readonly word: string;
	readonly syllabified: string;
	readonly syllables: readonly string[];
	readonly weight?: number | undefined;
}

type Direction = "down" | "up";

interface QueueItem {
	readonly state: number;
	readonly sourceIndex: number;
	readonly target: string;
	readonly path: readonly FstPathArc[];
	readonly depth: number;
	readonly weight?: number | undefined;
}

const defaultMaxDepth = 96;
const defaultMaxResults = 32;

function labelsFor(
	direction: Direction,
	arc: FstArc,
): { source: string; target: string } {
	if (direction === "down") return { source: arc.input, target: arc.output };
	return { source: arc.output, target: arc.input };
}

function resultSortKey(result: FstResult): string {
	return `${result.output}\u0000${result.input}\u0000${result.consumed}\u0000${result.path.length}`;
}

function compareStableText(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function pathSpan(source: string): readonly SpanRef[] {
	return Object.freeze([
		{ start: 0, end: source.length, unit: "utf16-code-unit" },
	]);
}

function apply(
	fst: Fst,
	source: string,
	direction: Direction,
	options: ApplyOptions,
): FstResult[] {
	const maxDepth =
		options.maxDepth ?? Math.max(defaultMaxDepth, source.length * 4 + 8);
	const maxResults = options.maxResults ?? defaultMaxResults;
	const arcsByState = new Map<number, FstArc[]>();
	for (const arc of fst.arcs) {
		const bucket = arcsByState.get(arc.from) ?? [];
		bucket.push(arc);
		arcsByState.set(arc.from, bucket);
	}

	const queue: QueueItem[] = [
		{
			state: fst.startState,
			sourceIndex: 0,
			target: "",
			path: Object.freeze([]),
			depth: 0,
		},
	];
	const results: FstResult[] = [];
	const seenResults = new Set<string>();

	while (queue.length > 0 && results.length < maxResults) {
		const item = queue.shift();
		if (item === undefined) break;

		const finalWeight = fst.finalWeights[item.state];
		const sourceComplete = item.sourceIndex === source.length;
		if (
			finalWeight !== undefined &&
			(sourceComplete || options.allowPartial === true)
		) {
			const weight = combineWeights(fst.semiring, item.weight, finalWeight);
			const input =
				direction === "down" ? source.slice(0, item.sourceIndex) : item.target;
			const output =
				direction === "down" ? item.target : source.slice(0, item.sourceIndex);
			const key = `${input}\u0000${output}\u0000${weight ?? 0}`;
			if (!seenResults.has(key)) {
				seenResults.add(key);
				results.push(
					Object.freeze({
						input,
						output,
						consumed: item.sourceIndex,
						path: Object.freeze([...item.path]),
						rank: 0,
						weight,
						spans:
							options.includeSpans === true
								? pathSpan(source.slice(0, item.sourceIndex))
								: undefined,
					}),
				);
			}
		}

		if (item.depth >= maxDepth) continue;
		for (const arc of arcsByState.get(item.state) ?? []) {
			const labels = labelsFor(direction, arc);
			if (
				labels.source !== epsilon &&
				!source.startsWith(labels.source, item.sourceIndex)
			)
				continue;
			const sourceEnd = item.sourceIndex + labels.source.length;
			const targetStart = item.target.length;
			const target = item.target + labels.target;
			queue.push({
				state: arc.to,
				sourceIndex: sourceEnd,
				target,
				depth: item.depth + 1,
				weight: combineWeights(fst.semiring, item.weight, arc.weight),
				path: Object.freeze([
					...item.path,
					Object.freeze({
						arc,
						sourceStart: item.sourceIndex,
						sourceEnd,
						targetStart,
						targetEnd: target.length,
					}),
				]),
			});
		}
	}

	return results
		.sort((left, right) => {
			const byWeight = compareWeights(fst.semiring, left.weight, right.weight);
			if (byWeight !== 0) return byWeight;
			return compareStableText(resultSortKey(left), resultSortKey(right));
		})
		.map((result, rank) => Object.freeze({ ...result, rank }));
}

export function applyDown(
	fst: Fst,
	input: string,
	options: ApplyOptions = {},
): FstResult[] {
	return apply(fst, input, "down", options);
}

export function applyUp(
	fst: Fst,
	output: string,
	options: ApplyOptions = {},
): FstResult[] {
	return apply(fst, output, "up", options);
}

export function transliterate(
	fst: Fst,
	input: string,
	options: ApplyOptions = {},
): string[] {
	return applyDown(fst, input, options).map((result) => result.output);
}

export function orthographicConvert(
	fst: Fst,
	input: string,
	options: ApplyOptions = {},
): string[] {
	return transliterate(fst, input, options);
}

function splitWithBreaks(
	text: string,
	separators: RegExp,
): { pieces: string[]; breaks: number[] } {
	const pieces = text.split(separators).filter((piece) => piece.length > 0);
	const breaks: number[] = [];
	let offset = 0;
	for (const piece of pieces.slice(0, -1)) {
		offset += piece.length;
		breaks.push(offset);
	}
	return { pieces, breaks };
}

export function hyphenateWord(
	fst: Fst,
	word: string,
	options: ApplyOptions = {},
): HyphenationResult[] {
	const outputs = applyDown(fst, word, options);
	if (outputs.length === 0) {
		return [
			Object.freeze({
				word,
				hyphenated: word,
				pieces: Object.freeze([word]),
				breaks: Object.freeze([]),
			}),
		];
	}
	return outputs.map((result) => {
		const split = splitWithBreaks(result.output, /[-\u00b7]/u);
		return Object.freeze({
			word,
			hyphenated: result.output,
			pieces: Object.freeze(split.pieces),
			breaks: Object.freeze(split.breaks),
			weight: result.weight,
		});
	});
}

export function syllabifyWord(
	fst: Fst,
	word: string,
	options: ApplyOptions = {},
): SyllabificationResult[] {
	const outputs = applyDown(fst, word, options);
	if (outputs.length === 0) {
		return [
			Object.freeze({
				word,
				syllabified: word,
				syllables: Object.freeze([word]),
			}),
		];
	}
	return outputs.map((result) => {
		const syllables = result.output
			.split(/[.\-\u00b7]/u)
			.filter((piece) => piece.length > 0);
		return Object.freeze({
			word,
			syllabified: result.output,
			syllables: Object.freeze(syllables),
			weight: result.weight,
		});
	});
}
