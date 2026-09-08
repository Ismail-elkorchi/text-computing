import type { ParallelRecord } from "../dataset/mod.ts";
import { createTextDocument } from "../internal/document.ts";
import { inputOrderId } from "../internal/ids.ts";
import { splitLines } from "../internal/text.ts";
import { parseAlignmentLinks } from "./align.ts";

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
