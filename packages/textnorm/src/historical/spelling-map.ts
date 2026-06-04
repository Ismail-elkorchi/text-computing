import { deepFreeze } from "../internal/freeze.js";
import { assertJsonValue } from "../internal/json.js";
import type {
	HistoricalSpellingMap,
	SpellingMapEntry,
} from "../normalize/types.js";
import {
	type BuildSpellingMapOptions,
	buildSpellingMap,
} from "../spell/map.js";

export interface BuildHistoricalSpellingMapOptions
	extends Omit<BuildSpellingMapOptions, "kind"> {
	readonly period?: string;
	readonly orthography?: string;
	readonly witnessId?: string;
	readonly editionId?: string;
	readonly editorialConvention?: string;
}

export function buildHistoricalSpellingMap(
	entries: Iterable<SpellingMapEntry>,
	options: BuildHistoricalSpellingMapOptions = {},
): HistoricalSpellingMap {
	assertJsonValue(options.metadata ?? {});
	const base = buildSpellingMap(entries, {
		...options,
		id: options.id ?? "historical-spelling-map",
		kind: "historical",
	});
	return deepFreeze({
		...base,
		kind: "historical",
		...(options.period !== undefined ? { period: options.period } : {}),
		...(options.orthography !== undefined
			? { orthography: options.orthography }
			: {}),
		...(options.witnessId !== undefined
			? { witnessId: options.witnessId }
			: {}),
		...(options.editionId !== undefined
			? { editionId: options.editionId }
			: {}),
		...(options.editorialConvention !== undefined
			? { editorialConvention: options.editorialConvention }
			: {}),
	}) as HistoricalSpellingMap;
}
