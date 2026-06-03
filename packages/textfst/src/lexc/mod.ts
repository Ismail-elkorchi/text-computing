import { buildTransducer, type Fst } from "../automaton/mod.js";
import type { FstCompileOptions } from "../regex/mod.js";

export interface LexcEntry {
	readonly surface: string;
	readonly analysis: string;
	readonly lemma?: string | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly weight?: number | undefined;
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface LexcObjectSource {
	readonly id?: string | undefined;
	readonly entries: readonly LexcEntry[];
	readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export type LexcSource = string | readonly LexcEntry[] | LexcObjectSource;
export interface LexcCompileOptions extends FstCompileOptions {}

function isLexcObjectSource(source: LexcSource): source is LexcObjectSource {
	return (
		typeof source === "object" &&
		source !== null &&
		!Array.isArray(source) &&
		"entries" in source
	);
}

function parseLexcLine(line: string): LexcEntry | undefined {
	const trimmed = line.trim();
	if (
		trimmed.length === 0 ||
		trimmed.startsWith("#") ||
		trimmed.startsWith("!")
	)
		return undefined;
	if (trimmed.includes("->")) {
		const [analysis, surface] = trimmed
			.split("->", 2)
			.map((part) => part.trim());
		if (analysis !== undefined && surface !== undefined)
			return { analysis, surface };
	}
	const fields = trimmed.split(/\t+/u);
	if (fields[0] === undefined || fields[1] === undefined) {
		throw new SyntaxError(
			`Lexicon line must contain surface and analysis fields: ${line}`,
		);
	}
	return {
		surface: fields[0],
		analysis: fields[1],
		weight: fields[2] === undefined ? undefined : Number(fields[2]),
	};
}

export function parseLexc(source: string): readonly LexcEntry[] {
	return Object.freeze(
		source.split(/\r?\n/u).flatMap((line) => parseLexcLine(line) ?? []),
	);
}

export function lexcEntries(source: LexcSource): readonly LexcEntry[] {
	if (typeof source === "string") return parseLexc(source);
	if (Array.isArray(source)) return Object.freeze([...source]);
	if (isLexcObjectSource(source)) return Object.freeze([...source.entries]);
	return Object.freeze([]);
}

export function compileLexicon(
	source: LexcSource,
	options: LexcCompileOptions = {},
): Fst {
	const entries = lexcEntries(source);
	const sourceId = isLexcObjectSource(source) ? source.id : undefined;
	const sourceMetadata = isLexcObjectSource(source)
		? source.metadata
		: undefined;
	return buildTransducer(
		entries.map((entry) => ({
			input: entry.analysis,
			output: entry.surface,
			weight: entry.weight,
		})),
		{
			id: options.id ?? sourceId,
			semiring: options.semiring,
			metadata: {
				...(sourceMetadata ?? {}),
				...(options.metadata ?? {}),
				entries: entries.map((entry) => ({
					surface: entry.surface,
					analysis: entry.analysis,
					lemma: entry.lemma,
					tags: entry.tags,
				})),
			},
		},
	);
}
