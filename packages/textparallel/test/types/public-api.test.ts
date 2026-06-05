import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { createDocument } from "@ismail-elkorchi/textdoc";
import {
	type AlignmentLink,
	alignSentences,
	alignWords,
	type BilingualDictionaryEntry,
	buildTranslationMemory,
	createParallelCorpus,
	createParallelDocument,
	type ParallelCorpus,
	type ParallelDocument,
	searchTranslationMemory,
	type TranslationMemory,
	type TranslationMemoryHit,
} from "../../dist/index.js";

const source: TextDocument = createDocument("Hello world.", { id: "types-en" });
const target: TextDocument = createDocument("Bonjour monde.", {
	id: "types-fr",
});
const dictionary: readonly BilingualDictionaryEntry[] = [
	{ source: "Hello", target: "Bonjour" },
];
const sentenceLinks: readonly AlignmentLink[] = alignSentences(source, target);
const wordLinks: readonly AlignmentLink[] = alignWords(source, target, {
	dictionaries: dictionary,
});
const pair: ParallelDocument = createParallelDocument(source, target, {
	links: sentenceLinks,
});
const corpus: ParallelCorpus = createParallelCorpus([pair]);
const tm: TranslationMemory = buildTranslationMemory([pair]);
const hits: readonly TranslationMemoryHit[] = searchTranslationMemory(
	tm,
	"hello",
);

void wordLinks;
void corpus;
void hits;
