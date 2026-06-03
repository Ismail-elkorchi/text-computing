import { boundedEditDistance } from "../fuzzy/edit-distance.js";
import { keyForText } from "../internal/normalize.js";
import { compareRankedMatch } from "../internal/sort.js";
import type {
	LexicalEntry,
	LexicalMatch,
	Lexicon,
	LexiconFormRef,
	LookupMode,
	LookupOptions,
} from "./types.js";

function modesFor(options: LookupOptions): readonly LookupMode[] {
	const mode = options.mode ?? "exact";
	return Object.freeze(Array.isArray(mode) ? [...mode] : [mode]);
}

function labelsMatch(
	entry: LexicalEntry,
	filter: string | readonly string[] | undefined,
): boolean {
	if (filter === undefined) return true;
	const labels = new Set(entry.labels ?? []);
	const requested = Array.isArray(filter) ? filter : [filter];
	return requested.every((label) => labels.has(label));
}

function entryMatchesFilters(
	entry: LexicalEntry,
	options: LookupOptions,
): boolean {
	return (
		(options.language === undefined || entry.language === options.language) &&
		(options.script === undefined || entry.script === options.script) &&
		(options.source === undefined || entry.source === options.source) &&
		labelsMatch(entry, options.labels)
	);
}

function matchFromRef<TEntry extends LexicalEntry>(
	lexicon: Lexicon<TEntry>,
	ref: LexiconFormRef,
	text: string,
	key: string,
	mode: LookupMode,
	score: number,
	rank: number,
	distance?: number,
): LexicalMatch<TEntry> | undefined {
	const entry = lexicon.entries[ref.entryIndex];
	if (entry === undefined) return undefined;
	return {
		entry,
		entryId: entry.id,
		form: ref.form,
		...(entry.canonical !== undefined ? { canonical: entry.canonical } : {}),
		matchedText: text,
		matchedKey: key,
		mode,
		...(entry.labels !== undefined ? { labels: entry.labels } : {}),
		...(entry.features !== undefined ? { features: entry.features } : {}),
		...(entry.language !== undefined ? { language: entry.language } : {}),
		...(entry.script !== undefined ? { script: entry.script } : {}),
		...(entry.source !== undefined ? { source: entry.source } : {}),
		score,
		rank,
		...(distance !== undefined ? { distance } : {}),
	};
}

function refsForMode(
	lexicon: Lexicon,
	text: string,
	mode: LookupMode,
	options: LookupOptions,
): readonly {
	ref: LexiconFormRef;
	key: string;
	score: number;
	distance?: number;
}[] {
	if (mode === "exact") {
		const values = lexicon.index.exact[text] ?? [];
		return values.map((ref) => ({ ref, key: text, score: 1 }));
	}
	if (mode === "normalized") {
		const key = keyForText(text, {
			normalization: options.normalization ?? "NFC",
		});
		const values = lexicon.index.normalized[key] ?? [];
		return values.map((ref) => ({ ref, key, score: 0.98 }));
	}
	if (mode === "casefold") {
		const key = keyForText(text, {
			normalization: options.normalization ?? "NFC",
			casefold: true,
		});
		const values = lexicon.index.casefold[key] ?? [];
		return values.map((ref) => ({ ref, key, score: 0.96 }));
	}
	if (mode === "prefix") {
		return lexicon.index.keys
			.filter((key) => key.startsWith(text))
			.flatMap((key) =>
				(lexicon.index.exact[key] ?? []).map((ref) => ({
					ref,
					key,
					score: 0.8,
				})),
			);
	}
	if (mode === "suffix") {
		return lexicon.index.keys
			.filter((key) => key.endsWith(text))
			.flatMap((key) =>
				(lexicon.index.exact[key] ?? []).map((ref) => ({
					ref,
					key,
					score: 0.78,
				})),
			);
	}
	const maxDistance = options.maxDistance ?? 1;
	const maxCandidates = options.maxCandidates ?? 64;
	return lexicon.index.keys
		.map((key) => ({
			key,
			distance: boundedEditDistance(text, key, maxDistance),
		}))
		.filter(
			(candidate): candidate is { key: string; distance: number } =>
				candidate.distance !== undefined,
		)
		.sort(
			(left, right) =>
				left.distance - right.distance || left.key.localeCompare(right.key),
		)
		.slice(0, maxCandidates)
		.flatMap((candidate) =>
			(lexicon.index.exact[candidate.key] ?? []).map((ref) => ({
				ref,
				key: candidate.key,
				score: 0.7 - candidate.distance * 0.05,
				distance: candidate.distance,
			})),
		);
}

export function lookup<TEntry extends LexicalEntry>(
	lexicon: Lexicon<TEntry>,
	text: string,
	options: LookupOptions = {},
): LexicalMatch<TEntry>[] {
	if (typeof text !== "string") {
		throw new TypeError("lookup text must be a string.");
	}
	const seen = new Set<string>();
	const matches: LexicalMatch<TEntry>[] = [];
	let rank = 0;
	for (const mode of modesFor(options)) {
		for (const candidate of refsForMode(lexicon, text, mode, options)) {
			const match = matchFromRef(
				lexicon,
				candidate.ref,
				text,
				candidate.key,
				mode,
				candidate.score,
				rank,
				candidate.distance,
			);
			rank += 1;
			if (match === undefined || !entryMatchesFilters(match.entry, options)) {
				continue;
			}
			const key = `${match.mode}\u0000${match.entryId}\u0000${match.form}`;
			if (seen.has(key)) continue;
			seen.add(key);
			matches.push(match);
		}
	}
	matches.sort(compareRankedMatch);
	return matches.slice(0, options.maxResults ?? matches.length);
}
