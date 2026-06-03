import { applyDown } from "../apply/mod.js";
import {
	type BuildRelationEntry,
	buildFst,
	buildTransducer,
	type Fst,
	type FstArc,
	union,
} from "../automaton/mod.js";
import type { SemiringName } from "../weight/mod.js";

export interface EditDistanceTransducerOptions {
	readonly id?: string | undefined;
	readonly alphabet?: readonly string[] | string | undefined;
	readonly maxDistance?: number | undefined;
	readonly insertionCost?: number | undefined;
	readonly deletionCost?: number | undefined;
	readonly substitutionCost?: number | undefined;
	readonly semiring?: SemiringName | undefined;
}

export interface ConfusionPair {
	readonly input: string;
	readonly output: string;
	readonly weight?: number | undefined;
}

export interface ConfusionTransducerOptions {
	readonly id?: string | undefined;
	readonly alphabet?: readonly string[] | string | undefined;
	readonly pairs: readonly ConfusionPair[];
	readonly semiring?: SemiringName | undefined;
}

export interface SpellingCandidateOptions {
	readonly maxDistance?: number | undefined;
	readonly maxResults?: number | undefined;
	readonly maxDepth?: number | undefined;
}

export interface SpellingCandidate {
	readonly input: string;
	readonly candidate: string;
	readonly weight?: number | undefined;
	readonly edits?: number | undefined;
}

function alphabetSymbols(
	value: readonly string[] | string | undefined,
	fallback: readonly string[] = [],
): readonly string[] {
	if (value === undefined) {
		if (fallback.length === 0) {
			throw new TypeError(
				"Spelling transducers require a caller-declared alphabet.",
			);
		}
		return Object.freeze([...fallback].sort());
	}
	return Object.freeze(typeof value === "string" ? [...value] : [...value]);
}

function pairAlphabet(pairs: readonly ConfusionPair[]): readonly string[] {
	const symbols = new Set<string>();
	for (const pair of pairs) {
		for (const symbol of [...pair.input, ...pair.output]) symbols.add(symbol);
	}
	return Object.freeze([...symbols].sort());
}

export function buildEditDistanceTransducer(
	options: EditDistanceTransducerOptions = {},
): Fst {
	const alphabet = alphabetSymbols(options.alphabet);
	const maxDistance = options.maxDistance ?? 1;
	const insertionCost = options.insertionCost ?? 1;
	const deletionCost = options.deletionCost ?? 1;
	const substitutionCost = options.substitutionCost ?? 1;
	const states = Array.from(
		{ length: maxDistance + 1 },
		(_value, index) => index,
	);
	const arcs: FstArc[] = [];
	for (let distance = 0; distance <= maxDistance; distance += 1) {
		for (const symbol of alphabet) {
			arcs.push({
				from: distance,
				to: distance,
				input: symbol,
				output: symbol,
				weight: 0,
			});
			if (distance < maxDistance) {
				arcs.push({
					from: distance,
					to: distance + 1,
					input: symbol,
					output: "",
					weight: deletionCost,
				});
				arcs.push({
					from: distance,
					to: distance + 1,
					input: "",
					output: symbol,
					weight: insertionCost,
				});
				for (const replacement of alphabet) {
					if (replacement !== symbol) {
						arcs.push({
							from: distance,
							to: distance + 1,
							input: symbol,
							output: replacement,
							weight: substitutionCost,
						});
					}
				}
			}
		}
	}
	return buildFst({
		id: options.id,
		kind: "transducer",
		semiring: options.semiring ?? "tropical",
		states,
		arcs,
		startState: 0,
		finalWeights: Object.fromEntries(states.map((state) => [state, 0])),
		alphabet,
		metadata: { kind: "edit-distance", maxDistance },
	});
}

export function buildConfusionTransducer(
	options: ConfusionTransducerOptions,
): Fst {
	const alphabet = alphabetSymbols(
		options.alphabet,
		pairAlphabet(options.pairs),
	);
	const identity: BuildRelationEntry[] = alphabet.map((symbol) => ({
		input: symbol,
		output: symbol,
		weight: 0,
	}));
	const confusions: BuildRelationEntry[] = options.pairs.map((pair) => ({
		input: pair.input,
		output: pair.output,
		weight: pair.weight ?? 1,
	}));
	return union(
		[
			buildTransducer(identity, { semiring: options.semiring ?? "tropical" }),
			buildTransducer(confusions, { semiring: options.semiring ?? "tropical" }),
		],
		{
			id: options.id,
			semiring: options.semiring ?? "tropical",
			metadata: { kind: "confusion-transducer", pairs: options.pairs },
		},
	);
}

export function spellingCandidates(
	fst: Fst,
	input: string,
	options: SpellingCandidateOptions = {},
): SpellingCandidate[] {
	const seen = new Set<string>();
	const maxResults = options.maxResults ?? 16;
	const results: SpellingCandidate[] = [];
	for (const result of applyDown(fst, input, {
		maxResults: Math.max(maxResults * 4, maxResults),
		maxDepth:
			options.maxDepth ?? input.length + (options.maxDistance ?? 2) * 2 + 8,
	})) {
		if (
			result.output === input &&
			result.weight !== undefined &&
			result.weight > 0
		)
			continue;
		if (seen.has(result.output)) continue;
		if (
			options.maxDistance !== undefined &&
			result.weight !== undefined &&
			result.weight > options.maxDistance
		) {
			continue;
		}
		seen.add(result.output);
		results.push(
			Object.freeze({
				input,
				candidate: result.output,
				weight: result.weight,
				edits:
					result.weight === undefined ? undefined : Math.round(result.weight),
			}),
		);
		if (results.length >= maxResults) break;
	}
	return results;
}
