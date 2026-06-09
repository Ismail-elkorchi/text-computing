import type {
	TextPack,
	TextPackCapabilities,
	TextPackCapabilityName,
} from "./types.js";

const capabilityOrder = {
	segmentation: ["none", "default", "profile", "dictionary", "fst", "rules"],
	normalization: ["none", "unicode", "lexicon", "rules", "fst", "statistical"],
	morphology: [
		"none",
		"lookup",
		"paradigm-table",
		"rules",
		"fst",
		"statistical",
	],
	tagging: ["none", "rules", "statistical", "hybrid"],
	parsing: ["none", "rules", "statistical", "hybrid"],
	extraction: ["none", "gazetteer", "rules", "statistical", "hybrid"],
	search: ["none", "analyzer", "index-profile"],
	terminology: ["none", "lexicon", "corpus", "kb"],
} as const;

export function capabilities(pack: TextPack): TextPackCapabilities {
	return mergeCapabilities(
		pack.manifest.capabilitySlots.flatMap((slot) =>
			slot.capabilities === undefined ? [] : [slot.capabilities],
		),
	);
}

function strongerLevel(
	key: keyof typeof capabilityOrder,
	left: string,
	right: string,
): string {
	const order = capabilityOrder[key];
	const leftIndex = order.indexOf(left as never);
	const rightIndex = order.indexOf(right as never);
	if (leftIndex < 0 || rightIndex < 0) {
		throw new TypeError(`Cannot merge unknown ${key} capability values.`);
	}
	const value = order[Math.max(leftIndex, rightIndex)];
	if (value === undefined) {
		throw new TypeError(`Cannot merge ${key} capability values.`);
	}
	return value;
}

export function mergeCapabilities(
	values: readonly TextPackCapabilities[],
): TextPackCapabilities {
	const output: Record<string, string | boolean> = {};
	for (const value of values) {
		for (const [key, item] of Object.entries(value) as [
			TextPackCapabilityName,
			string | boolean,
		][]) {
			if (typeof item === "boolean") {
				output[key] = Boolean(output[key]) || item;
				continue;
			}
			const existing = output[key];
			output[key] =
				typeof existing === "string"
					? strongerLevel(key as keyof typeof capabilityOrder, existing, item)
					: item;
		}
	}
	return Object.freeze(output) as TextPackCapabilities;
}
