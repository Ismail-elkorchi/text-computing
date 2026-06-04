import type { CompiledRuleSet } from "@ismail-elkorchi/textrules";
import type { NormalizationResourceMap } from "../normalize/types.js";

export function withTextrulesResources(
	resources: NormalizationResourceMap,
	ruleSets: readonly CompiledRuleSet[],
): NormalizationResourceMap {
	return Object.freeze({ ...resources, ruleSets });
}
