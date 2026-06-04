import type { DatasetOutput } from "../dataset/mod.js";

const encoder = new TextEncoder();

export async function writeChunk(
	output: DatasetOutput,
	chunk: string,
): Promise<void> {
	if (output.kind === "chunks") {
		output.chunks.push(chunk);
		return;
	}
	if (output.kind === "bytes") {
		output.chunks.push(encoder.encode(chunk));
		return;
	}
	if (output.kind === "writer") {
		await output.write(chunk);
		return;
	}
	if (output.kind === "stream") {
		const writer = output.stream.getWriter();
		await writer.write(encoder.encode(chunk));
		writer.releaseLock();
	}
}
