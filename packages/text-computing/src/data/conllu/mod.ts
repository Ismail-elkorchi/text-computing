import { createDataset, type DatasetReadOptions } from "../dataset/mod.ts";
import { readTextPayload, type TextPayload } from "../internal/text.ts";
import { conlluSentenceToRecord, parseConllu } from "./parse.ts";

export type { ConlluSentence, ConlluToken } from "./parse.ts";
export { conlluSentenceToRecord, parseConllu } from "./parse.ts";
export { serializeConllu } from "./serialize.ts";
export type {
	TextPackLike,
	TextPackResourceLike,
	UdAnnotationPackOptions,
	UdAnnotationRecord,
	UdAnnotationToken,
	UdDependencyProfileRecord,
	UdFeatureProfileRecord,
	UdPosProfileRecord,
	UdSentenceProfileRecord,
	UdSyntaxPackOptions,
	UdSyntaxPackResources,
	UdSyntaxResourceIds,
} from "./textpack.ts";
export {
	readUdAnnotationDatasetFromPack,
	readUdAnnotationDatasetFromPackAsync,
	udAnnotationRecordsFromPack,
	udAnnotationRecordsFromPackAsync,
	udSyntaxResourcesFromPack,
	udSyntaxResourcesFromPackAsync,
} from "./textpack.ts";

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
