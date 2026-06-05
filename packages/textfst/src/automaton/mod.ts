import { stableHash128 } from "@ismail-elkorchi/textfacts/hash";

import type { SemiringName } from "../weight/mod.js";
import { assertWeight, combineWeights, compareWeights } from "../weight/mod.js";

export const epsilon = "" as const;

export type FstKind = "acceptor" | "transducer";
export type TextUnit =
	| "utf8-byte"
	| "utf16-code-unit"
	| "unicode-scalar"
	| "grapheme"
	| "word"
	| "sentence"
	| "paragraph"
	| "line"
	| "block"
	| "token"
	| "morpheme"
	| "annotation";

export interface Span {
	readonly start: number;
	readonly end: number;
	readonly unit: TextUnit;
}

export interface SpanRef {
	readonly viewId: string;
	readonly span: Span;
}

export interface FstState {
	readonly id: number;
	readonly final?: boolean | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface FstArc {
	readonly from: number;
	readonly to: number;
	readonly input: string;
	readonly output: string;
	readonly weight?: number | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface Fst {
	readonly id: string;
	readonly kind: FstKind;
	readonly semiring: SemiringName;
	readonly states: readonly FstState[];
	readonly arcs: readonly FstArc[];
	readonly startState: number;
	readonly finalWeights: Readonly<Record<number, number>>;
	readonly alphabet?: readonly string[] | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface FstInput {
	readonly id?: string | undefined;
	readonly kind?: FstKind | undefined;
	readonly semiring?: SemiringName | undefined;
	readonly states?: readonly (number | FstState)[] | undefined;
	readonly arcs?: readonly FstArc[] | undefined;
	readonly startState?: number | undefined;
	readonly finalWeights?: Readonly<Record<number, number>> | undefined;
	readonly alphabet?: readonly string[] | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface FstValidationResult {
	readonly valid: boolean;
	readonly errors: readonly string[];
}

export interface BuildAcceptorEntry {
	readonly text: string;
	readonly weight?: number | undefined;
}

export interface BuildRelationEntry {
	readonly input: string;
	readonly output: string;
	readonly weight?: number | undefined;
}

export interface BuildFstOptions {
	readonly id?: string | undefined;
	readonly semiring?: SemiringName | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface EnumerateOptions {
	readonly maxDepth?: number | undefined;
	readonly maxResults?: number | undefined;
}

export interface FstRelation {
	readonly input: string;
	readonly output: string;
	readonly weight?: number | undefined;
}

export interface ComposeOptions extends EnumerateOptions {
	readonly id?: string | undefined;
}

export interface DeterminizeOptions extends EnumerateOptions {
	readonly id?: string | undefined;
}

export interface MinimizeOptions extends DeterminizeOptions {}

export interface ProjectOptions {
	readonly id?: string | undefined;
}

export interface ShortestPathOptions extends EnumerateOptions {
	readonly n?: number | undefined;
}

export interface FstPath {
	readonly input: string;
	readonly output: string;
	readonly arcs: readonly FstArc[];
	readonly weight?: number | undefined;
}

const defaultEnumerateDepth = 64;
const defaultEnumerateResults = 512;

function freezeRecord<T extends Record<string | number, unknown>>(
	record: T,
): Readonly<T> {
	return Object.freeze({ ...record });
}

function normalizeState(value: number | FstState): FstState {
	if (typeof value === "number") return Object.freeze({ id: value });
	return Object.freeze({ ...value });
}

function arcSortKey(arc: FstArc): string {
	return `${arc.from}\u0000${arc.input}\u0000${arc.output}\u0000${arc.to}\u0000${arc.weight ?? 0}`;
}

function compareStableText(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

function stateSortKey(state: FstState): number {
	return state.id;
}

function relationSortKey(relation: FstRelation): string {
	return `${relation.input}\u0000${relation.output}\u0000${relation.weight ?? 0}`;
}

function assertCompatibleSemiring(
	fsts: readonly Fst[],
	expected?: SemiringName,
): SemiringName {
	const semiring = expected ?? fsts[0]?.semiring ?? "boolean";
	for (const fst of fsts) {
		if (fst.semiring !== semiring) {
			throw new TypeError("FST operations require compatible semirings.");
		}
	}
	return semiring;
}

function normalizedAlphabet(
	arcs: readonly FstArc[],
	explicit?: readonly string[],
): readonly string[] | undefined {
	const symbols = new Set<string>(explicit ?? []);
	for (const arc of arcs) {
		if (arc.input !== epsilon) symbols.add(arc.input);
		if (arc.output !== epsilon) symbols.add(arc.output);
	}
	if (symbols.size === 0) return undefined;
	return Object.freeze([...symbols].sort());
}

function inferKind(arcs: readonly FstArc[]): FstKind {
	return arcs.every((arc) => arc.input === arc.output)
		? "acceptor"
		: "transducer";
}

function finalWeightsFrom(
	states: readonly FstState[],
	finalWeights: Readonly<Record<number, number>> | undefined,
	semiring: SemiringName,
): Readonly<Record<number, number>> {
	const out: Record<number, number> = {};
	for (const state of states) {
		if (state.final === true) out[state.id] = 0;
	}
	for (const [stateId, weight] of Object.entries(finalWeights ?? {})) {
		out[Number(stateId)] = assertWeight(weight, semiring);
	}
	return freezeRecord(out);
}

function assertNoDuplicateInputStates(states: readonly FstState[]): void {
	const seen = new Set<number>();
	for (const state of states) {
		if (seen.has(state.id)) {
			throw new TypeError(`state ${state.id} is declared more than once.`);
		}
		seen.add(state.id);
	}
}

function derivedId(fst: Omit<Fst, "id">): string {
	return `fst:${stableHash128(
		JSON.stringify({
			kind: fst.kind,
			semiring: fst.semiring,
			states: fst.states,
			arcs: fst.arcs,
			startState: fst.startState,
			finalWeights: fst.finalWeights,
			alphabet: fst.alphabet,
			metadata: fst.metadata,
		}),
	)}`;
}

export function buildFst(input: FstInput): Fst {
	const semiring = input.semiring ?? "boolean";
	const stateIds = new Set<number>();
	const states = (input.states ?? [input.startState ?? 0]).map((state) => {
		const normalized = normalizeState(state);
		stateIds.add(normalized.id);
		return normalized;
	});
	assertNoDuplicateInputStates(states);
	const arcs = (input.arcs ?? []).map((arc) => {
		assertWeight(arc.weight, semiring);
		stateIds.add(arc.from);
		stateIds.add(arc.to);
		return Object.freeze({ ...arc });
	});
	stateIds.add(input.startState ?? 0);
	for (const stateId of Object.keys(input.finalWeights ?? {}))
		stateIds.add(Number(stateId));

	const declaredStates = new Map(states.map((state) => [state.id, state]));
	const normalizedStates = [...stateIds]
		.map(
			(stateId) =>
				declaredStates.get(stateId) ?? Object.freeze({ id: stateId }),
		)
		.sort((left, right) => stateSortKey(left) - stateSortKey(right));
	const normalizedArcs = arcs.sort((left, right) =>
		compareStableText(arcSortKey(left), arcSortKey(right)),
	);
	const fstWithoutId = {
		kind: input.kind ?? inferKind(normalizedArcs),
		semiring,
		states: Object.freeze(normalizedStates),
		arcs: Object.freeze(normalizedArcs),
		startState: input.startState ?? 0,
		finalWeights: finalWeightsFrom(
			normalizedStates,
			input.finalWeights,
			semiring,
		),
		alphabet: normalizedAlphabet(normalizedArcs, input.alphabet),
		metadata:
			input.metadata === undefined ? undefined : freezeRecord(input.metadata),
	} satisfies Omit<Fst, "id">;
	const fst: Fst = Object.freeze({
		id: input.id ?? derivedId(fstWithoutId),
		...fstWithoutId,
	});
	assertFst(fst);
	return fst;
}

export function validateFst(fst: Fst): FstValidationResult {
	const errors: string[] = [];
	if (fst.kind !== "acceptor" && fst.kind !== "transducer") {
		errors.push("kind must be acceptor or transducer.");
	}
	if (
		fst.semiring !== "boolean" &&
		fst.semiring !== "tropical" &&
		fst.semiring !== "log"
	) {
		errors.push("semiring must be boolean, tropical, or log.");
	}
	const stateIds = new Set(fst.states.map((state) => state.id));
	if (stateIds.size !== fst.states.length) {
		errors.push("state ids must be unique.");
	}
	if (!stateIds.has(fst.startState))
		errors.push("startState must reference an existing state.");
	for (const state of fst.states) {
		if (!Number.isInteger(state.id) || state.id < 0) {
			errors.push(`state ${state.id} must be a non-negative integer.`);
		}
	}
	for (const arc of fst.arcs) {
		if (!stateIds.has(arc.from))
			errors.push(`arc.from ${arc.from} is not declared.`);
		if (!stateIds.has(arc.to)) errors.push(`arc.to ${arc.to} is not declared.`);
		if (typeof arc.input !== "string")
			errors.push("arc.input must be a string.");
		if (typeof arc.output !== "string")
			errors.push("arc.output must be a string.");
		if (fst.kind === "acceptor" && arc.input !== arc.output) {
			errors.push("acceptor arcs must use identical input and output labels.");
		}
		try {
			assertWeight(arc.weight, fst.semiring);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	for (const [stateId, weight] of Object.entries(fst.finalWeights)) {
		if (!stateIds.has(Number(stateId)))
			errors.push(`final state ${stateId} is not declared.`);
		try {
			assertWeight(weight, fst.semiring);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	return Object.freeze({
		valid: errors.length === 0,
		errors: Object.freeze(errors),
	});
}

export function assertFst(fst: Fst): asserts fst is Fst {
	const result = validateFst(fst);
	if (!result.valid) throw new TypeError(result.errors.join(" "));
}

export function alphabetFor(fst: Fst): readonly string[] {
	return fst.alphabet ?? normalizedAlphabet(fst.arcs) ?? Object.freeze([]);
}

export function buildAcceptor(
	entries: Iterable<string | BuildAcceptorEntry>,
	options: BuildFstOptions = {},
): Fst {
	let nextState = 1;
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	const transitions = new Map<string, number>();
	for (const entry of entries) {
		const text = typeof entry === "string" ? entry : entry.text;
		const weight = typeof entry === "string" ? undefined : entry.weight;
		let state = 0;
		for (const symbol of [...text]) {
			const key = `${state}\u0000${symbol}`;
			let to = transitions.get(key);
			if (to === undefined) {
				to = nextState;
				nextState += 1;
				transitions.set(key, to);
				arcs.push({ from: state, to, input: symbol, output: symbol });
			}
			state = to;
		}
		finalWeights[state] = weight ?? 0;
	}
	return buildFst({
		id: options.id,
		kind: "acceptor",
		semiring: options.semiring,
		states: Array.from({ length: nextState }, (_value, index) => index),
		arcs,
		startState: 0,
		finalWeights,
		metadata: options.metadata,
	});
}

export function buildStringTransducer(
	input: string,
	output: string,
	options: BuildFstOptions & { readonly weight?: number | undefined } = {},
): Fst {
	return buildTransducer([{ input, output, weight: options.weight }], options);
}

export function buildTransducer(
	entries: Iterable<BuildRelationEntry>,
	options: BuildFstOptions = {},
): Fst {
	let nextState = 1;
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	const transitions = new Map<string, number>();
	for (const entry of entries) {
		const inputSymbols = [...entry.input];
		const outputSymbols = [...entry.output];
		const length = Math.max(inputSymbols.length, outputSymbols.length);
		let state = 0;
		for (let index = 0; index < length; index += 1) {
			const input = inputSymbols[index] ?? epsilon;
			const output = outputSymbols[index] ?? epsilon;
			const key = `${state}\u0000${input}\u0000${output}`;
			let to = transitions.get(key);
			if (to === undefined) {
				to = nextState;
				nextState += 1;
				transitions.set(key, to);
				arcs.push({ from: state, to, input, output });
			}
			state = to;
		}
		finalWeights[state] = entry.weight ?? 0;
	}
	return buildFst({
		id: options.id,
		kind: "transducer",
		semiring: options.semiring,
		states: Array.from({ length: nextState }, (_value, index) => index),
		arcs,
		startState: 0,
		finalWeights,
		metadata: options.metadata,
	});
}

export function sortArcs(fst: Fst): Fst {
	return buildFst({ ...fst, id: fst.id });
}

export function union(
	fsts: readonly Fst[],
	options: BuildFstOptions = {},
): Fst {
	if (fsts.length === 0) {
		return buildFst({
			id: options.id,
			kind: "acceptor",
			semiring: options.semiring,
			states: [0],
			startState: 0,
			finalWeights: {},
			metadata: options.metadata,
		});
	}
	const semiring = assertCompatibleSemiring(fsts, options.semiring);
	const kind: FstKind = fsts.some((fst) => fst.kind === "transducer")
		? "transducer"
		: "acceptor";
	let offset = 1;
	const states: number[] = [0];
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	for (const fst of fsts) {
		arcs.push({
			from: 0,
			to: fst.startState + offset,
			input: epsilon,
			output: epsilon,
		});
		for (const state of fst.states) states.push(state.id + offset);
		for (const arc of fst.arcs)
			arcs.push({ ...arc, from: arc.from + offset, to: arc.to + offset });
		for (const [stateId, weight] of Object.entries(fst.finalWeights)) {
			finalWeights[Number(stateId) + offset] = weight;
		}
		offset += Math.max(...fst.states.map((state) => state.id), 0) + 1;
	}
	return buildFst({
		id: options.id,
		kind,
		semiring,
		states,
		arcs,
		startState: 0,
		finalWeights,
		metadata: options.metadata,
	});
}

export function concatenate(
	left: Fst,
	right: Fst,
	options: BuildFstOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right], options.semiring);
	const offset = Math.max(...left.states.map((state) => state.id), 0) + 1;
	const states = [
		...left.states.map((state) => state.id),
		...right.states.map((state) => state.id + offset),
	];
	const arcs: FstArc[] = [
		...left.arcs,
		...right.arcs.map((arc) => ({
			...arc,
			from: arc.from + offset,
			to: arc.to + offset,
		})),
	];
	for (const [stateId, weight] of Object.entries(left.finalWeights)) {
		arcs.push({
			from: Number(stateId),
			to: right.startState + offset,
			input: epsilon,
			output: epsilon,
			weight,
		});
	}
	const finalWeights: Record<number, number> = {};
	for (const [stateId, weight] of Object.entries(right.finalWeights)) {
		finalWeights[Number(stateId) + offset] = weight;
	}
	return buildFst({
		id: options.id,
		kind:
			left.kind === "acceptor" && right.kind === "acceptor"
				? "acceptor"
				: "transducer",
		semiring,
		states,
		arcs,
		startState: left.startState,
		finalWeights,
		metadata: options.metadata,
	});
}

export function invert(fst: Fst, options: ProjectOptions = {}): Fst {
	return buildFst({
		...fst,
		id: options.id ?? `${fst.id}:invert`,
		kind: fst.kind,
		arcs: fst.arcs.map((arc) => ({
			...arc,
			input: arc.output,
			output: arc.input,
		})),
	});
}

export function project(
	fst: Fst,
	side: "input" | "output",
	options: ProjectOptions = {},
): Fst {
	return buildFst({
		...fst,
		id: options.id ?? `${fst.id}:project:${side}`,
		kind: "acceptor",
		arcs: fst.arcs.map((arc) => {
			const label = side === "input" ? arc.input : arc.output;
			return { ...arc, input: label, output: label };
		}),
	});
}

export function enumerateRelations(
	fst: Fst,
	options: EnumerateOptions = {},
): FstRelation[] {
	const maxDepth = options.maxDepth ?? defaultEnumerateDepth;
	const maxResults = options.maxResults ?? defaultEnumerateResults;
	const arcsByState = new Map<number, FstArc[]>();
	for (const arc of fst.arcs) {
		const bucket = arcsByState.get(arc.from) ?? [];
		bucket.push(arc);
		arcsByState.set(arc.from, bucket);
	}
	const results: FstRelation[] = [];
	const stack: Array<{
		readonly state: number;
		readonly depth: number;
		readonly input: string;
		readonly output: string;
		readonly weight?: number | undefined;
	}> = [{ state: fst.startState, depth: 0, input: "", output: "" }];

	while (stack.length > 0 && results.length < maxResults) {
		const item = stack.pop();
		if (item === undefined) break;
		const finalWeight = fst.finalWeights[item.state];
		if (finalWeight !== undefined) {
			results.push({
				input: item.input,
				output: item.output,
				weight: combineWeights(fst.semiring, item.weight, finalWeight),
			});
		}
		if (item.depth >= maxDepth) continue;
		for (const arc of arcsByState.get(item.state) ?? []) {
			stack.push({
				state: arc.to,
				depth: item.depth + 1,
				input: item.input + arc.input,
				output: item.output + arc.output,
				weight: combineWeights(fst.semiring, item.weight, arc.weight),
			});
		}
	}

	return results.sort((left, right) => {
		const byWeight = compareWeights(fst.semiring, left.weight, right.weight);
		if (byWeight !== 0) return byWeight;
		return compareStableText(relationSortKey(left), relationSortKey(right));
	});
}

export function compose(
	left: Fst,
	right: Fst,
	options: ComposeOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right]);
	const relations: BuildRelationEntry[] = [];
	for (const leftRelation of enumerateRelations(left, options)) {
		for (const rightRelation of enumerateRelations(right, options)) {
			if (leftRelation.output !== rightRelation.input) continue;
			relations.push({
				input: leftRelation.input,
				output: rightRelation.output,
				weight: combineWeights(
					left.semiring,
					leftRelation.weight,
					rightRelation.weight,
				),
			});
		}
	}
	return buildTransducer(relations, {
		id: options.id,
		semiring,
		metadata: { operation: "compose", left: left.id, right: right.id },
	});
}

export function intersect(
	left: Fst,
	right: Fst,
	options: ComposeOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right]);
	const rightStrings = new Set(
		enumerateRelations(project(right, "input"), options).map(
			(relation) => relation.input,
		),
	);
	const entries = enumerateRelations(project(left, "input"), options)
		.filter((relation) => rightStrings.has(relation.input))
		.map((relation) => ({ text: relation.input, weight: relation.weight }));
	return buildAcceptor(entries, {
		id: options.id,
		semiring,
		metadata: { operation: "intersect", left: left.id, right: right.id },
	});
}

export function subtract(
	left: Fst,
	right: Fst,
	options: ComposeOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right]);
	const rightStrings = new Set(
		enumerateRelations(project(right, "input"), options).map(
			(relation) => relation.input,
		),
	);
	const entries = enumerateRelations(project(left, "input"), options)
		.filter((relation) => !rightStrings.has(relation.input))
		.map((relation) => ({ text: relation.input, weight: relation.weight }));
	return buildAcceptor(entries, {
		id: options.id,
		semiring,
		metadata: { operation: "subtract", left: left.id, right: right.id },
	});
}

export function epsilonRemove(fst: Fst, options: ComposeOptions = {}): Fst {
	const relations = enumerateRelations(fst, options);
	if (fst.kind === "acceptor") {
		return buildAcceptor(
			relations.map((relation) => ({
				text: relation.input,
				weight: relation.weight,
			})),
			{
				id: options.id,
				semiring: fst.semiring,
				metadata: { operation: "epsilon-remove", source: fst.id },
			},
		);
	}
	return buildTransducer(relations, {
		id: options.id,
		semiring: fst.semiring,
		metadata: { operation: "epsilon-remove", source: fst.id },
	});
}

export function determinize(fst: Fst, options: DeterminizeOptions = {}): Fst {
	const relations = enumerateRelations(fst, options);
	if (fst.kind === "acceptor") {
		return buildAcceptor(
			relations.map((relation) => ({
				text: relation.input,
				weight: relation.weight,
			})),
			{
				id: options.id,
				semiring: fst.semiring,
				metadata: { operation: "determinize", source: fst.id },
			},
		);
	}
	return buildTransducer(relations, {
		id: options.id,
		semiring: fst.semiring,
		metadata: { operation: "determinize", source: fst.id },
	});
}

export function minimize(fst: Fst, options: MinimizeOptions = {}): Fst {
	const deterministic = determinize(fst, options);
	if (deterministic.kind !== "acceptor") return deterministic;
	const relations = enumerateRelations(deterministic, options);
	return buildAcceptor(
		relations.map((relation) => ({
			text: relation.input,
			weight: relation.weight,
		})),
		{
			id: options.id,
			semiring: fst.semiring,
			metadata: { operation: "minimize", source: fst.id },
		},
	);
}

export function shortestPath(
	fst: Fst,
	options: ShortestPathOptions = {},
): FstPath[] {
	const n = options.n ?? options.maxResults ?? 1;
	const maxDepth = options.maxDepth ?? defaultEnumerateDepth;
	const maxResults = Math.max(options.maxResults ?? defaultEnumerateResults, n);
	const arcsByState = new Map<number, FstArc[]>();
	for (const arc of fst.arcs) {
		const bucket = arcsByState.get(arc.from) ?? [];
		bucket.push(arc);
		arcsByState.set(arc.from, bucket);
	}
	const paths: FstPath[] = [];
	const stack: Array<{
		readonly state: number;
		readonly depth: number;
		readonly input: string;
		readonly output: string;
		readonly arcs: readonly FstArc[];
		readonly weight?: number | undefined;
	}> = [
		{
			state: fst.startState,
			depth: 0,
			input: "",
			output: "",
			arcs: Object.freeze([]),
		},
	];

	while (stack.length > 0 && paths.length < maxResults) {
		const item = stack.pop();
		if (item === undefined) break;
		const finalWeight = fst.finalWeights[item.state];
		if (finalWeight !== undefined) {
			paths.push({
				input: item.input,
				output: item.output,
				arcs: Object.freeze([...item.arcs]),
				weight: combineWeights(fst.semiring, item.weight, finalWeight),
			});
		}
		if (item.depth >= maxDepth) continue;
		for (const arc of arcsByState.get(item.state) ?? []) {
			stack.push({
				state: arc.to,
				depth: item.depth + 1,
				input: item.input + arc.input,
				output: item.output + arc.output,
				arcs: Object.freeze([...item.arcs, arc]),
				weight: combineWeights(fst.semiring, item.weight, arc.weight),
			});
		}
	}

	return paths
		.sort((left, right) => {
			const byWeight = compareWeights(fst.semiring, left.weight, right.weight);
			if (byWeight !== 0) return byWeight;
			return compareStableText(
				`${left.input}\u0000${left.output}\u0000${left.arcs.length}`,
				`${right.input}\u0000${right.output}\u0000${right.arcs.length}`,
			);
		})
		.slice(0, n)
		.map((path) =>
			Object.freeze({
				input: path.input,
				output: path.output,
				arcs: path.arcs,
				weight: path.weight,
			}),
		);
}
