import type { CompiledRuleSet } from "../../rules/index.ts";
import type { NormalizationResourceMap } from "../normalize/types.ts";

export function withTextrulesResources(
	resources: NormalizationResourceMap,
	ruleSets: readonly CompiledRuleSet[],
): NormalizationResourceMap {
	return Object.freeze({ ...resources, ruleSets });
}
