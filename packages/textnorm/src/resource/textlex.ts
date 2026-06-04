import type { AbbreviationTable, Lexicon } from "@ismail-elkorchi/textlex";
import type { NormalizationResourceMap } from "../normalize/types.js";

export function withTextlexResources(
	resources: NormalizationResourceMap,
	input: {
		readonly lexicons?: readonly Lexicon[];
		readonly abbreviationTables?: readonly AbbreviationTable[];
	},
): NormalizationResourceMap {
	return Object.freeze({
		...resources,
		...(input.lexicons !== undefined ? { lexicons: input.lexicons } : {}),
		...(input.abbreviationTables !== undefined
			? { abbreviationTables: input.abbreviationTables }
			: {}),
	});
}
