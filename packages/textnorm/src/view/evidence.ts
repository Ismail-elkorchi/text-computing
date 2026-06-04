import type { Evidence } from "@ismail-elkorchi/textdoc";
import { packageName, packageVersion } from "../internal/version.js";
import type {
	NormalizationMode,
	NormalizationResourceMap,
} from "../normalize/types.js";

export interface EvidenceSeed {
	readonly mode: NormalizationMode;
	readonly inputViewId: string;
	readonly resources?: NormalizationResourceMap;
	readonly resourceIds?: readonly string[];
	readonly ruleIds?: readonly string[];
	readonly fstIds?: readonly string[];
	readonly lexicalIds?: readonly string[];
	readonly producer?: string;
	readonly version?: string;
	readonly optionsHash?: string;
	readonly exactness?: Evidence["exactness"];
}

function evidenceMode(seed: EvidenceSeed): Evidence["mode"] {
	if ((seed.ruleIds?.length ?? 0) > 0) return "rule";
	if ((seed.fstIds?.length ?? 0) > 0) return "fst";
	if ((seed.lexicalIds?.length ?? 0) > 0) return "lexicon";
	if ((seed.resourceIds?.length ?? 0) > 0) return "composite";
	return "algorithm";
}

export function normalizationEvidence(seed: EvidenceSeed): Evidence {
	return Object.freeze({
		mode: evidenceMode(seed),
		exactness:
			seed.exactness ?? (evidenceMode(seed) === "algorithm" ? "E0" : "E1"),
		producer: seed.producer ?? packageName,
		packageName,
		packageVersion: seed.version ?? packageVersion,
		...(seed.resourceIds !== undefined && seed.resourceIds.length > 0
			? { resourceIds: Object.freeze([...seed.resourceIds].sort()) }
			: {}),
		...(seed.ruleIds !== undefined && seed.ruleIds.length > 0
			? { ruleIds: Object.freeze([...seed.ruleIds].sort()) }
			: {}),
		...(seed.fstIds !== undefined && seed.fstIds.length > 0
			? { fstIds: Object.freeze([...seed.fstIds].sort()) }
			: {}),
		...(seed.lexicalIds !== undefined && seed.lexicalIds.length > 0
			? { resourceIds: Object.freeze([...seed.lexicalIds].sort()) }
			: {}),
		inputViewIds: Object.freeze([seed.inputViewId]),
		...(seed.optionsHash !== undefined
			? { optionsHash: seed.optionsHash }
			: {}),
	});
}
