export {
	confusionTableFromResource,
	parseStructuralReplacementResource,
	spellingMapFromResource,
	transliterationMapFromResource,
} from "./parse.js";
export {
	type LoadedStructuralPack,
	resourcesFromStructuralPack,
} from "./structural-pack.js";
export { withTextfstResources } from "./textfst.js";
export { withTextlexResources } from "./textlex.js";
export { withTextrulesResources } from "./textrules.js";
export type * from "./types.js";
