import { lookup } from "../lexicon/lookup.js";
import type { Termbase, TermbaseLookupOptions, TermMatch } from "./types.js";

export function lookupTermbase(
	termbase: Termbase,
	text: string,
	options: TermbaseLookupOptions = {},
): TermMatch[] {
	return lookup(termbase, text, options).filter(
		(match) =>
			(options.domain === undefined ||
				(match.entry.domains ?? []).includes(options.domain)) &&
			(options.termType === undefined ||
				match.entry.termType === options.termType),
	);
}
