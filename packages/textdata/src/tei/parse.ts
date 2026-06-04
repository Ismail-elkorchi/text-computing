import type { DatasetRecord } from "../dataset/mod.js";
import { extractXmlText } from "../internal/xml.js";
import { xmlExtractToRecord } from "./textdoc.js";

export function parseXmlRecord(
	source: string,
	id: string,
	index: number,
	format: "tei" | "html" | "xml",
	strict = true,
): DatasetRecord {
	return xmlExtractToRecord(extractXmlText(source, strict), id, index, format);
}
