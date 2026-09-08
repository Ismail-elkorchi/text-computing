import {
	type ArtifactIdentity,
	artifactIdentity,
	contentChecksum,
} from "../packs/artifacts.ts";
import {
	openResourceJson,
	openResourceText,
	requireSingleTaskResourceBinding,
	type TextPack,
	type TextPackArtifactReader,
	type TextPackResourceReader,
} from "../packs/index.ts";
import { assertRunnableTask, uniqueSorted } from "./tasks.ts";
import type {
	TextComputingEntityExecutionResult,
	TextComputingEntityExecutor,
	TextComputingEntitySummary,
	TextComputingNerModel,
} from "./types.ts";

export const nerModelSchemaId = "text-computing.ner-model.v1" as const;

export interface TextComputingEntityRuntimeContext {
	readonly pack: TextPack;
	readonly reader: TextPackResourceReader | undefined;
	readonly artifactReader: TextPackArtifactReader | undefined;
	readonly executor: TextComputingEntityExecutor | undefined;
	readonly languageTag: string;
}

export interface TextComputingEntityRuntimeResult
	extends TextComputingEntityExecutionResult {
	readonly modelResourceId: string;
	readonly artifactId: string;
	readonly artifact: ArtifactIdentity;
	readonly modelChecksum: string;
	readonly vocabularyChecksum: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(
	record: Readonly<Record<string, unknown>>,
	key: string,
	context: string,
): string {
	const value = record[key];
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(`${context}.${key} must be a non-empty string.`);
	}
	return value;
}

function booleanValue(
	record: Readonly<Record<string, unknown>>,
	key: string,
	context: string,
): boolean {
	const value = record[key];
	if (typeof value !== "boolean") {
		throw new TypeError(`${context}.${key} must be a boolean.`);
	}
	return value;
}

function recordValue(
	record: Readonly<Record<string, unknown>>,
	key: string,
	context: string,
): Readonly<Record<string, unknown>> {
	const value = record[key];
	if (!isRecord(value)) {
		throw new TypeError(`${context}.${key} must be an object.`);
	}
	return value;
}

export function parseNerModel(value: unknown): TextComputingNerModel {
	if (!isRecord(value)) {
		throw new TypeError("NER model configuration must be an object.");
	}
	if (value.schemaVersion !== "1") {
		throw new TypeError("NER model schemaVersion must be 1.");
	}
	if (value.task !== "entities") {
		throw new TypeError("NER model task must be entities.");
	}
	if (value.format !== "onnx") {
		throw new TypeError("NER model format must be onnx.");
	}
	const tokenizer = recordValue(value, "tokenizer", "NER model");
	if (tokenizer.type !== "bert-wordpiece") {
		throw new TypeError("NER model tokenizer.type must be bert-wordpiece.");
	}
	const specialTokens = recordValue(
		tokenizer,
		"specialTokens",
		"NER tokenizer",
	);
	const inputs = recordValue(value, "inputs", "NER model");
	const output = recordValue(value, "output", "NER model");
	if (
		!Array.isArray(output.labels) ||
		output.labels.length < 2 ||
		output.labels.some(
			(label) => typeof label !== "string" || label.length === 0,
		)
	) {
		throw new TypeError(
			"NER model output.labels must contain at least two non-empty labels.",
		);
	}
	const maxSequenceLength = value.maxSequenceLength;
	if (
		typeof maxSequenceLength !== "number" ||
		!Number.isSafeInteger(maxSequenceLength) ||
		maxSequenceLength < 3
	) {
		throw new TypeError(
			"NER model maxSequenceLength must be a safe integer of at least 3.",
		);
	}
	return Object.freeze({
		schemaVersion: "1",
		task: "entities",
		format: "onnx",
		artifactId: stringValue(value, "artifactId", "NER model"),
		artifactFile: stringValue(value, "artifactFile", "NER model"),
		tokenizer: Object.freeze({
			type: "bert-wordpiece",
			vocabularyResourceId: stringValue(
				tokenizer,
				"vocabularyResourceId",
				"NER tokenizer",
			),
			doLowerCase: booleanValue(tokenizer, "doLowerCase", "NER tokenizer"),
			stripAccents: booleanValue(tokenizer, "stripAccents", "NER tokenizer"),
			tokenizeChineseCharacters: booleanValue(
				tokenizer,
				"tokenizeChineseCharacters",
				"NER tokenizer",
			),
			specialTokens: Object.freeze({
				unknown: stringValue(specialTokens, "unknown", "NER specialTokens"),
				cls: stringValue(specialTokens, "cls", "NER specialTokens"),
				sep: stringValue(specialTokens, "sep", "NER specialTokens"),
				pad: stringValue(specialTokens, "pad", "NER specialTokens"),
			}),
		}),
		inputs: Object.freeze({
			inputIds: stringValue(inputs, "inputIds", "NER inputs"),
			attentionMask: stringValue(inputs, "attentionMask", "NER inputs"),
			...(inputs.tokenTypeIds === undefined
				? {}
				: { tokenTypeIds: stringValue(inputs, "tokenTypeIds", "NER inputs") }),
		}),
		output: Object.freeze({
			logits: stringValue(output, "logits", "NER output"),
			labels: Object.freeze([...(output.labels as string[])]),
		}),
		maxSequenceLength,
	});
}

function assertEntities(
	text: string,
	viewId: string,
	entities: readonly TextComputingEntitySummary[],
): void {
	let previousEnd = 0;
	const ids = new Set<string>();
	for (const entity of entities) {
		if (ids.has(entity.id)) {
			throw new TypeError(
				`Entity executor returned duplicate id ${entity.id}.`,
			);
		}
		ids.add(entity.id);
		if (
			entity.viewId !== viewId ||
			!Number.isSafeInteger(entity.startCU) ||
			!Number.isSafeInteger(entity.endCU) ||
			entity.startCU < previousEnd ||
			entity.endCU <= entity.startCU ||
			entity.endCU > text.length ||
			entity.text !== text.slice(entity.startCU, entity.endCU)
		) {
			throw new TypeError(
				`Entity executor returned an invalid or overlapping source span for ${entity.id}.`,
			);
		}
		if (
			!Number.isFinite(entity.score) ||
			entity.score < 0 ||
			entity.score > 1
		) {
			throw new TypeError(
				`Entity executor returned an invalid probability for ${entity.id}.`,
			);
		}
		previousEnd = entity.endCU;
	}
}

export async function recognizeEntities(
	context: TextComputingEntityRuntimeContext,
	text: string,
	viewId: string,
	tokenIdsForSpan: (startCU: number, endCU: number) => readonly string[],
): Promise<TextComputingEntityRuntimeResult> {
	assertRunnableTask(context.pack, "entities");
	if (context.executor === undefined) {
		throw new TypeError(
			"The entities task requires an entity executor. Load the pack with entityExecutor from @ismail-elkorchi/text-computing/onnx/node or /onnx/web.",
		);
	}
	const binding = requireSingleTaskResourceBinding(context.pack, {
		slot: "entities",
		role: "primary",
		schemaId: nerModelSchemaId,
	});
	const model = parseNerModel(
		await openResourceJson(context.pack, binding.resourceId, context.reader),
	);
	if (context.executor.format !== model.format) {
		throw new TypeError(
			`Entity executor ${context.executor.id} does not support ${model.format}.`,
		);
	}
	const slot = context.pack.manifest.capabilitySlots.find(
		(candidate) => candidate.slot === "entities",
	);
	if (!(slot?.artifactIds ?? []).includes(model.artifactId)) {
		throw new TypeError(
			`Entities model ${binding.resourceId} references artifact ${model.artifactId}, but the entities slot does not bind it.`,
		);
	}
	const vocabulary = await openResourceText(
		context.pack,
		model.tokenizer.vocabularyResourceId,
		context.reader,
	);
	const result = await context.executor.recognize({
		pack: context.pack,
		...(context.reader === undefined ? {} : { reader: context.reader }),
		...(context.artifactReader === undefined
			? {}
			: { artifactReader: context.artifactReader }),
		modelResourceId: binding.resourceId,
		model,
		vocabulary,
		text,
		viewId,
		languageTag: context.languageTag,
		tokenIdsForSpan,
	});
	const entities = Object.freeze(
		[...result.entities].sort(
			(left, right) => left.startCU - right.startCU || left.endCU - right.endCU,
		),
	);
	assertEntities(text, viewId, entities);
	return Object.freeze({
		entities,
		executorId: result.executorId,
		executorVersion: result.executorVersion,
		executionProvider: result.executionProvider,
		modelResourceId: binding.resourceId,
		artifactId: model.artifactId,
		artifact: artifactIdentity(
			context.pack,
			model.artifactId,
			model.artifactFile,
		),
		modelChecksum: await contentChecksum(JSON.stringify(model)),
		vocabularyChecksum: await contentChecksum(vocabulary),
	});
}

export function entityTokenIds(
	tokens: readonly {
		readonly id: string;
		readonly startCU: number;
		readonly endCU: number;
	}[],
	startCU: number,
	endCU: number,
): readonly string[] {
	return uniqueSorted(
		tokens
			.filter((token) => token.startCU < endCU && token.endCU > startCU)
			.map((token) => token.id),
	);
}
