import type {
	Annotation,
	AnnotationLayer,
	SpanRef,
	TextDocument,
} from "@ismail-elkorchi/textdoc";

export type CorpusDiagnosticSeverity = "info" | "warning" | "error";

export interface CorpusDiagnostic {
	code: string;
	severity: CorpusDiagnosticSeverity;
	message: string;
	corpusId?: string;
	docId?: string;
	layerId?: string;
	viewId?: string;
	queryPath?: string;
	span?: SpanRef;
	metadata?: Record<string, unknown>;
}

export interface CorpusDocumentRef {
	id: string;
	metadata: Record<string, unknown>;
}

export interface CorpusIndexManifest {
	documents: number;
	tokens: number;
	tokenLayers: string[];
	lemmas: number;
	annotationLayers: string[];
	annotationTypes: string[];
	metadataKeys: string[];
	partitions: Record<string, string[]>;
	ngrams: number[];
	relations: string[];
	reuse: boolean;
	diagnostics: CorpusDiagnostic[];
}

export interface TextCorpus {
	id: string;
	documents: CorpusDocumentRef[];
	indexes: CorpusIndexManifest;
	metadata: Record<string, unknown>;
}

export type CorpusTokenSource = "annotation-layer" | "whitespace";

export interface CorpusOptions {
	id?: string;
	metadata?: Record<string, unknown>;
	viewId?: string;
	tokenLayerId?: string;
	lemmaLayerId?: string;
	partitionKeys?: string[];
	tokenSource?: CorpusTokenSource;
	strict?: boolean;
}

export interface CorpusToken {
	id: string;
	docId: string;
	viewId: string;
	layerId?: string;
	annotationId?: string;
	index: number;
	text: string;
	normalized: string;
	lemma?: string;
	span?: SpanRef;
	features?: Record<string, unknown>;
}

export interface CorpusRecord {
	document: TextDocument;
	ref: CorpusDocumentRef;
	tokens: CorpusToken[];
	annotations: Annotation[];
	layers: AnnotationLayer[];
	partitions: Record<string, string>;
	diagnostics: CorpusDiagnostic[];
}

export interface CorpusState {
	options: NormalizedCorpusOptions;
	records: CorpusRecord[];
	diagnostics: CorpusDiagnostic[];
}

export interface NormalizedCorpusOptions {
	id?: string;
	metadata: Record<string, unknown>;
	viewId?: string;
	tokenLayerId?: string;
	lemmaLayerId?: string;
	partitionKeys: string[];
	tokenSource: CorpusTokenSource;
	strict: boolean;
}

export type CorpusInput = Iterable<TextDocument>;

export interface CorpusDataset {
	id: string;
	metadata: Record<string, unknown>;
	records: AsyncIterable<TextDocument> | Iterable<TextDocument>;
}
