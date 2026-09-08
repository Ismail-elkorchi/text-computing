import type { TextDocument } from "../../document/mod.ts";
import { candidateNormalizations } from "../normalize/candidates.ts";
import type {
	CandidateOptions,
	NormalizationCandidate,
} from "../normalize/types.ts";

export function candidateHistoricalAbbreviations(
	doc: TextDocument,
	options: CandidateOptions,
): readonly NormalizationCandidate[] {
	return candidateNormalizations(doc, {
		...options,
		modes: ["historical"],
		resources:
			options.resources?.abbreviationTables === undefined
				? {}
				: { abbreviationTables: options.resources.abbreviationTables },
	});
}
