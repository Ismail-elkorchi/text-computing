import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadEnglish } from "@ismail-elkorchi/textpack-en";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadEnglish({
	reader,
});

const analysis = await runtime.document.analyzeText(
	"Paris is a city, and people walk through its museums.",
	{
		entityLanguage: runtime.languageTag,
	},
);

console.log({
	language: runtime.languageTag,
	componentCount: runtime.pack.manifest.components?.length ?? 0,
	sentences: analysis.sentences.length,
	words: analysis.words.length,
	searchTerms: analysis.searchTokens.map((token) => token.term),
	matchedExpectedTerm: analysis.searchTokens.some(
		(token) => token.term === "paris",
	),
	qualityMetrics: analysis.qualityReport.metrics,
});
