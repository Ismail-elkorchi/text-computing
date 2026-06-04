import type { Score } from "@ismail-elkorchi/textdoc";
import { deepFreeze } from "../internal/freeze.js";
import { assertJsonValue } from "../internal/json.js";
import { orderedRecord, sortedUnique } from "../internal/stable.js";
import type {
	ReplacementCandidate,
	SpellingMap,
	SpellingMapEntry,
} from "../normalize/types.js";

export interface BuildSpellingMapOptions {
	readonly id?: string;
	readonly kind?: SpellingMap["kind"];
	readonly language?: string;
	readonly script?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly duplicatePolicy?: "reject" | "merge";
}

function candidateValue(candidate: string | ReplacementCandidate): string {
	return typeof candidate === "string" ? candidate : candidate.value;
}

function normalizedCandidates(
	candidates: readonly (string | ReplacementCandidate)[],
): readonly (string | ReplacementCandidate)[] {
	if (candidates.length === 0) {
		throw new TypeError("spelling map entries require at least one candidate.");
	}
	return Object.freeze(
		[...candidates].sort((left, right) =>
			candidateValue(left).localeCompare(candidateValue(right)),
		),
	);
}

function normalizeEntry(entry: SpellingMapEntry): SpellingMapEntry {
	if (typeof entry.source !== "string" || entry.source.length === 0) {
		throw new TypeError("spelling map source must be a non-empty string.");
	}
	assertJsonValue(entry.metadata ?? {});
	return Object.freeze({
		...entry,
		candidates: normalizedCandidates(entry.candidates),
		...(entry.labels !== undefined
			? { labels: sortedUnique(entry.labels) }
			: {}),
	});
}

export function candidateScore(
	candidate: string | ReplacementCandidate,
): Score | undefined {
	return typeof candidate === "string" ? undefined : candidate.score;
}

export function candidateText(
	candidate: string | ReplacementCandidate,
): string {
	return candidateValue(candidate);
}

export function buildSpellingMap(
	entries: Iterable<SpellingMapEntry>,
	options: BuildSpellingMapOptions = {},
): SpellingMap {
	assertJsonValue(options.metadata ?? {});
	const normalized = [...entries]
		.map(normalizeEntry)
		.sort(
			(left, right) =>
				left.source.localeCompare(right.source) ||
				candidateText(left.candidates[0] ?? "").localeCompare(
					candidateText(right.candidates[0] ?? ""),
				),
		);
	const duplicatePolicy = options.duplicatePolicy ?? "merge";
	const groups = new Map<string, SpellingMapEntry[]>();
	for (const entry of normalized) {
		if (duplicatePolicy === "reject" && groups.has(entry.source)) {
			throw new TypeError(`duplicate spelling map source: ${entry.source}`);
		}
		groups.set(entry.source, [...(groups.get(entry.source) ?? []), entry]);
	}
	return deepFreeze({
		id: options.id ?? "spelling-map",
		entries: normalized,
		bySource: orderedRecord(Object.fromEntries(groups)),
		kind: options.kind ?? "spelling",
		...(options.language !== undefined ? { language: options.language } : {}),
		...(options.script !== undefined ? { script: options.script } : {}),
		...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
	}) as SpellingMap;
}
