import type {
	Annotation,
	AnnotationLayer,
	SpanRef,
	TextDocument,
} from "@ismail-elkorchi/textdoc";
import { isTextDocument, validateTextDocument } from "@ismail-elkorchi/textdoc";
import type {
	CorpusDiagnostic,
	CorpusToken,
	NormalizedCorpusOptions,
} from "../store/types.js";
import { compareNumbers, compareStrings, stableEntries } from "./compare.js";
import { fail } from "./errors.js";
import { isRecord } from "./json.js";

function diagnostic(
	code: string,
	message: string,
	docId: string,
	severity: CorpusDiagnostic["severity"] = "warning",
	extra: Partial<CorpusDiagnostic> = {},
): CorpusDiagnostic {
	return { code, severity, message, docId, ...extra };
}

export function primaryViewId(
	doc: TextDocument,
	options: Pick<NormalizedCorpusOptions, "viewId">,
): string {
	if (options.viewId !== undefined) return options.viewId;
	const raw = doc.views.raw;
	if (raw !== undefined) return raw.id;
	const first = stableEntries(doc.views)[0];
	if (first !== undefined) return first[1].id;
	fail("TEXTCORPUS_VIEW_MISSING", `document has no text view: ${doc.id}`);
}

export function assertDocumentShape(doc: TextDocument): void {
	if (!isTextDocument(doc)) {
		fail("TEXTCORPUS_DOCUMENT_SHAPE", "document must be a final TextDocument");
	}
	const validation = validateTextDocument(doc);
	if (!validation.ok) {
		fail(
			"TEXTCORPUS_DOCUMENT_INVALID",
			`document ${doc.id} is invalid: ${validation.diagnostics.join(", ")}`,
		);
	}
}

function annotationValueText(annotation: Annotation): string | undefined {
	const value = annotation.value;
	return isRecord(value) && typeof value.text === "string"
		? value.text
		: undefined;
}

function annotationValueLemma(annotation: Annotation): string | undefined {
	const value = annotation.value;
	if (isRecord(value) && typeof value.lemma === "string") return value.lemma;
	const features = annotation.features;
	if (isRecord(features) && typeof features.lemma === "string") {
		return features.lemma;
	}
	return undefined;
}

function annotationValueIndex(annotation: Annotation): number | undefined {
	const value = annotation.value;
	if (isRecord(value) && Number.isInteger(value.index)) {
		return value.index as number;
	}
	const features = annotation.features;
	if (isRecord(features) && Number.isInteger(features.index)) {
		return features.index as number;
	}
	return undefined;
}

export function sliceSpanText(
	doc: TextDocument,
	ref: SpanRef,
	diagnostics: CorpusDiagnostic[],
	context: { readonly docId: string; readonly layerId?: string },
): string | undefined {
	const view = doc.views[ref.viewId];
	if (view === undefined) {
		diagnostics.push(
			diagnostic(
				"TEXTCORPUS_SPAN_VIEW_MISSING",
				`span view is missing: ${ref.viewId}`,
				context.docId,
				"error",
				{
					...(context.layerId !== undefined
						? { layerId: context.layerId }
						: {}),
					viewId: ref.viewId,
					span: ref,
				},
			),
		);
		return undefined;
	}
	if (ref.span.unit !== "utf16-code-unit") {
		diagnostics.push(
			diagnostic(
				"TEXTCORPUS_UNSUPPORTED_SPAN_UNIT",
				`cannot slice ${ref.span.unit} span as JavaScript text`,
				context.docId,
				"error",
				{
					...(context.layerId !== undefined
						? { layerId: context.layerId }
						: {}),
					viewId: ref.viewId,
					span: ref,
				},
			),
		);
		return undefined;
	}
	return view.text.slice(ref.span.start, ref.span.end);
}

function firstTokenSpan(annotation: Annotation): SpanRef | undefined {
	return annotation.spans[0];
}

function tokenSort(left: CorpusToken, right: CorpusToken): number {
	const view = compareStrings(left.viewId, right.viewId);
	if (view !== 0) return view;
	if (left.span !== undefined && right.span !== undefined) {
		const start = compareNumbers(left.span.span.start, right.span.span.start);
		if (start !== 0) return start;
		const end = compareNumbers(left.span.span.end, right.span.span.end);
		if (end !== 0) return end;
	}
	const index = compareNumbers(left.index, right.index);
	if (index !== 0) return index;
	return compareStrings(left.id, right.id);
}

function tokenLayerForDocument(
	doc: TextDocument,
	options: NormalizedCorpusOptions,
): AnnotationLayer | undefined {
	if (options.tokenLayerId !== undefined) {
		const layer = doc.layers[options.tokenLayerId];
		if (layer === undefined) {
			fail(
				"TEXTCORPUS_TOKEN_LAYER_MISSING",
				`token layer is missing in ${doc.id}: ${options.tokenLayerId}`,
			);
		}
		if (!layer.type.startsWith("token.")) {
			fail(
				"TEXTCORPUS_TOKEN_LAYER_TYPE",
				`token layer must use token.* type: ${layer.id}`,
			);
		}
		return layer;
	}
	return Object.values(doc.layers)
		.filter((layer) => layer.type.startsWith("token."))
		.sort((left, right) => compareStrings(left.id, right.id))[0];
}

function tokensFromLayer(
	doc: TextDocument,
	layer: AnnotationLayer,
	options: NormalizedCorpusOptions,
	diagnostics: CorpusDiagnostic[],
): CorpusToken[] {
	const viewId = layer.viewId ?? primaryViewId(doc, options);
	return Object.values(layer.annotations)
		.map((annotation, fallbackIndex) => {
			const span = firstTokenSpan(annotation);
			const lemma = annotationValueLemma(annotation);
			const text =
				annotationValueText(annotation) ??
				(span === undefined
					? undefined
					: sliceSpanText(doc, span, diagnostics, {
							docId: doc.id,
							layerId: layer.id,
						}));
			if (text === undefined) {
				diagnostics.push(
					diagnostic(
						"TEXTCORPUS_TOKEN_TEXT_MISSING",
						`token text is unavailable: ${annotation.id}`,
						doc.id,
						"error",
						{ layerId: layer.id, viewId },
					),
				);
			}
			return {
				id: `${doc.id}:${annotation.id}`,
				docId: doc.id,
				viewId,
				layerId: layer.id,
				annotationId: annotation.id,
				index: annotationValueIndex(annotation) ?? fallbackIndex,
				text: text ?? "",
				normalized: (text ?? "").toLocaleLowerCase("und"),
				...(lemma !== undefined ? { lemma } : {}),
				...(span !== undefined ? { span } : {}),
				...(annotation.features !== undefined
					? { features: { ...annotation.features } }
					: {}),
			};
		})
		.filter((token) => token.text.length > 0)
		.sort(tokenSort)
		.map((token, index) => ({ ...token, index }));
}

function tokensFromWhitespace(
	doc: TextDocument,
	options: NormalizedCorpusOptions,
): CorpusToken[] {
	const viewId = primaryViewId(doc, options);
	const view = doc.views[viewId];
	if (view === undefined) {
		fail("TEXTCORPUS_VIEW_MISSING", `view is missing: ${viewId}`);
	}
	const tokens: CorpusToken[] = [];
	const pattern = /\S+/gu;
	for (const match of view.text.matchAll(pattern)) {
		const text = match[0];
		const start = match.index;
		const end = start + text.length;
		tokens.push({
			id: `${doc.id}:tok-${tokens.length}`,
			docId: doc.id,
			viewId,
			index: tokens.length,
			text,
			normalized: text.toLocaleLowerCase("und"),
			span: {
				viewId,
				span: { start, end, unit: "utf16-code-unit" },
			},
		});
	}
	return tokens;
}

export function extractDocumentTokens(
	doc: TextDocument,
	options: NormalizedCorpusOptions,
	diagnostics: CorpusDiagnostic[],
): CorpusToken[] {
	const layer = tokenLayerForDocument(doc, options);
	if (layer !== undefined)
		return tokensFromLayer(doc, layer, options, diagnostics);
	if (options.tokenSource === "whitespace")
		return tokensFromWhitespace(doc, options);
	if (options.strict) {
		fail(
			"TEXTCORPUS_TOKEN_LAYER_MISSING",
			`document has no token.* layer: ${doc.id}`,
		);
	}
	diagnostics.push(
		diagnostic(
			"TEXTCORPUS_TOKEN_LAYER_MISSING",
			`document has no token.* layer: ${doc.id}`,
			doc.id,
		),
	);
	return [];
}

export function collectAnnotations(doc: TextDocument): Annotation[] {
	return Object.values(doc.layers)
		.flatMap((layer) => Object.values(layer.annotations))
		.sort((left, right) => compareStrings(left.id, right.id));
}

export function collectLayers(doc: TextDocument): AnnotationLayer[] {
	return Object.values(doc.layers).sort((left, right) =>
		compareStrings(left.id, right.id),
	);
}
