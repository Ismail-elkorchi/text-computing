import { createDataset, type DatasetReadOptions } from "../dataset/mod.js";
import { readTextPayload, type TextPayload } from "../internal/text.js";
import { conlluSentenceToRecord, parseConllu } from "./parse.js";

export type { ConlluSentence, ConlluToken } from "./parse.js";
export { conlluSentenceToRecord, parseConllu } from "./parse.js";
export { serializeConllu } from "./serialize.js";
export type {
	TextPackLike,
	TextPackResourceLike,
	UdAnnotationRecord,
	UdAnnotationToken,
	UdDependencyProfileRecord,
	UdFeatureProfileRecord,
	UdPosProfileRecord,
	UdSentenceProfileRecord,
	UdSyntaxPackOptions,
	UdSyntaxPackResources,
	UdSyntaxResourceIds,
} from "./textpack.js";
export {
	readUdAnnotationDatasetFromPack,
	readUdAnnotationDatasetFromPackAsync,
	udAnnotationRecordsFromPack,
	udAnnotationRecordsFromPackAsync,
	udSyntaxResourcesFromPack,
	udSyntaxResourcesFromPackAsync,
} from "./textpack.js";

export async function readConlluDataset(
	text: TextPayload,
	options: DatasetReadOptions = {},
) {
	const source = await readTextPayload(text);
	const records = parseConllu(source).map((sentence, index) =>
		conlluSentenceToRecord(sentence, index),
	);
	return createDataset(records, {
		id: options.id ?? "conllu",
		metadata: { ...options.metadata, format: "conllu" },
	});
}
