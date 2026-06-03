import { assertJsonRecord } from "../internal/json.js";
import { buildLexicon } from "../lexicon/build.js";
import type { Gazetteer, GazetteerEntry, GazetteerOptions } from "./types.js";

export function buildGazetteer(
	entries: Iterable<GazetteerEntry>,
	options: GazetteerOptions = {},
): Gazetteer {
	const normalized = [...entries].map((entry, index) => {
		if (entry.disambiguationHints !== undefined) {
			assertJsonRecord(
				entry.disambiguationHints,
				`entries[${index}].disambiguationHints`,
			);
		}
		if (entry.priority !== undefined && !Number.isFinite(entry.priority)) {
			throw new TypeError(`entries[${index}].priority must be finite.`);
		}
		return entry;
	});
	return buildLexicon(normalized, {
		id: options.id ?? "gazetteer",
		...options,
	});
}
