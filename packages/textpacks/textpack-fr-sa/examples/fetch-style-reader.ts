import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadFrenchShareAlike } from "@ismail-elkorchi/textpack-fr-sa";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadFrenchShareAlike({
	reader,
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
