import { buildLexicon } from "../lexicon/build.ts";
import type { Termbase, TermbaseOptions, TermEntry } from "./types.ts";

export function buildTermbase(
	entries: Iterable<TermEntry>,
	options: TermbaseOptions = {},
): Termbase {
	return buildLexicon(entries, { id: options.id ?? "termbase", ...options });
}
