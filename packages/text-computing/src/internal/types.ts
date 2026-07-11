import type {
	TextDataSegment,
	TextDataTableResource,
	UdAnnotationRecord,
	UdSyntaxPackResources,
} from "@ismail-elkorchi/textdata";
import type { TextDocument } from "@ismail-elkorchi/textdoc";
import type {
	EntityCandidate,
	EntityLinkOptions,
} from "@ismail-elkorchi/textkb";
import type {
	LexicalMatch,
	LookupOptions,
	MorphologyAnalysis,
	MorphologyGeneration,
	MorphologyParadigm,
} from "@ismail-elkorchi/textlex";
import type {
	CompiledTextNormProfile,
	TextNormProfileMode,
} from "@ismail-elkorchi/textnorm";
import type {
	TextPack,
	TextPackCapabilities,
	TextPackCapabilitySlotStatus,
	TextPackCapabilityTier,
	TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import type {
	ParallelCorpus,
	ParallelLinkRow,
	ParallelRowsFromPackOptions,
	ParallelTableResource,
} from "@ismail-elkorchi/textparallel";
import type {
	PipelineDiagnostic,
	PipelineTraceEvent,
	RunOptions,
	TextPipeline,
} from "@ismail-elkorchi/textpipeline";
import type {
	DocumentQualityOptions,
	QualityProfile,
	QualityReport,
	TextQualityPackResource,
} from "@ismail-elkorchi/textquality";
import type {
	AddOptions,
	IndexOptions,
	SearchIndex,
	SearchOptions,
	SearchQuery,
	SearchResult,
} from "@ismail-elkorchi/textsearch";

export type TextComputingLoadTarget = TextPack | TextPackModule;

export interface TextPackModule {
	readonly default?: unknown;
	readonly manifest?: unknown;
	readonly resources?: unknown;
}

export interface TextComputingLoadOptions {
	readonly reader?: TextPackResourceReader;
}

export interface TextComputingAnalyzeOptions extends TextComputingLoadOptions {
	readonly pack: TextComputingLoadTarget;
	readonly id?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly preset?: TextComputingTaskPreset;
	readonly tasks?: readonly TextComputingDocumentTask[];
	readonly lexiconMaxResults?: number;
	readonly morphologyMaxResults?: number;
	readonly entityMaxCandidates?: number;
	readonly entityLanguage?: string;
	readonly quality?: DocumentQualityOptions;
}

export interface TextComputingDocumentAnalysisOptions {
	readonly id?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly preset?: TextComputingTaskPreset;
	readonly tasks?: readonly TextComputingDocumentTask[];
	readonly lexiconMaxResults?: number;
	readonly morphologyMaxResults?: number;
	readonly entityMaxCandidates?: number;
	readonly entityLanguage?: string;
	readonly quality?: DocumentQualityOptions;
}

export type TextComputingDocumentTask =
	| "segmentation"
	| "normalization"
	| "lexicon"
	| "morphology"
	| "kb"
	| "search"
	| "quality";

export type TextComputingTaskPreset = "core" | "full" | "lookup";

export interface TextComputingMorphologySummary {
	readonly tokenId: string;
	readonly viewId: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly queryForm: string;
	readonly form: string;
	readonly lemma?: string;
	readonly partOfSpeech?: string;
	readonly features: Readonly<Record<string, string>>;
	readonly entryId?: string;
	readonly sourceResourceId: string;
}

export interface TextComputingEntitySummary {
	readonly entityId: string;
	readonly label: string;
	readonly matchedAlias: string;
	readonly matchKind: string;
	readonly score: number;
	readonly rank: number;
	readonly types: readonly string[];
	readonly mention: string;
	readonly viewId: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly tokenIds: readonly string[];
	readonly sourceEntityId?: string;
}

export interface TextComputingLemmaSummary {
	readonly tokenId: string;
	readonly viewId: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly value: string;
	readonly queryForm: string;
	readonly source: "lexicon" | "morphology";
	readonly sourceResourceId?: string;
}

export interface TextComputingToken extends TextDataSegment {
	readonly id: string;
	readonly index: number;
	readonly viewId: string;
	readonly normalizedText: string;
	readonly lemmas: readonly TextComputingLemmaSummary[];
	readonly morphology: readonly TextComputingMorphologySummary[];
	readonly entities: readonly TextComputingEntitySummary[];
}

export interface TextComputingSearchTokenSummary {
	readonly term: string;
	readonly position: number;
	readonly startCU: number;
	readonly endCU: number;
	readonly viewId: string;
	readonly type?: string;
}

export interface TextComputingQualityFindingSummary {
	readonly id: string;
	readonly kind: string;
	readonly severity: string;
	readonly message: string;
}

export interface TextComputingQualitySummary {
	readonly id: string;
	readonly target: string;
	readonly skipped?: boolean;
	readonly findingCount: number;
	readonly findings: readonly TextComputingQualityFindingSummary[];
	readonly metricCount: number;
	readonly metrics: Readonly<Record<string, unknown>>;
}

interface TextComputingEvidenceBase {
	readonly id: string;
	readonly packageName: string;
	readonly packId: string;
	readonly resourceIds: readonly string[];
	readonly componentPackageNames: readonly string[];
}

export interface TextComputingTaskSlotEvidence
	extends TextComputingEvidenceBase {
	readonly kind: "task-slot";
	readonly task: TextComputingDocumentTask;
	readonly status: TextPackCapabilitySlotStatus;
	readonly tier: TextPackCapabilityTier;
}

export interface TextComputingQualityReportEvidence
	extends TextComputingEvidenceBase {
	readonly kind: "quality-report";
	readonly task: "quality";
	readonly reportId: string;
}

export type TextComputingEvidence =
	| TextComputingTaskSlotEvidence
	| TextComputingQualityReportEvidence;

export interface TextComputingDocument {
	readonly text: string;
	readonly sourceViewId: string;
	readonly languageTag: string;
	readonly sentences: readonly TextDataSegment[];
	readonly tokens: readonly TextComputingToken[];
	readonly lexicalUnits: readonly TextDataSegment[];
	readonly lemmas: readonly TextComputingLemmaSummary[];
	readonly morphology: readonly TextComputingMorphologySummary[];
	readonly entities: readonly TextComputingEntitySummary[];
	readonly searchTokens: readonly TextComputingSearchTokenSummary[];
	readonly quality: TextComputingQualitySummary;
	readonly evidence: readonly TextComputingEvidence[];
	readonly toTextDoc: () => TextDocument;
	readonly toJSON: () => TextComputingDocumentJson;
}

export interface TextComputingDocumentJson {
	readonly text: string;
	readonly sourceViewId: string;
	readonly languageTag: string;
	readonly sentences: readonly TextDataSegment[];
	readonly tokens: readonly TextComputingToken[];
	readonly lexicalUnits: readonly TextDataSegment[];
	readonly lemmas: readonly TextComputingLemmaSummary[];
	readonly morphology: readonly TextComputingMorphologySummary[];
	readonly entities: readonly TextComputingEntitySummary[];
	readonly searchTokens: readonly TextComputingSearchTokenSummary[];
	readonly quality: TextComputingQualitySummary;
	readonly evidence: readonly TextComputingEvidence[];
}

export interface TextComputingPipelineRunOptions
	extends TextComputingDocumentAnalysisOptions {
	readonly run?: Omit<
		RunOptions,
		"cache" | "cachePolicy" | "diagnostics" | "resources" | "trace"
	>;
}

export interface TextComputingPipelineRun {
	readonly pipeline: TextPipeline;
	readonly document: TextDocument;
	readonly analysis: TextComputingDocument;
	readonly diagnostics: readonly PipelineDiagnostic[];
	readonly trace: readonly PipelineTraceEvent[];
}

export interface TextComputingSupportReport {
	readonly packageName: string;
	readonly packId: string;
	readonly version: string;
	readonly languages: readonly string[];
	readonly scripts: readonly string[];
	readonly slots: readonly TextComputingCapabilitySlotReport[];
	readonly resourceCount: number;
	readonly componentCount: number;
	readonly gapNotes: readonly string[];
}

export interface TextComputingCapabilitySlotReport {
	readonly slot: string;
	readonly status: string;
	readonly tier: TextPackCapabilityTier;
	readonly resourceIds: readonly string[];
	readonly artifactIds: readonly string[];
	readonly readerRequired: boolean;
	readonly capabilities: TextPackCapabilities;
	readonly notes: readonly string[];
}

export interface TextComputingPackInspection
	extends TextComputingSupportReport {
	readonly resources: readonly TextComputingResourceInspection[];
}

export interface TextComputingResourceInspection {
	readonly id: string;
	readonly kind: string;
	readonly schemaId?: string;
	readonly path?: string;
}

export interface TextComputingNlp {
	(
		text: string,
		options?: TextComputingDocumentAnalysisOptions,
	): Promise<TextComputingDocument>;
	readonly languageTag: string;
	readonly pack: TextPack;
	readonly reader: TextPackResourceReader | undefined;
	readonly support: () => TextComputingSupportReport;
	readonly inspect: () => TextComputingPackInspection;
	readonly tokenize: (text: string) => Promise<readonly TextDataSegment[]>;
	readonly normalize: (
		text: string,
		mode?: TextNormProfileMode,
	) => Promise<string>;
	readonly lookup: (
		form: string,
		options?: LookupOptions,
	) => Promise<readonly LexicalMatch[]>;
	readonly segmentation: {
		readonly lexicalUnits: (
			text: string,
		) => Promise<readonly TextDataSegment[]>;
		readonly words: (text: string) => Promise<readonly TextDataSegment[]>;
		readonly sentences: (text: string) => Promise<readonly TextDataSegment[]>;
	};
	readonly normalization: {
		readonly normalizeText: (
			text: string,
			mode?: TextNormProfileMode,
		) => Promise<string>;
		readonly normalizeDocument: (
			doc: Parameters<CompiledTextNormProfile["normalizeDocument"]>[0],
			mode?: TextNormProfileMode,
		) => Promise<ReturnType<CompiledTextNormProfile["normalizeDocument"]>>;
		readonly searchView: (
			doc: Parameters<CompiledTextNormProfile["searchView"]>[0],
		) => Promise<ReturnType<CompiledTextNormProfile["searchView"]>>;
	};
	readonly lexicon: {
		readonly lookup: (
			form: string,
			options?: LookupOptions,
		) => Promise<readonly LexicalMatch[]>;
	};
	readonly morphology: {
		readonly analyze: (
			form: string,
			options?: { readonly maxResults?: number },
		) => Promise<readonly MorphologyAnalysis[]>;
		readonly generate: (
			lemma: string,
			features?: Readonly<Record<string, string>>,
			options?: { readonly maxResults?: number },
		) => Promise<readonly MorphologyGeneration[]>;
		readonly paradigms: (
			lemma?: string,
		) => Promise<readonly MorphologyParadigm[]>;
	};
	readonly syntax: {
		readonly resources: () => Promise<UdSyntaxPackResources>;
		readonly annotations: () => Promise<readonly UdAnnotationRecord[]>;
		readonly dataset: () => Promise<unknown>;
	};
	readonly kb: {
		readonly resources: () => readonly TextComputingResourceInspection[];
		readonly candidates: (
			text: string,
			options?: EntityLinkOptions,
		) => Promise<readonly EntityCandidate[]>;
		readonly linkEntities: (
			doc: TextDocument,
			options?: EntityLinkOptions,
		) => Promise<TextDocument>;
	};
	readonly search: {
		readonly analyze: (
			text: string,
		) => Promise<readonly TextComputingSearchTokenSummary[]>;
		readonly createIndex: (options?: IndexOptions) => Promise<SearchIndex>;
		readonly addDocument: (
			index: SearchIndex,
			doc: TextDocument,
			options?: AddOptions,
		) => SearchIndex;
		readonly addAnalysis: (
			index: SearchIndex,
			analysis: TextComputingDocument,
			options?: AddOptions,
		) => SearchIndex;
		readonly query: (
			index: SearchIndex,
			query: string | SearchQuery,
			options?: SearchOptions,
		) => readonly SearchResult[];
	};
	readonly corpus: {
		readonly resources: () => readonly TextComputingResourceInspection[];
		readonly rows: () => Promise<readonly TextDataTableResource[]>;
		readonly documents: (options: {
			readonly maxDocuments: number;
		}) => Promise<readonly TextDocument[]>;
	};
	readonly parallel: {
		readonly resources: () => readonly TextComputingResourceInspection[];
		readonly rows: (
			options?: Omit<ParallelRowsFromPackOptions, "reader">,
		) => Promise<readonly ParallelTableResource[]>;
		readonly links: (
			options?: Omit<ParallelRowsFromPackOptions, "reader">,
		) => Promise<readonly ParallelLinkRow[]>;
		readonly corpus: (
			options?: Omit<ParallelRowsFromPackOptions, "reader">,
		) => Promise<ParallelCorpus>;
	};
	readonly quality: {
		readonly resources: () => Promise<readonly TextQualityPackResource[]>;
		readonly profiles: () => Promise<readonly QualityProfile[]>;
		readonly analyzeDocument: (
			doc: TextDocument,
			options?: DocumentQualityOptions,
		) => Promise<QualityReport>;
	};
	readonly document: {
		readonly analyzeText: (
			text: string,
			options?: TextComputingDocumentAnalysisOptions,
		) => Promise<TextComputingDocument>;
		readonly analyzeDocument: (
			doc: TextDocument,
			options?: TextComputingDocumentAnalysisOptions,
		) => Promise<TextComputingDocument>;
	};
	readonly pipeline: {
		readonly createDocumentAnalysisPipeline: (
			options?: TextComputingDocumentAnalysisOptions,
		) => TextPipeline;
		readonly runText: (
			text: string,
			options?: TextComputingPipelineRunOptions,
		) => Promise<TextComputingPipelineRun>;
		readonly runDocument: (
			doc: TextDocument,
			options?: TextComputingPipelineRunOptions,
		) => Promise<TextComputingPipelineRun>;
	};
}
