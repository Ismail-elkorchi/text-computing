import type {
	TextComputingEntityExecutor,
	TextComputingEntityExecutorRequest,
	TextComputingEntitySummary,
} from "./internal/types.ts";
import {
	tokenizeWordPieceChunks,
	type WordPieceToken,
} from "./internal/wordpiece.ts";
import { artifactIdentity, openArtifactBytes } from "./packs/artifacts.ts";

export interface TextComputingOnnxTensor {
	readonly data: ArrayLike<number | bigint>;
	readonly dims: readonly number[];
}

export interface TextComputingOnnxSession {
	readonly run: (
		feeds: Readonly<Record<string, TextComputingOnnxTensor>>,
	) => Promise<Readonly<Record<string, TextComputingOnnxTensor>>>;
}

export interface TextComputingOnnxBackend {
	readonly version: string;
	readonly id: string;
	readonly createSession: (
		model: Uint8Array,
	) => Promise<TextComputingOnnxSession>;
	readonly createInt64Tensor: (
		data: BigInt64Array,
		dims: readonly number[],
	) => TextComputingOnnxTensor;
}

interface TaggedPiece {
	readonly piece: WordPieceToken;
	readonly label: string;
	readonly probability: number;
}

function outputValues(tensor: TextComputingOnnxTensor): readonly number[] {
	const values: number[] = [];
	for (let index = 0; index < tensor.data.length; index += 1) {
		const value = tensor.data[index];
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new TypeError("ONNX NER logits must contain finite numbers.");
		}
		values.push(value);
	}
	return values;
}

function predictedLabel(
	values: readonly number[],
	offset: number,
	labels: readonly string[],
): { readonly label: string; readonly probability: number } {
	let maximum = Number.NEGATIVE_INFINITY;
	let labelIndex = 0;
	for (let index = 0; index < labels.length; index += 1) {
		const value = values[offset + index];
		if (value !== undefined && value > maximum) {
			maximum = value;
			labelIndex = index;
		}
	}
	let denominator = 0;
	for (let index = 0; index < labels.length; index += 1) {
		denominator += Math.exp((values[offset + index] ?? 0) - maximum);
	}
	const label = labels[labelIndex];
	if (label === undefined)
		throw new TypeError("ONNX NER label index is invalid.");
	return Object.freeze({ label, probability: 1 / denominator });
}

function entityType(modelLabel: string): string {
	const commonTypes: Readonly<Record<string, string>> = {
		PER: "person",
		ORG: "organization",
		LOC: "location",
		DATE: "date",
		MISC: "miscellaneous",
	};
	return commonTypes[modelLabel] ?? modelLabel.toLocaleLowerCase("und");
}

function entitiesFromPieces(
	request: TextComputingEntityExecutorRequest,
	pieces: readonly TaggedPiece[],
): readonly TextComputingEntitySummary[] {
	interface EntityDraft {
		readonly modelLabel: string;
		readonly startCU: number;
		endCU: number;
		readonly probabilities: number[];
	}
	const drafts: EntityDraft[] = [];
	let current: EntityDraft | undefined;
	const flush = () => {
		if (current !== undefined) drafts.push(current);
		current = undefined;
	};
	for (const tagged of pieces) {
		const match = /^(B|I)-(.+)$/u.exec(tagged.label);
		if (match === null) {
			flush();
			continue;
		}
		const prefix = match[1];
		const modelLabel = match[2];
		if (modelLabel === undefined) {
			flush();
			continue;
		}
		if (
			prefix === "B" ||
			current === undefined ||
			current.modelLabel !== modelLabel
		) {
			flush();
			current = {
				modelLabel,
				startCU: tagged.piece.startCU,
				endCU: tagged.piece.endCU,
				probabilities: [tagged.probability],
			};
		} else {
			current.endCU = tagged.piece.endCU;
			current.probabilities.push(tagged.probability);
		}
	}
	flush();
	return Object.freeze(
		drafts.map((draft, index) =>
			Object.freeze({
				id: `text-computing-entity-${String(index).padStart(6, "0")}`,
				type: entityType(draft.modelLabel),
				text: request.text.slice(draft.startCU, draft.endCU),
				score:
					draft.probabilities.reduce((sum, value) => sum + value, 0) /
					draft.probabilities.length,
				viewId: request.viewId,
				startCU: draft.startCU,
				endCU: draft.endCU,
				tokenIds: Object.freeze(
					request.tokenIdsForSpan(draft.startCU, draft.endCU),
				),
				modelLabel: draft.modelLabel,
			}),
		),
	);
}

export function createOnnxEntityExecutor(
	backend: TextComputingOnnxBackend,
): TextComputingEntityExecutor {
	const sessions = new Map<string, Promise<TextComputingOnnxSession>>();
	return Object.freeze({
		id: `text-computing-entities:${backend.id}`,
		version: backend.version,
		format: "onnx" as const,
		async recognize(request: TextComputingEntityExecutorRequest) {
			if (request.artifactReader === undefined) {
				throw new TypeError(
					"ONNX entity recognition requires an explicit artifactReader; model downloads are never implicit.",
				);
			}
			const artifact = request.pack.manifest.artifacts?.find(
				(candidate) => candidate.artifactId === request.model.artifactId,
			);
			if (artifact === undefined) {
				throw new TypeError(
					`NER model artifact ${request.model.artifactId} is not declared.`,
				);
			}
			const sessionKey = JSON.stringify(
				artifactIdentity(
					request.pack,
					artifact.artifactId,
					request.model.artifactFile,
				),
			);
			let session = sessions.get(sessionKey);
			if (session === undefined) {
				session = openArtifactBytes(
					request.pack,
					artifact.artifactId,
					request.artifactReader,
					request.model.artifactFile,
				).then((bytes) => backend.createSession(bytes));
				sessions.set(sessionKey, session);
				void session.catch(() => {
					if (sessions.get(sessionKey) === session) {
						sessions.delete(sessionKey);
					}
				});
			}
			const modelSession = await session;
			const taggedPieces: TaggedPiece[] = [];
			for (const chunk of tokenizeWordPieceChunks(
				request.text,
				request.model,
				request.vocabulary,
			)) {
				const sequenceLength = chunk.inputIds.length;
				const feeds: Record<string, TextComputingOnnxTensor> = {
					[request.model.inputs.inputIds]: backend.createInt64Tensor(
						chunk.inputIds,
						[1, sequenceLength],
					),
					[request.model.inputs.attentionMask]: backend.createInt64Tensor(
						chunk.attentionMask,
						[1, sequenceLength],
					),
				};
				if (request.model.inputs.tokenTypeIds !== undefined) {
					feeds[request.model.inputs.tokenTypeIds] = backend.createInt64Tensor(
						BigInt64Array.from(chunk.inputIds, () => 0n),
						[1, sequenceLength],
					);
				}
				const outputs = await modelSession.run(feeds);
				const logits = outputs[request.model.output.logits];
				if (logits === undefined) {
					throw new TypeError(
						`ONNX NER session did not return ${request.model.output.logits}.`,
					);
				}
				const labelCount = request.model.output.labels.length;
				if (
					logits.dims.length !== 3 ||
					logits.dims[0] !== 1 ||
					logits.dims[1] !== sequenceLength ||
					logits.dims[2] !== labelCount
				) {
					throw new TypeError(
						`ONNX NER logits must have shape [1, ${sequenceLength}, ${labelCount}].`,
					);
				}
				const values = outputValues(logits);
				for (let index = 1; index < sequenceLength - 1; index += 1) {
					const piece = chunk.tokens[index];
					if (piece === undefined) continue;
					const prediction = predictedLabel(
						values,
						index * labelCount,
						request.model.output.labels,
					);
					taggedPieces.push(Object.freeze({ piece, ...prediction }));
				}
			}
			return Object.freeze({
				entities: entitiesFromPieces(request, taggedPieces),
				executorId: `text-computing-entities:${backend.id}`,
				executorVersion: backend.version,
				executionProvider: backend.id,
			});
		},
	});
}
