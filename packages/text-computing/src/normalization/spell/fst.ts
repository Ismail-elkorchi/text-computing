import type { TextDocument } from "../../document/mod.ts";
import { candidateNormalizations } from "../normalize/candidates.ts";
import type {
	CandidateOptions,
	NormalizationCandidate,
} from "../normalize/types.ts";

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
