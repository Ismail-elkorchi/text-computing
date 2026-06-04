import type { SpellingMap, SpellingMapEntry } from "../normalize/types.js";
import {
	type BuildSpellingMapOptions,
	buildSpellingMap,
} from "../spell/map.js";

export function buildOrthographyMap(
	entries: Iterable<SpellingMapEntry>,
	options: Omit<BuildSpellingMapOptions, "kind"> = {},
): SpellingMap {
	return buildSpellingMap(entries, {
		...options,
		id: options.id ?? "orthography-map",
		kind: "historical",
	});
}
