import type { ParallelRecord } from "../dataset/mod.js";
import { createTextDocument } from "../internal/document.js";
import { inputOrderId } from "../internal/ids.js";
import { splitLines } from "../internal/text.js";
import { parseAlignmentLinks } from "./align.js";

export function parallelLinesToRecords(
	sourceText: string,
	targetText: string,
	alignments = "",
	sourceLanguage?: string,
	targetLanguage?: string,
): readonly ParallelRecord[] {
	const sourceLines = splitLines(sourceText);
	const targetLines = splitLines(targetText);
	const count = Math.max(sourceLines.length, targetLines.length);
	const links = alignments === "" ? [] : parseAlignmentLinks(alignments);
	const records: ParallelRecord[] = [];
	for (let index = 0; index < count; index += 1) {
		const id = inputOrderId("parallel", index);
		const source = sourceLines[index] ?? "";
		const target = targetLines[index] ?? "";
		records.push({
			id,
			sourceText: source,
			targetText: target,
			sourceDocument: createTextDocument(source, `source:${id}`, {
				metadata: { language: sourceLanguage ?? null },
			}),
			targetDocument: createTextDocument(target, `target:${id}`, {
				metadata: { language: targetLanguage ?? null },
			}),
			...(sourceLanguage !== undefined ? { sourceLanguage } : {}),
			...(targetLanguage !== undefined ? { targetLanguage } : {}),
			alignments: links.filter((link) => link.id === `alignment:${index + 1}`),
		});
	}
	return records;
}
