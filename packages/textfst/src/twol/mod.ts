import { buildTransducer, type Fst } from "../automaton/mod.js";
import type { FstCompileOptions } from "../regex/mod.js";

export interface TwolRule {
	readonly lexical: string;
	readonly surface: string;
	readonly weight?: number | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface TwolSource {
	readonly id?: string | undefined;
	readonly rules: readonly TwolRule[];
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface TwolCompileOptions extends FstCompileOptions {}

export type TwolInput = string | readonly TwolRule[] | TwolSource;

function isTwolSource(source: TwolInput): source is TwolSource {
	return (
		typeof source === "object" &&
		source !== null &&
		!Array.isArray(source) &&
		"rules" in source
	);
}

function parseTwolLine(line: string): TwolRule | undefined {
	const trimmed = line.trim();
	if (
		trimmed.length === 0 ||
		trimmed.startsWith("#") ||
		trimmed.startsWith("!")
	)
		return undefined;
	const delimiter = trimmed.includes("\t") ? "\t" : ":";
	const fields = trimmed
		.split(delimiter)
		.map((field) => field.trim())
		.filter((field) => field.length > 0);
	const lexical = fields[0];
	const surface = fields[1];
	const weight = fields[2];
	if (lexical === undefined || surface === undefined) {
		throw new SyntaxError(
			`Two-level rule line must contain lexical and surface labels: ${line}`,
		);
	}
	return {
		lexical,
		surface,
		weight: weight === undefined ? undefined : Number(weight),
	};
}

export function parseTwol(source: string): readonly TwolRule[] {
	return Object.freeze(
		source
			.split("\n")
			.flatMap(
				(line) =>
					parseTwolLine(line.endsWith("\r") ? line.slice(0, -1) : line) ?? [],
			),
	);
}

export function twolRules(source: TwolInput): readonly TwolRule[] {
	if (typeof source === "string") return parseTwol(source);
	if (Array.isArray(source)) return Object.freeze([...source]);
	if (isTwolSource(source)) return Object.freeze([...source.rules]);
	return Object.freeze([]);
}

export function compileTwol(
	source: TwolInput,
	options: TwolCompileOptions = {},
): Fst {
	const rules = twolRules(source);
	const sourceId = isTwolSource(source) ? source.id : undefined;
	const sourceMetadata = isTwolSource(source) ? source.metadata : undefined;
	return buildTransducer(
		rules.map((rule) => ({
			input: rule.lexical,
			output: rule.surface,
			weight: rule.weight,
		})),
		{
			id: options.id ?? sourceId,
			semiring: options.semiring,
			metadata: {
				...(sourceMetadata ?? {}),
				...(options.metadata ?? {}),
				rules,
			},
		},
	);
}
