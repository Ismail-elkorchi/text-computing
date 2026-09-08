import type { Annotation } from "../annotation/mod.ts";
import type { Span, SpanRef } from "../span/mod.ts";

export function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareNumbers(left: number, right: number): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function compareSpans(left: Span, right: Span): number {
	return (
		compareStrings(left.unit, right.unit) ||
		compareNumbers(left.start, right.start) ||
		compareNumbers(left.end, right.end)
	);
}

export function compareSpanRefs(left: SpanRef, right: SpanRef): number {
	return (
		compareStrings(left.viewId, right.viewId) ||
		compareSpans(left.span, right.span)
	);
}

export function compareAnnotations(
	left: Annotation,
	right: Annotation,
): number {
	const leftFirstSpan = left.spans[0];
	const rightFirstSpan = right.spans[0];
	if (leftFirstSpan !== undefined && rightFirstSpan !== undefined) {
		const bySpan = compareSpanRefs(leftFirstSpan, rightFirstSpan);
		if (bySpan !== 0) return bySpan;
	} else if (leftFirstSpan !== undefined) {
		return -1;
	} else if (rightFirstSpan !== undefined) {
		return 1;
	}
	return (
		compareStrings(left.layer, right.layer) ||
		compareStrings(left.type, right.type) ||
		compareStrings(left.id, right.id)
	);
}

export function sortedKeys(record: Record<string, unknown>): string[] {
	return Object.keys(record).sort(compareStrings);
}
