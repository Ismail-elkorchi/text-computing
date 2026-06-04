import { createDataset, type DatasetReadOptions } from "../dataset/mod.js";
import { readTextPayload, type TextPayload } from "../internal/text.js";
import { iobSentenceToRecord, parseIob } from "./parse.js";
import type { SequenceLabelScheme } from "./scheme.js";

export type { IobSentence, IobToken } from "./parse.js";
export { iobSentenceToRecord, parseIob } from "./parse.js";
export type { ParsedSequenceLabel, SequenceLabelScheme } from "./scheme.js";
export { assertTransition, parseSequenceLabel } from "./scheme.js";
export { serializeIob } from "./serialize.js";

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
