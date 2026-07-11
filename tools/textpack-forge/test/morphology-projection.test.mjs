import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluationRecordsForPack } from "../lib/evaluation.mjs";
import { transformRunners } from "../lib/transforms.mjs";

const EN_SPEC_URL = new URL(
	"../resources/textpack-en-inflection-scowl.resource.json",
	import.meta.url,
);
const FR_SPEC_URL = new URL(
	"../resources/textpack-fr-unimorph-sa.resource.json",
	import.meta.url,
);

async function readSpec(url) {
	return JSON.parse(await readFile(url, "utf8"));
}

function transform(spec, inputName, text) {
	const runner = transformRunners.get(spec.pipelineId);
	assert.ok(runner !== undefined);
	return runner(spec, new Map([[inputName, text]]));
}

function assertSingleIndexedTable(spec, tableId) {
	const table = spec.outputs.find((output) => output.resourceId === tableId);
	assert.deepEqual(table?.lookupKeyColumns, ["form", "lemma"]);
	assert.equal(
		spec.outputs.some((output) =>
			/lookup-(?:analyzer|generator)$/u.test(output.resourceId),
		),
		false,
	);
}

function mockPack(spec, outputs, language) {
	return {
		packageName: spec.packageName,
		resourceSpecIds: [spec.resourceSpecId],
		sourceIds: spec.sourceIds,
		snapshotIds: spec.snapshotIds,
		capabilitySlots: [
			{ slot: "morphology", tier: "lookup" },
			{ slot: "quality", tier: "baseline" },
		],
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

test("SCOWLv2 emits one form-and-lemma indexed inflection table", async () => {
	const spec = await readSpec(EN_SPEC_URL);
	assertSingleIndexedTable(spec, "en-scowl-inflection-entries");
	const outputs = transform(
		spec,
		"scowl.txt",
		"35: walk <v>: walked, walking, walks\n",
	);
	assert.deepEqual(
		outputs
			.map((output) => output.id)
			.filter((id) => /lookup-(?:analyzer|generator)$/u.test(id)),
		[],
	);
	const canonical = JSON.parse(
		outputs.find(
			(output) => output.id === "en-scowl-inflection-morphology-canonical",
		)?.text ?? "null",
	);
	assert.deepEqual(
		canonical.resourceRefs.map(({ resourceId, role }) => ({
			resourceId,
			role,
		})),
		[
			{
				resourceId: "en-scowl-inflection-entries",
				role: "paradigm-table",
			},
			{ resourceId: "en-scowl-pos-inventory", role: "feature-inventory" },
		],
	);
	assert.deepEqual(canonical.analyzers[0].resourceIds, [
		"en-scowl-inflection-entries",
		"en-scowl-pos-inventory",
	]);
	const records = evaluationRecordsForPack(mockPack(spec, outputs, "en"), {});
	for (const recordId of [
		"eval:en-scowl-inflection:indexed-analysis-volume",
		"eval:en-scowl-inflection:indexed-generation-volume",
	]) {
		const evidence = records.find(
			(record) => record.recordId === recordId,
		)?.evidence;
		assert.ok(evidence?.resourceIds.includes("en-scowl-inflection-entries"));
		assert.ok(
			evidence?.resourceIds.includes(
				"en-scowl-inflection-entries-lookup-index",
			),
		);
	}
});

test("French UniMorph emits one form-and-lemma indexed paradigm table", async () => {
	const spec = await readSpec(FR_SPEC_URL);
	assertSingleIndexedTable(spec, "fr-unimorph-paradigms");
	const outputs = transform(
		spec,
		"fra",
		[
			"parler\tparle\tV;IND;PRS;1;SG",
			"parler\tparlons\tV;IND;PRS;1;PL",
			"",
		].join("\n"),
	);
	assert.deepEqual(
		outputs
			.map((output) => output.id)
			.filter((id) => /lookup-(?:analyzer|generator)$/u.test(id)),
		[],
	);
	const canonical = JSON.parse(
		outputs.find((output) => output.id === "fr-unimorph-morphology-canonical")
			?.text ?? "null",
	);
	assert.deepEqual(
		canonical.resourceRefs.map(({ resourceId, role }) => ({
			resourceId,
			role,
		})),
		[
			{ resourceId: "fr-unimorph-paradigms", role: "paradigm-table" },
			{
				resourceId: "fr-unimorph-feature-inventory",
				role: "feature-inventory",
			},
		],
	);
	assert.deepEqual(canonical.analyzers[0].resourceIds, [
		"fr-unimorph-paradigms",
		"fr-unimorph-feature-inventory",
	]);
	const records = evaluationRecordsForPack(mockPack(spec, outputs, "fr"), {});
	for (const recordId of [
		"eval:fr-unimorph:indexed-analysis-volume",
		"eval:fr-unimorph:indexed-generation-volume",
	]) {
		const evidence = records.find(
			(record) => record.recordId === recordId,
		)?.evidence;
		assert.ok(evidence?.resourceIds.includes("fr-unimorph-paradigms"));
		assert.ok(
			evidence?.resourceIds.includes("fr-unimorph-paradigms-lookup-index"),
		);
	}
});
