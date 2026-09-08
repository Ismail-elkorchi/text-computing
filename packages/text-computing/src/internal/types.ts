import type { TextDataSegment } from "../data/index.ts";
import type { TextDocument } from "../document/mod.ts";
import type { EntityCandidate, EntityLinkOptions } from "../knowledge/index.ts";
import type {
	LexicalMatch,
	LookupOptions,
	MorphologyAnalysis,
	MorphologyGeneration,
	MorphologyParadigm,
} from "../lexicon/index.ts";
import type {
	CompiledTextNormProfile,
	TextNormProfileMode,
} from "../normalization/index.ts";
import type { ArtifactIdentity } from "../packs/artifacts.ts";
import type {
	TextPack,
	TextPackArtifactReader,
	TextPackCapabilities,
	TextPackCapabilitySlotStatus,
	TextPackCapabilityTier,
	TextPackResourceReader,
} from "../packs/index.ts";
import type {
	DocumentQualityOptions,
	QualityProfile,
	QualityReport,
	TextQualityPackResource,
} from "../quality/index.ts";
import type {
	AddOptions,
	IndexOptions,
	SearchIndex,
	SearchOptions,
	SearchQuery,
	SearchResult,
} from "../search/index.ts";

export type TextComputingLoadTarget = TextPack | TextPackModule;

export interface TextPackModule {
	readonly default?: unknown;
	readonly manifest?: unknown;
	readonly resources?: unknown;
}

export interface TextComputingLoadOptions {
	readonly reader?: TextPackResourceReader;
	readonly artifactReader?: TextPackArtifactReader;
	readonly entityExecutor?: TextComputingEntityExecutor;
}

export interface TextComputingAnalyzeOptions extends TextComputingLoadOptions {
	readonly pack: TextComputingLoadTarget;
	readonly id?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly preset?: TextComputingTaskPreset;
	readonly tasks?: readonly TextComputingDocumentTask[];
	readonly lexiconMaxResults?: number;
	readonly morphologyMaxResults?: number;
	readonly entityLinking?: Omit<EntityLinkOptions, "mentionSource" | "viewId">;
	readonly quality?: DocumentQualityOptions;
}

export interface TextComputingDocumentAnalysisOptions {
	readonly id?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly preset?: TextComputingTaskPreset;
	readonly tasks?: readonly TextComputingDocumentTask[];
	readonly lexiconMaxResults?: number;
	readonly morphologyMaxResults?: number;
	readonly entityLinking?: Omit<EntityLinkOptions, "mentionSource" | "viewId">;
	readonly quality?: DocumentQualityOptions;
}

export type TextComputingDocumentTask =
	| "segmentation"
	| "normalization"
	| "entities"
	| "lexicon"
	| "morphology"
	| "kb"
	| "search"
	| "quality";

export type TextComputingTaskPreset = "core" | "lookup";

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

export interface TextComputingEntityLinkSummary {
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

export interface TextComputingEntitySummary {
	readonly id: string;
	readonly type: string;
	readonly text: string;
	readonly score: number;
	readonly viewId: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly tokenIds: readonly string[];
	readonly modelLabel: string;
}

export interface TextComputingNerModel {
	readonly schemaVersion: "1";
	readonly task: "entities";
	readonly format: "onnx";
	readonly artifactId: string;
	readonly artifactFile: string;
	readonly tokenizer: {
		readonly type: "bert-wordpiece";
		readonly vocabularyResourceId: string;
		readonly doLowerCase: boolean;
		readonly stripAccents: boolean;
		readonly tokenizeChineseCharacters: boolean;
		readonly specialTokens: {
			readonly unknown: string;
			readonly cls: string;
			readonly sep: string;
			readonly pad: string;
		};
	};
	readonly inputs: {
		readonly inputIds: string;
		readonly attentionMask: string;
		readonly tokenTypeIds?: string;
	};
	readonly output: {
		readonly logits: string;
		readonly labels: readonly string[];
	};
	readonly maxSequenceLength: number;
}

export interface TextComputingEntityExecutorRequest {
	readonly pack: TextPack;
	readonly reader?: TextPackResourceReader;
	readonly artifactReader?: TextPackArtifactReader;
	readonly modelResourceId: string;
	readonly model: TextComputingNerModel;
	readonly vocabulary: string;
	readonly text: string;
	readonly viewId: string;
	readonly languageTag: string;
	readonly tokenIdsForSpan: (
		startCU: number,
		endCU: number,
	) => readonly string[];
}

export interface TextComputingEntityExecutionResult {
	readonly executorVersion: string;
	readonly entities: readonly TextComputingEntitySummary[];
	readonly executorId: string;
	readonly executionProvider: string;
}

export interface TextComputingEntityExecutor {
	readonly version: string;
	readonly id: string;
	readonly format: "onnx";
	readonly recognize: (
		request: TextComputingEntityExecutorRequest,
	) => Promise<TextComputingEntityExecutionResult>;
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
	readonly entityLinks: readonly TextComputingEntityLinkSummary[];
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
	readonly artifactIds: readonly string[];
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

export interface TextComputingModelExecutionEvidence
	extends TextComputingEvidenceBase {
	readonly kind: "model-execution";
	readonly artifact: ArtifactIdentity;
	readonly modelChecksum: string;
	readonly vocabularyChecksum: string;
	readonly executorVersion: string;
	readonly task: "entities";
	readonly modelResourceId: string;
	readonly executorId: string;
	readonly executionProvider: string;
}

export type TextComputingEvidence =
	| TextComputingTaskSlotEvidence
	| TextComputingModelExecutionEvidence
	| TextComputingQualityReportEvidence;

export interface AnalyzedDocument extends TextDocument, DocumentAnalysis {}

export interface DocumentAnalysis {
	readonly text: string;
	readonly sourceViewId: string;
	readonly languageTag: string;
	readonly sentences: readonly TextDataSegment[];
	readonly tokens: readonly TextComputingToken[];
	readonly lexicalUnits: readonly TextDataSegment[];
	readonly lemmas: readonly TextComputingLemmaSummary[];
	readonly morphology: readonly TextComputingMorphologySummary[];
	readonly entities: readonly TextComputingEntitySummary[];
	readonly entityLinks: readonly TextComputingEntityLinkSummary[];
	readonly searchTokens: readonly TextComputingSearchTokenSummary[];
	readonly quality: TextComputingQualitySummary;
	readonly evidence: readonly TextComputingEvidence[];
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
	): Promise<AnalyzedDocument>;
	readonly languageTag: string;
	readonly pack: TextPack;
	readonly reader: TextPackResourceReader | undefined;
	readonly artifactReader: TextPackArtifactReader | undefined;
	readonly entityExecutor: TextComputingEntityExecutor | undefined;
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
		readonly graphemes: (text: string) => Promise<readonly TextDataSegment[]>;
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
	readonly entities: {
		readonly recognize: (
			text: string,
		) => Promise<readonly TextComputingEntitySummary[]>;
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
		readonly query: (
			index: SearchIndex,
			query: string | SearchQuery,
			options?: SearchOptions,
		) => readonly SearchResult[];
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
		) => Promise<AnalyzedDocument>;
		readonly analyzeDocument: (
			doc: TextDocument,
			options?: TextComputingDocumentAnalysisOptions,
		) => Promise<AnalyzedDocument>;
	};
}
