import type { TextDocument } from "../../document/mod.ts";
import { candidateNormalizations } from "../normalize/candidates.ts";
import type {
	CandidateOptions,
	NormalizationCandidate,
} from "../normalize/types.ts";

export function candidateLexiconSpellings(
	doc: TextDocument,
	options: CandidateOptions,
): readonly NormalizationCandidate[] {
	return candidateNormalizations(doc, {
		...options,
		modes: ["spelling"],
		resources:
			options.resources?.lexicons === undefined
				? {}
				: { lexicons: options.resources.lexicons },
	});
}
