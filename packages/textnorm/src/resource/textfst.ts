import type { Fst } from "@ismail-elkorchi/textfst";
import type { NormalizationResourceMap } from "../normalize/types.js";

export function withTextfstResources(
	resources: NormalizationResourceMap,
	input: {
		readonly fsts?: readonly Fst[];
		readonly rewriteFsts?: readonly Fst[];
		readonly transliterationFsts?: readonly Fst[];
	},
): NormalizationResourceMap {
	return Object.freeze({
		...resources,
		...(input.fsts !== undefined ? { fsts: input.fsts } : {}),
		...(input.rewriteFsts !== undefined
			? { rewriteFsts: input.rewriteFsts }
			: {}),
		...(input.transliterationFsts !== undefined
			? { transliterationFsts: input.transliterationFsts }
			: {}),
	});
}
