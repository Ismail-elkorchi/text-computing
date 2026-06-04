import { createDataset, type DatasetReadOptions } from "../dataset/mod.js";
import { readTextPayload, type TextPayload } from "../internal/text.js";
import { parseXmlRecord } from "./parse.js";

export { parseXmlRecord } from "./parse.js";
export { structuralElements, structuralType } from "./structure.js";
export { xmlExtractToRecord } from "./textdoc.js";

export async function readTeiDataset(
	text: TextPayload,
	options: DatasetReadOptions = {},
) {
	const source = await readTextPayload(text);
	const record = parseXmlRecord(
		source,
		options.id ?? "tei",
		0,
		"tei",
		options.strict !== false,
	);
	return createDataset([record], {
		id: options.id ?? "tei",
		metadata: { ...options.metadata, format: "tei" },
	});
}

export async function readXmlDataset(
	text: TextPayload,
	options: DatasetReadOptions = {},
) {
	const source = await readTextPayload(text);
	const format = options.format === "html" ? "html" : "xml";
	const record = parseXmlRecord(
		source,
		options.id ?? format,
		0,
		format,
		options.strict !== false,
	);
	return createDataset([record], {
		id: options.id ?? format,
		metadata: { ...options.metadata, format },
	});
}
