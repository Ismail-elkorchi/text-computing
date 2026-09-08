import type { TextDocument } from "../../document/mod.ts";
import { candidateNormalizations } from "../normalize/candidates.ts";
import type {
	CandidateOptions,
	NormalizationCandidate,
} from "../normalize/types.ts";

export function candidateCasing(
	doc: TextDocument,
	options: CandidateOptions,
): readonly NormalizationCandidate[] {
	return candidateNormalizations(doc, { ...options, modes: ["casing"] });
}
