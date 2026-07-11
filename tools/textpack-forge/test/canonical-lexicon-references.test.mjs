import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { evaluationRecordsForPack } from "../lib/evaluation.mjs";
import { transformRunners } from "../lib/transforms.mjs";

const RESOURCE_DIR = new URL("../resources/", import.meta.url);

async function readSpec(fileName) {
	return JSON.parse(await readFile(new URL(fileName, RESOURCE_DIR), "utf8"));
}

function transform(spec, inputs) {
	const runner = transformRunners.get(spec.pipelineId);
	assert.ok(runner !== undefined);
	return runner(spec, new Map(inputs));
}

function canonicalResourceRefs(outputs, resourceId) {
	const text = outputs.find((output) => output.id === resourceId)?.text;
	assert.notEqual(text, undefined);
	return JSON.parse(text).resourceRefs.map(({ resourceId: id, role }) => ({
		resourceId: id,
		role,
	}));
}

function mockPack(spec, outputs, language) {
	return {
		packageName: spec.packageName,
		resourceSpecIds: [spec.resourceSpecId],
		sourceIds: spec.sourceIds,
		snapshotIds: spec.snapshotIds,
		capabilitySlots: ["lexicon", "morphology", "quality", "search"].map(
			(slot) => ({ slot, tier: "resource-only" }),
		),
		manifest: {
			targets: {
				languages: [language],
				scripts: ["Latn"],
				modalities: ["typed"],
			},
		},
		payloads: outputs.map((output) => ({
			...output,
			resourceText: output.text,
			pipelineId: spec.pipelineId,
		})),
	};
}

test("ESDB canonical lexicon targets word rows without pulling profile evidence", async () => {
	const spec = await readSpec("textpack-en-wordlist-esdb.resource.json");
	const outputs = transform(
		spec,
		spec.inputFiles.map((input) => [path.basename(input.path), "colour\n"]),
	);
	assert.deepEqual(
		canonicalResourceRefs(outputs, "en-esdb-wordlist-lexicon-canonical"),
		[{ resourceId: "en-esdb-default-wordlists", role: "forms" }],
	);
	assert.ok(outputs.some((output) => output.id === "en-esdb-default-profiles"));

	const evidence = evaluationRecordsForPack(
		mockPack(spec, outputs, "en"),
		{},
	).find(
		(record) =>
			record.recordId === "eval:en-esdb-wordlist:default-profile-count",
	)?.evidence;
	assert.ok(evidence?.resourceIds.includes("en-esdb-default-profiles"));
});

test("SCOWLv2 canonical lexicon targets entries without pulling POS evidence", async () => {
	const spec = await readSpec("textpack-en-inflection-scowl.resource.json");
	const outputs = transform(spec, [
		["scowl.txt", "35: walk <v>: walked, walking, walks\n"],
	]);
	assert.deepEqual(
		canonicalResourceRefs(outputs, "en-scowl-inflection-lexicon-canonical"),
		[{ resourceId: "en-scowl-inflection-entries", role: "forms" }],
	);
	assert.ok(outputs.some((output) => output.id === "en-scowl-pos-inventory"));

	const evidence = evaluationRecordsForPack(
		mockPack(spec, outputs, "en"),
		{},
	).find(
		(record) => record.recordId === "eval:en-scowl-inflection:pos-inventory",
	)?.evidence;
	assert.ok(evidence?.resourceIds.includes("en-scowl-pos-inventory"));
});

test("Lexique canonical lexicon targets its form-and-lemma entry table", async () => {
	const spec = await readSpec("textpack-fr-lexique-sa.resource.json");
	const outputs = transform(spec, [
		[
			"Lexique383.tsv",
			"ortho\tlemme\tcgram\tgenre\tnombre\nchats\tchat\tNOM\tm\tp\n",
		],
	]);
	assert.deepEqual(
		canonicalResourceRefs(outputs, "fr-lexique-lexicon-canonical"),
		[{ resourceId: "fr-lexique-entries", role: "entries" }],
	);
	assert.ok(outputs.some((output) => output.id === "fr-lexique-lemmas"));

	const evidence = evaluationRecordsForPack(
		mockPack(spec, outputs, "fr"),
		{},
	).find(
		(record) => record.recordId === "eval:fr-lexique:lemma-volume",
	)?.evidence;
	assert.ok(evidence?.resourceIds.includes("fr-lexique-lemmas"));
});

test("resource specs index only targeted lookup tables", async () => {
	const lexique = await readSpec("textpack-fr-lexique-sa.resource.json");
	const lexiqueById = new Map(
		lexique.outputs.map((output) => [output.resourceId, output]),
	);
	assert.deepEqual(lexiqueById.get("fr-lexique-entries")?.lookupKeyColumns, [
		"form",
		"lemma",
	]);
	assert.deepEqual(
		lexiqueById.get("fr-lexique-entries")?.lookupPatternColumns,
		["form"],
	);
	assert.equal(
		lexiqueById.get("fr-lexique-lemmas")?.lookupKeyColumns,
		undefined,
	);

	for (const language of ["en", "ar"]) {
		const wordnet = await readSpec(
			`textpack-wordnet-${language}.resource.json`,
		);
		const outputById = new Map(
			wordnet.outputs.map((output) => [output.resourceId, output]),
		);
		assert.deepEqual(
			outputById.get(`wordnet-${language}-lexical-entries`)?.lookupKeyColumns,
			["lemma"],
		);
		assert.deepEqual(
			outputById.get(`wordnet-${language}-lexical-entries`)
				?.lookupPatternColumns,
			["lemma"],
		);
		for (const suffix of ["senses", "synsets", "relations"]) {
			assert.equal(
				outputById.get(`wordnet-${language}-${suffix}`)?.lookupKeyColumns,
				undefined,
			);
		}
	}

	const camel = await readSpec("textpack-ar-msa-morphology.resource.json");
	const morphemes = camel.outputs.find(
		(output) => output.resourceId === "ar-msa-camel-morph-morphemes",
	);
	assert.deepEqual(morphemes?.lookupEmptyKeyColumns, ["surface"]);
	assert.equal(morphemes?.lookupPatternColumns, undefined);

	const scowl = await readSpec("textpack-en-inflection-scowl.resource.json");
	const scowlEntries = scowl.outputs.find(
		(output) => output.resourceId === "en-scowl-inflection-entries",
	);
	assert.deepEqual(scowlEntries?.lookupPatternColumns, ["form"]);
});
