import {
	buildConfusionTable,
	buildHistoricalSpellingMap,
	buildOrthographyMap,
	buildSpellingMap,
	buildTransliterationMap,
} from "../../dist/index.js";

export const spellingMap = buildSpellingMap(
	[
		{ source: "olde", candidates: ["old"] },
		{ source: "shoppe", candidates: ["shop"] },
	],
	{ id: "spell:test" },
);

export const historicalMap = buildHistoricalSpellingMap(
	[{ source: "ye", candidates: ["the"] }],
	{
		id: "hist:test",
		period: "early-modern",
		witnessId: "witness:a",
		editorialConvention: "search",
	},
);

export const orthographyMap = buildOrthographyMap(
	[{ source: "musick", candidates: ["music"] }],
	{ id: "orth:test" },
);

export const confusionTable = buildConfusionTable(
	[{ source: "rn", replacement: "m", level: "character", cost: 0.5 }],
	{ id: "ocr:test", modality: "ocr" },
);

export const punctuationMap = buildSpellingMap(
	[{ source: "“", candidates: ['"'] }],
	{ id: "punct:test", kind: "punctuation" },
);

export const spacingMap = buildSpellingMap(
	[{ source: "can not", candidates: ["cannot"] }],
	{ id: "space:test", kind: "spacing" },
);

export const transliterationMap = buildTransliterationMap(
	[{ source: "salam", target: "سلام", cost: 0 }],
	{
		id: "translit:test",
		sourceScript: "Latn",
		targetScript: "Arab",
	},
);
