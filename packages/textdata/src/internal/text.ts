import { fail } from "./errors.js";

const decoder = new TextDecoder("utf-8", { fatal: true });

export type TextPayload =
	| string
	| Uint8Array
	| ArrayBuffer
	| Blob
	| ReadableStream<Uint8Array>;

function isBlob(value: unknown): value is Blob {
	return (
		typeof Blob !== "undefined" &&
		value instanceof Blob &&
		typeof value.text === "function"
	);
}

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
	return (
		typeof ReadableStream !== "undefined" &&
		value instanceof ReadableStream &&
		typeof value.getReader === "function"
	);
}

export async function readTextPayload(payload: TextPayload): Promise<string> {
	if (typeof payload === "string") return payload;
	if (payload instanceof Uint8Array) return decoder.decode(payload);
	if (payload instanceof ArrayBuffer)
		return decoder.decode(new Uint8Array(payload));
	if (isBlob(payload)) return payload.text();
	if (isReadableStream(payload)) {
		const chunks: Uint8Array[] = [];
		const reader = payload.getReader();
		for (;;) {
			const result = await reader.read();
			if (result.done) break;
			chunks.push(result.value);
		}
		const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
		const bytes = new Uint8Array(length);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return decoder.decode(bytes);
	}
	fail("TEXTDATA_INVALID_TEXT_PAYLOAD", "unsupported text payload");
}

export function splitLines(text: string): readonly string[] {
	const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	return normalized.endsWith("\n")
		? normalized.slice(0, -1).split("\n")
		: normalized.split("\n");
}

export function textOffsetsForTokens(
	tokens: readonly string[],
): readonly number[] {
	const offsets: number[] = [];
	let offset = 0;
	for (const token of tokens) {
		offsets.push(offset);
		offset += token.length + 1;
	}
	return offsets;
}
