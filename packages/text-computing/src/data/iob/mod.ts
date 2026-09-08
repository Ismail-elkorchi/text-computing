import { createDataset, type DatasetReadOptions } from "../dataset/mod.ts";
import { readTextPayload, type TextPayload } from "../internal/text.ts";
import { iobSentenceToRecord, parseIob } from "./parse.ts";
import type { SequenceLabelScheme } from "./scheme.ts";

export type { IobSentence, IobToken } from "./parse.ts";
export { iobSentenceToRecord, parseIob } from "./parse.ts";
export type { ParsedSequenceLabel, SequenceLabelScheme } from "./scheme.ts";
export { assertTransition, parseSequenceLabel } from "./scheme.ts";
export { serializeIob } from "./serialize.ts";

export async function readIobDataset(
	text: TextPayload,
	options: DatasetReadOptions = {},
) {
	const scheme = (options.scheme ?? "BIO") as SequenceLabelScheme;
	const source = await readTextPayload(text);
	const records = parseIob(source, scheme).map((sentence, index) =>
		iobSentenceToRecord(sentence, index, scheme),
	);
	return createDataset(records, {
		id: options.id ?? "iob",
		metadata: { ...options.metadata, format: "iob", scheme },
	});
}
