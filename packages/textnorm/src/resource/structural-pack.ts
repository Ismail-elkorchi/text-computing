import type {
	NormalizationResourceMap,
	StructuralReplacementResource,
} from "../normalize/types.js";
import { parseStructuralReplacementResource } from "./parse.js";

export interface LoadedStructuralPack {
	readonly id: string;
	readonly resources: readonly StructuralReplacementResource[];
}

export function resourcesFromStructuralPack(
	pack: LoadedStructuralPack,
): NormalizationResourceMap {
	if (pack.id.length === 0)
		throw new TypeError("structural pack id must be non-empty.");
	return Object.freeze({
		structuralResources: Object.freeze(
			pack.resources.map(parseStructuralReplacementResource),
		),
	});
}
