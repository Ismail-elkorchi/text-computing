import { lookup } from "../lexicon/lookup.ts";
import type {
	Gazetteer,
	GazetteerLookupOptions,
	GazetteerMatch,
} from "./types.ts";

export function lookupGazetteer(
	gazetteer: Gazetteer,
	text: string,
	options: GazetteerLookupOptions = {},
): GazetteerMatch[] {
	return lookup(gazetteer, text, options).filter(
		(match) =>
			(options.entityType === undefined ||
				match.entry.entityType === options.entityType) &&
			(options.kbId === undefined || match.entry.kbId === options.kbId),
	);
}
