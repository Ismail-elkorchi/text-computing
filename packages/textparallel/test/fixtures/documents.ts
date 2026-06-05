import { createDocument } from "@ismail-elkorchi/textdoc";
import {
	alignSentences,
	type BilingualDictionaryEntry,
	createParallelCorpus,
	createParallelDocument,
	type ParallelCorpus,
	type ParallelDocument,
} from "../../dist/index.js";

export const fixtureDictionary: readonly BilingualDictionaryEntry[] =
	Object.freeze([
		{ source: "Hello", target: "Bonjour", weight: 1 },
		{ source: "world", target: "monde", weight: 1 },
		{ source: "Good", target: "Bon", weight: 1 },
		{ source: "day", target: "jour", weight: 1 },
	]);

export function sourceDocument() {
	return createDocument("Hello world. Good day.", {
		id: "doc-en",
		metadata: { language: "en" },
	});
}

export function targetDocument() {
	return createDocument("Bonjour monde. Bon jour.", {
		id: "doc-fr",
		metadata: { language: "fr" },
	});
}

export function fixtureParallelDocument(): ParallelDocument {
	const source = sourceDocument();
	const target = targetDocument();
	return createParallelDocument(source, target, {
		id: "pair-en-fr",
		links: alignSentences(source, target),
		metadata: { languagePair: "en-fr" },
	});
}

export function fixtureParallelCorpus(): ParallelCorpus {
	return createParallelCorpus([fixtureParallelDocument()], {
		id: "corpus-en-fr",
		sourceLanguage: "en",
		targetLanguage: "fr",
		metadata: { domain: "general" },
	});
}
