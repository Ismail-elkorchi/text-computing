import assert from "node:assert/strict";
import test from "node:test";

import {
	assertLookupIndexIntegrity,
	buildLookupIndex,
	lookupIndexMetadata,
	normalizedLookupIndexKey,
} from "../lib/lookup-index.mjs";

test("lookup indexes use UTF-16 row spans and stable source order", () => {
	const sourceText = [
		"entryId\tform\tlemma",
		"one\tCAFÉ\tcafé",
		"two\t😀s\tgrin",
		"three\tcafe\tcafé",
		"",
	].join("\n");
	const index = buildLookupIndex(sourceText, "textlex.lexicon.rows.v1", [
		"form",
		"lemma",
	]);
	assert.ok(index !== undefined);
	const rows = index.text.trimEnd().split("\n").slice(1);
	const emojiRow = rows.find((row) => row.startsWith("😀s\t"));
	assert.ok(emojiRow !== undefined);
	const [, packedEmojiSpan] = emojiRow.split("\t");
	const [start, length, order] = packedEmojiSpan
		.split(",")
		.map((value) => Number.parseInt(value, 36));
	assert.equal(sourceText.slice(start, start + length), "two\t😀s\tgrin");
	assert.equal(order, 1);
	assert.equal(rows.filter((row) => row.startsWith("café\t")).length, 1);
	assert.equal(normalizedLookupIndexKey("CAFÉ"), "café");
	assert.equal(normalizedLookupIndexKey("Straße"), "strasse");
});

test("lookup index integrity detects stale source text and metadata", () => {
	const sourceText = "entryId\talias\nQ1\tExample\n";
	const index = buildLookupIndex(sourceText, "textkb.knowledge-base.rows.v1", [
		"alias",
	]);
	assert.ok(index !== undefined);
	const metadata = lookupIndexMetadata({
		sourceResourceId: "kb-aliases",
		sourceResourceSchemaId: "textkb.knowledge-base.rows.v1",
		sourceText,
		indexText: index.text,
		keyColumns: index.keyColumns,
		recordCount: index.recordCount,
		spanCount: index.spanCount,
	});
	assert.doesNotThrow(() =>
		assertLookupIndexIntegrity({
			indexText: index.text,
			sourceText,
			schemaId: "textkb.knowledge-base.rows.v1",
			metadata,
		}),
	);
	assert.throws(
		() =>
			assertLookupIndexIntegrity({
				indexText: index.text,
				sourceText: sourceText.replace("Example", "Changed"),
				schemaId: "textkb.knowledge-base.rows.v1",
				metadata,
			}),
		/stale or invalid|do not match/u,
	);
});
