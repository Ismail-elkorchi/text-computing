import assert from "node:assert/strict";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import {
	assertLookupIndexIntegrity,
	buildLookupIndex,
	LOOKUP_INDEX_FORMAT,
	LOOKUP_INDEX_MAGIC,
	lookupIndexSourceText,
	lookupIndexMetadata,
	normalizedLookupIndexKey,
} from "../lib/lookup-index.mjs";

function decodedContainer(indexText) {
	const magicEnd = indexText.indexOf("\n");
	const directoryEnd = indexText.indexOf("\n", magicEnd + 1);
	assert.equal(indexText.slice(0, magicEnd), LOOKUP_INDEX_MAGIC);
	const directory = JSON.parse(indexText.slice(magicEnd + 1, directoryEnd));
	const dataStart = directoryEnd + 1;
	const decode = (descriptor) => {
		if (descriptor.length === 0) return "";
		const encoded = indexText.slice(
			dataStart + descriptor.offset,
			dataStart + descriptor.offset + descriptor.length,
		);
		return gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
	};
	return {
		directory,
		keyTexts: directory.keyBuckets.map(decode),
		rowTexts: directory.rowBuckets.map(decode),
		patternTexts: directory.patternBuckets.map(decode),
	};
}

function bucketLines(texts) {
	return texts.flatMap((text) => text.split("\n").filter(Boolean));
}

test("v2 indexes scope normalized keys by column and store each row once", () => {
	const sourceText = [
		"entryId\tform\tlemma\tforms",
		"one\tCAFÉ\tcafé\tCafe|CAFÉ",
		"two\t😀s\tgrin\t😀s,grins",
		"three\tcafe\tcafé\tcafe cafes",
		"",
	].join("\n");
	const index = buildLookupIndex(
		sourceText,
		"textlex.lexicon.rows.v1",
		["form", "lemma", "forms"],
		{ patternColumns: ["form", "forms"] },
	);
	assert.ok(index !== undefined);
	assert.equal(
		index.text,
		buildLookupIndex(
			sourceText,
			"textlex.lexicon.rows.v1",
			["form", "lemma", "forms"],
			{ patternColumns: ["form", "forms"] },
		)?.text,
	);
	const decoded = decodedContainer(index.text);
	const keyLines = bucketLines(decoded.keyTexts);
	const rowLines = bucketLines(decoded.rowTexts);
	assert.equal(rowLines.length, 3);
	assert.deepEqual(rowLines, sourceText.trimEnd().split("\n").slice(1));
	assert.equal(lookupIndexSourceText(index.text), sourceText);
	assert.equal(
		keyLines.some((line) => line.startsWith("form\u0000café\t")),
		true,
	);
	assert.equal(
		keyLines.some((line) => line.startsWith("lemma\u0000café\t")),
		true,
	);
	assert.equal(
		keyLines.some((line) => line.startsWith("forms\u0000cafes\t")),
		true,
	);
	assert.equal(
		bucketLines(decoded.patternTexts).some((line) => line.startsWith("CAFÉ\t")),
		true,
	);
	const scopedEmoji = "form\u0000😀s";
	const emojiBucket = decoded.directory.keyBuckets.findIndex(
		(descriptor) =>
			descriptor.firstKey <= scopedEmoji && descriptor.lastKey >= scopedEmoji,
	);
	assert.notEqual(emojiBucket, -1);
	assert.equal(
		decoded.keyTexts[emojiBucket]?.includes(`${scopedEmoji}\t`),
		true,
	);
	assert.equal(normalizedLookupIndexKey("CAFÉ"), "café");
	assert.equal(normalizedLookupIndexKey("Straße"), "strasse");
});

test("v2 indexes preserve the empty CAMeL surface key without indexing empty lemmas", () => {
	const sourceText = [
		"section\tsurface\tlemma",
		"PREFIXES\t\t",
		"STEMS\tكتاب\tكِتَاب",
		"SUFFIXES\t\t",
		"",
	].join("\n");
	const index = buildLookupIndex(
		sourceText,
		"textlex.morphology.rows.v1",
		["surface", "lemma"],
		{ emptyKeyColumns: ["surface"] },
	);
	assert.ok(index !== undefined);
	const keys = bucketLines(decodedContainer(index.text).keyTexts);
	const emptySurface = keys.find((line) => line.startsWith("surface\u0000\t"));
	assert.ok(emptySurface !== undefined);
	assert.deepEqual(
		emptySurface
			.slice(emptySurface.indexOf("\t") + 1)
			.split(",")
			.map((value) => Number.parseInt(value, 36)),
		[0, 2],
	);
	assert.equal(
		keys.some((line) => line.startsWith("lemma\u0000\t")),
		false,
	);
});

test("v2 lookup index integrity rejects stale sources, buckets, and metadata", () => {
	const sourceText = "entryId\talias\tentityId\nQ1\tExample\tQ1\n";
	const index = buildLookupIndex(sourceText, "textkb.knowledge-base.rows.v1", [
		"alias",
		"entityId",
	]);
	assert.ok(index !== undefined);
	const metadata = lookupIndexMetadata({
		sourceResourceId: "kb-aliases",
		sourceResourceSchemaId: "textkb.knowledge-base.rows.v1",
		sourceText,
		indexText: index.text,
		keyColumns: index.keyColumns,
		emptyKeyColumns: index.emptyKeyColumns,
		fuzzyColumns: index.fuzzyColumns,
		patternColumns: index.patternColumns,
		recordCount: index.recordCount,
		rowReferenceCount: index.rowReferenceCount,
	});
	assert.equal(metadata.indexFormat, LOOKUP_INDEX_FORMAT);
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
		/stale or invalid|do not match|buckets|source view|physical storage/u,
	);
	const directoryEnd = index.text.indexOf("\n", index.text.indexOf("\n") + 1);
	const payloadStart = directoryEnd + 1;
	const corrupted = `${index.text.slice(0, payloadStart)}${index.text[payloadStart] === "A" ? "B" : "A"}${index.text.slice(payloadStart + 1)}`;
	assert.throws(
		() =>
			assertLookupIndexIntegrity({
				indexText: corrupted,
				sourceText,
				schemaId: "textkb.knowledge-base.rows.v1",
				metadata,
			}),
		/gzip|integrity|buckets/u,
	);
	assert.throws(
		() =>
			assertLookupIndexIntegrity({
				indexText: index.text,
				sourceText,
				schemaId: "textkb.knowledge-base.rows.v1",
				metadata: { ...metadata, bucketCount: metadata.bucketCount + 1 },
			}),
		/directory disagrees|stale or invalid/u,
	);
});

test("v2 bucket storage remains compact against large source text", () => {
	const rows = Array.from({ length: 4_000 }, (_, index) => {
		const id = String(index).padStart(5, "0");
		return `entry-${id}\tform-${id}\tlemma-${index % 250}\tNOUN\t${"shared-feature;".repeat(6)}`;
	});
	const sourceText = [
		"entryId\tform\tlemma\tpartOfSpeech\tfeatures",
		...rows,
		"",
	].join("\n");
	const index = buildLookupIndex(sourceText, "textlex.morphology.rows.v1", [
		"form",
		"lemma",
	]);
	assert.ok(index !== undefined);
	const metadata = lookupIndexMetadata({
		sourceResourceId: "morphology",
		sourceResourceSchemaId: "textlex.morphology.rows.v1",
		sourceText,
		indexText: index.text,
		keyColumns: index.keyColumns,
		emptyKeyColumns: index.emptyKeyColumns,
		fuzzyColumns: index.fuzzyColumns,
		patternColumns: index.patternColumns,
		recordCount: index.recordCount,
		rowReferenceCount: index.rowReferenceCount,
	});
	assert.equal(metadata.sourceRowCount, rows.length);
	assert.ok(metadata.maximumBucketByteLength <= 512 * 1024);
	assert.ok(
		metadata.lookupIndexShippedByteLength <= metadata.storageBudgetByteLength,
	);
	assert.ok(
		Buffer.byteLength(index.text, "utf8") <
			Buffer.byteLength(sourceText, "utf8"),
		`${Buffer.byteLength(index.text, "utf8")}/${Buffer.byteLength(sourceText, "utf8")}`,
	);
	assert.doesNotThrow(() =>
		assertLookupIndexIntegrity({
			indexText: index.text,
			sourceText,
			schemaId: "textlex.morphology.rows.v1",
			metadata,
		}),
	);
});

test("v2 scoped keys reject NUL delimiters", () => {
	assert.throws(
		() =>
			buildLookupIndex(
				"entryId\tform\n1\tbad\u0000key\n",
				"textlex.morphology.rows.v1",
				["form"],
			),
		/forbidden delimiter/u,
	);
});
