import { applyDown } from "../apply/mod.js";
import {
	buildStringTransducer,
	buildTransducer,
	type Fst,
	union,
} from "../automaton/mod.js";
import type { FstCompileOptions } from "../regex/mod.js";

export interface RewriteRule {
	readonly id?: string | undefined;
	readonly input: string;
	readonly output: string;
	readonly weight?: number | undefined;
	readonly leftContext?: string | undefined;
	readonly rightContext?: string | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface RewriteCompileOptions extends FstCompileOptions {}

function firstRewriteArrow(
	rule: string,
): { index: number; length: number } | undefined {
	const thinArrow = rule.indexOf("->");
	const thickArrow = rule.indexOf("=>");
	if (thinArrow === -1) {
		return thickArrow === -1 ? undefined : { index: thickArrow, length: 2 };
	}
	if (thickArrow === -1 || thinArrow < thickArrow) {
		return { index: thinArrow, length: 2 };
	}
	return { index: thickArrow, length: 2 };
}

function parseRewriteText(rule: string): RewriteRule {
	const arrow = firstRewriteArrow(rule);
	if (arrow === undefined) {
		throw new SyntaxError("Rewrite text must use `input -> output` syntax.");
	}
	return {
		input: rule.slice(0, arrow.index).trim(),
		output: rule.slice(arrow.index + arrow.length).trim(),
	};
}

export function compileRewrite(
	rule: RewriteRule | string,
	options: RewriteCompileOptions = {},
): Fst {
	const parsed = typeof rule === "string" ? parseRewriteText(rule) : rule;
	const id = options.id ?? parsed.id;
	return buildStringTransducer(parsed.input, parsed.output, {
		id,
		semiring: options.semiring,
		weight: parsed.weight,
		metadata: {
			...(options.metadata ?? {}),
			...(parsed.metadata ?? {}),
			rule: { input: parsed.input, output: parsed.output },
			leftContext: parsed.leftContext,
			rightContext: parsed.rightContext,
		},
	});
}

export function compileRewriteSet(
	rules: readonly (RewriteRule | string)[],
	options: RewriteCompileOptions = {},
): Fst {
	return union(
		rules.map((rule, index) =>
			compileRewrite(rule, {
				...options,
				id: options.id === undefined ? undefined : `${options.id}:${index}`,
			}),
		),
		{ id: options.id, semiring: options.semiring, metadata: options.metadata },
	);
}

export function rewriteText(rule: RewriteRule | Fst, input: string): string[] {
	const fst = "arcs" in rule ? rule : compileRewrite(rule);
	return applyDown(fst, input).map((result) => result.output);
}

export function compileReplacementTable(
	entries: readonly {
		readonly input: string;
		readonly output: string;
		readonly weight?: number;
	}[],
	options: RewriteCompileOptions = {},
): Fst {
	return buildTransducer(entries, {
		id: options.id,
		semiring: options.semiring,
		metadata: options.metadata,
	});
}
