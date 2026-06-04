import type {
	ConfusionTable,
	SpellingMap,
	StructuralReplacementResource,
	TransliterationMap,
} from "../normalize/types.js";
import { buildConfusionTable } from "../ocr/confusion-table.js";
import { buildSpellingMap } from "../spell/map.js";
import { buildTransliterationMap } from "../transliteration/map.js";

export function parseStructuralReplacementResource(
	input: StructuralReplacementResource,
): StructuralReplacementResource {
	if (input.id.length === 0 || input.entries.length === 0) {
		throw new TypeError(
			"structural replacement resources require id and entries.",
		);
	}
	return Object.freeze({
		...input,
		entries: Object.freeze(input.entries.map((entry) => Object.freeze(entry))),
	});
}

export function spellingMapFromResource(
	input: StructuralReplacementResource,
): SpellingMap {
	const resource = parseStructuralReplacementResource(input);
	return buildSpellingMap(
		resource.entries.map((entry) => ({
			source: entry.source,
			candidates: entry.candidates ?? [entry.target ?? entry.replacement ?? ""],
		})),
		{
			id: resource.id,
			kind: resource.kind ?? "spelling",
			...(resource.metadata !== undefined
				? { metadata: resource.metadata }
				: {}),
		},
	);
}

export function confusionTableFromResource(
	input: StructuralReplacementResource,
): ConfusionTable {
	const resource = parseStructuralReplacementResource(input);
	return buildConfusionTable(
		resource.entries.map((entry) => ({
			source: entry.source,
			replacement: entry.target ?? entry.replacement ?? "",
			level: "character",
			...(entry.cost !== undefined ? { cost: entry.cost } : {}),
		})),
		{
			id: resource.id,
			...(resource.metadata !== undefined
				? { metadata: resource.metadata }
				: {}),
		},
	);
}

export function transliterationMapFromResource(
	input: StructuralReplacementResource,
	options: { readonly sourceScript: string; readonly targetScript: string },
): TransliterationMap {
	const resource = parseStructuralReplacementResource(input);
	return buildTransliterationMap(
		resource.entries.map((entry) => ({
			source: entry.source,
			target: entry.target ?? entry.replacement ?? "",
			...(entry.cost !== undefined ? { cost: entry.cost } : {}),
		})),
		{
			id: resource.id,
			sourceScript: options.sourceScript,
			targetScript: options.targetScript,
			...(resource.metadata !== undefined
				? { metadata: resource.metadata }
				: {}),
		},
	);
}
