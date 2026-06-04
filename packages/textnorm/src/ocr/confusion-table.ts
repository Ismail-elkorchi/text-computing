import { deepFreeze } from "../internal/freeze.js";
import { assertJsonValue } from "../internal/json.js";
import { orderedRecord } from "../internal/stable.js";
import type { ConfusionEntry, ConfusionTable } from "../normalize/types.js";

export interface BuildConfusionTableOptions {
	readonly id?: string;
	readonly modality?: ConfusionTable["modality"];
	readonly metadata?: Readonly<Record<string, unknown>>;
}

function normalizeEntry(entry: ConfusionEntry): ConfusionEntry {
	if (entry.source.length === 0) {
		throw new TypeError("confusion source must be non-empty.");
	}
	if (entry.replacement === entry.source) {
		throw new TypeError("confusion replacement must differ from source.");
	}
	if (
		entry.cost !== undefined &&
		(!Number.isFinite(entry.cost) || entry.cost < 0)
	) {
		throw new TypeError("confusion cost must be a non-negative finite number.");
	}
	if (
		entry.probability !== undefined &&
		(!Number.isFinite(entry.probability) ||
			entry.probability < 0 ||
			entry.probability > 1)
	) {
		throw new TypeError("confusion probability must be between 0 and 1.");
	}
	assertJsonValue(entry.metadata ?? {});
	return Object.freeze({ ...entry, level: entry.level ?? "character" });
}

export function buildConfusionTable(
	entries: Iterable<ConfusionEntry>,
	options: BuildConfusionTableOptions = {},
): ConfusionTable {
	assertJsonValue(options.metadata ?? {});
	const normalized = [...entries]
		.map(normalizeEntry)
		.sort(
			(left, right) =>
				left.source.localeCompare(right.source) ||
				left.replacement.localeCompare(right.replacement) ||
				(left.cost ?? 0) - (right.cost ?? 0),
		);
	const groups = new Map<string, ConfusionEntry[]>();
	for (const entry of normalized) {
		groups.set(entry.source, [...(groups.get(entry.source) ?? []), entry]);
	}
	return deepFreeze({
		id: options.id ?? "confusion-table",
		entries: normalized,
		bySource: orderedRecord(Object.fromEntries(groups)),
		...(options.modality !== undefined ? { modality: options.modality } : {}),
		...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
	}) as ConfusionTable;
}
