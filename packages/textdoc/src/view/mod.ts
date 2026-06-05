import type { TextDocument } from "../document/mod.ts";
import { compareSpans } from "../internal/compare.ts";
import { fail } from "../internal/error.ts";
import { isNonEmptyString, isRecord } from "../internal/guards.ts";
import { insertRecordValue } from "../internal/records.ts";
import type { SpanMap } from "../span/mod.ts";
import { isSpanMap } from "../span/mod.ts";

export type TextViewKind =
	| "raw"
	| "decoded"
	| "normalized"
	| "casefolded"
	| "tailored"
	| "tokenized"
	| "morphological"
	| "transliterated"
	| "transcribed"
	| "historical-normalized"
	| "ocr-corrected"
	| "noisy-normalized"
	| "search"
	| "task"
	| "external";

export interface TransformInfo {
	readonly kind: string;
	readonly producer: string;
	readonly algorithm?: string;
	readonly version?: string;
	readonly sourceViewId?: string;
	readonly optionsHash?: string;
}

export interface TextView {
	readonly id: string;
	readonly kind: TextViewKind;
	readonly text: string;
	readonly sourceViewId?: string;
	readonly spanMapId?: string;
	readonly transform: TransformInfo;
}

const viewKinds: readonly TextViewKind[] = [
	"raw",
	"decoded",
	"normalized",
	"casefolded",
	"tailored",
	"tokenized",
	"morphological",
	"transliterated",
	"transcribed",
	"historical-normalized",
	"ocr-corrected",
	"noisy-normalized",
	"search",
	"task",
	"external",
];

export function isTextViewKind(value: unknown): value is TextViewKind {
	return typeof value === "string" && viewKinds.includes(value as TextViewKind);
}

export function isTransformInfo(value: unknown): value is TransformInfo {
	return (
		isRecord(value) &&
		isNonEmptyString(value.kind) &&
		isNonEmptyString(value.producer) &&
		(value.algorithm === undefined || isNonEmptyString(value.algorithm)) &&
		(value.version === undefined || isNonEmptyString(value.version)) &&
		(value.sourceViewId === undefined ||
			isNonEmptyString(value.sourceViewId)) &&
		(value.optionsHash === undefined || isNonEmptyString(value.optionsHash))
	);
}

export function isTextView(value: unknown): value is TextView {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isTextViewKind(value.kind) &&
		typeof value.text === "string" &&
		(value.sourceViewId === undefined ||
			isNonEmptyString(value.sourceViewId)) &&
		(value.spanMapId === undefined || isNonEmptyString(value.spanMapId)) &&
		isTransformInfo(value.transform)
	);
}

function normalizeView(view: TextView): TextView {
	if (!isTextView(view)) {
		fail(
			"TEXTDOC_INVALID_VIEW",
			"view must satisfy the final TextView contract",
		);
	}
	return view;
}

function normalizeSpanMap(spanMap: SpanMap): SpanMap {
	if (!isSpanMap(spanMap)) {
		fail(
			"TEXTDOC_INVALID_SPAN_MAP",
			"span map must satisfy the final SpanMap contract",
		);
	}
	const entries = [...spanMap.entries].sort(
		(left, right) =>
			compareSpans(left.source, right.source) ||
			compareSpans(left.target, right.target),
	);
	return { ...spanMap, entries };
}

export function addView(doc: TextDocument, view: TextView): TextDocument {
	const normalized = normalizeView(view);
	if (
		normalized.sourceViewId !== undefined &&
		doc.views[normalized.sourceViewId] === undefined
	) {
		fail(
			"TEXTDOC_VIEW_SOURCE_MISSING",
			`source view is missing: ${normalized.sourceViewId}`,
		);
	}
	if (
		normalized.spanMapId !== undefined &&
		doc.spanMaps[normalized.spanMapId] === undefined
	) {
		fail(
			"TEXTDOC_VIEW_SPAN_MAP_MISSING",
			`view span map is missing: ${normalized.spanMapId}`,
		);
	}
	if (normalized.spanMapId !== undefined) {
		const spanMap = doc.spanMaps[normalized.spanMapId] as SpanMap;
		if (spanMap.targetViewId !== normalized.id) {
			fail(
				"TEXTDOC_VIEW_SPAN_MAP_TARGET_MISMATCH",
				`view span map target mismatch: ${normalized.id}:${spanMap.targetViewId}`,
			);
		}
		if (
			normalized.sourceViewId !== undefined &&
			spanMap.sourceViewId !== normalized.sourceViewId
		) {
			fail(
				"TEXTDOC_VIEW_SPAN_MAP_SOURCE_MISMATCH",
				`view span map source mismatch: ${normalized.id}:${spanMap.sourceViewId}`,
			);
		}
	}
	return {
		...doc,
		views: insertRecordValue(doc.views, normalized.id, normalized, "view"),
	};
}

export function addViewWithSpanMap(
	doc: TextDocument,
	view: TextView,
	spanMap: SpanMap,
): TextDocument {
	const normalizedView = normalizeView(view);
	const normalizedSpanMap = normalizeSpanMap(spanMap);
	if (normalizedView.sourceViewId === undefined) {
		fail(
			"TEXTDOC_VIEW_SOURCE_MISSING",
			"views added with span maps must declare a source view",
		);
	}
	if (doc.views[normalizedView.sourceViewId] === undefined) {
		fail(
			"TEXTDOC_VIEW_SOURCE_MISSING",
			`source view is missing: ${normalizedView.sourceViewId}`,
		);
	}
	if (normalizedView.spanMapId !== normalizedSpanMap.id) {
		fail(
			"TEXTDOC_VIEW_SPAN_MAP_MISMATCH",
			`view span map id must match span map id: ${normalizedView.id}:${normalizedSpanMap.id}`,
		);
	}
	if (normalizedSpanMap.sourceViewId !== normalizedView.sourceViewId) {
		fail(
			"TEXTDOC_VIEW_SPAN_MAP_SOURCE_MISMATCH",
			`view span map source mismatch: ${normalizedView.id}:${normalizedSpanMap.sourceViewId}`,
		);
	}
	if (normalizedSpanMap.targetViewId !== normalizedView.id) {
		fail(
			"TEXTDOC_VIEW_SPAN_MAP_TARGET_MISMATCH",
			`view span map target mismatch: ${normalizedView.id}:${normalizedSpanMap.targetViewId}`,
		);
	}
	return {
		...doc,
		views: insertRecordValue(
			doc.views,
			normalizedView.id,
			normalizedView,
			"view",
		),
		spanMaps: insertRecordValue(
			doc.spanMaps,
			normalizedSpanMap.id,
			normalizedSpanMap,
			"span map",
		),
	};
}
