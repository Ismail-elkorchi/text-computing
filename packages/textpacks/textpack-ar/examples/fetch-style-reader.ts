import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadArabic } from "@ismail-elkorchi/textpack-ar";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadArabic({
	reader,
	licensePolicy: "allow-share-alike",
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
