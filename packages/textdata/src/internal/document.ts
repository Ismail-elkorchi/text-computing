import {
	type Annotation,
	type AnnotationGraph,
	type AnnotationLayer,
	addAnnotation,
	addGraph,
	addLayer,
	createDocument,
	type Evidence,
	type TextDocument,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { fail } from "./errors.js";
import { packageName, packageVersion } from "./ids.js";

export interface CreateTextDataDocumentOptions {
	readonly sourceId?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly sourceMetadata?: Readonly<Record<string, unknown>>;
}

export function textDataEvidence(
	inputViewIds: readonly string[] = ["raw"],
	mode: Evidence["mode"] = "algorithm",
): Evidence {
	return {
		mode,
		exactness: "E1",
		producer: packageName,
		packageName,
		packageVersion,
		inputViewIds,
	};
}

export function createTextDocument(
	text: string,
	id: string,
	options: CreateTextDataDocumentOptions = {},
): TextDocument {
	const document = createDocument(text, {
		id,
		sourceId: options.sourceId ?? `source:${id}`,
		rawViewId: "raw",
		...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
		...(options.sourceMetadata !== undefined
			? { sourceMetadata: options.sourceMetadata }
			: {}),
		transform: {
			kind: "dataset-read",
			producer: packageName,
			version: packageVersion,
		},
	});
	const validation = validateTextDocument(document);
	if (!validation.ok) {
		fail(
			"TEXTDATA_INVALID_DOCUMENT",
			`created document is invalid: ${validation.diagnostics.join(", ")}`,
		);
	}
	return document;
}

export function withLayer(
	document: TextDocument,
	layer: AnnotationLayer,
): TextDocument {
	return addLayer(document, layer);
}

export function withAnnotation<T>(
	document: TextDocument,
	annotation: Annotation<T>,
): TextDocument {
	return addAnnotation(document, annotation);
}

export function withGraph(
	document: TextDocument,
	graph: AnnotationGraph,
): TextDocument {
	return addGraph(document, graph);
}

export function assertFinalDocument(document: TextDocument): TextDocument {
	const validation = validateTextDocument(document);
	if (!validation.ok) {
		fail(
			"TEXTDATA_INVALID_DOCUMENT",
			`document references are invalid: ${validation.diagnostics.join(", ")}`,
		);
	}
	return document;
}
