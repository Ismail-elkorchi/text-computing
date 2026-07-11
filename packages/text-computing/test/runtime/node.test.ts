import assert from "node:assert/strict";
import test from "node:test";
import {
	createNodeResourceReader,
	load,
} from "@ismail-elkorchi/text-computing/node";
import { createPack } from "@ismail-elkorchi/textpack";
import { runTextComputingFileBackedSmoke } from "./file-backed-smoke.ts";

test("the Node package subpath resolves through the package export map", () => {
	assert.equal(typeof createNodeResourceReader, "function");
	assert.equal(typeof load, "function");
});

test("text-computing file-backed gzip resources materialize in Node with a fetch-style reader", async () => {
	await runTextComputingFileBackedSmoke("node");
});

test("merged morphology keeps all results when maxResults is omitted", async () => {
	const pack = createPack(
		{
			schemaVersion: "1",
			id: "pack:text-computing-morphology-limit",
			name: "Text Computing Morphology Limit",
			version: "1.0.0",
			packageName: "@ismail-elkorchi/textpack-morphology-limit",
			targets: { languages: ["fr"], scripts: ["Latn"] },
			engines: { "@ismail-elkorchi/text-computing": "^0.1.0" },
			resources: [
				{
					id: "morphology-a",
					kind: "morphology",
					schemaId: "textlex.morphology.v1",
				},
				{
					id: "morphology-a-analyzer",
					kind: "morphology",
					schemaId: "textlex.morphology.rows.v1",
				},
				{
					id: "morphology-a-generator",
					kind: "morphology",
					schemaId: "textlex.morphology.rows.v1",
				},
				{
					id: "morphology-b",
					kind: "morphology",
					schemaId: "textlex.morphology.v1",
				},
				{
					id: "morphology-b-analyzer",
					kind: "morphology",
					schemaId: "textlex.morphology.rows.v1",
				},
				{
					id: "morphology-b-generator",
					kind: "morphology",
					schemaId: "textlex.morphology.rows.v1",
				},
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
							ownerPackage: "@ismail-elkorchi/textlex",
						},
						{
							role: "primary",
							resourceId: "morphology-b",
							schemaId: "textlex.morphology.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textlex",
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
					{ resourceId: "morphology-a-analyzer", role: "analyzer" },
					{ resourceId: "morphology-a-generator", role: "generator" },
				],
			},
			"morphology-a-analyzer":
				"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nparle\tparler-a\tVERB\tV;IND;PRS\ta1\n",
			"morphology-a-generator":
				"lemma\tform\tpartOfSpeech\tfeatureBundle\tentryId\nparler\tparle-a\tVERB\tV;IND;PRS\ta1\n",
			"morphology-b": {
				schemaVersion: "1",
				kind: "morphology",
				morphologyId: "morphology-b",
				languageTag: "fr",
				resourceRefs: [
					{ resourceId: "morphology-b-analyzer", role: "analyzer" },
					{ resourceId: "morphology-b-generator", role: "generator" },
				],
			},
			"morphology-b-analyzer":
				"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nparle\tparler-b\tVERB\tV;IND;PRS\tb1\n",
			"morphology-b-generator":
				"lemma\tform\tpartOfSpeech\tfeatureBundle\tentryId\nparler\tparle-b\tVERB\tV;IND;PRS\tb1\n",
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
