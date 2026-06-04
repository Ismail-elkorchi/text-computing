import type {
	Annotation,
	AnnotationLayer,
	Evidence,
	Score,
	SpanMap,
	SpanMapRelation,
	SpanRef,
	TextDocument,
	TextUnit,
	TextView,
	TextViewKind,
} from "@ismail-elkorchi/textdoc";
import type { Fst } from "@ismail-elkorchi/textfst";
import type { AbbreviationTable, Lexicon } from "@ismail-elkorchi/textlex";
import type { CompiledRuleSet } from "@ismail-elkorchi/textrules";

export type NormalizationMode =
	| "spelling"
	| "historical"
	| "ocr"
	| "dialect"
	| "transliteration"
	| "punctuation"
	| "spacing"
	| "casing";

export interface NormalizationCandidate {
	readonly source: SpanRef;
	readonly candidate: string;
	readonly kind: NormalizationMode;
	readonly evidence: Evidence;
	readonly score?: Score;
}

export interface NormalizationViewResult {
	readonly view: TextView;
	readonly spanMap: SpanMap;
	readonly candidates: readonly NormalizationCandidate[];
}

export interface ReplacementCandidate {
	readonly value: string;
	readonly score?: Score;
	readonly features?: Readonly<Record<string, unknown>>;
}

export interface SpellingMapEntry {
	readonly source: string;
	readonly candidates: readonly (string | ReplacementCandidate)[];
	readonly kind?: NormalizationMode;
	readonly labels?: readonly string[];
	readonly period?: string;
	readonly language?: string;
	readonly script?: string;
	readonly sourceId?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface SpellingMap {
	readonly id: string;
	readonly entries: readonly SpellingMapEntry[];
	readonly bySource: Readonly<Record<string, readonly SpellingMapEntry[]>>;
	readonly kind: NormalizationMode;
	readonly language?: string;
	readonly script?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface HistoricalSpellingMap extends SpellingMap {
	readonly kind: "historical";
	readonly period?: string;
	readonly orthography?: string;
	readonly witnessId?: string;
	readonly editionId?: string;
	readonly editorialConvention?: string;
}

export type ConfusionLevel = "character" | "word";

export interface ConfusionEntry {
	readonly source: string;
	readonly replacement: string;
	readonly level?: ConfusionLevel;
	readonly cost?: number;
	readonly probability?: number;
	readonly modality?: "ocr" | "atr" | "asr" | "typed" | "social";
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ConfusionTable {
	readonly id: string;
	readonly entries: readonly ConfusionEntry[];
	readonly bySource: Readonly<Record<string, readonly ConfusionEntry[]>>;
	readonly modality?: "ocr" | "atr" | "asr" | "typed" | "social";
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TransliterationEntry {
	readonly source: string;
	readonly target: string;
	readonly cost?: number;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TransliterationMap {
	readonly id: string;
	readonly sourceScript: string;
	readonly targetScript: string;
	readonly direction: "forward" | "reverse";
	readonly entries: readonly TransliterationEntry[];
	readonly bySource: Readonly<Record<string, readonly TransliterationEntry[]>>;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuralReplacementResource {
	readonly id: string;
	readonly kind?: NormalizationMode;
	readonly entries: readonly {
		readonly source: string;
		readonly target?: string;
		readonly replacement?: string;
		readonly candidates?: readonly string[];
		readonly cost?: number;
	}[];
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface NormalizationResourceMap {
	readonly spellingMaps?: readonly SpellingMap[];
	readonly historicalSpellingMaps?: readonly HistoricalSpellingMap[];
	readonly orthographyMaps?: readonly SpellingMap[];
	readonly dialectMaps?: readonly SpellingMap[];
	readonly contractionMaps?: readonly SpellingMap[];
	readonly punctuationMaps?: readonly SpellingMap[];
	readonly spacingMaps?: readonly SpellingMap[];
	readonly confusionTables?: readonly ConfusionTable[];
	readonly transliterationMaps?: readonly TransliterationMap[];
	readonly lexicons?: readonly Lexicon[];
	readonly abbreviationTables?: readonly AbbreviationTable[];
	readonly fsts?: readonly Fst[];
	readonly rewriteFsts?: readonly Fst[];
	readonly transliterationFsts?: readonly Fst[];
	readonly ruleSets?: readonly CompiledRuleSet[];
	readonly structuralResources?: readonly StructuralReplacementResource[];
}

export interface NormalizationProfile {
	readonly id: string;
	readonly languages?: readonly string[];
	readonly scripts?: readonly string[];
	readonly periods?: readonly string[];
	readonly orthographies?: readonly string[];
	readonly modalities?: readonly (
		| "typed"
		| "ocr"
		| "atr"
		| "asr"
		| "social"
		| "transliterated"
		| "historical"
	)[];
	readonly editorialConvention?: string;
	readonly targetViewKind?: TextViewKind;
	readonly modes?: readonly NormalizationMode[];
	readonly resources?: NormalizationResourceMap;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export type CandidateOverlapPolicy =
	| "all"
	| "highest-ranked-non-overlap"
	| "longest"
	| "shortest"
	| "first-resource"
	| "diagnostic-only";

export interface RerankerContext {
	readonly document: TextDocument;
	readonly sourceView: TextView;
	readonly modes: readonly NormalizationMode[];
}

export type Reranker = (
	candidates: readonly NormalizationCandidate[],
	context: RerankerContext,
) => readonly NormalizationCandidate[];

export interface CandidateOptions {
	readonly sourceViewId?: string;
	readonly modes?: readonly NormalizationMode[];
	readonly profile?: NormalizationProfile;
	readonly resources?: NormalizationResourceMap;
	readonly maxCandidates?: number;
	readonly maxCandidatesPerSpan?: number;
	readonly maxEditDistance?: number;
	readonly spanUnitPolicy?: "reject-non-utf16" | "utf16-only";
	readonly overlapPolicy?: CandidateOverlapPolicy;
	readonly repeatedCharacterMaxRun?: number;
	readonly casePolicy?: "casefold" | "lowercase" | "uppercase";
	readonly repairLineBreakHyphenation?: boolean;
	readonly diagnosticMode?: boolean;
	readonly reranker?: Reranker;
	readonly producer?: string;
	readonly packageVersion?: string;
	readonly optionsHash?: string;
}

export interface TextNormOptions extends CandidateOptions {
	readonly targetViewId?: string;
	readonly targetViewKind?: TextViewKind;
	readonly spanMapId?: string;
	readonly unicodeForm?: "NFC" | "NFD" | "NFKC" | "NFKD";
	readonly retainRejectedCandidates?: boolean;
	readonly annotation?: {
		readonly emit?: boolean;
		readonly layerId?: string;
		readonly layerType?: string;
		readonly annotationType?: string;
	};
}

export interface VariantGraphOptions extends CandidateOptions {
	readonly graphId?: string;
	readonly candidates?: readonly NormalizationCandidate[];
	readonly maxAlternatives?: number;
}

export interface VariantGraphNode {
	readonly id: string;
	readonly kind: "source" | "candidate";
	readonly source?: SpanRef;
	readonly text: string;
	readonly candidate?: NormalizationCandidate;
}

export interface VariantGraphEdge {
	readonly id: string;
	readonly source: string;
	readonly target: string;
	readonly relation: NormalizationMode | "identity" | "chosen";
	readonly evidence?: Evidence;
	readonly score?: Score;
}

export interface VariantGraph {
	readonly id: string;
	readonly nodes: Readonly<Record<string, VariantGraphNode>>;
	readonly edges: Readonly<Record<string, VariantGraphEdge>>;
	readonly metadata: Readonly<Record<string, unknown>>;
}

export type EditOperationKind = "equal" | "insert" | "delete" | "replace";

export interface EditOperation {
	readonly kind: EditOperationKind;
	readonly sourceStart: number;
	readonly sourceEnd: number;
	readonly targetStart: number;
	readonly targetEnd: number;
	readonly sourceText: string;
	readonly targetText: string;
	readonly relation?: SpanMapRelation;
	readonly cost?: number;
}

export interface EditScript {
	readonly source: string;
	readonly target: string;
	readonly sourceUnit: TextUnit;
	readonly targetUnit: TextUnit;
	readonly operations: readonly EditOperation[];
}

export interface TextNormDiagnostic {
	readonly code: string;
	readonly severity: "info" | "warning" | "error";
	readonly message: string;
	readonly path?: string;
	readonly source?: SpanRef;
	readonly resourceId?: string;
	readonly context?: Readonly<Record<string, unknown>>;
}

export interface TextNormAnnotationValue {
	readonly candidate: string;
	readonly kind: NormalizationMode;
	readonly mode: NormalizationMode;
	readonly chosen: boolean;
	readonly resources?: readonly string[];
	readonly score?: Score;
	readonly editSummary: Readonly<Record<string, unknown>>;
}

export interface AnnotateNormalizationOptions {
	readonly layerId?: string;
	readonly layerType?: string;
	readonly annotationType?: string;
	readonly replaceLayer?: boolean;
}

export interface AnnotatedNormalizationResult extends NormalizationViewResult {
	readonly document: TextDocument;
	readonly layer: AnnotationLayer<TextNormAnnotationValue>;
	readonly annotations: readonly Annotation<TextNormAnnotationValue>[];
}
