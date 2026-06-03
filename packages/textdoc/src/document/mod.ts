import {
	readText,
	type TextInput as TextfactsInput,
} from "@ismail-elkorchi/textfacts/input";
import type { AnnotationGraph } from "../graph/mod.ts";
import { isAnnotationGraph } from "../graph/mod.ts";
import { fail } from "../internal/error.ts";
import { isNonEmptyString, isRecord } from "../internal/guards.ts";
import { orderedRecord } from "../internal/records.ts";
import type { AnnotationLayer } from "../layer/mod.ts";
import { isAnnotationLayer } from "../layer/mod.ts";
import type { SpanMap } from "../span/mod.ts";
import { isSpanMap } from "../span/mod.ts";
import type { TextView, TransformInfo } from "../view/mod.ts";
import { isTextView } from "../view/mod.ts";

export type TextInput = TextfactsInput;

export interface TextSource {
	readonly id: string;
	readonly text: string;
	readonly inputKind: "string" | "utf8" | "utf16le" | "bytes";
	readonly byteLength?: number;
	readonly wellFormed: boolean;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TextDocument {
	readonly id: string;
	readonly sources: Readonly<Record<string, TextSource>>;
	readonly views: Readonly<Record<string, TextView>>;
	readonly spanMaps: Readonly<Record<string, SpanMap>>;
	readonly layers: Readonly<Record<string, AnnotationLayer>>;
	readonly graphs: Readonly<Record<string, AnnotationGraph>>;
	readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CreateDocumentOptions {
	readonly id?: string;
	readonly sourceId?: string;
	readonly sourceMetadata?: Readonly<Record<string, unknown>>;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly rawViewId?: string;
	readonly includeText?: true;
	readonly allowIllFormed?: boolean;
	readonly transform?: Partial<TransformInfo>;
}

export interface TextDocumentValidationResult {
	readonly ok: boolean;
	readonly diagnostics: readonly string[];
}

function defaultRawTransform(
	overrides: Partial<TransformInfo> | undefined,
): TransformInfo {
	return {
		kind: overrides?.kind ?? "raw-input",
		producer: overrides?.producer ?? "@ismail-elkorchi/textdoc",
		...(overrides?.algorithm !== undefined
			? { algorithm: overrides.algorithm }
			: {}),
		...(overrides?.version !== undefined ? { version: overrides.version } : {}),
		...(overrides?.sourceViewId !== undefined
			? { sourceViewId: overrides.sourceViewId }
			: {}),
		...(overrides?.optionsHash !== undefined
			? { optionsHash: overrides.optionsHash }
			: {}),
	};
}

export function isTextSource(value: unknown): value is TextSource {
	const byteLength = isRecord(value) ? value.byteLength : undefined;
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		typeof value.text === "string" &&
		(value.inputKind === "string" ||
			value.inputKind === "utf8" ||
			value.inputKind === "utf16le" ||
			value.inputKind === "bytes") &&
		(byteLength === undefined ||
			(Number.isInteger(byteLength) && (byteLength as number) >= 0)) &&
		typeof value.wellFormed === "boolean" &&
		(value.metadata === undefined || isRecord(value.metadata))
	);
}

export function isTextDocument(value: unknown): value is TextDocument {
	return (
		isRecord(value) &&
		isNonEmptyString(value.id) &&
		isRecord(value.sources) &&
		Object.entries(value.sources).every(
			([id, source]) =>
				id === (source as TextSource).id && isTextSource(source),
		) &&
		isRecord(value.views) &&
		Object.entries(value.views).every(
			([id, view]) => id === (view as TextView).id && isTextView(view),
		) &&
		isRecord(value.spanMaps) &&
		Object.entries(value.spanMaps).every(
			([id, spanMap]) => id === (spanMap as SpanMap).id && isSpanMap(spanMap),
		) &&
		isRecord(value.layers) &&
		Object.entries(value.layers).every(
			([id, layer]) =>
				id === (layer as AnnotationLayer).id && isAnnotationLayer(layer),
		) &&
		isRecord(value.graphs) &&
		Object.entries(value.graphs).every(
			([id, graph]) =>
				id === (graph as AnnotationGraph).id && isAnnotationGraph(graph),
		) &&
		isRecord(value.metadata)
	);
}

export function validateTextDocument(
	value: unknown,
): TextDocumentValidationResult {
	const diagnostics: string[] = [];
	if (!isTextDocument(value)) {
		return {
			ok: false,
			diagnostics: ["textdoc.document.shape"],
		};
	}
	for (const view of Object.values(value.views)) {
		if (
			view.sourceViewId !== undefined &&
			value.views[view.sourceViewId] === undefined
		) {
			diagnostics.push(
				`textdoc.view.source-missing:${view.id}:${view.sourceViewId}`,
			);
		}
		if (
			view.spanMapId !== undefined &&
			value.spanMaps[view.spanMapId] === undefined
		) {
			diagnostics.push(
				`textdoc.view.span-map-missing:${view.id}:${view.spanMapId}`,
			);
		}
	}
	for (const spanMap of Object.values(value.spanMaps)) {
		if (value.views[spanMap.sourceViewId] === undefined) {
			diagnostics.push(
				`textdoc.span-map.source-view-missing:${spanMap.id}:${spanMap.sourceViewId}`,
			);
		}
		if (value.views[spanMap.targetViewId] === undefined) {
			diagnostics.push(
				`textdoc.span-map.target-view-missing:${spanMap.id}:${spanMap.targetViewId}`,
			);
		}
	}
	const seenAnnotationIds = new Map<string, string>();
	for (const layer of Object.values(value.layers)) {
		if (layer.viewId !== undefined && value.views[layer.viewId] === undefined) {
			diagnostics.push(
				`textdoc.layer.view-missing:${layer.id}:${layer.viewId}`,
			);
		}
		for (const annotation of Object.values(layer.annotations)) {
			const existingLayerId = seenAnnotationIds.get(annotation.id);
			if (existingLayerId !== undefined) {
				diagnostics.push(
					`textdoc.annotation.duplicate-id:${annotation.id}:${existingLayerId}:${layer.id}`,
				);
			}
			seenAnnotationIds.set(annotation.id, layer.id);
			if (annotation.layer !== layer.id) {
				diagnostics.push(
					`textdoc.annotation.layer-mismatch:${annotation.id}:${annotation.layer}`,
				);
			}
			for (const ref of annotation.spans) {
				if (value.views[ref.viewId] === undefined) {
					diagnostics.push(
						`textdoc.annotation.view-missing:${annotation.id}:${ref.viewId}`,
					);
				}
			}
			for (const inputViewId of annotation.evidence.inputViewIds) {
				if (value.views[inputViewId] === undefined) {
					diagnostics.push(
						`textdoc.evidence.input-view-missing:${annotation.id}:${inputViewId}`,
					);
				}
			}
		}
	}
	return {
		ok: diagnostics.length === 0,
		diagnostics,
	};
}

export function createDocument(
	input: TextInput,
	options: CreateDocumentOptions = {},
): TextDocument {
	if (options.includeText !== undefined && options.includeText !== true) {
		fail(
			"TEXTDOC_INCLUDE_TEXT_REQUIRED",
			"final TextDocument sources and views require text",
		);
	}
	const source = readText(
		input,
		options.allowIllFormed === undefined
			? {}
			: { allowIllFormed: options.allowIllFormed },
	);
	const documentId = options.id ?? "document";
	const sourceId = options.sourceId ?? "source";
	const rawViewId = options.rawViewId ?? "raw";
	if (
		!isNonEmptyString(documentId) ||
		!isNonEmptyString(sourceId) ||
		!isNonEmptyString(rawViewId)
	) {
		fail(
			"TEXTDOC_INVALID_ID",
			"document, source, and raw view ids must be non-empty strings",
		);
	}
	const inputKind = source.sourceType === "utf8" ? "utf8" : "string";
	const textSource: TextSource = {
		id: sourceId,
		text: source.text,
		inputKind,
		...(source.byteLength !== undefined
			? { byteLength: source.byteLength }
			: {}),
		wellFormed: source.wellFormed,
		...(options.sourceMetadata !== undefined
			? { metadata: options.sourceMetadata }
			: {}),
	};
	const rawView: TextView = {
		id: rawViewId,
		kind: inputKind === "utf8" ? "decoded" : "raw",
		text: source.text,
		transform: defaultRawTransform(options.transform),
	};
	return {
		id: documentId,
		sources: orderedRecord({ [sourceId]: textSource }),
		views: orderedRecord({ [rawViewId]: rawView }),
		spanMaps: {},
		layers: {},
		graphs: {},
		metadata: orderedRecord(options.metadata ?? {}),
	};
}
