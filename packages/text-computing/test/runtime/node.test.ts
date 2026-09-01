import assert from "node:assert/strict";
import test from "node:test";
import {
	createNodeResourceReader,
	load,
} from "@ismail-elkorchi/text-computing/node";
import { createPack } from "@ismail-elkorchi/textpack";
import { indexedMorphologyTableFixture } from "../fixtures/indexed-table.ts";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

test("the Node package subpath resolves through the package export map", () => {
	assert.equal(typeof createNodeResourceReader, "function");
	assert.equal(typeof load, "function");
});

test("text-computing file-backed gzip resources materialize in Node with a fetch-style reader", async () => {
	await runTextComputingFileBackedSmoke("node");
});

test("merged morphology keeps all results when maxResults is omitted", async () => {
	const morphologyATable = await indexedMorphologyTableFixture(
		"morphology-a-table",
		"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nparle\tparler-a\tVERB\tV;IND;PRS\ta1\nparle-a\tparler\tVERB\tV;IND;PRS\ta2\n",
		["form", "lemma"],
	);
	const morphologyBTable = await indexedMorphologyTableFixture(
		"morphology-b-table",
		"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nparle\tparler-b\tVERB\tV;IND;PRS\tb1\nparle-b\tparler\tVERB\tV;IND;PRS\tb2\n",
		["form", "lemma"],
	);
	const pack = createPack(
		{
			schemaVersion: "1",
			id: "pack:text-computing-morphology-limit",
			name: "Text Computing Morphology Limit",
			version: "1.0.0",
			packageName: "@ismail-elkorchi/textpack-morphology-limit",
			targets: { languages: ["fr"], scripts: ["Latn"] },
			resources: [
				{
					id: "morphology-a",
					kind: "morphology",
					schemaId: "textlex.morphology.v1",
				},
				morphologyATable.source,
				morphologyATable.index,
				{
					id: "morphology-b",
					kind: "morphology",
					schemaId: "textlex.morphology.v1",
				},
				morphologyBTable.source,
				morphologyBTable.index,
			],
			capabilitySlots: [
				{
					slot: "morphology",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["morphology-a", "morphology-b"],
					bindings: [
						{
							role: "primary",
							resourceId: "morphology-a",
							schemaId: "textlex.morphology.v1",
							required: true,
						},
						{
							role: "primary",
							resourceId: "morphology-b",
							schemaId: "textlex.morphology.v1",
							required: true,
						},
					],
				},
			],
		},
		{
			"morphology-a": {
				schemaVersion: "1",
				kind: "morphology",
				morphologyId: "morphology-a",
				languageTag: "fr",
				resourceRefs: [
					{ resourceId: "morphology-a-table", role: "paradigm-table" },
					{
						resourceId: "morphology-a-table-lookup-index",
						role: "lookup-index",
					},
				],
			},
			"morphology-b": {
				schemaVersion: "1",
				kind: "morphology",
				morphologyId: "morphology-b",
				languageTag: "fr",
				resourceRefs: [
					{ resourceId: "morphology-b-table", role: "paradigm-table" },
					{
						resourceId: "morphology-b-table-lookup-index",
						role: "lookup-index",
					},
				],
			},
			...morphologyATable.resources,
			...morphologyBTable.resources,
		},
	);
	const nlp = await load(pack);
	const analyses = await nlp.morphology.analyze("parle");
	assert.deepEqual(
		analyses.map((analysis) => analysis.lemma),
		["parler-a", "parler-b"],
	);
	assert.equal(
		(await nlp.morphology.analyze("parle", { maxResults: 1 })).length,
		1,
	);
	const generations = await nlp.morphology.generate("parler");
	assert.deepEqual(
		generations.map((generation) => generation.form),
		["parle-a", "parle-b"],
	);
	assert.equal(
		(await nlp.morphology.generate("parler", undefined, { maxResults: 1 }))
			.length,
		1,
	);
});
