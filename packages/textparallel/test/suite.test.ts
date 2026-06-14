import assert from "node:assert/strict";
import test from "node:test";

import {
	alignSentences,
	alignWords,
	annotateAlignment,
	assertJsonValue,
	buildTranslationMemory,
	compareParallelCollocations,
	createParallelCorpus,
	createParallelDocument,
	extractBilingualTerms,
	induceBilingualLexicon,
	parallelTablesFromPack,
	searchTranslationMemory,
	shallowTransfer,
	trainSentenceAligner,
	trainWordAligner,
} from "../dist/index.js";
import {
	fixtureDictionary,
	fixtureParallelCorpus,
	fixtureParallelDocument,
	sourceDocument,
	targetDocument,
} from "./fixtures/documents.ts";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

async function fileBackedTextResource(path: string, text: string) {
	return {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-parallel-test",
		packageRoot: "file:///fixture/",
		path,
		encoding: "utf8",
		checksum: `sha256:${await sha256(text)}`,
		byteLength: new TextEncoder().encode(text).byteLength,
	} as const;
}

function textResourceReader(records: Readonly<Record<string, string>>) {
	return {
		readText({
			descriptor,
		}: {
			readonly descriptor: { readonly path: string };
		}): string {
			const text = records[descriptor.path];
			if (text === undefined) {
				throw new Error(`missing fixture resource ${descriptor.path}`);
			}
			return text;
		},
	};
}

test("runs the final section 20 parallel workflow", () => {
	const source = sourceDocument();
	const target = targetDocument();
	const sentenceLinks = alignSentences(source, target);
	const wordLinks = alignWords(source, target, {
		dictionaries: fixtureDictionary,
		allowNullLinks: false,
	});
	const pair = createParallelDocument(source, target, {
		id: "workflow-pair",
		links: sentenceLinks,
	});
	const corpus = createParallelCorpus([pair], {
		id: "workflow-corpus",
		sourceLanguage: "en",
		targetLanguage: "fr",
	});
	const tm = buildTranslationMemory([pair], { id: "workflow-tm" });
	const hits = searchTranslationMemory(tm, "hello world", { maxHits: 2 });
	const terms = extractBilingualTerms(corpus);
	const lexicon = induceBilingualLexicon(corpus, {
		dictionaries: fixtureDictionary,
	});
	const collocations = compareParallelCollocations(corpus);
	const transferred = shallowTransfer(
		source,
		{
			dictionaries: fixtureDictionary,
		},
		{ output: "both" },
	);
	const annotated = annotateAlignment(pair);
	const sentenceModel = trainSentenceAligner([pair]);
	const wordModel = trainWordAligner([pair]);

	assert.equal(sentenceLinks.length, 2);
	assert.ok(wordLinks.some((link) => link.relation === "equivalent"));
	assert.equal(hits[0]?.targetText, "Bonjour monde.");
	assert.ok(terms.some((term) => term.sourceText === "Hello world."));
	assert.ok(lexicon.some((entry) => entry.sourceForm === "Hello"));
	assert.ok(
		collocations.some((entry) => entry.sourceCollocation[0] === "hello"),
	);
	assert.equal(
		transferred.views["translation.transfer"]?.text,
		"Bonjour monde. Bon jour.",
	);
	assert.ok(annotated.sourceDoc.layers["alignment.links"]);
	assert.equal(sentenceModel.kind, "sentence-alignment");
	assert.equal(wordModel.kind, "word-alignment");
	assertJsonValue(tm);
	assertJsonValue(corpus);
});

test("parallel textpack resources materialize through the adapter", async () => {
	const alignmentText =
		"id\tsourceText\ttargetText\tsourceLanguage\ttargetLanguage\np1\tGood morning\tBonjour\ten\tfr\n";
	const pack = {
		manifest: {
			targets: { languages: ["en", "fr"] },
			resources: [
				{
					id: "parallel-en-fr-links",
					kind: "alignment-table" as const,
					schemaId: "textparallel.alignment.rows.v1",
				},
			],
		},
		resources: {
			"parallel-en-fr-links": await fileBackedTextResource(
				"resources/parallel-en-fr.tsv",
				alignmentText,
			),
		},
	};
	const tables = await parallelTablesFromPack(pack, {
		reader: textResourceReader({
			"resources/parallel-en-fr.tsv": alignmentText,
		}),
	});
	assert.deepEqual(tables[0]?.rows[0], {
		id: "p1",
		sourceLanguage: "en",
		sourceText: "Good morning",
		targetLanguage: "fr",
		targetText: "Bonjour",
	});
});

test("keeps corpus construction and metadata JSON-safe", () => {
	class Metadata {
		readonly languagePair = "en-fr";
	}
	const pair = fixtureParallelDocument();
	const corpus = fixtureParallelCorpus();
	assert.equal(pair.metadata.languagePair, "en-fr");
	assert.equal(corpus.indexes.documents, 1);
	assert.equal(corpus.indexes.links, 2);
	assert.throws(
		() =>
			createParallelDocument(sourceDocument(), targetDocument(), {
				metadata: { bad: Number.NaN },
			}),
		/TEXTPARALLEL_JSON_NUMBER/,
	);
	assert.throws(
		() =>
			createParallelDocument(sourceDocument(), targetDocument(), {
				metadata: new Metadata(),
			}),
		/TEXTPARALLEL_JSON_VALUE/,
	);
});
