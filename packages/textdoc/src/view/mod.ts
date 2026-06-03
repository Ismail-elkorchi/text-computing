import type { TextDocument } from "../document/mod.ts";
import { fail } from "../internal/error.ts";
import { isNonEmptyString, isRecord } from "../internal/guards.ts";
import { insertRecordValue } from "../internal/records.ts";

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
	return {
		...doc,
		views: insertRecordValue(doc.views, normalized.id, normalized, "view"),
	};
}
