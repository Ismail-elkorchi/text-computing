import * as ort from "onnxruntime-node";
import {
	createOnnxEntityExecutor,
	type TextComputingOnnxBackend,
	type TextComputingOnnxSession,
	type TextComputingOnnxTensor,
} from "./onnx.ts";

export type {
	TextComputingOnnxBackend,
	TextComputingOnnxSession,
	TextComputingOnnxTensor,
} from "./onnx.ts";
export { createOnnxEntityExecutor } from "./onnx.ts";

export function createNodeOnnxEntityExecutor() {
	const backend: TextComputingOnnxBackend = {
		id: "onnxruntime-node",
		version: "1.29.0",
		createSession: async (model) => {
			const session = await ort.InferenceSession.create(model);
			return {
				async run(feeds) {
					return (await session.run(
						feeds as Readonly<Record<string, ort.Tensor>>,
					)) as Readonly<Record<string, TextComputingOnnxTensor>>;
				},
			} satisfies TextComputingOnnxSession;
		},
		createInt64Tensor: (data, dims) => new ort.Tensor("int64", data, [...dims]),
	};
	return createOnnxEntityExecutor(backend);
}
