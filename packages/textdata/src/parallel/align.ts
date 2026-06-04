import type { AlignmentLink } from "../dataset/mod.js";
import { fail } from "../internal/errors.js";
import { splitLines } from "../internal/text.js";

export function parseAlignmentLinks(text: string): readonly AlignmentLink[] {
	const links: AlignmentLink[] = [];
	for (const [lineIndex, line] of splitLines(text).entries()) {
		if (line.trim() === "") continue;
		const [sourceRaw, targetRaw, relation] = line.trim().split(/\s+/);
		if (sourceRaw === undefined || targetRaw === undefined) {
			fail(
				"TEXTDATA_ALIGNMENT",
				"alignment rows require source and target spans",
			);
		}
		const [sourceStart, sourceEnd] = sourceRaw.split("-").map(Number);
		const [targetStart, targetEnd] = targetRaw.split("-").map(Number);
		if (
			!Number.isFinite(sourceStart) ||
			!Number.isFinite(sourceEnd) ||
			!Number.isFinite(targetStart) ||
			!Number.isFinite(targetEnd)
		) {
			fail("TEXTDATA_ALIGNMENT", "alignment spans must be numeric");
		}
		const sourceStartValue = sourceStart as number;
		const sourceEndValue = sourceEnd as number;
		const targetStartValue = targetStart as number;
		const targetEndValue = targetEnd as number;
		links.push({
			id: `alignment:${lineIndex + 1}`,
			source: {
				viewId: "raw",
				span: {
					start: sourceStartValue,
					end: sourceEndValue,
					unit: "utf16-code-unit",
				},
			},
			target: {
				viewId: "raw",
				span: {
					start: targetStartValue,
					end: targetEndValue,
					unit: "utf16-code-unit",
				},
			},
			...(relation !== undefined ? { relation } : {}),
		});
	}
	return links;
}
