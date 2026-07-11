import { stableHash128 } from "@ismail-elkorchi/textfacts/hash";

import type { SemiringName } from "../weight/mod.js";
import {
	assertWeight,
	combineWeights,
	compareWeights,
	getSemiring,
} from "../weight/mod.js";

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

function arcsBySource(fst: Fst): ReadonlyMap<number, readonly FstArc[]> {
	const result = new Map<number, FstArc[]>();
	for (const arc of fst.arcs) {
		const bucket = result.get(arc.from) ?? [];
		bucket.push(arc);
		result.set(arc.from, bucket);
	}
	return result;
}

function expandArcLabels(fst: Fst): Fst {
	let nextState = Math.max(...fst.states.map((state) => state.id), -1) + 1;
	const states: (number | FstState)[] = [...fst.states];
	const arcs: FstArc[] = [];
	for (const arc of fst.arcs) {
		const inputs = [...arc.input];
		const outputs = [...arc.output];
		const length = Math.max(inputs.length, outputs.length);
		if (length <= 1) {
			arcs.push(arc);
			continue;
		}
		let from = arc.from;
		for (let index = 0; index < length; index += 1) {
			const to = index === length - 1 ? arc.to : nextState++;
			if (to !== arc.to) states.push(to);
			arcs.push({
				from,
				to,
				input: inputs[index] ?? epsilon,
				output: outputs[index] ?? epsilon,
				...(index === 0 && arc.weight !== undefined
					? { weight: arc.weight }
					: {}),
				...(index === 0 && arc.metadata !== undefined
					? { metadata: arc.metadata }
					: {}),
			});
			from = to;
		}
	}
	if (
		arcs.length === fst.arcs.length &&
		arcs.every((arc, index) => arc === fst.arcs[index])
	) {
		return fst;
	}
	return buildFst({
		...fst,
		id: `${fst.id}:expanded-labels`,
		states,
		arcs,
	});
}

interface CompositionState {
	readonly left: number;
	readonly right: number;
	readonly filter: 0 | 1 | 2;
}

export function compose(
	left: Fst,
	right: Fst,
	options: ComposeOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right]);
	const expandedLeft = expandArcLabels(left);
	const expandedRight = expandArcLabels(right);
	const leftArcs = arcsBySource(expandedLeft);
	const rightArcs = arcsBySource(expandedRight);
	const states: CompositionState[] = [];
	const stateIds = new Map<string, number>();
	const pending: number[] = [];
	const intern = (state: CompositionState): number => {
		const key = `${state.left}\u0000${state.right}\u0000${state.filter}`;
		const existing = stateIds.get(key);
		if (existing !== undefined) return existing;
		const id = states.length;
		states.push(state);
		stateIds.set(key, id);
		pending.push(id);
		return id;
	};
	const startState = intern({
		left: expandedLeft.startState,
		right: expandedRight.startState,
		filter: 0,
	});
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	for (let cursor = 0; cursor < pending.length; cursor += 1) {
		const from = pending[cursor] as number;
		const state = states[from] as CompositionState;
		const leftFinal = expandedLeft.finalWeights[state.left];
		const rightFinal = expandedRight.finalWeights[state.right];
		if (leftFinal !== undefined && rightFinal !== undefined) {
			finalWeights[from] = combineWeights(semiring, leftFinal, rightFinal) ?? 0;
		}
		const outgoingLeft = leftArcs.get(state.left) ?? [];
		const outgoingRight = rightArcs.get(state.right) ?? [];
		for (const leftArc of outgoingLeft) {
			for (const rightArc of outgoingRight) {
				if (leftArc.output !== epsilon && leftArc.output === rightArc.input) {
					const to = intern({
						left: leftArc.to,
						right: rightArc.to,
						filter: 0,
					});
					const weight = combineWeights(
						semiring,
						leftArc.weight,
						rightArc.weight,
					);
					arcs.push({
						from,
						to,
						input: leftArc.input,
						output: rightArc.output,
						...(weight !== undefined ? { weight } : {}),
					});
				}
				if (
					state.filter === 0 &&
					leftArc.output === epsilon &&
					rightArc.input === epsilon
				) {
					const to = intern({
						left: leftArc.to,
						right: rightArc.to,
						filter: 0,
					});
					const weight = combineWeights(
						semiring,
						leftArc.weight,
						rightArc.weight,
					);
					arcs.push({
						from,
						to,
						input: leftArc.input,
						output: rightArc.output,
						...(weight !== undefined ? { weight } : {}),
					});
				}
			}
			if (leftArc.output === epsilon && state.filter !== 2) {
				const to = intern({
					left: leftArc.to,
					right: state.right,
					filter: 1,
				});
				arcs.push({
					from,
					to,
					input: leftArc.input,
					output: epsilon,
					...(leftArc.weight !== undefined ? { weight: leftArc.weight } : {}),
				});
			}
		}
		for (const rightArc of outgoingRight) {
			if (rightArc.input !== epsilon || state.filter === 1) continue;
			const to = intern({
				left: state.left,
				right: rightArc.to,
				filter: 2,
			});
			arcs.push({
				from,
				to,
				input: epsilon,
				output: rightArc.output,
				...(rightArc.weight !== undefined ? { weight: rightArc.weight } : {}),
			});
		}
	}
	return buildFst({
		id: options.id,
		kind:
			left.kind === "acceptor" && right.kind === "acceptor"
				? "acceptor"
				: "transducer",
		semiring,
		states: states.map((_state, id) => id),
		arcs,
		startState,
		finalWeights,
		metadata: { operation: "compose", left: left.id, right: right.id },
	});
}

export function intersect(
	left: Fst,
	right: Fst,
	options: ComposeOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right]);
	const product = compose(project(left, "input"), project(right, "input"));
	return buildFst({
		...product,
		id: options.id,
		kind: "acceptor",
		semiring,
		metadata: { operation: "intersect", left: left.id, right: right.id },
	});
}

function epsilonClosureWeights(fst: Fst, source: number): Map<number, number> {
	const outgoing = arcsBySource(fst);
	const distances = new Map<number, number>([[source, 0]]);
	const unsettled = new Set<number>([source]);
	while (unsettled.size > 0) {
		let state: number | undefined;
		let distance = Number.POSITIVE_INFINITY;
		for (const candidate of unsettled) {
			const candidateDistance =
				distances.get(candidate) ?? Number.POSITIVE_INFINITY;
			if (candidateDistance < distance) {
				state = candidate;
				distance = candidateDistance;
			}
		}
		if (state === undefined) break;
		unsettled.delete(state);
		for (const arc of outgoing.get(state) ?? []) {
			if (arc.input !== epsilon || arc.output !== epsilon) continue;
			const nextDistance = distance + (arc.weight ?? 0);
			if (nextDistance >= (distances.get(arc.to) ?? Number.POSITIVE_INFINITY)) {
				continue;
			}
			distances.set(arc.to, nextDistance);
			unsettled.add(arc.to);
		}
	}
	return distances;
}

function invertMatrix(matrix: readonly (readonly number[])[]): number[][] {
	const size = matrix.length;
	const augmented = matrix.map((row, rowIndex) => [
		...row,
		...Array.from({ length: size }, (_value, column) =>
			rowIndex === column ? 1 : 0,
		),
	]);
	for (let column = 0; column < size; column += 1) {
		let pivot = column;
		for (let row = column + 1; row < size; row += 1) {
			if (
				Math.abs(augmented[row]?.[column] ?? 0) >
				Math.abs(augmented[pivot]?.[column] ?? 0)
			) {
				pivot = row;
			}
		}
		const pivotValue = augmented[pivot]?.[column] ?? 0;
		if (!Number.isFinite(pivotValue) || Math.abs(pivotValue) < 1e-12) {
			throw new TypeError(
				"log-semiring epsilon closure diverges; epsilon cycles must have finite total path mass.",
			);
		}
		[augmented[column], augmented[pivot]] = [
			augmented[pivot] as number[],
			augmented[column] as number[],
		];
		for (let index = 0; index < size * 2; index += 1) {
			const row = augmented[column] as number[];
			row[index] = (row[index] ?? 0) / pivotValue;
		}
		for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
			if (rowIndex === column) continue;
			const row = augmented[rowIndex] as number[];
			const factor = row[column] ?? 0;
			if (factor === 0) continue;
			for (let index = 0; index < size * 2; index += 1) {
				row[index] =
					(row[index] ?? 0) - factor * (augmented[column]?.[index] ?? 0);
			}
		}
	}
	return augmented.map((row) => row.slice(size));
}

function logEpsilonClosures(fst: Fst): Map<number, Map<number, number>> {
	const stateIds = fst.states.map((state) => state.id);
	const indexes = new Map(stateIds.map((stateId, index) => [stateId, index]));
	const size = stateIds.length;
	const probabilities = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => 0),
	);
	const cycleDistances = Array.from({ length: size }, () =>
		Array.from({ length: size }, () => Number.POSITIVE_INFINITY),
	);
	for (const arc of fst.arcs) {
		if (arc.input !== epsilon || arc.output !== epsilon) continue;
		const from = indexes.get(arc.from);
		const to = indexes.get(arc.to);
		if (from === undefined || to === undefined) continue;
		const probability = Math.exp(-(arc.weight ?? 0));
		if (!Number.isFinite(probability)) {
			throw new TypeError(
				"log-semiring epsilon closure diverges because an epsilon weight has unbounded mass.",
			);
		}
		const probabilityRow = probabilities[from] as number[];
		probabilityRow[to] = (probabilityRow[to] ?? 0) + probability;
		const distanceRow = cycleDistances[from] as number[];
		distanceRow[to] = Math.min(
			distanceRow[to] ?? Number.POSITIVE_INFINITY,
			arc.weight ?? 0,
		);
	}
	for (let middle = 0; middle < size; middle += 1) {
		for (let from = 0; from < size; from += 1) {
			for (let to = 0; to < size; to += 1) {
				const through =
					(cycleDistances[from]?.[middle] ?? Number.POSITIVE_INFINITY) +
					(cycleDistances[middle]?.[to] ?? Number.POSITIVE_INFINITY);
				if (
					through < (cycleDistances[from]?.[to] ?? Number.POSITIVE_INFINITY)
				) {
					(cycleDistances[from] as number[])[to] = through;
				}
			}
		}
	}
	if (
		cycleDistances.some(
			(row, index) => (row[index] ?? Number.POSITIVE_INFINITY) <= 0,
		)
	) {
		throw new TypeError(
			"log-semiring epsilon closure diverges on a zero- or negative-weight epsilon cycle.",
		);
	}
	const identityMinusTransitions = probabilities.map((row, rowIndex) =>
		row.map(
			(probability, column) => (rowIndex === column ? 1 : 0) - probability,
		),
	);
	const closureProbabilities = invertMatrix(identityMinusTransitions);
	const result = new Map<number, Map<number, number>>();
	for (let from = 0; from < size; from += 1) {
		const closure = new Map<number, number>();
		for (let to = 0; to < size; to += 1) {
			const probability = closureProbabilities[from]?.[to] ?? 0;
			if (probability < -1e-10 || !Number.isFinite(probability)) {
				throw new TypeError(
					"log-semiring epsilon closure diverges; epsilon cycles must have total path mass below one.",
				);
			}
			if (probability <= 1e-15) continue;
			closure.set(stateIds[to] as number, -Math.log(probability));
		}
		result.set(stateIds[from] as number, closure);
	}
	return result;
}

function allEpsilonClosures(fst: Fst): Map<number, Map<number, number>> {
	if (fst.semiring === "log") return logEpsilonClosures(fst);
	return new Map(
		fst.states.map((state) => [state.id, epsilonClosureWeights(fst, state.id)]),
	);
}

export function subtract(
	left: Fst,
	right: Fst,
	options: ComposeOptions = {},
): Fst {
	const semiring = assertCompatibleSemiring([left, right]);
	const leftAcceptor = epsilonRemove(expandArcLabels(project(left, "input")));
	const rightAcceptor = determinize(expandArcLabels(project(right, "input")));
	const leftArcs = arcsBySource(leftAcceptor);
	const rightTransitions = new Map<string, number>();
	for (const arc of rightAcceptor.arcs) {
		rightTransitions.set(`${arc.from}\u0000${arc.input}`, arc.to);
	}
	const states: Array<readonly [number, number]> = [];
	const stateIds = new Map<string, number>();
	const pending: number[] = [];
	const intern = (pair: readonly [number, number]): number => {
		const key = `${pair[0]}\u0000${pair[1]}`;
		const existing = stateIds.get(key);
		if (existing !== undefined) return existing;
		const id = states.length;
		states.push(pair);
		stateIds.set(key, id);
		pending.push(id);
		return id;
	};
	const startState = intern([
		leftAcceptor.startState,
		rightAcceptor.startState,
	]);
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	for (let cursor = 0; cursor < pending.length; cursor += 1) {
		const from = pending[cursor] as number;
		const [leftState, rightState] = states[from] as readonly [number, number];
		const leftFinal = leftAcceptor.finalWeights[leftState];
		if (
			leftFinal !== undefined &&
			(rightState < 0 || rightAcceptor.finalWeights[rightState] === undefined)
		) {
			finalWeights[from] = leftFinal;
		}
		for (const arc of leftArcs.get(leftState) ?? []) {
			const rightTarget =
				rightState < 0
					? -1
					: (rightTransitions.get(`${rightState}\u0000${arc.input}`) ?? -1);
			const to = intern([arc.to, rightTarget]);
			arcs.push({ ...arc, from, to });
		}
	}
	return buildFst({
		id: options.id,
		kind: "acceptor",
		semiring,
		states: states.map((_state, id) => id),
		arcs,
		startState,
		finalWeights,
		metadata: { operation: "subtract", left: left.id, right: right.id },
	});
}

export function epsilonRemove(fst: Fst, options: ComposeOptions = {}): Fst {
	const expanded = expandArcLabels(fst);
	const outgoing = arcsBySource(expanded);
	const arcsByKey = new Map<string, FstArc>();
	const finalWeights: Record<number, number> = {};
	const closures = allEpsilonClosures(expanded);
	const semiring = getSemiring(expanded.semiring);
	for (const state of expanded.states) {
		const closure = closures.get(state.id) ?? new Map([[state.id, 0]]);
		for (const [reachable, closureWeight] of closure) {
			const finalWeight = expanded.finalWeights[reachable];
			if (finalWeight !== undefined) {
				const candidate = closureWeight + finalWeight;
				finalWeights[state.id] =
					finalWeights[state.id] === undefined
						? candidate
						: semiring.plus(finalWeights[state.id] as number, candidate);
			}
			for (const arc of outgoing.get(reachable) ?? []) {
				if (arc.input === epsilon && arc.output === epsilon) continue;
				const weight = closureWeight + (arc.weight ?? 0);
				const key = `${state.id}\u0000${arc.to}\u0000${arc.input}\u0000${arc.output}`;
				const existing = arcsByKey.get(key);
				arcsByKey.set(key, {
					...(existing ?? arc),
					from: state.id,
					...(expanded.semiring === "boolean"
						? { weight: undefined }
						: {
								weight:
									existing === undefined
										? weight
										: semiring.plus(existing.weight ?? 0, weight),
							}),
				});
			}
		}
	}
	return buildFst({
		id: options.id,
		kind: expanded.kind,
		semiring: fst.semiring,
		states: expanded.states,
		arcs: [...arcsByKey.values()],
		startState: expanded.startState,
		finalWeights,
		metadata: { operation: "epsilon-remove", source: fst.id },
	});
}

type WeightedSubset = readonly (readonly [number, number])[];

function subsetKey(subset: WeightedSubset): string {
	return subset.map(([state, weight]) => `${state}:${weight}`).join("|");
}

function semiringSum(
	semiringName: SemiringName,
	values: readonly number[],
): number {
	const semiring = getSemiring(semiringName);
	return values.reduce(
		(total, value) => semiring.plus(total, value),
		semiring.zero,
	);
}

function semiringResidual(
	semiringName: SemiringName,
	weight: number,
	factor: number,
): number {
	if (semiringName === "boolean") return 0;
	const residual = weight - factor;
	if (!Number.isFinite(residual)) {
		throw new TypeError(
			"weighted determinization produced a non-finite residual",
		);
	}
	return Object.is(residual, -0) || Math.abs(residual) < 1e-12 ? 0 : residual;
}

export function determinize(fst: Fst, options: DeterminizeOptions = {}): Fst {
	const source = epsilonRemove(expandArcLabels(fst));
	const outgoing = arcsBySource(source);
	const subsets: WeightedSubset[] = [];
	const stateIds = new Map<string, number>();
	const pending: number[] = [];
	const intern = (entries: Iterable<readonly [number, number]>): number => {
		const subset = Object.freeze(
			[...entries].sort((left, right) => left[0] - right[0]),
		) as WeightedSubset;
		const key = subsetKey(subset);
		const existing = stateIds.get(key);
		if (existing !== undefined) return existing;
		const id = subsets.length;
		subsets.push(subset);
		stateIds.set(key, id);
		pending.push(id);
		return id;
	};
	const startState = intern([[source.startState, 0]]);
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	for (let cursor = 0; cursor < pending.length; cursor += 1) {
		const from = pending[cursor] as number;
		const subset = subsets[from] as WeightedSubset;
		const finalCandidates = subset.flatMap(([state, residual]) => {
			const finalWeight = source.finalWeights[state];
			return finalWeight === undefined ? [] : [residual + finalWeight];
		});
		if (finalCandidates.length > 0) {
			finalWeights[from] = semiringSum(source.semiring, finalCandidates);
		}
		const grouped = new Map<string, Map<number, number>>();
		for (const [state, residual] of subset) {
			for (const arc of outgoing.get(state) ?? []) {
				const label = JSON.stringify([arc.input, arc.output]);
				const destinations = grouped.get(label) ?? new Map<number, number>();
				const cost = residual + (arc.weight ?? 0);
				const previous = destinations.get(arc.to);
				destinations.set(
					arc.to,
					previous === undefined
						? cost
						: getSemiring(source.semiring).plus(previous, cost),
				);
				grouped.set(label, destinations);
			}
		}
		for (const [label, destinations] of [...grouped.entries()].sort(
			([leftLabel], [rightLabel]) => compareStableText(leftLabel, rightLabel),
		)) {
			const transitionWeight = semiringSum(source.semiring, [
				...destinations.values(),
			]);
			const residuals = [...destinations].map(
				([state, weight]) =>
					[
						state,
						semiringResidual(source.semiring, weight, transitionWeight),
					] as const,
			);
			const to = intern(residuals);
			const [input, output] = JSON.parse(label) as [string, string];
			arcs.push({
				from,
				to,
				input,
				output,
				...(source.semiring === "boolean" ? {} : { weight: transitionWeight }),
			});
		}
	}
	return buildFst({
		id: options.id,
		kind: source.kind,
		semiring: fst.semiring,
		states: subsets.map((_subset, id) => id),
		arcs,
		startState,
		finalWeights,
		metadata: { operation: "determinize", source: fst.id },
	});
}

export function minimize(fst: Fst, options: MinimizeOptions = {}): Fst {
	const deterministic = determinize(fst, options);
	const outgoing = arcsBySource(deterministic);
	let partitions = new Map<number, number>();
	const initialClasses = new Map<string, number>();
	for (const state of deterministic.states) {
		const finalWeight = deterministic.finalWeights[state.id];
		const signature =
			finalWeight === undefined ? "non-final" : `final:${finalWeight}`;
		let partition = initialClasses.get(signature);
		if (partition === undefined) {
			partition = initialClasses.size;
			initialClasses.set(signature, partition);
		}
		partitions.set(state.id, partition);
	}
	while (true) {
		const classes = new Map<string, number>();
		const next = new Map<number, number>();
		for (const state of deterministic.states) {
			const finalWeight = deterministic.finalWeights[state.id];
			const transitions = (outgoing.get(state.id) ?? []).map((arc) => [
				arc.input,
				arc.output,
				arc.weight ?? 0,
				partitions.get(arc.to) ?? -1,
			]);
			const signature = JSON.stringify([
				finalWeight === undefined ? null : finalWeight,
				transitions,
			]);
			let partition = classes.get(signature);
			if (partition === undefined) {
				partition = classes.size;
				classes.set(signature, partition);
			}
			next.set(state.id, partition);
		}
		const stable = deterministic.states.every(
			(state) => next.get(state.id) === partitions.get(state.id),
		);
		partitions = next;
		if (stable) break;
	}
	const partitionCount = Math.max(...partitions.values(), -1) + 1;
	const representatives = Array.from({ length: partitionCount }, () => -1);
	for (const state of deterministic.states) {
		const partition = partitions.get(state.id) as number;
		if ((representatives[partition] ?? -1) < 0)
			representatives[partition] = state.id;
	}
	const arcs: FstArc[] = [];
	const finalWeights: Record<number, number> = {};
	for (let partition = 0; partition < partitionCount; partition += 1) {
		const representative = representatives[partition] as number;
		const finalWeight = deterministic.finalWeights[representative];
		if (finalWeight !== undefined) finalWeights[partition] = finalWeight;
		for (const arc of outgoing.get(representative) ?? []) {
			arcs.push({
				...arc,
				from: partition,
				to: partitions.get(arc.to) as number,
			});
		}
	}
	return buildFst({
		id: options.id,
		kind: deterministic.kind,
		semiring: deterministic.semiring,
		states: Array.from({ length: partitionCount }, (_value, id) => id),
		arcs,
		startState: partitions.get(deterministic.startState) as number,
		finalWeights,
		metadata: { operation: "minimize", source: fst.id },
	});
}

interface WeightedStatePath {
	readonly state: number;
	readonly input: string;
	readonly output: string;
	readonly arcs: readonly FstArc[];
	readonly weight: number;
}

function pathOrder(
	left: Pick<FstPath, "input" | "output" | "arcs"> & {
		readonly weight: number;
	},
	right: Pick<FstPath, "input" | "output" | "arcs"> & {
		readonly weight: number;
	},
): number {
	return (
		left.weight - right.weight ||
		compareStableText(
			`${left.input}\u0000${left.output}\u0000${left.arcs.length}`,
			`${right.input}\u0000${right.output}\u0000${right.arcs.length}`,
		)
	);
}

function boundedShortestPaths(
	fst: Fst,
	n: number,
	maxDepth: number,
): FstPath[] {
	const outgoing = arcsBySource(fst);
	let layer = new Map<number, WeightedStatePath[]>([
		[
			fst.startState,
			[
				{
					state: fst.startState,
					input: "",
					output: "",
					arcs: Object.freeze([]),
					weight: 0,
				},
			],
		],
	]);
	const results: Array<{
		readonly input: string;
		readonly output: string;
		readonly arcs: readonly FstArc[];
		readonly weight: number;
	}> = [];
	for (let depth = 0; depth <= maxDepth; depth += 1) {
		for (const paths of layer.values()) {
			for (const path of paths) {
				const finalWeight = fst.finalWeights[path.state];
				if (finalWeight !== undefined) {
					results.push({ ...path, weight: path.weight + finalWeight });
				}
			}
		}
		if (depth === maxDepth) break;
		const next = new Map<number, WeightedStatePath[]>();
		for (const paths of layer.values()) {
			for (const path of paths) {
				for (const arc of outgoing.get(path.state) ?? []) {
					const candidate: WeightedStatePath = {
						state: arc.to,
						input: path.input + arc.input,
						output: path.output + arc.output,
						arcs: Object.freeze([...path.arcs, arc]),
						weight: path.weight + (arc.weight ?? 0),
					};
					next.set(arc.to, [...(next.get(arc.to) ?? []), candidate]);
				}
			}
		}
		layer = new Map(
			[...next].map(([state, paths]) => [
				state,
				paths.sort(pathOrder).slice(0, n),
			]),
		);
	}
	return results
		.sort(pathOrder)
		.slice(0, n)
		.map((path) =>
			Object.freeze({
				input: path.input,
				output: path.output,
				arcs: path.arcs,
				...(fst.semiring === "boolean" ? {} : { weight: path.weight }),
			}),
		);
}

export function shortestPath(
	fst: Fst,
	options: ShortestPathOptions = {},
): FstPath[] {
	const n = options.n ?? options.maxResults ?? 1;
	if (!Number.isInteger(n) || n <= 0) {
		throw new RangeError("shortestPath n must be a positive integer.");
	}
	const maxDepth =
		options.maxDepth ?? Math.max(defaultEnumerateDepth, fst.states.length);
	if (
		fst.arcs.some((arc) => (arc.weight ?? 0) < 0) ||
		Object.values(fst.finalWeights).some((weight) => weight < 0)
	) {
		return boundedShortestPaths(fst, n, maxDepth);
	}
	const arcsByState = arcsBySource(fst);
	const paths: FstPath[] = [];
	type SearchItem =
		| {
				readonly kind: "state";
				readonly state: number;
				readonly depth: number;
				readonly input: string;
				readonly output: string;
				readonly arcs: readonly FstArc[];
				readonly weight: number;
		  }
		| {
				readonly kind: "result";
				readonly input: string;
				readonly output: string;
				readonly arcs: readonly FstArc[];
				readonly weight: number;
		  };
	const queue: SearchItem[] = [
		{
			kind: "state",
			state: fst.startState,
			depth: 0,
			input: "",
			output: "",
			arcs: Object.freeze([]),
			weight: 0,
		},
	];
	const itemKey = (item: SearchItem): string =>
		`${item.input}\u0000${item.output}\u0000${item.arcs.length}`;
	while (queue.length > 0 && paths.length < n) {
		queue.sort(
			(left, right) =>
				left.weight - right.weight ||
				(left.kind === right.kind ? 0 : left.kind === "result" ? -1 : 1) ||
				compareStableText(itemKey(left), itemKey(right)),
		);
		const item = queue.shift();
		if (item === undefined) break;
		if (item.kind === "result") {
			paths.push(
				Object.freeze({
					input: item.input,
					output: item.output,
					arcs: item.arcs,
					...(fst.semiring === "boolean" ? {} : { weight: item.weight }),
				}),
			);
			continue;
		}
		const finalWeight = fst.finalWeights[item.state];
		if (finalWeight !== undefined) {
			queue.push({
				kind: "result",
				input: item.input,
				output: item.output,
				arcs: item.arcs,
				weight: item.weight + finalWeight,
			});
		}
		if (item.depth >= maxDepth) continue;
		for (const arc of arcsByState.get(item.state) ?? []) {
			queue.push({
				kind: "state",
				state: arc.to,
				depth: item.depth + 1,
				input: item.input + arc.input,
				output: item.output + arc.output,
				arcs: Object.freeze([...item.arcs, arc]),
				weight: item.weight + (arc.weight ?? 0),
			});
		}
	}
	return paths;
}
