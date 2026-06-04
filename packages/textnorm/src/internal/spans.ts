import type {
	Span,
	SpanRef,
	TextDocument,
	TextUnit,
	TextView,
} from "@ismail-elkorchi/textdoc";

export function assertUtf16Span(span: Span, label = "span"): void {
	if (span.unit !== "utf16-code-unit") {
		throw new TypeError(`${label} must use utf16-code-unit coordinates.`);
	}
	if (
		!Number.isInteger(span.start) ||
		!Number.isInteger(span.end) ||
		span.start < 0 ||
		span.end < span.start
	) {
		throw new TypeError(`${label} must be a valid half-open span.`);
	}
}

export function assertSpanWithinView(
	view: TextView,
	span: Span,
	label = "span",
): void {
	assertUtf16Span(span, label);
	if (span.end > view.text.length) {
		throw new RangeError(`${label} exceeds view text length.`);
	}
}

export function sourceTextForSpan(doc: TextDocument, ref: SpanRef): string {
	const view = doc.views[ref.viewId];
	if (view === undefined)
		throw new TypeError(`span references missing view: ${ref.viewId}`);
	assertSpanWithinView(view, ref.span, "candidate source span");
	return view.text.slice(ref.span.start, ref.span.end);
}

export function utf16Span(start: number, end: number): Span {
	return Object.freeze({ start, end, unit: "utf16-code-unit" as TextUnit });
}

export function utf16SpanRef(
	viewId: string,
	start: number,
	end: number,
): SpanRef {
	return Object.freeze({ viewId, span: utf16Span(start, end) });
}

export function findAllSpans(text: string, needle: string): readonly Span[] {
	if (needle.length === 0) return Object.freeze([]);
	const spans: Span[] = [];
	let offset = text.indexOf(needle);
	while (offset >= 0) {
		spans.push(utf16Span(offset, offset + needle.length));
		offset = text.indexOf(needle, Math.max(offset + 1, offset + needle.length));
	}
	return Object.freeze(spans);
}
