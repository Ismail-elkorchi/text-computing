import {
	createDataset,
	type DatasetReadOptions,
	type DatasetRecord,
} from "../dataset/mod.js";
import {
	createTextDocument,
	textDataEvidence,
	withAnnotation,
	withLayer,
} from "../internal/document.js";
import { inputOrderId } from "../internal/ids.js";
import {
	readTextPayload,
	splitLines,
	type TextPayload,
	textOffsetsForTokens,
} from "../internal/text.js";

export async function readConllDataset(
	text: TextPayload,
	options: DatasetReadOptions = {},
) {
	const source = await readTextPayload(text);
	const sentences: string[][][] = [];
	let sentence: string[][] = [];
	for (const line of splitLines(source)) {
		if (line.trim() === "") {
			if (sentence.length > 0) sentences.push(sentence);
			sentence = [];
			continue;
		}
		if (line.startsWith("#")) continue;
		sentence.push(line.trim().split(/\s+/));
	}
	if (sentence.length > 0) sentences.push(sentence);
	const tagColumn =
		typeof options.tagColumn === "number" ? options.tagColumn : 1;
	const records: DatasetRecord[] = sentences.map((rows, sentenceIndex) => {
		const id = inputOrderId("sentence", sentenceIndex);
		const tokens = rows.map((row) => row[0] ?? "");
		const offsets = textOffsetsForTokens(tokens);
		const textValue = tokens.join(" ");
		let document = createTextDocument(textValue, `doc:${id}`, {
			metadata: { format: "conll" },
		});
		document = withLayer(document, {
			id: "tokens",
			type: "token.word",
			viewId: "raw",
			annotations: {},
		});
		for (let tokenIndex = 0; tokenIndex < rows.length; tokenIndex += 1) {
			const row = rows[tokenIndex];
			const token = row?.[0] ?? "";
			const start = offsets[tokenIndex] ?? 0;
			document = withAnnotation(document, {
				id: `token:${id}:${tokenIndex + 1}`,
				layer: "tokens",
				type: "token.word",
				spans: [
					{
						viewId: "raw",
						span: {
							start,
							end: start + token.length,
							unit: "utf16-code-unit",
						},
					},
				],
				value: {
					index: tokenIndex,
					text: token,
					tag: row?.[tagColumn] ?? null,
				},
				evidence: textDataEvidence(),
			});
		}
		return { id, text: textValue, document, fields: { format: "conll" } };
	});
	return createDataset(records, {
		id: options.id ?? "conll",
		metadata: { ...options.metadata, format: "conll" },
	});
}
