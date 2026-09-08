import type { DatasetRecord } from "../dataset/mod.ts";
import { extractXmlText } from "../internal/xml.ts";
import { xmlExtractToRecord } from "./textdoc.ts";

export function parseXmlRecord(
	source: string,
	id: string,
	index: number,
	format: "tei" | "html" | "xml",
	strict = true,
): DatasetRecord {
	return xmlExtractToRecord(extractXmlText(source, strict), id, index, format);
}
