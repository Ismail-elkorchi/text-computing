import type { TextDocument } from "../document/mod.ts";
import { compareSpans } from "../internal/compare.ts";
import { fail } from "../internal/error.ts";
import {
	isFiniteNumber,
	isNonEmptyString,
	isRecord,
} from "../internal/guards.ts";
import { insertRecordValue, orderedRecord } from "../internal/records.ts";

export type TextUnit =
	| "utf8-byte"
	| "utf16-code-unit"
	| "unicode-scalar"
	| "grapheme"
	| "word"
	| "sentence"
	| "paragraph"
	| "line"
	| "block"
	| "token"
	| "morpheme"
	| "annotation";

export interface Span {
	readonly start: number;
	readonly end: number;
	readonly unit: TextUnit;
}

export interface SpanRef {
	readonly viewId: string;
	readonly span: Span;
}

export type SpanMapRelation =
	| "identity"
	| "normalized"
	| "expanded"
	| "contracted"
	| "inserted"
	| "deleted"
	| "reordered"
	| "aligned"
	| "approximate";

export interface SpanMapEntry {
	readonly source: Span;
	readonly target: Span;
	readonly relation: SpanMapRelation;
	readonly cost?: number;
}

export interface SpanMap {
	readonly id: string;
	readonly sourceViewId: string;
	readonly targetViewId: string;
	readonly entries: readonly SpanMapEntry[];
}

const textUnits: readonly TextUnit[] = [
	"utf8-byte",
	"utf16-code-unit",
	"unicode-scalar",
	"grapheme",
	"word",
	"sentence",
	"paragraph",
	"line",
	"block",
	"token",
	"morpheme",
	"annotation",
];

const spanMapRelations: readonly SpanMapRelation[] = [
	"identity",
	"normalized",
	"expanded",
	"contracted",
	"inserted",
	"deleted",
	"reordered",
	"aligned",
	"approximate",
];

export function isTextUnit(value: unknown): value is TextUnit {
	return typeof value === "string" && textUnits.includes(value as TextUnit);
}

export function isSpanMapRelation(value: unknown): value is SpanMapRelation {
	return (
		typeof value === "string" &&
		spanMapRelations.includes(value as SpanMapRelation)
	);
}

export function isSpan(value: unknown): value is Span {
	return (
		isRecord(value) &&
		isFiniteNumber(value.start) &&
		isFiniteNumber(value.end) &&
		value.start >= 0 &&
		value.end >= value.start &&
		isTextUnit(value.unit)
	);
}

export function isSpanRef(value: unknown): value is SpanRef {
	return (
		isRecord(value) && isNonEmptyString(value.viewId) && isSpan(value.span)
	);
}

export function isSpanMapEntry(value: unknown): value is SpanMapEntry {
	return (
		isRecord(value) &&
		isSpan(value.source) &&
		isSpan(value.target) &&
		isSpanMapRelation(value.relation) &&
		(value.cost === undefined || isFiniteNumber(value.cost))
	);
}

export function isSpanMap(value: unknown): value is SpanMap {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isNonEmptyString(value.sourceViewId) &&
		isNonEmptyString(value.targetViewId) &&
		Array.isArray(value.entries) &&
		value.entries.every((entry) => isSpanMapEntry(entry))
	);
}

export function assertSpan(span: Span, label = "span"): void {
	if (!isSpan(span)) {
		fail(
			"TEXTDOC_INVALID_SPAN",
			`${label} must be a half-open final textdoc span`,
		);
	}
}

function sameSpan(left: Span, right: Span): boolean {
	return (
		left.start === right.start &&
		left.end === right.end &&
		left.unit === right.unit
	);
}

function reverseRelation(relation: SpanMapRelation): SpanMapRelation {
	if (relation === "expanded") return "contracted";
	if (relation === "contracted") return "expanded";
	return relation;
}

function mapEntryForward(
	entry: SpanMapEntry,
	ref: SpanRef,
	targetViewId: string,
): SpanRef | undefined {
	if (!sameSpan(entry.source, ref.span)) return undefined;
	return { viewId: targetViewId, span: entry.target };
}

function mapEntryReverse(
	entry: SpanMapEntry,
	ref: SpanRef,
	targetViewId: string,
): SpanRef | undefined {
	if (!sameSpan(entry.target, ref.span)) return undefined;
	return { viewId: targetViewId, span: entry.source };
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

export function addSpanMap(doc: TextDocument, spanMap: SpanMap): TextDocument {
	const normalized = normalizeSpanMap(spanMap);
	if (doc.views[normalized.sourceViewId] === undefined) {
		fail(
			"TEXTDOC_SPAN_MAP_SOURCE_VIEW_MISSING",
			`span map source view is missing: ${normalized.sourceViewId}`,
		);
	}
	if (doc.views[normalized.targetViewId] === undefined) {
		fail(
			"TEXTDOC_SPAN_MAP_TARGET_VIEW_MISSING",
			`span map target view is missing: ${normalized.targetViewId}`,
		);
	}
	return {
		...doc,
		spanMaps: insertRecordValue(
			doc.spanMaps,
			normalized.id,
			normalized,
			"span map",
		),
	};
}

export function mapSpan(
	doc: TextDocument,
	ref: SpanRef,
	targetViewId: string,
): SpanRef[] {
	if (!isSpanRef(ref)) {
		fail(
			"TEXTDOC_INVALID_SPAN_REF",
			"span reference must satisfy the final SpanRef contract",
		);
	}
	if (!isNonEmptyString(targetViewId)) {
		fail(
			"TEXTDOC_INVALID_VIEW_ID",
			"target view id must be a non-empty string",
		);
	}
	if (ref.viewId === targetViewId) return [ref];

	const mapped: SpanRef[] = [];
	for (const spanMap of Object.values(orderedRecord(doc.spanMaps))) {
		if (
			spanMap.sourceViewId === ref.viewId &&
			spanMap.targetViewId === targetViewId
		) {
			for (const entry of spanMap.entries) {
				const result = mapEntryForward(entry, ref, targetViewId);
				if (result !== undefined && entry.relation !== "deleted")
					mapped.push(result);
			}
		}
		if (
			spanMap.targetViewId === ref.viewId &&
			spanMap.sourceViewId === targetViewId
		) {
			for (const entry of spanMap.entries) {
				const result = mapEntryReverse(
					{ ...entry, relation: reverseRelation(entry.relation) },
					ref,
					targetViewId,
				);
				if (result !== undefined && entry.relation !== "inserted")
					mapped.push(result);
			}
		}
	}
	return mapped.sort((left, right) => compareSpans(left.span, right.span));
}
