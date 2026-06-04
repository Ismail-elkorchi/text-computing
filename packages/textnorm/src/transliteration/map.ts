import { deepFreeze } from "../internal/freeze.js";
import { assertJsonValue } from "../internal/json.js";
import { orderedRecord } from "../internal/stable.js";
import type {
	TransliterationEntry,
	TransliterationMap,
} from "../normalize/types.js";

export interface BuildTransliterationMapOptions {
	readonly id?: string;
	readonly sourceScript: string;
	readonly targetScript: string;
	readonly direction?: "forward" | "reverse";
	readonly metadata?: Readonly<Record<string, unknown>>;
}

function normalizeEntry(entry: TransliterationEntry): TransliterationEntry {
	if (entry.source.length === 0 || entry.target.length === 0) {
		throw new TypeError(
			"transliteration entries require non-empty source and target.",
		);
	}
	if (
		entry.cost !== undefined &&
		(!Number.isFinite(entry.cost) || entry.cost < 0)
	) {
		throw new TypeError(
			"transliteration cost must be a non-negative finite number.",
		);
	}
	assertJsonValue(entry.metadata ?? {});
	return Object.freeze(entry);
}

export function buildTransliterationMap(
	entries: Iterable<TransliterationEntry>,
	options: BuildTransliterationMapOptions,
): TransliterationMap {
	assertJsonValue(options.metadata ?? {});
	const normalized = [...entries]
		.map(normalizeEntry)
		.sort(
			(left, right) =>
				left.source.localeCompare(right.source) ||
				left.target.localeCompare(right.target) ||
				(left.cost ?? 0) - (right.cost ?? 0),
		);
	const groups = new Map<string, TransliterationEntry[]>();
	for (const entry of normalized) {
		groups.set(entry.source, [...(groups.get(entry.source) ?? []), entry]);
	}
	return deepFreeze({
		id: options.id ?? "transliteration-map",
		sourceScript: options.sourceScript,
		targetScript: options.targetScript,
		direction: options.direction ?? "forward",
		entries: normalized,
		bySource: orderedRecord(Object.fromEntries(groups)),
		...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
	}) as TransliterationMap;
}
