import {
	createDataset,
	type DatasetReadOptions,
	type DatasetRecord,
} from "../dataset/mod.js";
import { createTextDocument } from "../internal/document.js";
import { inputOrderId } from "../internal/ids.js";
import { readTextPayload, type TextPayload } from "../internal/text.js";

async function* textPayloads(
	input:
		| TextPayload
		| readonly TextPayload[]
		| Iterable<TextPayload>
		| AsyncIterable<TextPayload>,
): AsyncIterable<TextPayload> {
	if (
		typeof input === "string" ||
		input instanceof Uint8Array ||
		input instanceof ArrayBuffer ||
		(typeof Blob !== "undefined" && input instanceof Blob) ||
		(typeof ReadableStream !== "undefined" && input instanceof ReadableStream)
	) {
		yield input as TextPayload;
		return;
	}
	for await (const payload of input as
		| Iterable<TextPayload>
		| AsyncIterable<TextPayload>) {
		yield payload;
	}
}

export async function readPlainTextCollection(
	input:
		| TextPayload
		| readonly TextPayload[]
		| Iterable<TextPayload>
		| AsyncIterable<TextPayload>,
	options: DatasetReadOptions = {},
) {
	const records: DatasetRecord[] = [];
	let index = 0;
	for await (const payload of textPayloads(input)) {
		const id = inputOrderId("record", index);
		const text = await readTextPayload(payload);
		records.push({
			id,
			text,
			document: createTextDocument(text, `doc:${id}`, {
				metadata: {
					format: "plain-text",
					...(options.language !== undefined
						? { language: options.language }
						: {}),
					...(options.script !== undefined ? { script: options.script } : {}),
				},
			}),
			fields: { format: "plain-text" },
		});
		index += 1;
	}
	return createDataset(records, {
		id: options.id ?? "plain-text",
		metadata: { ...options.metadata, format: "plain-text" },
	});
}
