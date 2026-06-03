import {
	buildFst,
	epsilon,
	type Fst,
	type FstArc,
	type FstInput,
	union,
} from "../automaton/mod.js";
import type { SemiringName } from "../weight/mod.js";

export interface FstCompileOptions {
	readonly id?: string | undefined;
	readonly semiring?: SemiringName | undefined;
	readonly alphabet?: readonly string[] | string | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface RegexDiagnostic {
	readonly message: string;
	readonly offset: number;
}

export interface RegexAstLiteral {
	readonly type: "literal";
	readonly value: string;
}

export interface RegexAstConcat {
	readonly type: "concat";
	readonly parts: readonly RegexAstNode[];
}

export interface RegexAstAlternate {
	readonly type: "alternate";
	readonly alternatives: readonly RegexAstNode[];
}

export interface RegexAstRepeat {
	readonly type: "repeat";
	readonly node: RegexAstNode;
	readonly min: number;
	readonly max?: number | undefined;
}

export type RegexAstNode =
	| RegexAstLiteral
	| RegexAstConcat
	| RegexAstAlternate
	| RegexAstRepeat;

interface Fragment {
	readonly start: number;
	readonly end: number;
	readonly arcs: readonly FstArc[];
	readonly states: readonly number[];
}

class RegexParser {
	readonly #pattern: string;
	#index = 0;

	constructor(pattern: string) {
		this.#pattern = pattern;
	}

	parse(): RegexAstNode {
		const expression = this.#parseAlternation();
		if (this.#index !== this.#pattern.length) {
			throw new SyntaxError(`Unexpected token at offset ${this.#index}.`);
		}
		return expression;
	}

	#parseAlternation(): RegexAstNode {
		const alternatives = [this.#parseConcat()];
		while (this.#peek() === "|") {
			this.#index += 1;
			alternatives.push(this.#parseConcat());
		}
		const only = alternatives[0];
		return alternatives.length === 1 && only !== undefined
			? only
			: { type: "alternate", alternatives };
	}

	#parseConcat(): RegexAstNode {
		const parts: RegexAstNode[] = [];
		while (
			this.#index < this.#pattern.length &&
			this.#peek() !== ")" &&
			this.#peek() !== "|"
		) {
			parts.push(this.#parseRepeat());
		}
		if (parts.length === 0) return { type: "literal", value: epsilon };
		const only = parts[0];
		return parts.length === 1 && only !== undefined
			? only
			: { type: "concat", parts };
	}

	#parseRepeat(): RegexAstNode {
		let node = this.#parseAtom();
		const token = this.#peek();
		if (token === "?" || token === "*" || token === "+") {
			this.#index += 1;
			if (token === "?") node = { type: "repeat", node, min: 0, max: 1 };
			if (token === "*") node = { type: "repeat", node, min: 0 };
			if (token === "+") node = { type: "repeat", node, min: 1 };
		}
		return node;
	}

	#parseAtom(): RegexAstNode {
		const token = this.#peek();
		if (token === undefined) return { type: "literal", value: epsilon };
		if (token === "(") {
			this.#index += 1;
			const node = this.#parseAlternation();
			if (this.#peek() !== ")")
				throw new SyntaxError(`Unclosed group at offset ${this.#index}.`);
			this.#index += 1;
			return node;
		}
		if (token === "[") return this.#parseClass();
		if (token === "\\") {
			this.#index += 1;
			const escaped = this.#read();
			if (escaped === undefined)
				throw new SyntaxError("Dangling escape at end of pattern.");
			return { type: "literal", value: escaped };
		}
		this.#index += 1;
		return { type: "literal", value: token };
	}

	#parseClass(): RegexAstNode {
		this.#index += 1;
		const alternatives: RegexAstLiteral[] = [];
		while (this.#index < this.#pattern.length && this.#peek() !== "]") {
			const value = this.#read();
			if (value !== undefined) alternatives.push({ type: "literal", value });
		}
		if (this.#peek() !== "]")
			throw new SyntaxError(
				`Unclosed character class at offset ${this.#index}.`,
			);
		this.#index += 1;
		return { type: "alternate", alternatives };
	}

	#peek(): string | undefined {
		return this.#pattern[this.#index];
	}

	#read(): string | undefined {
		const value = this.#pattern[this.#index];
		if (value !== undefined) this.#index += 1;
		return value;
	}
}

export function parseRegex(pattern: string): RegexAstNode {
	return new RegexParser(pattern).parse();
}

function stateAllocator(): () => number {
	let nextState = 0;
	return () => {
		const state = nextState;
		nextState += 1;
		return state;
	};
}

function compileNode(node: RegexAstNode, nextState: () => number): Fragment {
	if (node.type === "literal") {
		const start = nextState();
		const end = nextState();
		const arc = { from: start, to: end, input: node.value, output: node.value };
		return {
			start,
			end,
			arcs: Object.freeze([arc]),
			states: Object.freeze([start, end]),
		};
	}
	if (node.type === "concat") {
		const parts = node.parts.map((part) => compileNode(part, nextState));
		const arcs: FstArc[] = [];
		const states = new Set<number>();
		for (const part of parts) {
			for (const state of part.states) states.add(state);
			arcs.push(...part.arcs);
		}
		for (let index = 0; index < parts.length - 1; index += 1) {
			const current = parts[index];
			const next = parts[index + 1];
			if (current !== undefined && next !== undefined) {
				arcs.push({
					from: current.end,
					to: next.start,
					input: epsilon,
					output: epsilon,
				});
			}
		}
		return {
			start: parts[0]?.start ?? 0,
			end: parts.at(-1)?.end ?? 0,
			arcs: Object.freeze(arcs),
			states: Object.freeze([...states]),
		};
	}
	if (node.type === "alternate") {
		const start = nextState();
		const end = nextState();
		const arcs: FstArc[] = [];
		const states = new Set<number>([start, end]);
		for (const alternative of node.alternatives) {
			const fragment = compileNode(alternative, nextState);
			for (const state of fragment.states) states.add(state);
			arcs.push({
				from: start,
				to: fragment.start,
				input: epsilon,
				output: epsilon,
			});
			arcs.push(...fragment.arcs);
			arcs.push({
				from: fragment.end,
				to: end,
				input: epsilon,
				output: epsilon,
			});
		}
		return {
			start,
			end,
			arcs: Object.freeze(arcs),
			states: Object.freeze([...states]),
		};
	}
	const fragment = compileNode(node.node, nextState);
	const start = nextState();
	const end = nextState();
	const arcs: FstArc[] = [
		{ from: start, to: fragment.start, input: epsilon, output: epsilon },
		...fragment.arcs,
		{ from: fragment.end, to: end, input: epsilon, output: epsilon },
	];
	if (node.min === 0)
		arcs.push({ from: start, to: end, input: epsilon, output: epsilon });
	if (node.max === undefined)
		arcs.push({
			from: fragment.end,
			to: fragment.start,
			input: epsilon,
			output: epsilon,
		});
	return {
		start,
		end,
		arcs: Object.freeze(arcs),
		states: Object.freeze([start, end, ...fragment.states]),
	};
}

function alphabetFromOptions(
	options: FstCompileOptions,
): readonly string[] | undefined {
	if (options.alphabet === undefined) return undefined;
	return Object.freeze(
		typeof options.alphabet === "string"
			? [...options.alphabet]
			: [...options.alphabet],
	);
}

export function compileRegex(
	pattern: string,
	options: FstCompileOptions = {},
): Fst {
	const ast = parseRegex(pattern);
	const nextState = stateAllocator();
	const fragment = compileNode(ast, nextState);
	const input: FstInput = {
		id: options.id,
		kind: "acceptor",
		semiring: options.semiring ?? "boolean",
		states: fragment.states,
		arcs: fragment.arcs,
		startState: fragment.start,
		finalWeights: { [fragment.end]: 0 },
		alphabet: alphabetFromOptions(options),
		metadata: { ...(options.metadata ?? {}), pattern },
	};
	return buildFst(input);
}

export function compileRegexes(
	patterns: readonly string[],
	options: FstCompileOptions = {},
): Fst {
	return union(
		patterns.map((pattern, index) =>
			compileRegex(pattern, {
				...options,
				id: options.id === undefined ? undefined : `${options.id}:${index}`,
			}),
		),
		{ id: options.id, semiring: options.semiring, metadata: options.metadata },
	);
}
