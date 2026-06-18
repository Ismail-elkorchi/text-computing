import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadFrench } from "@ismail-elkorchi/textpack-fr";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadFrench({
	reader,
	licensePolicy: "allow-share-alike",
});

const analysis = await runtime.document.analyzeText(
	"En France, j'aime apprendre chaque jour.",
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
		(token) => token.term === "france",
	),
	qualityMetrics: analysis.qualityReport.metrics,
});
