import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { candidateNormalizations } from "../normalize/candidates.js";
import type {
	CandidateOptions,
	NormalizationCandidate,
} from "../normalize/types.js";

export function candidateContractions(
	doc: TextDocument,
	options: CandidateOptions,
): readonly NormalizationCandidate[] {
	return candidateNormalizations(doc, {
		...options,
		modes: ["dialect"],
		resources:
			options.resources?.contractionMaps === undefined
				? {}
				: { dialectMaps: options.resources.contractionMaps },
	});
}
