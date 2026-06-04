import type { DatasetRecord } from "../dataset/mod.js";
import {
	assertFinalDocument,
	createTextDocument,
	textDataEvidence,
	withAnnotation,
	withLayer,
} from "../internal/document.js";
import { inputOrderId } from "../internal/ids.js";
import type { XmlExtractResult } from "../internal/xml.js";
import { structuralElements, structuralType } from "./structure.js";

export function xmlExtractToRecord(
	extract: XmlExtractResult,
	id: string,
	index: number,
	format: "tei" | "html" | "xml",
): DatasetRecord {
	let document = createTextDocument(extract.text, `doc:${id}`, {
		metadata: { format, ...extract.metadata },
	});
	document = withLayer(document, {
		id: "structure",
		type: "structure",
		viewId: "raw",
		annotations: {},
	});
	let ordinal = 0;
	for (const element of structuralElements(extract.elements)) {
		if (element.end === element.start && element.name.toLowerCase() !== "lb") {
			continue;
		}
		ordinal += 1;
		document = withAnnotation(document, {
			id: `structure:${id}:${ordinal}`,
			layer: "structure",
			type: structuralType(element.name),
			spans: [
				{
					viewId: "raw",
					span: {
						start: element.start,
						end: element.end,
						unit: "utf16-code-unit",
					},
				},
			],
			value: {
				name: element.name,
				attributes: element.attributes,
				text: extract.text.slice(element.start, element.end),
			},
			evidence: textDataEvidence(),
		});
	}
	return {
		id: id || inputOrderId("record", index),
		text: extract.text,
		document: assertFinalDocument(document),
		fields: { format },
		metadata: extract.metadata,
	};
}
