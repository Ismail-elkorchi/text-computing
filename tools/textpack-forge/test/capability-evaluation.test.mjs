import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Ajv from "ajv";

import { assertModelBackedEvidence } from "../lib/evaluation.mjs";
import { capabilitySlotPolicy } from "../lib/policy.mjs";

test("capability policy validates explicit status and tier claims", () => {
	assert.deepEqual(
		capabilitySlotPolicy({
			slot: "core",
			status: "profiled",
			tier: "resource-only",
		}),
		{ status: "profiled", tier: "resource-only" },
	);
	assert.throws(
		() =>
			capabilitySlotPolicy({
				slot: "morphology",
				status: "task-supported",
			}),
		/explicit supported capability tier/u,
	);
	assert.throws(
		() =>
			capabilitySlotPolicy({
				slot: "syntax",
				status: "profiled",
				tier: "model-backed",
			}),
		/requires tier resource-only/u,
	);
});

const modelPack = {
	packageName: "@ismail-elkorchi/textpack-test-model",
	capabilitySlots: [
		{ slot: "tagging", status: "task-supported", tier: "model-backed" },
	],
};

const heldOutEvidence = {
	capabilitySlot: "tagging",
	tier: "model-backed",
	evaluationKind: "task-accuracy",
	result: "pass",
	metric: {
		name: "accuracy",
		value: 0.92,
		unit: "ratio",
		operator: "gte",
		threshold: 0.9,
	},
	dataset: {
		sourceIds: ["source:test"],
		snapshotIds: ["snapshot:test"],
		split: "held-out-test",
	},
	evidence: {
		resourceIds: ["model:test"],
		modelId: "model:test",
		sampleSize: 100,
	},
};

test("model-backed tiers require held-out task accuracy, not runtime smoke", () => {
	assert.throws(
		() =>
			assertModelBackedEvidence(modelPack, [
				{ ...heldOutEvidence, evaluationKind: "runtime-smoke" },
			]),
		/held-out task-accuracy/u,
	);
	assert.throws(
		() =>
			assertModelBackedEvidence(modelPack, [
				{
					...heldOutEvidence,
					dataset: { ...heldOutEvidence.dataset, split: "training" },
				},
			]),
		/held-out task-accuracy/u,
	);
	assert.doesNotThrow(() =>
		assertModelBackedEvidence(modelPack, [heldOutEvidence]),
	);
});

test("model-backed non-task records remain valid schema evidence", async () => {
	const schema = JSON.parse(
		await readFile(
			new URL(
				"../../../schemas/textpack-evaluation-record.schema.json",
				import.meta.url,
			),
			"utf8",
		),
	);
	const validate = new Ajv({ strict: true }).compile(schema);
	const integrityRecord = {
		schemaVersion: "1",
		recordId: "eval:model:integrity",
		packageName: modelPack.packageName,
		resourceSpecId: "resource-spec:model",
		pipelineId: "model-pipeline",
		capabilitySlot: "tagging",
		tier: "model-backed",
		taskType: "tagging.integrity",
		evaluationKind: "integrity",
		result: "warning",
		metric: { name: "checksum", value: true, unit: "boolean" },
		dataset: {
			sourceIds: ["source:test"],
			snapshotIds: ["snapshot:test"],
		},
		evidence: { resourceIds: ["model:test"] },
		limitations: [],
	};
	assert.equal(
		validate(integrityRecord),
		true,
		JSON.stringify(validate.errors),
	);
	assert.equal(
		validate({
			...integrityRecord,
			evaluationKind: "task-accuracy",
			result: "pass",
		}),
		false,
	);
	assert.equal(
		validate({
			...integrityRecord,
			recordId: "eval:model:accuracy",
			evaluationKind: "task-accuracy",
			result: "pass",
			metric: heldOutEvidence.metric,
			dataset: heldOutEvidence.dataset,
			evidence: heldOutEvidence.evidence,
		}),
		true,
		JSON.stringify(validate.errors),
	);
});
