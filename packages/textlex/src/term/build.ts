import { buildLexicon } from "../lexicon/build.js";
import type { Termbase, TermbaseOptions, TermEntry } from "./types.js";

export function buildTermbase(
	entries: Iterable<TermEntry>,
	options: TermbaseOptions = {},
): Termbase {
	return buildLexicon(entries, { id: options.id ?? "termbase", ...options });
}
