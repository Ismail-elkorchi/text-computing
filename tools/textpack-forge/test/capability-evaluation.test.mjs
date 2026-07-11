import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import Ajv from "ajv";

import {
	assertDeclaredConformanceEvaluation,
	assertModelBackedEvidence,
	assertTaskSupportedDistributionEvaluation,
	evaluationRecordsPassReadiness,
} from "../lib/evaluation.mjs";
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

test("failed evaluation evidence blocks task-supported distributions", () => {
	const distribution = {
		packageName: "@ismail-elkorchi/textpack-test",
		distribution: true,
		capabilitySlots: [
			{ slot: "normalization", status: "task-supported", tier: "baseline" },
		],
	};
	assert.throws(
		() =>
			assertTaskSupportedDistributionEvaluation(distribution, [
				{ recordId: "eval:test:failed", result: "fail" },
			]),
		/eval:test:failed/u,
	);
	assert.doesNotThrow(() =>
		assertTaskSupportedDistributionEvaluation(distribution, [
			{
				capabilitySlot: "normalization",
				recordId: "eval:test:passed",
				result: "pass",
			},
		]),
	);
	assert.throws(
		() =>
			assertTaskSupportedDistributionEvaluation(distribution, [
				{
					capabilitySlot: "segmentation",
					recordId: "eval:test:wrong-slot",
					result: "pass",
				},
			]),
		/normalization lacks passing/u,
	);
});

test("failed distribution evidence is fatal while internal packs remain independent", () => {
	const failedResourceEvidence = [
		{ recordId: "eval:test:resource", result: "fail" },
	];
	assert.throws(
		() =>
			assertTaskSupportedDistributionEvaluation(
				{
					packageName: "@ismail-elkorchi/textpack-resource-only",
					distribution: true,
					capabilitySlots: [
						{ slot: "foundation", status: "profiled", tier: "resource-only" },
					],
				},
				failedResourceEvidence,
			),
		/eval:test:resource/u,
	);
	assert.doesNotThrow(() =>
		assertTaskSupportedDistributionEvaluation(
			{
				packageName: "@ismail-elkorchi/textpack-internal",
				distribution: false,
				capabilitySlots: [
					{ slot: "normalization", status: "task-supported", tier: "baseline" },
				],
			},
			failedResourceEvidence,
		),
	);
});

test("declared publishability evaluation ids must resolve uniquely and pass", () => {
	const pack = {
		packageName: "@ismail-elkorchi/textpack-test",
		publishable: true,
		publishabilityEvidence: {
			conformanceEvidence: [
				"eval:test:conformance",
				"docs:textpacks/readiness.md#test",
			],
		},
	};
	assert.doesNotThrow(() =>
		assertDeclaredConformanceEvaluation(pack, [
			{ recordId: "eval:test:conformance", result: "pass" },
		]),
	);
	assert.throws(
		() => assertDeclaredConformanceEvaluation(pack, []),
		/resolves to 0/u,
	);
	assert.throws(
		() =>
			assertDeclaredConformanceEvaluation(pack, [
				{ recordId: "eval:test:conformance", result: "fail" },
			]),
		/did not pass/u,
	);
	assert.throws(
		() =>
			assertDeclaredConformanceEvaluation(pack, [
				{ recordId: "eval:test:conformance", result: "pass" },
				{ recordId: "eval:test:conformance", result: "pass" },
			]),
		/resolves to 2/u,
	);
	assert.throws(
		() =>
			assertDeclaredConformanceEvaluation(
				{
					...pack,
					publishabilityEvidence: {
						conformanceEvidence: ["docs:textpacks/readiness.md#test"],
					},
				},
				[],
			),
		/no executable evaluation/u,
	);
});

test("readiness requires passing slot evidence and rejects any failed record", () => {
	assert.equal(
		evaluationRecordsPassReadiness([
			{
				evaluationKind: "resource-conformance",
				recordId: "eval:test:resource-pass",
				result: "pass",
			},
		]),
		true,
	);
	assert.equal(
		evaluationRecordsPassReadiness([
			{ recordId: "eval:test:pass", result: "pass" },
			{ recordId: "eval:test:fail", result: "fail" },
		]),
		false,
	);
	assert.equal(
		evaluationRecordsPassReadiness([
			{ recordId: "eval:test:warning", result: "warning" },
		]),
		false,
	);
	assert.equal(evaluationRecordsPassReadiness([]), false);
});
