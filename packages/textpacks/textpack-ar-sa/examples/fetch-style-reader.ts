import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadArabicShareAlike } from "@ismail-elkorchi/textpack-ar-sa";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadArabicShareAlike({
	reader,
});

const analysis = await runtime.document.analyzeText(
	"القاهرة مدينة ويكتب الناس عن الكتب.",
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
		(token) => token.term === "القاهرة",
	),
	qualityMetrics: analysis.qualityReport.metrics,
});
