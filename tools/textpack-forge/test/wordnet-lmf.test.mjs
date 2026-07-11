import assert from "node:assert/strict";
import test from "node:test";

import {
	assertWordnetSemanticIntegrity,
	parseWordnetLmf,
} from "../lib/wordnet-lmf.mjs";

const VALID_LMF = `<?xml version="1.0" encoding="UTF-8"?>
<LexicalResource>
  <Lexicon>
    <LexicalEntry id="entry-expanded">
      <Lemma writtenForm="expanded lemma" partOfSpeech="n">
        <Form writtenForm="expanded lemmas" />
      </Lemma>
      <Sense id="sense-expanded" synset="synset-n" />
    </LexicalEntry>
    <LexicalEntry id="entry-self-closing">
      <Lemma writtenForm="run" partOfSpeech="v" />
      <Sense id="sense-run" synset="synset-v" />
    </LexicalEntry>
    <Synset id="synset-n" partOfSpeech="n">
      <Definition>an expanded lemma</Definition>
    </Synset>
    <Synset id="synset-v" partOfSpeech="v">
      <Definition>move quickly</Definition>
    </Synset>
  </Lexicon>
</LexicalResource>`;

test("LMF parsing preserves attributes on expanded and self-closing Lemma elements", () => {
	const tables = parseWordnetLmf(VALID_LMF);
	assert.deepEqual(tables.lexicalEntryRows, [
		["entry-expanded", "expanded lemma", "n"],
		["entry-self-closing", "run", "v"],
	]);
	assert.doesNotThrow(() =>
		assertWordnetSemanticIntegrity(tables, "fixture WordNet"),
	);
});

test("semantic integrity rejects blank lemma and part-of-speech fields", () => {
	const tables = parseWordnetLmf(
		VALID_LMF.replace(
			'<Lemma writtenForm="expanded lemma" partOfSpeech="n">',
			"<Lemma>",
		),
	);
	assert.throws(
		() => assertWordnetSemanticIntegrity(tables, "fixture WordNet"),
		/semantic integrity failed.*empty required field/su,
	);
});

test("semantic integrity rejects dangling sense links", () => {
	const tables = parseWordnetLmf(
		VALID_LMF.replace('synset="synset-v"', 'synset="missing-synset"'),
	);
	assert.throws(
		() => assertWordnetSemanticIntegrity(tables, "fixture WordNet"),
		/references an unknown synset/u,
	);
});

test("semantic integrity rejects dangling scoped relation targets", () => {
	const senseTables = parseWordnetLmf(VALID_LMF);
	senseTables.relationRows.push([
		"sense",
		"sense-run",
		"also",
		"missing-sense",
	]);
	assert.throws(
		() => assertWordnetSemanticIntegrity(senseTables, "fixture WordNet"),
		/sense relation target missing-sense references an unknown sense/u,
	);

	const synsetTables = parseWordnetLmf(VALID_LMF);
	synsetTables.relationRows.push([
		"synset",
		"synset-v",
		"also",
		"missing-synset",
	]);
	assert.throws(
		() => assertWordnetSemanticIntegrity(synsetTables, "fixture WordNet"),
		/synset relation target missing-synset references an unknown synset/u,
	);
});

test("semantic integrity rejects dangling synset members", () => {
	const tables = parseWordnetLmf(
		VALID_LMF.replace(
			'<Synset id="synset-n" partOfSpeech="n">',
			'<Synset id="synset-n" partOfSpeech="n" members="entry-expanded missing-entry">',
		),
	);
	assert.throws(
		() => assertWordnetSemanticIntegrity(tables, "fixture WordNet"),
		/synset synset-n member missing-entry references an unknown lexical entry/u,
	);
});
