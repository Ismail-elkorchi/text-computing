import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { candidateNormalizations } from "../normalize/candidates.js";
import type {
	CandidateOptions,
	NormalizationCandidate,
} from "../normalize/types.js";

export function candidateFstSpellings(
	doc: TextDocument,
	options: CandidateOptions,
): readonly NormalizationCandidate[] {
	return candidateNormalizations(doc, {
		...options,
		modes: ["spelling"],
		resources: {
			...(options.resources?.fsts !== undefined
				? { fsts: options.resources.fsts }
				: {}),
			...(options.resources?.rewriteFsts !== undefined
				? { rewriteFsts: options.resources.rewriteFsts }
				: {}),
		},
	});
}
