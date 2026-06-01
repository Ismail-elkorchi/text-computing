import { formatU64Hex, hash64Text, type Hash64AlgoId } from "@ismail-elkorchi/textfacts/hash";
import {
  isTextDocDocumentV1,
  type TextDocDocumentTokenAnnotation,
  type TextDocDocumentV1,
  type TextDocLayer,
  type TextDocView,
} from "@ismail-elkorchi/textdoc";

export const packageName = "@ismail-elkorchi/textcorpus" as const;
export const textCorpusCollectionSchemaVersion = 1 as const;
export const textCorpusScoringSchemaVersion = 1 as const;
export const textCorpusRetrievalSchemaVersion = 1 as const;
export const textCorpusRetrievalQrelsSchemaVersion = 1 as const;
export const textCorpusRetrievalEvaluationSchemaVersion = 1 as const;
export const textCorpusAnalysisSchemaVersion = 1 as const;
export const textCorpusTokenSource = "explicit-textdoc-token-layer" as const;
export const textCorpusEvidenceClassE2 = "E2" as const;
export const textCorpusTfRawCountFormula = "tf.raw-count" as const;
export const textCorpusDfDocumentCountFormula = "df.document-count" as const;
export const textCorpusTfidfSklearnSmoothRawFormula = "tfidf.sklearn-smooth-raw" as const;
export const textCorpusTfidfSklearnSmoothL2Formula = "tfidf.sklearn-smooth-l2" as const;
export const textCorpusBm25OkapiFormula = "bm25.okapi.k1-1.5.b-0.75" as const;
export const textCorpusBm25OkapiK1_1_2Formula = "bm25.okapi.k1-1.2.b-0.75" as const;
export const textCorpusBm25fFormula = "bm25f.k1-1.2.b-0.75.fielded" as const;

export type PackageName = typeof packageName;
export type TextCorpusCollectionSchemaVersion = typeof textCorpusCollectionSchemaVersion;
export type TextCorpusScoringSchemaVersion = typeof textCorpusScoringSchemaVersion;
export type TextCorpusRetrievalSchemaVersion = typeof textCorpusRetrievalSchemaVersion;
export type TextCorpusRetrievalQrelsSchemaVersion = typeof textCorpusRetrievalQrelsSchemaVersion;
export type TextCorpusRetrievalEvaluationSchemaVersion =
  typeof textCorpusRetrievalEvaluationSchemaVersion;
export type TextCorpusAnalysisSchemaVersion = typeof textCorpusAnalysisSchemaVersion;
export type TextCorpusTokenSource = typeof textCorpusTokenSource;
export type TextCorpusEvidenceClass = typeof textCorpusEvidenceClassE2;
export type TextCorpusTfidfFormulaId =
  | typeof textCorpusTfidfSklearnSmoothRawFormula
  | typeof textCorpusTfidfSklearnSmoothL2Formula;
export type TextCorpusBm25FormulaId =
  | typeof textCorpusBm25OkapiFormula
  | typeof textCorpusBm25OkapiK1_1_2Formula;
export type TextCorpusFormulaId =
  | typeof textCorpusTfRawCountFormula
  | typeof textCorpusDfDocumentCountFormula
  | TextCorpusTfidfFormulaId
  | TextCorpusBm25FormulaId
  | typeof textCorpusBm25fFormula;
export type TextCorpusRetrievalFormulaId =
  | typeof textCorpusBm25OkapiFormula
  | typeof textCorpusBm25fFormula;

export interface TextCorpusEntry {
  readonly id: string;
  readonly document: TextDocDocumentV1;
  readonly viewId: string;
  readonly tokenLayerId: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface TextCorpusCollectionPolicy {
  readonly tokenSource: TextCorpusTokenSource;
  readonly units: "utf16-code-unit";
}

export interface TextCorpusCollectionV1 {
  readonly schemaVersion: TextCorpusCollectionSchemaVersion;
  readonly corpusId: string;
  readonly policy: TextCorpusCollectionPolicy;
  readonly entries: readonly TextCorpusEntry[];
}

export interface CreateTextCorpusCollectionOptions {
  readonly corpusId: string;
}

export type TextCorpusMetadataFilters = Readonly<
  Record<string, string | readonly string[]>
>;

export type TextCorpusNormalizedMetadataFilters = Readonly<Record<string, readonly string[]>>;

export interface TextCorpusSelectionDocumentRefV1 {
  readonly id: string;
  readonly documentId: string;
  readonly revision: string;
  readonly viewId: string;
  readonly tokenLayerId: string;
  readonly tokenCount: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface TextCorpusSelectionProvenanceV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly units: "utf16-code-unit";
  readonly documentOrder: readonly string[];
  readonly tokenCount: number;
  readonly documents: readonly TextCorpusSelectionDocumentRefV1[];
  readonly metadataFilters?: TextCorpusNormalizedMetadataFilters;
}

export interface TextCorpusFingerprintIndexOptions {
  readonly shingleSize: number;
  readonly windowSize: number;
  readonly hashAlgorithm?: Hash64AlgoId;
  readonly maxDocs?: number;
  readonly maxFingerprintsPerDoc?: number;
  readonly maxIndexEntries?: number;
}

export interface TextCorpusFingerprintIndex {
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly hashAlgorithm: Hash64AlgoId;
  readonly shingleSize: number;
  readonly windowSize: number;
  readonly docFingerprints: Readonly<Record<string, readonly string[]>>;
  readonly index: Readonly<Record<string, readonly string[]>>;
  readonly truncated?: boolean;
}

export interface TextCorpusQuery {
  readonly id: string;
  readonly tokens: readonly string[];
}

export interface TextCorpusTermValue {
  readonly term: string;
  readonly value: number;
}

export interface TextCorpusFormulaTermValues {
  readonly formula: TextCorpusTfidfFormulaId;
  readonly values: readonly TextCorpusTermValue[];
}

export interface TextCorpusDocumentScore {
  readonly docId: string;
  readonly score: number;
}

export interface TextCorpusFormulaDocumentScores {
  readonly formula: TextCorpusBm25FormulaId;
  readonly scores: readonly TextCorpusDocumentScore[];
}

export interface TextCorpusDocumentTermScores {
  readonly id: string;
  readonly length: number;
  readonly tf: readonly TextCorpusTermValue[];
  readonly tfidf: readonly TextCorpusTermValue[];
  readonly tfidfVariants?: readonly TextCorpusFormulaTermValues[];
}

export interface TextCorpusQueryScores {
  readonly id: string;
  readonly bm25: readonly TextCorpusDocumentScore[];
  readonly bm25Variants?: readonly TextCorpusFormulaDocumentScores[];
}

export interface TextCorpusScoringOptions {
  readonly queries?: readonly TextCorpusQuery[];
  readonly tolerance?: number;
  readonly tfidfFormulas?: readonly TextCorpusTfidfFormulaId[];
  readonly bm25Formulas?: readonly TextCorpusBm25FormulaId[];
}

export interface TextCorpusScoringResultV1 {
  readonly schemaVersion: TextCorpusScoringSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly formulaSet: readonly TextCorpusFormulaId[];
  readonly documentOrder: readonly string[];
  readonly termOrder: readonly string[];
  readonly tolerance: number;
  readonly documents: readonly TextCorpusDocumentTermScores[];
  readonly queries: readonly TextCorpusQueryScores[];
}

export interface TextCorpusParsedQuery {
  readonly id: string;
  readonly raw: string;
  readonly tokens: readonly string[];
  readonly clauses: readonly TextCorpusParsedQueryClause[];
  readonly expression?: TextCorpusQueryExpression;
  readonly syntax?: TextCorpusQuerySyntax;
}

export type TextCorpusQueryClauseOperator = "should" | "must" | "must-not";
export type TextCorpusParsedQueryClauseKind = "term" | "phrase" | "proximity";
export type TextCorpusQueryExpressionKind = "clause" | "and" | "or" | "not";
export type TextCorpusQuerySyntax = "terms" | "boolean";

export interface TextCorpusParsedQueryClause {
  readonly term: string;
  readonly terms?: readonly string[];
  readonly kind?: TextCorpusParsedQueryClauseKind;
  readonly operator: TextCorpusQueryClauseOperator;
  readonly field?: string;
  readonly proximity?: number;
}

export interface TextCorpusQueryExpression {
  readonly kind: TextCorpusQueryExpressionKind;
  readonly clause?: TextCorpusParsedQueryClause;
  readonly children?: readonly TextCorpusQueryExpression[];
}

export interface TextCorpusParseQueryOptions {
  readonly id?: string;
}

export interface TextCorpusPosting {
  readonly docId: string;
  readonly positions: readonly number[];
}

export type TextCorpusRetrievalFieldSource = "tokens" | "metadata";

export interface TextCorpusRetrievalFieldSpec {
  readonly id: string;
  readonly source: TextCorpusRetrievalFieldSource;
  readonly metadataKey?: string;
  readonly weight?: number;
  readonly b?: number;
}

export interface TextCorpusRetrievalNormalizedFieldSpec {
  readonly id: string;
  readonly source: TextCorpusRetrievalFieldSource;
  readonly metadataKey?: string;
  readonly weight: number;
  readonly b: number;
}

export interface TextCorpusRetrievalBuildOptions {
  readonly formula?: TextCorpusRetrievalFormulaId;
  readonly fields?: readonly TextCorpusRetrievalFieldSpec[];
}

export interface TextCorpusRetrievalDocumentField {
  readonly id: string;
  readonly length: number;
  readonly tokens: readonly string[];
}

export interface TextCorpusRetrievalDocument {
  readonly id: string;
  readonly length: number;
  readonly tokens: readonly string[];
  readonly fields?: readonly TextCorpusRetrievalDocumentField[];
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface TextCorpusRetrievalIndexV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly formula: TextCorpusRetrievalFormulaId;
  readonly documentOrder: readonly string[];
  readonly termOrder: readonly string[];
  readonly averageDocumentLength: number;
  readonly documents: readonly TextCorpusRetrievalDocument[];
  readonly invertedIndex: Readonly<Record<string, readonly TextCorpusPosting[]>>;
  readonly fieldOrder?: readonly string[];
  readonly fieldSpecs?: readonly TextCorpusRetrievalNormalizedFieldSpec[];
  readonly fieldAverageLengths?: Readonly<Record<string, number>>;
  readonly fieldInvertedIndex?: Readonly<
    Record<string, Readonly<Record<string, readonly TextCorpusPosting[]>>>
  >;
}

export interface TextCorpusRetrievalIndexChecksum {
  readonly algorithm: "fnv1a64-utf8";
  readonly value: string;
}

export interface TextCorpusRetrievalIndexArtifactV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly artifactType: "textcorpus-retrieval-index-artifact-v1";
  readonly index: TextCorpusRetrievalIndexV1;
  readonly checksum: TextCorpusRetrievalIndexChecksum;
}

export interface TextCorpusRetrievalIndexStorageRefV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly artifactType: "textcorpus-retrieval-index-storage-ref-v1";
  readonly key: string;
  readonly checksum: TextCorpusRetrievalIndexChecksum;
  readonly byteLength: number;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly formula: TextCorpusRetrievalFormulaId;
  readonly documentCount: number;
  readonly termCount: number;
  readonly fieldCount: number;
}

export type TextCorpusRetrievalIndexStoreWriteText = (
  key: string,
  text: string,
) => void | Promise<void>;

export type TextCorpusRetrievalIndexStoreReadText = (
  key: string,
) => string | Promise<string>;

export interface SaveTextCorpusRetrievalIndexArtifactOptions {
  readonly key: string;
  readonly writeText: TextCorpusRetrievalIndexStoreWriteText;
}

export interface LoadTextCorpusRetrievalIndexArtifactOptions {
  readonly readText: TextCorpusRetrievalIndexStoreReadText;
}

export interface TextCorpusRetrievalFieldContribution {
  readonly field: string;
  readonly tf: number;
  readonly length: number;
  readonly averageLength: number;
  readonly weight: number;
  readonly normalizedTf: number;
}

export interface TextCorpusRetrievalTermExplanation {
  readonly term: string;
  readonly field?: string;
  readonly tf: number;
  readonly df: number;
  readonly idf: number;
  readonly contribution: number;
  readonly fieldContributions?: readonly TextCorpusRetrievalFieldContribution[];
}

export interface TextCorpusRetrievalSnippet {
  readonly text: string;
  readonly tokenStart: number;
  readonly tokenEnd: number;
  readonly highlightedTerms: readonly string[];
}

export interface TextCorpusRetrievalHit {
  readonly docId: string;
  readonly score: number;
  readonly snippet?: TextCorpusRetrievalSnippet;
  readonly explain: readonly TextCorpusRetrievalTermExplanation[];
}

export interface TextCorpusRetrievalQueryResult {
  readonly query: TextCorpusParsedQuery;
  readonly hits: readonly TextCorpusRetrievalHit[];
}

export interface TextCorpusRetrievalSearchOptions {
  readonly topK?: number;
  readonly snippetWindow?: number;
  readonly includeZeroScores?: boolean;
}

export interface TextCorpusRetrievalStreamOptions extends TextCorpusRetrievalSearchOptions {
  readonly failOnInvalidQuery?: boolean;
}

export interface TextCorpusRetrievalResultV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly formula: TextCorpusRetrievalFormulaId;
  readonly results: readonly TextCorpusRetrievalQueryResult[];
}

export interface TextCorpusRelevanceRating {
  readonly docId: string;
  readonly grade: number;
}

export interface TextCorpusRelevanceJudgment {
  readonly queryId: string;
  readonly ratings: readonly TextCorpusRelevanceRating[];
}

export interface TextCorpusRetrievalQrelsV1 {
  readonly schemaVersion: TextCorpusRetrievalQrelsSchemaVersion;
  readonly taskId: "nlp-retrieval";
  readonly corpusId: string;
  readonly source?: TextCorpusRetrievalQrelsSource;
  readonly judgments: readonly TextCorpusRelevanceJudgment[];
}

export interface TextCorpusRetrievalQrelsSource {
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly split: string;
  readonly license: string;
  readonly sourceUrl: string;
  readonly checksum: string;
}

export interface TextCorpusRetrievalEvaluationOptions {
  readonly k?: number;
  readonly relevantGradeThreshold?: number;
  readonly tolerance?: number;
}

export interface TextCorpusRetrievalQueryEvaluation {
  readonly queryId: string;
  readonly retrieved: readonly string[];
  readonly relevant: readonly string[];
  readonly precisionAtK: number;
  readonly recallAtK: number;
  readonly reciprocalRank: number;
  readonly ndcgAtK: number;
}

export interface TextCorpusRetrievalEvaluationSummary {
  readonly precisionAtK: number;
  readonly recallAtK: number;
  readonly mrr: number;
  readonly ndcgAtK: number;
}

export interface TextCorpusRetrievalEvaluationResultV1 {
  readonly schemaVersion: TextCorpusRetrievalEvaluationSchemaVersion;
  readonly taskId: "nlp-retrieval";
  readonly corpusId: string;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly formula: TextCorpusRetrievalFormulaId;
  readonly k: number;
  readonly relevantGradeThreshold: number;
  readonly tolerance: number;
  readonly summary: TextCorpusRetrievalEvaluationSummary;
  readonly queries: readonly TextCorpusRetrievalQueryEvaluation[];
}

export interface TextCorpusCitationWindowOptions {
  readonly tokenWindow?: number;
}

export type TextCorpusCitationTextPolicy = "source-span" | "token-join";

export interface TextCorpusCitationWindowV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly corpusId: string;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly queryId: string;
  readonly docId: string;
  readonly documentId: string;
  readonly viewId: string;
  readonly tokenLayerId: string;
  readonly tokenStart: number;
  readonly tokenEnd: number;
  readonly text: string;
  readonly textPolicy: TextCorpusCitationTextPolicy;
  readonly span?: {
    readonly startCU: number;
    readonly endCU: number;
  };
  readonly score: number;
  readonly formula: TextCorpusRetrievalFormulaId;
  readonly loss: readonly string[];
}

export interface TextCorpusCitationWindowSetV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly windows: readonly TextCorpusCitationWindowV1[];
}

export interface TextCorpusQuoteGroundingOptions {
  readonly docId: string;
  readonly quoteTokens: readonly string[];
  readonly tokenWindow?: number;
}

export interface TextCorpusQuoteGroundingMatchV1 {
  readonly docId: string;
  readonly documentId: string;
  readonly viewId: string;
  readonly tokenLayerId: string;
  readonly tokenStart: number;
  readonly tokenEnd: number;
  readonly text: string;
  readonly textPolicy: TextCorpusCitationTextPolicy;
  readonly span?: {
    readonly startCU: number;
    readonly endCU: number;
  };
  readonly loss: readonly string[];
}

export interface TextCorpusQuoteGroundingResultV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly corpusId: string;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly docId: string;
  readonly quoteTokens: readonly string[];
  readonly status: "grounded" | "ambiguous" | "not-found";
  readonly matches: readonly TextCorpusQuoteGroundingMatchV1[];
}

export interface TextCorpusAnalysisSelectionOptions {
  readonly metadataFilters?: TextCorpusMetadataFilters;
}

export interface TextCorpusConcordanceOptions extends TextCorpusAnalysisSelectionOptions {
  readonly query: string;
  readonly window?: number;
}

export interface TextCorpusConcordanceRowV1 {
  readonly docId: string;
  readonly documentId: string;
  readonly tokenIndex: number;
  readonly left: readonly string[];
  readonly match: string;
  readonly right: readonly string[];
}

export interface TextCorpusConcordanceResultV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly query: string;
  readonly window: number;
  readonly rows: readonly TextCorpusConcordanceRowV1[];
}

export interface TextCorpusFrequencyOptions extends TextCorpusAnalysisSelectionOptions {}

export interface TextCorpusFrequencyRowV1 {
  readonly term: string;
  readonly count: number;
  readonly documentFrequency: number;
  readonly relativeFrequency: number;
}

export interface TextCorpusFrequencyResultV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly rows: readonly TextCorpusFrequencyRowV1[];
}

export interface TextCorpusNgramOptions extends TextCorpusAnalysisSelectionOptions {
  readonly n: number;
}

export interface TextCorpusNgramRowV1 {
  readonly ngram: readonly string[];
  readonly count: number;
  readonly documentFrequency: number;
  readonly relativeFrequency: number;
}

export interface TextCorpusNgramResultV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly n: number;
  readonly rows: readonly TextCorpusNgramRowV1[];
}

export interface TextCorpusCooccurrenceOptions extends TextCorpusAnalysisSelectionOptions {
  readonly window?: number;
}

export interface TextCorpusCooccurrenceRowV1 {
  readonly term: string;
  readonly coTerm: string;
  readonly count: number;
  readonly termCount: number;
  readonly coTermCount: number;
  readonly pmiLog2: number;
}

export interface TextCorpusCooccurrenceResultV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly window: number;
  readonly rows: readonly TextCorpusCooccurrenceRowV1[];
}

export interface TextCorpusCollocateOptions extends TextCorpusCooccurrenceOptions {
  readonly term: string;
}

export interface TextCorpusCollocateResultV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly term: string;
  readonly window: number;
  readonly rows: readonly TextCorpusCooccurrenceRowV1[];
}

export type TextCorpusPairwiseRelationLabel =
  | "exact-duplicate"
  | "near-duplicate"
  | "shared-reuse";

export interface TextCorpusPairwiseRelationOptions extends TextCorpusAnalysisSelectionOptions {
  readonly shingleSize: number;
  readonly windowSize: number;
  readonly hashAlgorithm?: Hash64AlgoId;
  readonly nearDuplicateThreshold?: number;
}

export interface TextCorpusPairwiseRelationRowV1 {
  readonly leftDocId: string;
  readonly rightDocId: string;
  readonly relation: TextCorpusPairwiseRelationLabel;
  readonly sharedFingerprintCount: number;
  readonly leftFingerprintCount: number;
  readonly rightFingerprintCount: number;
  readonly jaccard: number;
}

export interface TextCorpusPairwiseRelationResultV1 {
  readonly schemaVersion: TextCorpusAnalysisSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
  readonly evidenceClass: TextCorpusEvidenceClass;
  readonly selection: TextCorpusSelectionProvenanceV1;
  readonly shingleSize: number;
  readonly windowSize: number;
  readonly hashAlgorithm: Hash64AlgoId;
  readonly nearDuplicateThreshold: number;
  readonly rows: readonly TextCorpusPairwiseRelationRowV1[];
}

export type TextCorpusArtifactV1 =
  | TextCorpusConcordanceResultV1
  | TextCorpusFrequencyResultV1
  | TextCorpusNgramResultV1
  | TextCorpusCooccurrenceResultV1
  | TextCorpusCollocateResultV1
  | TextCorpusPairwiseRelationResultV1
  | TextCorpusScoringResultV1
  | TextCorpusRetrievalIndexV1
  | TextCorpusRetrievalIndexArtifactV1
  | TextCorpusRetrievalIndexStorageRefV1
  | TextCorpusRetrievalResultV1
  | TextCorpusRetrievalEvaluationResultV1
  | TextCorpusCitationWindowSetV1
  | TextCorpusQuoteGroundingResultV1;

export type TextCorpusMetricEnvelopeMetricValue = number | string;
export type TextCorpusMetricEnvelopeMetricParameters = Readonly<Record<string, string | number | boolean>>;

export interface TextCorpusMetricEnvelopeMetricV1 {
  readonly metricId: string;
  readonly kind: string;
  readonly value: TextCorpusMetricEnvelopeMetricValue;
  readonly unit?: string;
  readonly parameters?: TextCorpusMetricEnvelopeMetricParameters;
}

export interface TextCorpusMetricEnvelopePayloadV1 {
  readonly corpusId: string;
  readonly metricSetId: string;
  readonly metrics: readonly TextCorpusMetricEnvelopeMetricV1[];
}

export interface TextCorpusMetricEnvelopePayloadOptions {
  readonly metricSetId?: string;
  readonly includeSelectionMetrics?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, entryValue]) => isNonEmptyString(key) && isNonEmptyString(entryValue),
    )
  );
}

function findView(document: TextDocDocumentV1, viewId: string): TextDocView | undefined {
  return document.views.find((view) => view.id === viewId);
}

function isTokenLayer(
  layer: TextDocLayer,
  tokenLayerId: string,
  viewId: string,
): layer is TextDocLayer<TextDocDocumentTokenAnnotation> {
  return layer.id === tokenLayerId && layer.viewId === viewId && layer.kind === "token";
}

function findTokenLayer(
  document: TextDocDocumentV1,
  tokenLayerId: string,
  viewId: string,
): TextDocLayer<TextDocDocumentTokenAnnotation> | undefined {
  return document.layers.find((layer) => isTokenLayer(layer, tokenLayerId, viewId));
}

function compareEntriesById(left: TextCorpusEntry, right: TextCorpusEntry): number {
  return left.id.localeCompare(right.id);
}

function rightmostMinimumIndex(values: readonly bigint[], startIndex: number, endIndex: number): number {
  let selectedIndex = startIndex;
  let selectedValue = values[startIndex];
  if (selectedValue === undefined) return startIndex;

  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const value = values[index];
    if (value === undefined) continue;
    if (value <= selectedValue) {
      selectedValue = value;
      selectedIndex = index;
    }
  }

  return selectedIndex;
}

function selectFingerprintIndexes(
  hashes: readonly bigint[],
  windowSize: number,
  maxFingerprintsPerDoc: number,
): readonly number[] {
  if (hashes.length === 0) return [];
  const effectiveWindow = Math.max(1, Math.floor(windowSize));
  const selected = new Set<number>();

  if (hashes.length <= effectiveWindow) {
    for (let index = 0; index < hashes.length && selected.size < maxFingerprintsPerDoc; index += 1) {
      selected.add(index);
    }
  } else {
    for (let startIndex = 0; startIndex <= hashes.length - effectiveWindow; startIndex += 1) {
      selected.add(rightmostMinimumIndex(hashes, startIndex, startIndex + effectiveWindow));
      if (selected.size >= maxFingerprintsPerDoc) break;
    }
  }

  return Array.from(selected).sort((left, right) => left - right).slice(0, maxFingerprintsPerDoc);
}

function resolveTokenText(
  document: TextDocDocumentV1,
  annotation: TextDocDocumentTokenAnnotation,
): string {
  if (annotation.text !== undefined) return annotation.text;
  if (document.text === undefined) {
    throw new Error(
      `token annotation ${annotation.id} must carry text when document.text is absent`,
    );
  }
  const spanTarget = annotation.targets.find((target) => target.kind === "span");
  if (!spanTarget) {
    throw new Error(`token annotation ${annotation.id} must target a span`);
  }
  return document.text.slice(spanTarget.startCU, spanTarget.endCU);
}

function getEntryTokenAnnotations(entry: TextCorpusEntry): readonly TextDocDocumentTokenAnnotation[] {
  const tokenLayer = findTokenLayer(entry.document, entry.tokenLayerId, entry.viewId);
  if (!tokenLayer) {
    throw new Error(
      `entry ${entry.id} references missing token layer ${entry.tokenLayerId} in view ${entry.viewId}`,
    );
  }

  return tokenLayer.annotations.filter((annotation) => annotation.lifecycle.state === "active");
}

function getEntryTokenTexts(entry: TextCorpusEntry): readonly string[] {
  return getEntryTokenAnnotations(entry).map((annotation) => resolveTokenText(entry.document, annotation));
}

function tokenSpan(annotation: TextDocDocumentTokenAnnotation): { readonly startCU: number; readonly endCU: number } | undefined {
  const target = annotation.targets.find((entry) => entry.kind === "span");
  return target === undefined ? undefined : { startCU: target.startCU, endCU: target.endCU };
}

function citationTextFromTokens(
  entry: TextCorpusEntry,
  tokenStart: number,
  tokenEnd: number,
): {
  readonly text: string;
  readonly textPolicy: TextCorpusCitationTextPolicy;
  readonly span?: { readonly startCU: number; readonly endCU: number };
  readonly loss: readonly string[];
} {
  const annotations = getEntryTokenAnnotations(entry);
  const effectiveStart = Math.max(0, Math.min(tokenStart, annotations.length));
  const effectiveEnd = Math.max(effectiveStart, Math.min(tokenEnd, annotations.length));
  const selected = annotations.slice(effectiveStart, effectiveEnd);
  const firstSpan = selected.length > 0 ? tokenSpan(selected[0] as TextDocDocumentTokenAnnotation) : undefined;
  const lastSpan = selected.length > 0 ? tokenSpan(selected[selected.length - 1] as TextDocDocumentTokenAnnotation) : undefined;
  if (entry.document.text !== undefined && firstSpan !== undefined && lastSpan !== undefined) {
    return {
      text: entry.document.text.slice(firstSpan.startCU, lastSpan.endCU),
      textPolicy: "source-span",
      span: { startCU: firstSpan.startCU, endCU: lastSpan.endCU },
      loss: [],
    };
  }
  return {
    text: selected.map((annotation) => resolveTokenText(entry.document, annotation)).join(" "),
    textPolicy: "token-join",
    loss: ["missing-source-span"],
  };
}

function compareTerms(left: string, right: string): number {
  return left.localeCompare(right);
}

function countTerms(tokens: readonly string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
  return value;
}

function normalizeMetadataFilters(
  filters: TextCorpusMetadataFilters | undefined,
): TextCorpusNormalizedMetadataFilters | undefined {
  if (filters === undefined) return undefined;
  if (!isRecord(filters)) {
    throw new TypeError("textcorpus metadata filters must be a record");
  }
  const normalized: Record<string, readonly string[]> = {};
  for (const [key, value] of Object.entries(filters).sort(([left], [right]) => left.localeCompare(right))) {
    if (!isNonEmptyString(key)) {
      throw new TypeError("textcorpus metadata filter keys must be non-empty strings");
    }
    if (typeof value === "string") {
      if (!isNonEmptyString(value)) {
        throw new TypeError(`metadata filter ${key} must be a non-empty string`);
      }
      normalized[key] = [value];
      continue;
    }
    if (!Array.isArray(value) || value.length === 0 || !value.every((entry) => isNonEmptyString(entry))) {
      throw new TypeError(`metadata filter ${key} must be a non-empty string or string array`);
    }
    normalized[key] = [...new Set(value)].sort(compareTerms);
  }
  return normalized;
}

function entryMatchesMetadataFilters(
  entry: TextCorpusEntry,
  filters: TextCorpusNormalizedMetadataFilters | undefined,
): boolean {
  if (filters === undefined) return true;
  return Object.entries(filters).every(([key, acceptedValues]) => {
    const actualValue = entry.metadata?.[key];
    return actualValue !== undefined && acceptedValues.includes(actualValue);
  });
}

interface TextCorpusSelectedEntry {
  readonly entry: TextCorpusEntry;
  readonly tokens: readonly string[];
}

function selectTextCorpusEntries(
  collection: TextCorpusCollectionV1,
  metadataFilters?: TextCorpusMetadataFilters,
): {
  readonly entries: readonly TextCorpusSelectedEntry[];
  readonly selection: TextCorpusSelectionProvenanceV1;
} {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }
  const normalizedFilters = normalizeMetadataFilters(metadataFilters);
  const entries = collection.entries
    .filter((entry) => entryMatchesMetadataFilters(entry, normalizedFilters))
    .map((entry) => ({ entry, tokens: getEntryTokenTexts(entry) }));
  const documents = entries.map(({ entry, tokens }) => ({
    id: entry.id,
    documentId: entry.document.documentId,
    revision: entry.document.revision,
    viewId: entry.viewId,
    tokenLayerId: entry.tokenLayerId,
    tokenCount: tokens.length,
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
  }));
  return {
    entries,
    selection: {
      schemaVersion: textCorpusAnalysisSchemaVersion,
      corpusId: collection.corpusId,
      tokenSource: textCorpusTokenSource,
      units: "utf16-code-unit",
      documentOrder: entries.map(({ entry }) => entry.id),
      tokenCount: entries.reduce((sum, selected) => sum + selected.tokens.length, 0),
      documents,
      ...(normalizedFilters ? { metadataFilters: normalizedFilters } : {}),
    },
  };
}

function tokenCountMap(selectedEntries: readonly TextCorpusSelectedEntry[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const { tokens } of selectedEntries) {
    for (const [term, count] of countTerms(tokens)) {
      counts.set(term, (counts.get(term) ?? 0) + count);
    }
  }
  return counts;
}

function documentFrequencyMapForTerms(selectedEntries: readonly TextCorpusSelectedEntry[]): ReadonlyMap<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const { tokens } of selectedEntries) {
    for (const term of new Set(tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }
  return documentFrequency;
}

function relativeFrequency(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function ngramKey(ngram: readonly string[]): string {
  return ngram.join("\u001f");
}

function splitNgramKey(key: string): readonly string[] {
  return key.length === 0 ? [] : key.split("\u001f");
}

function compareStringArrays(left: readonly string[], right: readonly string[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? "";
    const rightValue = right[index] ?? "";
    const compared = leftValue.localeCompare(rightValue);
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

function cooccurrenceKey(left: string, right: string): string {
  const [term, coTerm] = [left, right].sort(compareTerms);
  return `${term}\u001f${coTerm}`;
}

function splitCooccurrenceKey(key: string): readonly [string, string] {
  const [term = "", coTerm = ""] = key.split("\u001f");
  return [term, coTerm];
}

function pmiLog2(count: number, termCount: number, coTermCount: number, totalPairs: number): number {
  if (count <= 0 || termCount <= 0 || coTermCount <= 0 || totalPairs <= 0) return 0;
  return Math.log2((count * totalPairs) / (termCount * coTermCount));
}

function validateQueries(queries: readonly TextCorpusQuery[]): void {
  const seen = new Set<string>();
  for (const query of queries) {
    if (!isNonEmptyString(query.id)) {
      throw new TypeError("textcorpus query id must be a non-empty string");
    }
    if (seen.has(query.id)) {
      throw new Error(`duplicate textcorpus query id: ${query.id}`);
    }
    seen.add(query.id);
    if (!Array.isArray(query.tokens) || !query.tokens.every((token) => typeof token === "string")) {
      throw new TypeError(`textcorpus query ${query.id} tokens must be a string array`);
    }
  }
}

function smoothSklearnIdf(documentCount: number, documentFrequency: number): number {
  return Math.log((1 + documentCount) / (1 + documentFrequency)) + 1;
}

function bm25OkapiIdf(documentCount: number, documentFrequency: number): number {
  if (documentFrequency <= 0) return 0;
  return Math.log((documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
}

function bm25OkapiParameters(formula: TextCorpusBm25FormulaId): { readonly k1: number; readonly b: number } {
  if (formula === textCorpusBm25OkapiK1_1_2Formula) return { k1: 1.2, b: 0.75 };
  return { k1: 1.5, b: 0.75 };
}

function bm25OkapiScore(
  termFrequency: number,
  documentLength: number,
  averageDocumentLength: number,
  idf: number,
  parameters: { readonly k1: number; readonly b: number } = bm25OkapiParameters(textCorpusBm25OkapiFormula),
): number {
  if (termFrequency <= 0 || averageDocumentLength <= 0 || idf === 0) return 0;
  const { k1, b } = parameters;
  const denominator = termFrequency + k1 * (1 - b + b * (documentLength / averageDocumentLength));
  if (denominator === 0) return 0;
  return idf * ((termFrequency * (k1 + 1)) / denominator);
}

function bm25fScore(weightedTermFrequency: number, idf: number): number {
  if (weightedTermFrequency <= 0 || idf === 0) return 0;
  const k1 = 1.2;
  return idf * ((weightedTermFrequency * (k1 + 1)) / (weightedTermFrequency + k1));
}

function isTermValueArray(value: unknown): value is readonly TextCorpusTermValue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.term === "string" &&
        typeof entry.value === "number" &&
        Number.isFinite(entry.value),
    )
  );
}

function isTfidfFormula(value: unknown): value is TextCorpusTfidfFormulaId {
  return value === textCorpusTfidfSklearnSmoothRawFormula || value === textCorpusTfidfSklearnSmoothL2Formula;
}

function isBm25ScoringFormula(value: unknown): value is TextCorpusBm25FormulaId {
  return value === textCorpusBm25OkapiFormula || value === textCorpusBm25OkapiK1_1_2Formula;
}

function isScoringFormula(value: unknown): value is TextCorpusFormulaId {
  return (
    value === textCorpusTfRawCountFormula ||
    value === textCorpusDfDocumentCountFormula ||
    isTfidfFormula(value) ||
    isBm25ScoringFormula(value) ||
    value === textCorpusBm25fFormula
  );
}

function isFormulaTermValuesArray(value: unknown): value is readonly TextCorpusFormulaTermValues[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        isTfidfFormula(entry.formula) &&
        isTermValueArray(entry.values),
    )
  );
}

function isDocumentScoreArray(value: unknown): value is readonly TextCorpusDocumentScore[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.docId) &&
        typeof entry.score === "number" &&
        Number.isFinite(entry.score),
    )
  );
}

function isFormulaDocumentScoresArray(value: unknown): value is readonly TextCorpusFormulaDocumentScores[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        isBm25ScoringFormula(entry.formula) &&
        isDocumentScoreArray(entry.scores),
    )
  );
}

function isPostingArray(value: unknown): value is readonly TextCorpusPosting[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.docId) &&
        Array.isArray(entry.positions) &&
        entry.positions.every((position) => Number.isInteger(position) && position >= 0),
    )
  );
}

function isRetrievalFormula(value: unknown): value is TextCorpusRetrievalFormulaId {
  return value === textCorpusBm25OkapiFormula || value === textCorpusBm25fFormula;
}

function isRelevanceRating(value: unknown): value is TextCorpusRelevanceRating {
  return (
    isRecord(value) &&
    isNonEmptyString(value.docId) &&
    typeof value.grade === "number" &&
    Number.isInteger(value.grade) &&
    value.grade >= 0
  );
}

function isRelevanceJudgment(value: unknown): value is TextCorpusRelevanceJudgment {
  return (
    isRecord(value) &&
    isNonEmptyString(value.queryId) &&
    Array.isArray(value.ratings) &&
    value.ratings.length > 0 &&
    value.ratings.every((rating) => isRelevanceRating(rating))
  );
}

function isRetrievalQrelsSource(value: unknown): value is TextCorpusRetrievalQrelsSource {
  return (
    isRecord(value) &&
    isNonEmptyString(value.datasetId) &&
    isNonEmptyString(value.datasetVersion) &&
    isNonEmptyString(value.split) &&
    isNonEmptyString(value.license) &&
    isNonEmptyString(value.sourceUrl) &&
    isNonEmptyString(value.checksum)
  );
}

function isRetrievalDocumentField(value: unknown): value is TextCorpusRetrievalDocumentField {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    typeof value.length === "number" &&
    Number.isInteger(value.length) &&
    value.length >= 0 &&
    Array.isArray(value.tokens) &&
    value.tokens.every((token) => typeof token === "string")
  );
}

function isRetrievalDocument(value: unknown): value is TextCorpusRetrievalDocument {
  if (!isRecord(value)) return false;
  const length = value.length;
  return (
    isNonEmptyString(value.id) &&
    typeof length === "number" &&
    Number.isInteger(length) &&
    length >= 0 &&
    Array.isArray(value.tokens) &&
    value.tokens.every((token) => typeof token === "string") &&
    (value.fields === undefined ||
      (Array.isArray(value.fields) && value.fields.every((field) => isRetrievalDocumentField(field)))) &&
    (value.metadata === undefined || isStringRecord(value.metadata))
  );
}

function isRetrievalFieldSpec(value: unknown): value is TextCorpusRetrievalNormalizedFieldSpec {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    (value.source === "tokens" || value.source === "metadata") &&
    (value.metadataKey === undefined || isNonEmptyString(value.metadataKey)) &&
    typeof value.weight === "number" &&
    Number.isFinite(value.weight) &&
    value.weight > 0 &&
    typeof value.b === "number" &&
    Number.isFinite(value.b) &&
    value.b >= 0 &&
    value.b <= 1
  );
}

function isNumberRecord(value: unknown): value is Readonly<Record<string, number>> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, entryValue]) =>
        isNonEmptyString(key) &&
        typeof entryValue === "number" &&
        Number.isFinite(entryValue) &&
        entryValue >= 0,
    )
  );
}

function isFieldInvertedIndex(
  value: unknown,
): value is Readonly<Record<string, Readonly<Record<string, readonly TextCorpusPosting[]>>>> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([fieldId, fieldIndex]) =>
        isNonEmptyString(fieldId) &&
        isRecord(fieldIndex) &&
        Object.values(fieldIndex).every((entry) => isPostingArray(entry)),
    )
  );
}

function validateEntry(entry: TextCorpusEntry): void {
  if (!isNonEmptyString(entry.id)) {
    throw new TypeError("textcorpus entry id must be a non-empty string");
  }
  if (!isTextDocDocumentV1(entry.document)) {
    throw new TypeError(`entry ${entry.id} must carry a valid TextDocDocumentV1 document`);
  }
  if (!isNonEmptyString(entry.viewId)) {
    throw new TypeError(`entry ${entry.id} viewId must be a non-empty string`);
  }
  if (!isNonEmptyString(entry.tokenLayerId)) {
    throw new TypeError(`entry ${entry.id} tokenLayerId must be a non-empty string`);
  }
  if (entry.metadata !== undefined && !isStringRecord(entry.metadata)) {
    throw new TypeError(`entry ${entry.id} metadata must be a string-to-string record`);
  }
  if (!findView(entry.document, entry.viewId)) {
    throw new Error(`entry ${entry.id} references missing view ${entry.viewId}`);
  }
  if (!findTokenLayer(entry.document, entry.tokenLayerId, entry.viewId)) {
    throw new Error(
      `entry ${entry.id} references missing token layer ${entry.tokenLayerId} in view ${entry.viewId}`,
    );
  }
}

export function isTextCorpusEntry(value: unknown): value is TextCorpusEntry {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isTextDocDocumentV1(value.document) &&
    isNonEmptyString(value.viewId) &&
    isNonEmptyString(value.tokenLayerId) &&
    (value.metadata === undefined || isStringRecord(value.metadata))
  );
}

export function isTextCorpusCollectionV1(value: unknown): value is TextCorpusCollectionV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusCollectionSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    isRecord(value.policy) &&
    value.policy.tokenSource === textCorpusTokenSource &&
    value.policy.units === "utf16-code-unit" &&
    Array.isArray(value.entries) &&
    value.entries.every((entry) => isTextCorpusEntry(entry))
  );
}

function isTextCorpusEvidenceClass(value: unknown): value is TextCorpusEvidenceClass {
  return value === textCorpusEvidenceClassE2;
}

function isNormalizedMetadataFilters(value: unknown): value is TextCorpusNormalizedMetadataFilters {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, entryValue]) =>
        isNonEmptyString(key) &&
        Array.isArray(entryValue) &&
        entryValue.length > 0 &&
        entryValue.every((item) => isNonEmptyString(item)),
    )
  );
}

function isTextCorpusSelectionDocumentRefV1(value: unknown): value is TextCorpusSelectionDocumentRefV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.revision) &&
    isNonEmptyString(value.viewId) &&
    isNonEmptyString(value.tokenLayerId) &&
    typeof value.tokenCount === "number" &&
    Number.isInteger(value.tokenCount) &&
    value.tokenCount >= 0 &&
    (value.metadata === undefined || isStringRecord(value.metadata))
  );
}

export function isTextCorpusSelectionProvenanceV1(value: unknown): value is TextCorpusSelectionProvenanceV1 {
  if (
    !(
      isRecord(value) &&
      value.schemaVersion === textCorpusAnalysisSchemaVersion &&
      isNonEmptyString(value.corpusId) &&
      value.tokenSource === textCorpusTokenSource &&
      value.units === "utf16-code-unit" &&
      Array.isArray(value.documentOrder) &&
      value.documentOrder.every((entry) => isNonEmptyString(entry)) &&
      typeof value.tokenCount === "number" &&
      Number.isInteger(value.tokenCount) &&
      value.tokenCount >= 0 &&
      Array.isArray(value.documents) &&
      value.documents.every((entry) => isTextCorpusSelectionDocumentRefV1(entry)) &&
      (value.metadataFilters === undefined || isNormalizedMetadataFilters(value.metadataFilters))
    )
  ) {
    return false;
  }
  const documents = value.documents as readonly TextCorpusSelectionDocumentRefV1[];
  const documentOrder = value.documentOrder as readonly string[];
  return (
    documents.map((entry) => entry.id).join("\u001f") === documentOrder.join("\u001f") &&
    documents.reduce((sum, entry) => sum + entry.tokenCount, 0) === value.tokenCount
  );
}

function selectionMatchesCorpus(
  selection: unknown,
  corpusId: unknown,
): selection is TextCorpusSelectionProvenanceV1 {
  return isTextCorpusSelectionProvenanceV1(selection) && selection.corpusId === corpusId;
}

function isTextCorpusConcordanceRowV1(value: unknown): value is TextCorpusConcordanceRowV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.docId) &&
    isNonEmptyString(value.documentId) &&
    typeof value.tokenIndex === "number" &&
    Number.isInteger(value.tokenIndex) &&
    value.tokenIndex >= 0 &&
    Array.isArray(value.left) &&
    value.left.every((entry) => typeof entry === "string") &&
    typeof value.match === "string" &&
    Array.isArray(value.right) &&
    value.right.every((entry) => typeof entry === "string")
  );
}

export function isTextCorpusConcordanceResultV1(value: unknown): value is TextCorpusConcordanceResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusAnalysisSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    isNonEmptyString(value.query) &&
    typeof value.window === "number" &&
    Number.isInteger(value.window) &&
    value.window >= 0 &&
    Array.isArray(value.rows) &&
    value.rows.every((entry) => isTextCorpusConcordanceRowV1(entry))
  );
}

function isFrequencyRow(value: unknown): value is TextCorpusFrequencyRowV1 {
  return (
    isRecord(value) &&
    typeof value.term === "string" &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count >= 0 &&
    typeof value.documentFrequency === "number" &&
    Number.isInteger(value.documentFrequency) &&
    value.documentFrequency >= 0 &&
    typeof value.relativeFrequency === "number" &&
    Number.isFinite(value.relativeFrequency) &&
    value.relativeFrequency >= 0
  );
}

export function isTextCorpusFrequencyResultV1(value: unknown): value is TextCorpusFrequencyResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusAnalysisSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    Array.isArray(value.rows) &&
    value.rows.every((entry) => isFrequencyRow(entry))
  );
}

function isNgramRow(value: unknown): value is TextCorpusNgramRowV1 {
  return (
    isRecord(value) &&
    Array.isArray(value.ngram) &&
    value.ngram.length >= 1 &&
    value.ngram.every((entry) => typeof entry === "string") &&
    isFrequencyRow({ term: value.ngram.join("\u001f"), count: value.count, documentFrequency: value.documentFrequency, relativeFrequency: value.relativeFrequency })
  );
}

export function isTextCorpusNgramResultV1(value: unknown): value is TextCorpusNgramResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusAnalysisSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    typeof value.n === "number" &&
    Number.isInteger(value.n) &&
    value.n >= 1 &&
    Array.isArray(value.rows) &&
    value.rows.every((entry) => isNgramRow(entry))
  );
}

function isCooccurrenceRow(value: unknown): value is TextCorpusCooccurrenceRowV1 {
  return (
    isRecord(value) &&
    typeof value.term === "string" &&
    typeof value.coTerm === "string" &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count >= 0 &&
    typeof value.termCount === "number" &&
    Number.isInteger(value.termCount) &&
    value.termCount >= 0 &&
    typeof value.coTermCount === "number" &&
    Number.isInteger(value.coTermCount) &&
    value.coTermCount >= 0 &&
    typeof value.pmiLog2 === "number" &&
    Number.isFinite(value.pmiLog2)
  );
}

export function isTextCorpusCooccurrenceResultV1(value: unknown): value is TextCorpusCooccurrenceResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusAnalysisSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    !("term" in value) &&
    typeof value.window === "number" &&
    Number.isInteger(value.window) &&
    value.window >= 1 &&
    Array.isArray(value.rows) &&
    value.rows.every((entry) => isCooccurrenceRow(entry))
  );
}

export function isTextCorpusCollocateResultV1(value: unknown): value is TextCorpusCollocateResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusAnalysisSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    isNonEmptyString(value.term) &&
    typeof value.window === "number" &&
    Number.isInteger(value.window) &&
    value.window >= 1 &&
    Array.isArray(value.rows) &&
    value.rows.every((entry) => isCooccurrenceRow(entry))
  );
}

function isPairwiseRelationLabel(value: unknown): value is TextCorpusPairwiseRelationLabel {
  return value === "exact-duplicate" || value === "near-duplicate" || value === "shared-reuse";
}

function isPairwiseRelationRow(value: unknown): value is TextCorpusPairwiseRelationRowV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.leftDocId) &&
    isNonEmptyString(value.rightDocId) &&
    isPairwiseRelationLabel(value.relation) &&
    typeof value.sharedFingerprintCount === "number" &&
    Number.isInteger(value.sharedFingerprintCount) &&
    value.sharedFingerprintCount >= 0 &&
    typeof value.leftFingerprintCount === "number" &&
    Number.isInteger(value.leftFingerprintCount) &&
    value.leftFingerprintCount >= 0 &&
    typeof value.rightFingerprintCount === "number" &&
    Number.isInteger(value.rightFingerprintCount) &&
    value.rightFingerprintCount >= 0 &&
    typeof value.jaccard === "number" &&
    Number.isFinite(value.jaccard) &&
    value.jaccard >= 0 &&
    value.jaccard <= 1
  );
}

export function isTextCorpusPairwiseRelationResultV1(value: unknown): value is TextCorpusPairwiseRelationResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusAnalysisSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    typeof value.shingleSize === "number" &&
    Number.isInteger(value.shingleSize) &&
    value.shingleSize >= 1 &&
    typeof value.windowSize === "number" &&
    Number.isInteger(value.windowSize) &&
    value.windowSize >= 1 &&
    (value.hashAlgorithm === "fnv1a64-utf16le" ||
      value.hashAlgorithm === "fnv1a64-utf8" ||
      value.hashAlgorithm === "xxh64-utf8") &&
    typeof value.nearDuplicateThreshold === "number" &&
    Number.isFinite(value.nearDuplicateThreshold) &&
    value.nearDuplicateThreshold >= 0 &&
    value.nearDuplicateThreshold <= 1 &&
    Array.isArray(value.rows) &&
    value.rows.every((entry) => isPairwiseRelationRow(entry))
  );
}

export function isTextCorpusFingerprintIndex(
  value: unknown,
): value is TextCorpusFingerprintIndex {
  return (
    isRecord(value) &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    (value.hashAlgorithm === "fnv1a64-utf16le" ||
      value.hashAlgorithm === "fnv1a64-utf8" ||
      value.hashAlgorithm === "xxh64-utf8") &&
    typeof value.shingleSize === "number" &&
    Number.isInteger(value.shingleSize) &&
    value.shingleSize >= 1 &&
    typeof value.windowSize === "number" &&
    Number.isInteger(value.windowSize) &&
    value.windowSize >= 1 &&
    isRecord(value.docFingerprints) &&
    Object.values(value.docFingerprints).every(
      (entry) => Array.isArray(entry) && entry.every((hash) => isNonEmptyString(hash)),
    ) &&
    isRecord(value.index) &&
    Object.values(value.index).every(
      (entry) => Array.isArray(entry) && entry.every((docId) => isNonEmptyString(docId)),
    ) &&
    (value.truncated === undefined || typeof value.truncated === "boolean")
  );
}

export function isTextCorpusScoringResultV1(value: unknown): value is TextCorpusScoringResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusScoringSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    Array.isArray(value.formulaSet) &&
    value.formulaSet.every((entry) => isScoringFormula(entry)) &&
    Array.isArray(value.documentOrder) &&
    value.documentOrder.every((entry) => isNonEmptyString(entry)) &&
    Array.isArray(value.termOrder) &&
    value.termOrder.every((entry) => typeof entry === "string") &&
    typeof value.tolerance === "number" &&
    value.tolerance >= 0 &&
    Array.isArray(value.documents) &&
    value.documents.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.id) &&
        typeof entry.length === "number" &&
        Number.isInteger(entry.length) &&
        entry.length >= 0 &&
        isTermValueArray(entry.tf) &&
        isTermValueArray(entry.tfidf) &&
        (entry.tfidfVariants === undefined || isFormulaTermValuesArray(entry.tfidfVariants)),
    ) &&
    Array.isArray(value.queries) &&
    value.queries.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.id) &&
        isDocumentScoreArray(entry.bm25) &&
        (entry.bm25Variants === undefined || isFormulaDocumentScoresArray(entry.bm25Variants)),
    )
  );
}

export function isTextCorpusParsedQuery(value: unknown): value is TextCorpusParsedQuery {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.raw === "string" &&
    Array.isArray(value.tokens) &&
    value.tokens.every((token) => typeof token === "string") &&
    Array.isArray(value.clauses) &&
    value.clauses.every(
      (clause) =>
        isRecord(clause) &&
        typeof clause.term === "string" &&
        (clause.operator === "should" ||
          clause.operator === "must" ||
          clause.operator === "must-not") &&
        (clause.kind === undefined ||
          clause.kind === "term" ||
          clause.kind === "phrase" ||
          clause.kind === "proximity") &&
        (clause.terms === undefined ||
          (Array.isArray(clause.terms) && clause.terms.every((term) => typeof term === "string"))) &&
        (clause.proximity === undefined ||
          (typeof clause.proximity === "number" &&
            Number.isInteger(clause.proximity) &&
            clause.proximity >= 0)) &&
        (clause.field === undefined || isNonEmptyString(clause.field)),
    ) &&
    (value.expression === undefined || isTextCorpusQueryExpression(value.expression)) &&
    (value.syntax === undefined || value.syntax === "terms" || value.syntax === "boolean")
  );
}

function isTextCorpusQueryExpression(value: unknown): value is TextCorpusQueryExpression {
  if (!isRecord(value)) return false;
  if (value.kind === "clause") {
    return (
      value.clause === undefined ||
      isTextCorpusParsedQuery({ id: "guard", raw: "", tokens: [], clauses: [value.clause] })
    );
  }
  return (
    (value.kind === "and" || value.kind === "or" || value.kind === "not") &&
    Array.isArray(value.children) &&
    value.children.length >= 1 &&
    value.children.every((child) => isTextCorpusQueryExpression(child))
  );
}

export function isTextCorpusRetrievalIndexV1(value: unknown): value is TextCorpusRetrievalIndexV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    isRetrievalFormula(value.formula) &&
    Array.isArray(value.documentOrder) &&
    value.documentOrder.every((entry) => isNonEmptyString(entry)) &&
    Array.isArray(value.termOrder) &&
    value.termOrder.every((entry) => typeof entry === "string") &&
    typeof value.averageDocumentLength === "number" &&
    Number.isFinite(value.averageDocumentLength) &&
    value.averageDocumentLength >= 0 &&
    Array.isArray(value.documents) &&
    value.documents.every((entry) => isRetrievalDocument(entry)) &&
    isRecord(value.invertedIndex) &&
    Object.values(value.invertedIndex).every((entry) => isPostingArray(entry)) &&
    (value.fieldOrder === undefined ||
      (Array.isArray(value.fieldOrder) && value.fieldOrder.every((entry) => isNonEmptyString(entry)))) &&
    (value.fieldSpecs === undefined ||
      (Array.isArray(value.fieldSpecs) && value.fieldSpecs.every((entry) => isRetrievalFieldSpec(entry)))) &&
    (value.fieldAverageLengths === undefined || isNumberRecord(value.fieldAverageLengths)) &&
    (value.fieldInvertedIndex === undefined || isFieldInvertedIndex(value.fieldInvertedIndex))
  );
}

export function isTextCorpusRetrievalResultV1(value: unknown): value is TextCorpusRetrievalResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    isRetrievalFormula(value.formula) &&
    Array.isArray(value.results) &&
    value.results.every(
      (entry) =>
        isRecord(entry) &&
        isTextCorpusParsedQuery(entry.query) &&
        Array.isArray(entry.hits) &&
        entry.hits.every(
          (hit) =>
            isRecord(hit) &&
            isNonEmptyString(hit.docId) &&
            typeof hit.score === "number" &&
            Number.isFinite(hit.score) &&
            Array.isArray(hit.explain),
        ),
    )
  );
}

export function isTextCorpusRetrievalQrelsV1(value: unknown): value is TextCorpusRetrievalQrelsV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalQrelsSchemaVersion &&
    value.taskId === "nlp-retrieval" &&
    isNonEmptyString(value.corpusId) &&
    (value.source === undefined || isRetrievalQrelsSource(value.source)) &&
    Array.isArray(value.judgments) &&
    value.judgments.every((judgment) => isRelevanceJudgment(judgment))
  );
}

function isRetrievalQueryEvaluation(value: unknown): value is TextCorpusRetrievalQueryEvaluation {
  return (
    isRecord(value) &&
    isNonEmptyString(value.queryId) &&
    Array.isArray(value.retrieved) &&
    value.retrieved.every((docId) => isNonEmptyString(docId)) &&
    Array.isArray(value.relevant) &&
    value.relevant.every((docId) => isNonEmptyString(docId)) &&
    typeof value.precisionAtK === "number" &&
    Number.isFinite(value.precisionAtK) &&
    typeof value.recallAtK === "number" &&
    Number.isFinite(value.recallAtK) &&
    typeof value.reciprocalRank === "number" &&
    Number.isFinite(value.reciprocalRank) &&
    typeof value.ndcgAtK === "number" &&
    Number.isFinite(value.ndcgAtK)
  );
}

function isRetrievalEvaluationSummary(
  value: unknown,
): value is TextCorpusRetrievalEvaluationSummary {
  return (
    isRecord(value) &&
    typeof value.precisionAtK === "number" &&
    Number.isFinite(value.precisionAtK) &&
    typeof value.recallAtK === "number" &&
    Number.isFinite(value.recallAtK) &&
    typeof value.mrr === "number" &&
    Number.isFinite(value.mrr) &&
    typeof value.ndcgAtK === "number" &&
    Number.isFinite(value.ndcgAtK)
  );
}

export function isTextCorpusRetrievalEvaluationResultV1(
  value: unknown,
): value is TextCorpusRetrievalEvaluationResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalEvaluationSchemaVersion &&
    value.taskId === "nlp-retrieval" &&
    isNonEmptyString(value.corpusId) &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    isRetrievalFormula(value.formula) &&
    typeof value.k === "number" &&
    Number.isInteger(value.k) &&
    value.k >= 1 &&
    typeof value.relevantGradeThreshold === "number" &&
    Number.isInteger(value.relevantGradeThreshold) &&
    value.relevantGradeThreshold >= 1 &&
    typeof value.tolerance === "number" &&
    Number.isFinite(value.tolerance) &&
    value.tolerance >= 0 &&
    isRetrievalEvaluationSummary(value.summary) &&
    Array.isArray(value.queries) &&
    value.queries.every((query) => isRetrievalQueryEvaluation(query))
  );
}

function isTextCorpusCitationWindowV1(value: unknown): value is TextCorpusCitationWindowV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    isNonEmptyString(value.queryId) &&
    isNonEmptyString(value.docId) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.viewId) &&
    isNonEmptyString(value.tokenLayerId) &&
    typeof value.tokenStart === "number" &&
    Number.isInteger(value.tokenStart) &&
    value.tokenStart >= 0 &&
    typeof value.tokenEnd === "number" &&
    Number.isInteger(value.tokenEnd) &&
    value.tokenEnd >= value.tokenStart &&
    typeof value.text === "string" &&
    (value.textPolicy === "source-span" || value.textPolicy === "token-join") &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    isRetrievalFormula(value.formula) &&
    Array.isArray(value.loss) &&
    value.loss.every((entry) => typeof entry === "string")
  );
}

export function isTextCorpusCitationWindowSetV1(value: unknown): value is TextCorpusCitationWindowSetV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    selectionMatchesCorpus(value.selection, value.corpusId) &&
    Array.isArray(value.windows) &&
    value.windows.every((entry) => isTextCorpusCitationWindowV1(entry))
  );
}

function isTextCorpusQuoteGroundingMatchV1(value: unknown): value is TextCorpusQuoteGroundingMatchV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.docId) &&
    isNonEmptyString(value.documentId) &&
    isNonEmptyString(value.viewId) &&
    isNonEmptyString(value.tokenLayerId) &&
    typeof value.tokenStart === "number" &&
    Number.isInteger(value.tokenStart) &&
    value.tokenStart >= 0 &&
    typeof value.tokenEnd === "number" &&
    Number.isInteger(value.tokenEnd) &&
    value.tokenEnd >= value.tokenStart &&
    typeof value.text === "string" &&
    (value.textPolicy === "source-span" || value.textPolicy === "token-join") &&
    Array.isArray(value.loss) &&
    value.loss.every((entry) => typeof entry === "string")
  );
}

export function isTextCorpusQuoteGroundingResultV1(value: unknown): value is TextCorpusQuoteGroundingResultV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    isNonEmptyString(value.docId) &&
    Array.isArray(value.quoteTokens) &&
    value.quoteTokens.every((entry) => typeof entry === "string") &&
    (value.status === "grounded" || value.status === "ambiguous" || value.status === "not-found") &&
    Array.isArray(value.matches) &&
    value.matches.every((entry) => isTextCorpusQuoteGroundingMatchV1(entry))
  );
}

export function createTextCorpusCollection(
  entries: readonly TextCorpusEntry[],
  options: CreateTextCorpusCollectionOptions,
): TextCorpusCollectionV1 {
  if (!isNonEmptyString(options.corpusId)) {
    throw new TypeError("textcorpus collection corpusId must be a non-empty string");
  }

  const seenEntryIds = new Set<string>();
  const seenDocumentIds = new Set<string>();
  const normalizedEntries = [...entries];

  for (const entry of normalizedEntries) {
    validateEntry(entry);
    if (seenEntryIds.has(entry.id)) {
      throw new Error(`duplicate textcorpus entry id: ${entry.id}`);
    }
    seenEntryIds.add(entry.id);
    if (seenDocumentIds.has(entry.document.documentId)) {
      throw new Error(`duplicate textcorpus documentId: ${entry.document.documentId}`);
    }
    seenDocumentIds.add(entry.document.documentId);
  }

  normalizedEntries.sort(compareEntriesById);

  return {
    schemaVersion: textCorpusCollectionSchemaVersion,
    corpusId: options.corpusId,
    policy: {
      tokenSource: textCorpusTokenSource,
      units: "utf16-code-unit",
    },
    entries: normalizedEntries,
  };
}

export function sliceTextCorpusByMetadata(
  collection: TextCorpusCollectionV1,
  filters: TextCorpusMetadataFilters,
): TextCorpusCollectionV1 {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }
  if (!isRecord(filters)) {
    throw new TypeError("textcorpus metadata filters must be a record");
  }

  const normalizedFilters = Object.entries(filters).map(([key, value]) => {
    if (!isNonEmptyString(key)) {
      throw new TypeError("textcorpus metadata filter keys must be non-empty strings");
    }
    if (typeof value === "string") {
      if (!isNonEmptyString(value)) {
        throw new TypeError(`metadata filter ${key} must be a non-empty string`);
      }
      return [key, new Set([value])] as const;
    }
    if (!Array.isArray(value) || value.length === 0 || !value.every((entry) => isNonEmptyString(entry))) {
      throw new TypeError(`metadata filter ${key} must be a non-empty string or string array`);
    }
    return [key, new Set(value)] as const;
  });

  const entries = collection.entries.filter((entry) =>
    normalizedFilters.every(([key, acceptedValues]) => {
      const actualValue = entry.metadata?.[key];
      return actualValue !== undefined && acceptedValues.has(actualValue);
    }),
  );

  return {
    ...collection,
    entries,
  };
}

export function computeTextCorpusConcordance(
  collection: TextCorpusCollectionV1,
  options: TextCorpusConcordanceOptions,
): TextCorpusConcordanceResultV1 {
  if (!isNonEmptyString(options.query)) {
    throw new TypeError("textcorpus concordance query must be a non-empty string");
  }
  const window = nonNegativeInteger(options.window ?? 5, "textcorpus concordance window");
  const { entries, selection } = selectTextCorpusEntries(collection, options.metadataFilters);
  const rows: TextCorpusConcordanceRowV1[] = [];
  for (const { entry, tokens } of entries) {
    for (const [tokenIndex, token] of tokens.entries()) {
      if (token !== options.query) continue;
      rows.push({
        docId: entry.id,
        documentId: entry.document.documentId,
        tokenIndex,
        left: tokens.slice(Math.max(0, tokenIndex - window), tokenIndex),
        match: token,
        right: tokens.slice(tokenIndex + 1, tokenIndex + window + 1),
      });
    }
  }
  rows.sort((left, right) => left.docId.localeCompare(right.docId) || left.tokenIndex - right.tokenIndex);
  return {
    schemaVersion: textCorpusAnalysisSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    query: options.query,
    window,
    rows,
  };
}

export function computeTextCorpusFrequencies(
  collection: TextCorpusCollectionV1,
  options: TextCorpusFrequencyOptions = {},
): TextCorpusFrequencyResultV1 {
  const { entries, selection } = selectTextCorpusEntries(collection, options.metadataFilters);
  const counts = tokenCountMap(entries);
  const documentFrequency = documentFrequencyMapForTerms(entries);
  const totalTokens = selection.tokenCount;
  const rows = [...counts.entries()]
    .sort(([left], [right]) => compareTerms(left, right))
    .map(([term, count]) => ({
      term,
      count,
      documentFrequency: documentFrequency.get(term) ?? 0,
      relativeFrequency: relativeFrequency(count, totalTokens),
    }));
  return {
    schemaVersion: textCorpusAnalysisSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    rows,
  };
}

export function computeTextCorpusNgrams(
  collection: TextCorpusCollectionV1,
  options: TextCorpusNgramOptions,
): TextCorpusNgramResultV1 {
  const n = positiveInteger(options.n, "textcorpus n-gram size");
  const { entries, selection } = selectTextCorpusEntries(collection, options.metadataFilters);
  const counts = new Map<string, number>();
  const documentFrequency = new Map<string, number>();
  let totalNgrams = 0;
  for (const { tokens } of entries) {
    const seenInDocument = new Set<string>();
    for (let tokenIndex = 0; tokenIndex <= tokens.length - n; tokenIndex += 1) {
      const key = ngramKey(tokens.slice(tokenIndex, tokenIndex + n));
      counts.set(key, (counts.get(key) ?? 0) + 1);
      seenInDocument.add(key);
      totalNgrams += 1;
    }
    for (const key of seenInDocument) {
      documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
    }
  }
  const rows = [...counts.entries()]
    .map(([key, count]) => ({
      ngram: splitNgramKey(key),
      count,
      documentFrequency: documentFrequency.get(key) ?? 0,
      relativeFrequency: relativeFrequency(count, totalNgrams),
    }))
    .sort((left, right) => compareStringArrays(left.ngram, right.ngram));
  return {
    schemaVersion: textCorpusAnalysisSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    n,
    rows,
  };
}

export function computeTextCorpusCooccurrences(
  collection: TextCorpusCollectionV1,
  options: TextCorpusCooccurrenceOptions = {},
): TextCorpusCooccurrenceResultV1 {
  const window = positiveInteger(options.window ?? 5, "textcorpus co-occurrence window");
  const { entries, selection } = selectTextCorpusEntries(collection, options.metadataFilters);
  const termCounts = tokenCountMap(entries);
  const pairCounts = new Map<string, number>();
  let totalPairs = 0;
  for (const { tokens } of entries) {
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const left = tokens[tokenIndex] ?? "";
      for (
        let neighborIndex = tokenIndex + 1;
        neighborIndex < tokens.length && neighborIndex <= tokenIndex + window;
        neighborIndex += 1
      ) {
        const right = tokens[neighborIndex] ?? "";
        const key = cooccurrenceKey(left, right);
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        totalPairs += 1;
      }
    }
  }
  const rows = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [term, coTerm] = splitCooccurrenceKey(key);
      const termCount = termCounts.get(term) ?? 0;
      const coTermCount = termCounts.get(coTerm) ?? 0;
      return {
        term,
        coTerm,
        count,
        termCount,
        coTermCount,
        pmiLog2: pmiLog2(count, termCount, coTermCount, totalPairs),
      };
    })
    .sort((left, right) => left.term.localeCompare(right.term) || left.coTerm.localeCompare(right.coTerm));
  return {
    schemaVersion: textCorpusAnalysisSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    window,
    rows,
  };
}

export function computeTextCorpusCollocates(
  collection: TextCorpusCollectionV1,
  options: TextCorpusCollocateOptions,
): TextCorpusCollocateResultV1 {
  if (!isNonEmptyString(options.term)) {
    throw new TypeError("textcorpus collocate term must be a non-empty string");
  }
  const cooccurrences = computeTextCorpusCooccurrences(collection, options);
  const rows = cooccurrences.rows
    .flatMap((row): readonly TextCorpusCooccurrenceRowV1[] => {
      if (row.term === options.term) return [row];
      if (row.coTerm === options.term) {
        return [
          {
            term: options.term,
            coTerm: row.term,
            count: row.count,
            termCount: row.coTermCount,
            coTermCount: row.termCount,
            pmiLog2: row.pmiLog2,
          },
        ];
      }
      return [];
    })
    .sort((left, right) => left.coTerm.localeCompare(right.coTerm));
  return {
    schemaVersion: textCorpusAnalysisSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection: cooccurrences.selection,
    term: options.term,
    window: cooccurrences.window,
    rows,
  };
}

export function computeTextCorpusPairwiseRelations(
  collection: TextCorpusCollectionV1,
  options: TextCorpusPairwiseRelationOptions,
): TextCorpusPairwiseRelationResultV1 {
  const shingleSize = positiveInteger(options.shingleSize, "textcorpus pairwise shingle size");
  const windowSize = positiveInteger(options.windowSize, "textcorpus pairwise window size");
  const nearDuplicateThreshold = options.nearDuplicateThreshold ?? 0.8;
  if (!Number.isFinite(nearDuplicateThreshold) || nearDuplicateThreshold < 0 || nearDuplicateThreshold > 1) {
    throw new TypeError("textcorpus near-duplicate threshold must be between 0 and 1");
  }
  const { entries, selection } = selectTextCorpusEntries(collection, options.metadataFilters);
  const selectedCollection: TextCorpusCollectionV1 = {
    ...collection,
    entries: entries.map(({ entry }) => entry),
  };
  const fingerprintIndex = buildTextCorpusFingerprintIndex(selectedCollection, {
    shingleSize,
    windowSize,
    ...(options.hashAlgorithm ? { hashAlgorithm: options.hashAlgorithm } : {}),
  });
  const rows: TextCorpusPairwiseRelationRowV1[] = [];
  const documentOrder = selection.documentOrder;
  for (let leftIndex = 0; leftIndex < documentOrder.length; leftIndex += 1) {
    const leftDocId = documentOrder[leftIndex] ?? "";
    const leftFingerprints = new Set(fingerprintIndex.docFingerprints[leftDocId] ?? []);
    for (let rightIndex = leftIndex + 1; rightIndex < documentOrder.length; rightIndex += 1) {
      const rightDocId = documentOrder[rightIndex] ?? "";
      const rightFingerprints = new Set(fingerprintIndex.docFingerprints[rightDocId] ?? []);
      const shared = [...leftFingerprints].filter((fingerprint) => rightFingerprints.has(fingerprint));
      if (shared.length === 0) continue;
      const unionCount = new Set([...leftFingerprints, ...rightFingerprints]).size;
      const jaccard = unionCount === 0 ? 0 : shared.length / unionCount;
      const relation: TextCorpusPairwiseRelationLabel =
        jaccard === 1 ? "exact-duplicate" : jaccard >= nearDuplicateThreshold ? "near-duplicate" : "shared-reuse";
      rows.push({
        leftDocId,
        rightDocId,
        relation,
        sharedFingerprintCount: shared.length,
        leftFingerprintCount: leftFingerprints.size,
        rightFingerprintCount: rightFingerprints.size,
        jaccard,
      });
    }
  }
  rows.sort((left, right) => left.leftDocId.localeCompare(right.leftDocId) || left.rightDocId.localeCompare(right.rightDocId));
  return {
    schemaVersion: textCorpusAnalysisSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    shingleSize,
    windowSize,
    hashAlgorithm: fingerprintIndex.hashAlgorithm,
    nearDuplicateThreshold,
    rows,
  };
}

export function buildTextCorpusFingerprintIndex(
  collection: TextCorpusCollectionV1,
  options: TextCorpusFingerprintIndexOptions,
): TextCorpusFingerprintIndex {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }

  const shingleSize = Math.max(1, Math.floor(options.shingleSize));
  const windowSize = Math.max(1, Math.floor(options.windowSize));
  const hashAlgorithm = options.hashAlgorithm ?? "fnv1a64-utf16le";
  const maxDocs = options.maxDocs ?? Number.POSITIVE_INFINITY;
  const maxFingerprintsPerDoc = options.maxFingerprintsPerDoc ?? Number.POSITIVE_INFINITY;
  const maxIndexEntries = options.maxIndexEntries ?? Number.POSITIVE_INFINITY;

  const index = new Map<string, string[]>();
  const docFingerprints: Record<string, readonly string[]> = {};
  let truncated = false;
  let processedDocs = 0;

  for (const entry of collection.entries) {
    if (processedDocs >= maxDocs) {
      truncated = true;
      break;
    }
    processedDocs += 1;

    const tokenTexts = getEntryTokenTexts(entry);
    const shingleHashes: bigint[] = [];

    for (let tokenIndex = 0; tokenIndex <= tokenTexts.length - shingleSize; tokenIndex += 1) {
      const shingleText = tokenTexts.slice(tokenIndex, tokenIndex + shingleSize).join("\u001f");
      shingleHashes.push(hash64Text(shingleText, { algo: hashAlgorithm }));
    }

    const selectedIndexes = selectFingerprintIndexes(
      shingleHashes,
      windowSize,
      maxFingerprintsPerDoc,
    );
    const hashesForDocument: string[] = [];

    for (const selectedIndex of selectedIndexes) {
      const hashValue = shingleHashes[selectedIndex];
      if (hashValue === undefined) continue;
      const hashHex = formatU64Hex(hashValue);
      hashesForDocument.push(hashHex);

      let bucket = index.get(hashHex);
      if (!bucket) {
        if (index.size >= maxIndexEntries) {
          truncated = true;
          continue;
        }
        bucket = [];
        index.set(hashHex, bucket);
      }

      if (bucket[bucket.length - 1] !== entry.id) {
        bucket.push(entry.id);
      }
    }

    docFingerprints[entry.id] = hashesForDocument;
  }

  const normalizedIndex: Record<string, readonly string[]> = {};
  for (const hashHex of Array.from(index.keys()).sort()) {
    normalizedIndex[hashHex] = (index.get(hashHex) ?? []).slice();
  }

  return {
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    hashAlgorithm,
    shingleSize,
    windowSize,
    docFingerprints,
    index: normalizedIndex,
    ...(truncated ? { truncated: true } : {}),
  };
}

function uniqueTfidfFormulas(formulas: readonly TextCorpusTfidfFormulaId[] | undefined): readonly TextCorpusTfidfFormulaId[] {
  const requested = formulas ?? [textCorpusTfidfSklearnSmoothRawFormula];
  const output: TextCorpusTfidfFormulaId[] = [];
  for (const formula of requested) {
    if (!isTfidfFormula(formula)) throw new TypeError(`unsupported textcorpus TF-IDF formula: ${String(formula)}`);
    if (!output.includes(formula)) output.push(formula);
  }
  if (!output.includes(textCorpusTfidfSklearnSmoothRawFormula)) output.unshift(textCorpusTfidfSklearnSmoothRawFormula);
  return output;
}

function uniqueBm25Formulas(formulas: readonly TextCorpusBm25FormulaId[] | undefined): readonly TextCorpusBm25FormulaId[] {
  const requested = formulas ?? [textCorpusBm25OkapiFormula];
  const output: TextCorpusBm25FormulaId[] = [];
  for (const formula of requested) {
    if (!isBm25ScoringFormula(formula)) throw new TypeError(`unsupported textcorpus BM25 formula: ${String(formula)}`);
    if (!output.includes(formula)) output.push(formula);
  }
  if (!output.includes(textCorpusBm25OkapiFormula)) output.unshift(textCorpusBm25OkapiFormula);
  return output;
}

function l2NormalizeTermValues(values: readonly TextCorpusTermValue[]): readonly TextCorpusTermValue[] {
  const norm = Math.sqrt(values.reduce((sum, entry) => sum + entry.value ** 2, 0));
  if (norm === 0) return [];
  return values.map((entry) => ({ term: entry.term, value: entry.value / norm }));
}

export function computeTextCorpusScoring(
  collection: TextCorpusCollectionV1,
  options: TextCorpusScoringOptions = {},
): TextCorpusScoringResultV1 {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }

  const queries = options.queries ?? [];
  validateQueries(queries);
  const tfidfFormulas = uniqueTfidfFormulas(options.tfidfFormulas);
  const bm25Formulas = uniqueBm25Formulas(options.bm25Formulas);
  const { entries, selection } = selectTextCorpusEntries(collection);
  const documentOrder = entries.map(({ entry }) => entry.id);
  const tokenLists = entries.map(({ tokens }) => tokens);
  const termCounts = tokenLists.map((tokens) => countTerms(tokens));
  const termSet = new Set<string>();
  const documentFrequency = new Map<string, number>();

  for (const counts of termCounts) {
    for (const term of counts.keys()) {
      termSet.add(term);
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const termOrder = [...termSet].sort(compareTerms);
  const documentCount = entries.length;
  const averageDocumentLength =
    tokenLists.reduce((sum, tokens) => sum + tokens.length, 0) / Math.max(1, documentCount);

  const documents = entries.map(({ entry }, index) => {
    const counts = termCounts[index] ?? new Map<string, number>();
    const tf: TextCorpusTermValue[] = [];
    const tfidf: TextCorpusTermValue[] = [];
    for (const term of termOrder) {
      const count = counts.get(term) ?? 0;
      if (count === 0) continue;
      tf.push({ term, value: count });
      const df = documentFrequency.get(term) ?? 0;
      tfidf.push({ term, value: count * smoothSklearnIdf(documentCount, df) });
    }
    const tfidfVariants = tfidfFormulas.map((formula) => ({
      formula,
      values: formula === textCorpusTfidfSklearnSmoothL2Formula ? l2NormalizeTermValues(tfidf) : tfidf,
    }));
    return {
      id: entry.id,
      length: tokenLists[index]?.length ?? 0,
      tf,
      tfidf,
      ...(tfidfFormulas.length > 1 ? { tfidfVariants } : {}),
    };
  });

  const queryScores = queries.map((query) => ({
    id: query.id,
    bm25: entries.map(({ entry }, index) => {
      const counts = termCounts[index] ?? new Map<string, number>();
      const documentLength = tokenLists[index]?.length ?? 0;
      const score = query.tokens.reduce((sum, term) => {
        const df = documentFrequency.get(term) ?? 0;
        const idf = bm25OkapiIdf(documentCount, df);
        return sum + bm25OkapiScore(counts.get(term) ?? 0, documentLength, averageDocumentLength, idf);
      }, 0);
      return {
        docId: entry.id,
        score,
      };
    }),
    ...(bm25Formulas.length > 1
      ? {
          bm25Variants: bm25Formulas.map((formula) => ({
            formula,
            scores: entries.map(({ entry }, index) => {
              const counts = termCounts[index] ?? new Map<string, number>();
              const documentLength = tokenLists[index]?.length ?? 0;
              const parameters = bm25OkapiParameters(formula);
              const score = query.tokens.reduce((sum, term) => {
                const df = documentFrequency.get(term) ?? 0;
                const idf = bm25OkapiIdf(documentCount, df);
                return sum + bm25OkapiScore(counts.get(term) ?? 0, documentLength, averageDocumentLength, idf, parameters);
              }, 0);
              return {
                docId: entry.id,
                score,
              };
            }),
          })),
        }
      : {}),
  }));

  return {
    schemaVersion: textCorpusScoringSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    formulaSet: [
      textCorpusTfRawCountFormula,
      textCorpusDfDocumentCountFormula,
      ...tfidfFormulas,
      ...bm25Formulas,
    ],
    documentOrder,
    termOrder,
    tolerance: options.tolerance ?? 1e-12,
    documents,
    queries: queryScores,
  };
}

function normalizeQueryTokens(raw: string): readonly string[] {
  return raw
    .normalize("NFC")
    .toLocaleLowerCase("und")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((token) => token.length > 0);
}

type QueryToken =
  | { readonly type: "atom"; readonly clause: TextCorpusParsedQueryClause }
  | { readonly type: "operator"; readonly value: "AND" | "OR" | "NOT" }
  | { readonly type: "unary"; readonly value: "+" | "-" }
  | { readonly type: "paren"; readonly value: "(" | ")" };

function querySyntaxError(message: string): SyntaxError {
  return new SyntaxError(`textcorpus query syntax error: ${message}`);
}

function normalizeQueryField(raw: string): string {
  const field = normalizeQueryTokens(raw)[0];
  if (!isNonEmptyString(field)) throw querySyntaxError("field name must contain a token");
  return field;
}

function makeQueryClause(
  value: string,
  options: {
    readonly operator?: TextCorpusQueryClauseOperator;
    readonly field?: string;
    readonly proximity?: number;
  } = {},
): TextCorpusParsedQueryClause | undefined {
  const terms = normalizeQueryTokens(value);
  if (terms.length === 0) return undefined;
  const operator = options.operator ?? "should";
  if (terms.length === 1 && options.proximity === undefined) {
    return {
      term: terms[0] as string,
      terms,
      kind: "term",
      operator,
      ...(options.field ? { field: options.field } : {}),
    };
  }
  return {
    term: terms.join(" "),
    terms,
    kind: options.proximity === undefined ? "phrase" : "proximity",
    operator,
    ...(options.field ? { field: options.field } : {}),
    ...(options.proximity === undefined ? {} : { proximity: options.proximity }),
  };
}

function readQuotedQueryValue(raw: string, start: number): {
  readonly value: string;
  readonly end: number;
  readonly proximity?: number;
} {
  let cursor = start + 1;
  let value = "";
  while (cursor < raw.length) {
    const char = raw[cursor] as string;
    if (char === "\"") {
      cursor += 1;
      let proximity: number | undefined;
      if (raw[cursor] === "~") {
        cursor += 1;
        const numberStart = cursor;
        while (cursor < raw.length && /[0-9]/u.test(raw[cursor] as string)) cursor += 1;
        if (cursor === numberStart) throw querySyntaxError("proximity phrase must include an integer distance");
        proximity = Number.parseInt(raw.slice(numberStart, cursor), 10);
      }
      return { value, end: cursor, ...(proximity === undefined ? {} : { proximity }) };
    }
    value += char;
    cursor += 1;
  }
  throw querySyntaxError("unclosed quoted phrase");
}

function readQueryWord(raw: string, start: number): { readonly value: string; readonly end: number } {
  let cursor = start;
  while (cursor < raw.length && !/\s|\(|\)|"/u.test(raw[cursor] as string)) cursor += 1;
  return { value: raw.slice(start, cursor), end: cursor };
}

function scanQueryTokens(raw: string): {
  readonly tokens: readonly QueryToken[];
  readonly usesBooleanSyntax: boolean;
} {
  const tokens: QueryToken[] = [];
  let usesBooleanSyntax = false;
  let cursor = 0;
  while (cursor < raw.length) {
    const char = raw[cursor] as string;
    if (/\s/u.test(char)) {
      cursor += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      usesBooleanSyntax = true;
      tokens.push({ type: "paren", value: char });
      cursor += 1;
      continue;
    }
    if (char === "+" || char === "-") {
      tokens.push({ type: "unary", value: char });
      cursor += 1;
      continue;
    }

    let field: string | undefined;
    if (char !== "\"") {
      const prefix = readQueryWord(raw, cursor);
      const fieldSeparator = prefix.value.indexOf(":");
      if (fieldSeparator > 0) {
        field = normalizeQueryField(prefix.value.slice(0, fieldSeparator));
        const rest = prefix.value.slice(fieldSeparator + 1);
        if (rest.length > 0) {
          const clause = makeQueryClause(rest, { field });
          if (clause !== undefined) tokens.push({ type: "atom", clause });
          cursor = prefix.end;
          continue;
        }
        cursor += fieldSeparator + 1;
      }
    }

    if (raw[cursor] === "\"") {
      const quoted = readQuotedQueryValue(raw, cursor);
      const clause = makeQueryClause(quoted.value, {
        ...(field === undefined ? {} : { field }),
        ...(quoted.proximity === undefined ? {} : { proximity: quoted.proximity }),
      });
      if (clause !== undefined) tokens.push({ type: "atom", clause });
      cursor = quoted.end;
      continue;
    }

    const word = readQueryWord(raw, cursor);
    const upper = word.value.toLocaleUpperCase("und");
    if (upper === "AND" || upper === "OR" || upper === "NOT") {
      usesBooleanSyntax = true;
      tokens.push({ type: "operator", value: upper });
    } else {
      const clause = makeQueryClause(word.value, field === undefined ? {} : { field });
      if (clause !== undefined) tokens.push({ type: "atom", clause });
    }
    cursor = word.end;
  }
  return { tokens, usesBooleanSyntax };
}

function queryExpressionFromClause(clause: TextCorpusParsedQueryClause): TextCorpusQueryExpression {
  return { kind: "clause", clause };
}

function applyQueryOperator(
  clause: TextCorpusParsedQueryClause,
  operator: TextCorpusQueryClauseOperator,
): TextCorpusParsedQueryClause {
  return { ...clause, operator };
}

function collectExpressionClauses(expression: TextCorpusQueryExpression, output: TextCorpusParsedQueryClause[] = []): TextCorpusParsedQueryClause[] {
  if (expression.kind === "clause" && expression.clause !== undefined) {
    output.push(expression.clause);
    return output;
  }
  for (const child of expression.children ?? []) collectExpressionClauses(child, output);
  return output;
}

function parseQueryExpression(tokens: readonly QueryToken[]): TextCorpusQueryExpression | undefined {
  let cursor = 0;

  function peek(): QueryToken | undefined {
    return tokens[cursor];
  }

  function consume(): QueryToken | undefined {
    const token = tokens[cursor];
    cursor += 1;
    return token;
  }

  function parsePrimary(): TextCorpusQueryExpression {
    const token = consume();
    if (token === undefined) throw querySyntaxError("expected query clause");
    if (token.type === "unary") {
      const operator = token.value === "+" ? "must" : "must-not";
      const child = parsePrimary();
      if (child.kind === "clause" && child.clause !== undefined) {
        return queryExpressionFromClause(applyQueryOperator(child.clause, operator));
      }
      return token.value === "-" ? { kind: "not", children: [child] } : child;
    }
    if (token.type === "operator" && token.value === "NOT") {
      return { kind: "not", children: [parsePrimary()] };
    }
    if (token.type === "paren" && token.value === "(") {
      const expression = parseOr();
      const close = consume();
      if (close?.type !== "paren" || close.value !== ")") throw querySyntaxError("unclosed parenthesized expression");
      return expression;
    }
    if (token.type === "atom") return queryExpressionFromClause(token.clause);
    throw querySyntaxError("unexpected query token");
  }

  function parseAnd(): TextCorpusQueryExpression {
    let left = parsePrimary();
    while (peek()?.type === "operator" && (peek() as { readonly value?: string }).value === "AND") {
      consume();
      left = { kind: "and", children: [left, parsePrimary()] };
    }
    return left;
  }

  function nextTokenStartsImplicitOr(): boolean {
    const token = peek();
    return token?.type === "atom" || token?.type === "unary" || (token?.type === "paren" && token.value === "(");
  }

  function parseOr(): TextCorpusQueryExpression {
    let left = parseAnd();
    while ((peek()?.type === "operator" && (peek() as { readonly value?: string }).value === "OR") || nextTokenStartsImplicitOr()) {
      if (peek()?.type === "operator") consume();
      left = { kind: "or", children: [left, parseAnd()] };
    }
    return left;
  }

  if (tokens.length === 0) return undefined;
  const expression = parseOr();
  if (cursor !== tokens.length) throw querySyntaxError("unexpected trailing query token");
  return expression;
}

function parseQueryClauses(raw: string): {
  readonly clauses: readonly TextCorpusParsedQueryClause[];
  readonly expression?: TextCorpusQueryExpression;
  readonly syntax: TextCorpusQuerySyntax;
} {
  const scanned = scanQueryTokens(raw);
  const expression = parseQueryExpression(scanned.tokens);
  const clauses = expression === undefined ? [] : collectExpressionClauses(expression);
  return {
    clauses,
    ...(expression === undefined ? {} : { expression }),
    syntax: scanned.usesBooleanSyntax ? "boolean" : "terms",
  };
}

export function parseTextCorpusQuery(
  raw: string,
  options: TextCorpusParseQueryOptions = {},
): TextCorpusParsedQuery {
  if (typeof raw !== "string") {
    throw new TypeError("textcorpus query raw text must be a string");
  }
  const parsed = parseQueryClauses(raw);
  const clauses = parsed.clauses;
  const tokens = clauses.flatMap((clause) => clause.terms ?? [clause.term]);
  const id = options.id ?? `query:${tokens.join("-") || "empty"}`;
  if (!isNonEmptyString(id)) {
    throw new TypeError("textcorpus parsed query id must be a non-empty string");
  }
  return {
    id,
    raw,
    tokens,
    clauses,
    ...(parsed.expression === undefined ? {} : { expression: parsed.expression }),
    syntax: parsed.syntax,
  };
}

export function buildTextCorpusRetrievalIndex(
  collection: TextCorpusCollectionV1,
  options: TextCorpusRetrievalBuildOptions = {},
): TextCorpusRetrievalIndexV1 {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }

  const formula = options.formula ?? textCorpusBm25OkapiFormula;
  if (!isRetrievalFormula(formula)) {
    throw new TypeError("textcorpus retrieval formula must be a known formula id");
  }
  const fieldSpecs =
    formula === textCorpusBm25fFormula ? normalizeRetrievalFieldSpecs(options.fields) : [];
  const { entries, selection } = selectTextCorpusEntries(collection);

  const documents = entries.map(({ entry, tokens }) => {
    const fields = fieldSpecs.map((fieldSpec) => {
      const fieldTokensForEntry = retrievalFieldTokens(entry, tokens, fieldSpec);
      return {
        id: fieldSpec.id,
        tokens: fieldTokensForEntry,
        length: fieldTokensForEntry.length,
      };
    });
    return {
      id: entry.id,
      length: tokens.length,
      tokens,
      ...(fields.length > 0 ? { fields } : {}),
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
    };
  });
  const documentOrder = documents.map((document) => document.id);
  const postingsByTerm = new Map<string, Map<string, number[]>>();
  const fieldPostingsByField = new Map<string, Map<string, Map<string, number[]>>>();

  for (const document of documents) {
    for (const [position, token] of document.tokens.entries()) {
      let postings = postingsByTerm.get(token);
      if (postings === undefined) {
        postings = new Map<string, number[]>();
        postingsByTerm.set(token, postings);
      }
      const positions = postings.get(document.id) ?? [];
      positions.push(position);
      postings.set(document.id, positions);
    }
    for (const field of document.fields ?? []) {
      let postingsByTermForField = fieldPostingsByField.get(field.id);
      if (postingsByTermForField === undefined) {
        postingsByTermForField = new Map<string, Map<string, number[]>>();
        fieldPostingsByField.set(field.id, postingsByTermForField);
      }
      for (const [position, token] of field.tokens.entries()) {
        let postings = postingsByTermForField.get(token);
        if (postings === undefined) {
          postings = new Map<string, number[]>();
          postingsByTermForField.set(token, postings);
        }
        const positions = postings.get(document.id) ?? [];
        positions.push(position);
        postings.set(document.id, positions);
      }
    }
  }

  const fieldTermSet = new Set<string>();
  for (const fieldIndex of fieldPostingsByField.values()) {
    for (const term of fieldIndex.keys()) fieldTermSet.add(term);
  }
  const termOrder = [...new Set([...postingsByTerm.keys(), ...fieldTermSet])].sort(compareTerms);
  const invertedIndex: Record<string, readonly TextCorpusPosting[]> = {};
  for (const term of termOrder) {
    const postings = postingsByTerm.get(term) ?? new Map<string, number[]>();
    invertedIndex[term] = [...postings.entries()]
      .sort(([leftDocId], [rightDocId]) => leftDocId.localeCompare(rightDocId))
      .map(([docId, positions]) => ({ docId, positions }));
  }
  const fieldInvertedIndex: Record<string, Readonly<Record<string, readonly TextCorpusPosting[]>>> = {};
  for (const fieldSpec of fieldSpecs) {
    const fieldIndex = fieldPostingsByField.get(fieldSpec.id) ?? new Map<string, Map<string, number[]>>();
    const normalizedFieldIndex: Record<string, readonly TextCorpusPosting[]> = {};
    for (const term of [...fieldIndex.keys()].sort(compareTerms)) {
      const postings = fieldIndex.get(term) ?? new Map<string, number[]>();
      normalizedFieldIndex[term] = [...postings.entries()]
        .sort(([leftDocId], [rightDocId]) => leftDocId.localeCompare(rightDocId))
        .map(([docId, positions]) => ({ docId, positions }));
    }
    fieldInvertedIndex[fieldSpec.id] = normalizedFieldIndex;
  }

  const averageDocumentLength =
    documents.reduce((sum, document) => sum + document.length, 0) / Math.max(1, documents.length);
  const fieldAverageLengths: Record<string, number> = {};
  for (const fieldSpec of fieldSpecs) {
    fieldAverageLengths[fieldSpec.id] =
      documents.reduce((sum, document) => {
        const field = document.fields?.find((entry) => entry.id === fieldSpec.id);
        return sum + (field?.length ?? 0);
      }, 0) / Math.max(1, documents.length);
  }

  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    formula,
    documentOrder,
    termOrder,
    averageDocumentLength,
    documents,
    invertedIndex,
    ...(fieldSpecs.length > 0
      ? {
          fieldOrder: fieldSpecs.map((fieldSpec) => fieldSpec.id),
          fieldSpecs,
          fieldAverageLengths,
          fieldInvertedIndex,
        }
      : {}),
  };
}

function normalizeRetrievalFieldSpecs(
  specs: readonly TextCorpusRetrievalFieldSpec[] | undefined,
): readonly TextCorpusRetrievalNormalizedFieldSpec[] {
  const rawSpecs =
    specs ?? ([{ id: "body", source: "tokens", weight: 1, b: 0.75 }] as const);
  const seen = new Set<string>();
  return rawSpecs.map((spec) => {
    if (!isNonEmptyString(spec.id)) {
      throw new TypeError("textcorpus retrieval field id must be a non-empty string");
    }
    if (seen.has(spec.id)) {
      throw new Error(`duplicate textcorpus retrieval field id: ${spec.id}`);
    }
    seen.add(spec.id);
    if (spec.source !== "tokens" && spec.source !== "metadata") {
      throw new TypeError(`textcorpus retrieval field ${spec.id} source must be tokens or metadata`);
    }
    const metadataKey = spec.source === "metadata" ? spec.metadataKey ?? spec.id : undefined;
    if (spec.source === "metadata" && !isNonEmptyString(metadataKey)) {
      throw new TypeError(`textcorpus retrieval metadata field ${spec.id} must name a metadata key`);
    }
    const weight = spec.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new TypeError(`textcorpus retrieval field ${spec.id} weight must be a positive number`);
    }
    const b = spec.b ?? 0.75;
    if (!Number.isFinite(b) || b < 0 || b > 1) {
      throw new TypeError(`textcorpus retrieval field ${spec.id} b must be between 0 and 1`);
    }
    return {
      id: spec.id,
      source: spec.source,
      ...(metadataKey ? { metadataKey } : {}),
      weight,
      b,
    };
  });
}

function retrievalFieldTokens(
  entry: TextCorpusEntry,
  bodyTokens: readonly string[],
  fieldSpec: TextCorpusRetrievalNormalizedFieldSpec,
): readonly string[] {
  if (fieldSpec.source === "tokens") return bodyTokens;
  const metadataKey = fieldSpec.metadataKey ?? fieldSpec.id;
  const metadataValue = entry.metadata?.[metadataKey];
  return metadataValue === undefined ? [] : normalizeQueryTokens(metadataValue);
}

function uniqueQueryTokens(tokens: readonly string[]): readonly string[] {
  return [...new Set(tokens)].sort(compareTerms);
}

function validateRetrievalQrels(qrels: TextCorpusRetrievalQrelsV1): void {
  if (!isTextCorpusRetrievalQrelsV1(qrels)) {
    throw new TypeError("textcorpus retrieval qrels must satisfy TextCorpusRetrievalQrelsV1");
  }
  const seenQueries = new Set<string>();
  for (const judgment of qrels.judgments) {
    if (seenQueries.has(judgment.queryId)) {
      throw new Error(`duplicate textcorpus qrels query id: ${judgment.queryId}`);
    }
    seenQueries.add(judgment.queryId);
    const seenDocs = new Set<string>();
    for (const rating of judgment.ratings) {
      if (seenDocs.has(rating.docId)) {
        throw new Error(`duplicate textcorpus qrels doc id: ${judgment.queryId}/${rating.docId}`);
      }
      seenDocs.add(rating.docId);
    }
  }
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function discountedGainAtK(grades: readonly number[], k: number): number {
  return grades.slice(0, k).reduce((sum, grade, index) => {
    const rank = index + 1;
    const gain = 2 ** grade - 1;
    return sum + gain / Math.log2(rank + 1);
  }, 0);
}

function evaluateQueryRetrieval(
  result: TextCorpusRetrievalResultV1,
  judgment: TextCorpusRelevanceJudgment,
  k: number,
  relevantGradeThreshold: number,
): TextCorpusRetrievalQueryEvaluation {
  const resultForQuery = result.results.find((entry) => entry.query.id === judgment.queryId);
  const retrieved = (resultForQuery?.hits ?? []).slice(0, k).map((hit) => hit.docId);
  const gradeByDoc = new Map(judgment.ratings.map((rating) => [rating.docId, rating.grade]));
  const relevant = judgment.ratings
    .filter((rating) => rating.grade >= relevantGradeThreshold)
    .map((rating) => rating.docId)
    .sort((left, right) => left.localeCompare(right));
  const relevantSet = new Set(relevant);
  const relevantRetrievedCount = retrieved.filter((docId) => relevantSet.has(docId)).length;
  const precisionAtK = relevantRetrievedCount / k;
  const recallAtK = relevant.length === 0 ? 0 : relevantRetrievedCount / relevant.length;
  const firstRelevantIndex = retrieved.findIndex((docId) => relevantSet.has(docId));
  const reciprocalRank = firstRelevantIndex === -1 ? 0 : 1 / (firstRelevantIndex + 1);
  const actualGrades = retrieved.map((docId) => gradeByDoc.get(docId) ?? 0);
  const idealGrades = judgment.ratings
    .map((rating) => rating.grade)
    .sort((left, right) => right - left);
  const idealDcg = discountedGainAtK(idealGrades, k);
  const ndcgAtK = idealDcg === 0 ? 0 : discountedGainAtK(actualGrades, k) / idealDcg;
  return {
    queryId: judgment.queryId,
    retrieved,
    relevant,
    precisionAtK,
    recallAtK,
    reciprocalRank,
    ndcgAtK,
  };
}

function scoringTokens(query: TextCorpusParsedQuery): readonly string[] {
  return query.clauses
    .filter((clause) => clause.operator !== "must-not" && clause.field === undefined)
    .flatMap((clause) => clause.terms ?? [clause.term]);
}

interface TextCorpusRetrievalScoringClause {
  readonly term: string;
  readonly field?: string;
}

function scoringClauses(
  index: TextCorpusRetrievalIndexV1,
  query: TextCorpusParsedQuery,
): readonly TextCorpusRetrievalScoringClause[] {
  if (index.formula === textCorpusBm25OkapiFormula) {
    return scoringTokens(query).map((term) => ({ term }));
  }
  const fieldSet = new Set(index.fieldOrder ?? []);
  return query.clauses
    .filter((clause) => clause.operator !== "must-not")
    .flatMap((clause) => {
      const terms = clause.terms ?? [clause.term];
      if (clause.field === undefined) return terms.map((term) => ({ term }));
      if (!fieldSet.has(clause.field)) return [];
      return terms.map((term) => ({ term, field: clause.field }));
    });
}

function positionsForTerm(index: TextCorpusRetrievalIndexV1, term: string, docId: string): readonly number[] {
  return index.invertedIndex[term]?.find((posting) => posting.docId === docId)?.positions ?? [];
}

function positionsForFieldTerm(
  index: TextCorpusRetrievalIndexV1,
  field: string,
  term: string,
  docId: string,
): readonly number[] {
  return index.fieldInvertedIndex?.[field]?.[term]?.find((posting) => posting.docId === docId)?.positions ?? [];
}

function metadataTokens(document: TextCorpusRetrievalDocument, field: string): readonly string[] {
  const value = document.metadata?.[field];
  return value === undefined ? [] : normalizeQueryTokens(value);
}

function fieldTokens(document: TextCorpusRetrievalDocument, field: string): readonly string[] {
  return document.fields?.find((entry) => entry.id === field)?.tokens ?? [];
}

function includesTermSequence(tokens: readonly string[], terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  if (terms.length > tokens.length) return false;
  for (let start = 0; start <= tokens.length - terms.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < terms.length; offset += 1) {
      if (tokens[start + offset] !== terms[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function includesTermsWithinProximity(
  tokens: readonly string[],
  terms: readonly string[],
  proximity: number,
): boolean {
  if (terms.length <= 1) return terms.every((term) => tokens.includes(term));
  const termPositions = terms.map((term) =>
    tokens.flatMap((token, index) => (token === term ? [index] : [])),
  );
  if (termPositions.some((positions) => positions.length === 0)) return false;
  for (const firstPosition of termPositions[0] ?? []) {
    let previous = firstPosition;
    let matched = true;
    for (let termIndex = 1; termIndex < termPositions.length; termIndex += 1) {
      const next = (termPositions[termIndex] ?? []).find(
        (position) => position > previous && position - previous - 1 <= proximity,
      );
      if (next === undefined) {
        matched = false;
        break;
      }
      previous = next;
    }
    if (matched) return true;
  }
  return false;
}

function documentTokensForClause(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  clause: TextCorpusParsedQueryClause,
): readonly string[] {
  if (clause.field !== undefined) {
    if ((index.fieldOrder ?? []).includes(clause.field)) return fieldTokens(document, clause.field);
    return metadataTokens(document, clause.field);
  }
  return document.tokens;
}

function documentMatchesClause(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  clause: TextCorpusParsedQueryClause,
): boolean {
  const terms = clause.terms ?? [clause.term];
  const tokens = documentTokensForClause(index, document, clause);
  if (clause.kind === "phrase") return includesTermSequence(tokens, terms);
  if (clause.kind === "proximity") {
    return includesTermsWithinProximity(tokens, terms, clause.proximity ?? 0);
  }
  return terms.every((term) => tokens.includes(term));
}

function documentMatchesExpression(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  expression: TextCorpusQueryExpression,
): boolean {
  if (expression.kind === "clause") {
    if (expression.clause === undefined) return true;
    const matched = documentMatchesClause(index, document, expression.clause);
    return expression.clause.operator === "must-not" ? !matched : matched;
  }
  if (expression.kind === "not") {
    return !(expression.children ?? []).some((child) => documentMatchesExpression(index, document, child));
  }
  if (expression.kind === "and") {
    return (expression.children ?? []).every((child) => documentMatchesExpression(index, document, child));
  }
  return (expression.children ?? []).some((child) => documentMatchesExpression(index, document, child));
}

function documentMatchesQuery(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  query: TextCorpusParsedQuery,
): boolean {
  if (query.syntax === "boolean" && query.expression !== undefined) {
    return documentMatchesExpression(index, document, query.expression);
  }
  const mustClauses = query.clauses.filter((clause) => clause.operator === "must");
  if (!mustClauses.every((clause) => documentMatchesClause(index, document, clause))) return false;
  const prohibitedClauses = query.clauses.filter((clause) => clause.operator === "must-not");
  if (prohibitedClauses.some((clause) => documentMatchesClause(index, document, clause))) return false;
  const shouldClauses = query.clauses.filter((clause) => clause.operator === "should");
  const shouldFieldClauses = shouldClauses.filter((clause) => clause.field !== undefined);
  if (!shouldFieldClauses.every((clause) => documentMatchesClause(index, document, clause))) {
    return false;
  }
  const shouldTermClauses = shouldClauses.filter((clause) => clause.field === undefined);
  if (mustClauses.length === 0 && shouldTermClauses.length > 0) {
    return shouldTermClauses.some((clause) => documentMatchesClause(index, document, clause));
  }
  return true;
}

function createRetrievalSnippet(
  document: TextCorpusRetrievalDocument,
  queryTokens: readonly string[],
  windowSize: number,
): TextCorpusRetrievalSnippet | undefined {
  const queryTokenSet = new Set(queryTokens);
  const matchedPositions = document.tokens.flatMap((token, position) => (queryTokenSet.has(token) ? [position] : []));
  if (matchedPositions.length === 0) return undefined;
  const effectiveWindow = Math.max(0, Math.floor(windowSize));
  const tokenStart = Math.max(0, Math.min(...matchedPositions) - effectiveWindow);
  const tokenEnd = Math.min(document.tokens.length, Math.max(...matchedPositions) + effectiveWindow + 1);
  const snippetTokens = document.tokens.slice(tokenStart, tokenEnd);
  return {
    text: snippetTokens.join(" "),
    tokenStart,
    tokenEnd,
    highlightedTerms: [...new Set(snippetTokens.filter((token) => queryTokenSet.has(token)))].sort(compareTerms),
  };
}

function scoreRetrievalDocument(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  clauses: readonly TextCorpusRetrievalScoringClause[],
): {
  readonly score: number;
  readonly explain: readonly TextCorpusRetrievalTermExplanation[];
} {
  if (index.formula === textCorpusBm25fFormula) {
    const explain = uniqueScoringClauses(clauses).map((clause) =>
      scoreBm25fRetrievalClause(index, document, clause),
    );
    return {
      score: explain.reduce((sum, entry) => sum + entry.contribution, 0),
      explain,
    };
  }

  const explain = uniqueQueryTokens(clauses.map((clause) => clause.term)).map((term) => {
    const positions = positionsForTerm(index, term, document.id);
    const tf = positions.length;
    const df = index.invertedIndex[term]?.length ?? 0;
    const idf = bm25OkapiIdf(index.documents.length, df);
    const contribution = bm25OkapiScore(tf, document.length, index.averageDocumentLength, idf);
    return { term, tf, df, idf, contribution };
  });
  return {
    score: explain.reduce((sum, entry) => sum + entry.contribution, 0),
    explain,
  };
}

function uniqueScoringClauses(
  clauses: readonly TextCorpusRetrievalScoringClause[],
): readonly TextCorpusRetrievalScoringClause[] {
  const byKey = new Map<string, TextCorpusRetrievalScoringClause>();
  for (const clause of clauses) {
    const key = `${clause.field ?? ""}\u0000${clause.term}`;
    if (!byKey.has(key)) byKey.set(key, clause);
  }
  return [...byKey.values()].sort(
    (left, right) =>
      (left.field ?? "").localeCompare(right.field ?? "") ||
      left.term.localeCompare(right.term),
  );
}

function fieldSpecById(
  index: TextCorpusRetrievalIndexV1,
  fieldId: string,
): TextCorpusRetrievalNormalizedFieldSpec | undefined {
  return index.fieldSpecs?.find((fieldSpec) => fieldSpec.id === fieldId);
}

function fieldLength(document: TextCorpusRetrievalDocument, fieldId: string): number {
  return document.fields?.find((field) => field.id === fieldId)?.length ?? 0;
}

function fieldDocumentFrequency(
  index: TextCorpusRetrievalIndexV1,
  term: string,
  field?: string,
): number {
  if (field !== undefined) return index.fieldInvertedIndex?.[field]?.[term]?.length ?? 0;
  const docIds = new Set<string>();
  for (const fieldId of index.fieldOrder ?? []) {
    for (const posting of index.fieldInvertedIndex?.[fieldId]?.[term] ?? []) {
      docIds.add(posting.docId);
    }
  }
  return docIds.size;
}

function scoreBm25fRetrievalClause(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  clause: TextCorpusRetrievalScoringClause,
): TextCorpusRetrievalTermExplanation {
  const fieldIds = clause.field !== undefined ? [clause.field] : index.fieldOrder ?? [];
  const fieldContributions = fieldIds.flatMap((fieldId): readonly TextCorpusRetrievalFieldContribution[] => {
    const fieldSpec = fieldSpecById(index, fieldId);
    if (fieldSpec === undefined) return [];
    const tf = positionsForFieldTerm(index, fieldId, clause.term, document.id).length;
    const length = fieldLength(document, fieldId);
    const averageLength = index.fieldAverageLengths?.[fieldId] ?? 0;
    if (tf <= 0 || averageLength <= 0) {
      return [
        {
          field: fieldId,
          tf,
          length,
          averageLength,
          weight: fieldSpec.weight,
          normalizedTf: 0,
        },
      ];
    }
    const denominator = 1 - fieldSpec.b + fieldSpec.b * (length / averageLength);
    const normalizedTf = denominator === 0 ? 0 : fieldSpec.weight * (tf / denominator);
    return [
      {
        field: fieldId,
        tf,
        length,
        averageLength,
        weight: fieldSpec.weight,
        normalizedTf,
      },
    ];
  });
  const weightedTf = fieldContributions.reduce((sum, entry) => sum + entry.normalizedTf, 0);
  const df = fieldDocumentFrequency(index, clause.term, clause.field);
  const idf = bm25OkapiIdf(index.documents.length, df);
  const contribution = bm25fScore(weightedTf, idf);
  return {
    term: clause.term,
    ...(clause.field ? { field: clause.field } : {}),
    tf: weightedTf,
    df,
    idf,
    contribution,
    fieldContributions,
  };
}

function searchSingleTextCorpusRetrievalQuery(
  index: TextCorpusRetrievalIndexV1,
  query: TextCorpusParsedQuery,
  options: Required<Pick<TextCorpusRetrievalSearchOptions, "topK" | "snippetWindow">> &
    Pick<TextCorpusRetrievalSearchOptions, "includeZeroScores">,
  documentById: ReadonlyMap<string, TextCorpusRetrievalDocument>,
): TextCorpusRetrievalQueryResult {
  const clausesForScoring = scoringClauses(index, query);
  const tokensForSnippet = clausesForScoring
    .filter((clause) => clause.field === undefined)
    .map((clause) => clause.term);
  const hits = index.documentOrder.flatMap((docId) => {
    const document = documentById.get(docId);
    if (document === undefined) return [];
    if (!documentMatchesQuery(index, document, query)) return [];
    const scored = scoreRetrievalDocument(index, document, clausesForScoring);
    if (!options.includeZeroScores && scored.score <= 0) return [];
    const snippet = createRetrievalSnippet(document, tokensForSnippet, options.snippetWindow);
    return [
      {
        docId,
        score: scored.score,
        ...(snippet ? { snippet } : {}),
        explain: scored.explain,
      },
    ];
  });
  hits.sort((left, right) => right.score - left.score || left.docId.localeCompare(right.docId));
  return {
    query,
    hits: hits.slice(0, options.topK),
  };
}

function normalizeRetrievalSearchOptions(
  options: TextCorpusRetrievalSearchOptions = {},
): Required<Pick<TextCorpusRetrievalSearchOptions, "topK" | "snippetWindow">> &
  Pick<TextCorpusRetrievalSearchOptions, "includeZeroScores"> {
  return {
    topK: Math.max(0, Math.floor(options.topK ?? 10)),
    snippetWindow: Math.max(0, Math.floor(options.snippetWindow ?? 2)),
    ...(options.includeZeroScores === undefined ? {} : { includeZeroScores: options.includeZeroScores }),
  };
}

export function* iterateTextCorpusRetrievalResults(
  index: TextCorpusRetrievalIndexV1,
  queries: readonly TextCorpusParsedQuery[],
  options: TextCorpusRetrievalStreamOptions = {},
): IterableIterator<TextCorpusRetrievalQueryResult> {
  if (!isTextCorpusRetrievalIndexV1(index)) {
    throw new TypeError("textcorpus retrieval index must satisfy TextCorpusRetrievalIndexV1");
  }
  if (!Array.isArray(queries)) {
    throw new TypeError("textcorpus retrieval queries must be an array");
  }
  const normalizedOptions = normalizeRetrievalSearchOptions(options);
  const documentById = new Map(index.documents.map((document) => [document.id, document]));
  for (const query of queries) {
    if (!isTextCorpusParsedQuery(query)) {
      if (options.failOnInvalidQuery === false) continue;
      throw new TypeError("textcorpus retrieval queries must be parsed query objects");
    }
    yield searchSingleTextCorpusRetrievalQuery(index, query, normalizedOptions, documentById);
  }
}

export function searchTextCorpusRetrievalIndex(
  index: TextCorpusRetrievalIndexV1,
  queries: readonly TextCorpusParsedQuery[],
  options: TextCorpusRetrievalSearchOptions = {},
): TextCorpusRetrievalResultV1 {
  const results = [...iterateTextCorpusRetrievalResults(index, queries, options)];
  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    corpusId: index.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection: index.selection,
    formula: index.formula,
    results,
  };
}

export function evaluateTextCorpusRetrieval(
  result: TextCorpusRetrievalResultV1,
  qrels: TextCorpusRetrievalQrelsV1,
  options: TextCorpusRetrievalEvaluationOptions = {},
): TextCorpusRetrievalEvaluationResultV1 {
  if (!isTextCorpusRetrievalResultV1(result)) {
    throw new TypeError("textcorpus retrieval result must satisfy TextCorpusRetrievalResultV1");
  }
  validateRetrievalQrels(qrels);
  if (result.corpusId !== qrels.corpusId) {
    throw new Error(`textcorpus retrieval qrels corpus mismatch: ${qrels.corpusId} != ${result.corpusId}`);
  }
  const k = Math.max(1, Math.floor(options.k ?? 10));
  const relevantGradeThreshold = Math.max(1, Math.floor(options.relevantGradeThreshold ?? 1));
  const tolerance = options.tolerance ?? 1e-12;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new TypeError("textcorpus retrieval evaluation tolerance must be a non-negative finite number");
  }
  const queries = [...qrels.judgments]
    .sort((left, right) => left.queryId.localeCompare(right.queryId))
    .map((judgment) => evaluateQueryRetrieval(result, judgment, k, relevantGradeThreshold));
  return {
    schemaVersion: textCorpusRetrievalEvaluationSchemaVersion,
    taskId: "nlp-retrieval",
    corpusId: result.corpusId,
    evidenceClass: textCorpusEvidenceClassE2,
    selection: result.selection,
    formula: result.formula,
    k,
    relevantGradeThreshold,
    tolerance,
    summary: {
      precisionAtK: average(queries.map((query) => query.precisionAtK)),
      recallAtK: average(queries.map((query) => query.recallAtK)),
      mrr: average(queries.map((query) => query.reciprocalRank)),
      ndcgAtK: average(queries.map((query) => query.ndcgAtK)),
    },
    queries,
  };
}

function entryById(collection: TextCorpusCollectionV1): ReadonlyMap<string, TextCorpusEntry> {
  return new Map(collection.entries.map((entry) => [entry.id, entry]));
}

function windowRangeForHit(
  entry: TextCorpusEntry,
  hit: TextCorpusRetrievalHit,
  tokenWindow: number,
): { readonly tokenStart: number; readonly tokenEnd: number } {
  const tokens = getEntryTokenTexts(entry);
  const baseStart = hit.snippet?.tokenStart ?? 0;
  const baseEnd = hit.snippet?.tokenEnd ?? Math.min(tokens.length, 1);
  return {
    tokenStart: Math.max(0, baseStart - tokenWindow),
    tokenEnd: Math.min(tokens.length, baseEnd + tokenWindow),
  };
}

export function createTextCorpusCitationWindows(
  collection: TextCorpusCollectionV1,
  result: TextCorpusRetrievalResultV1,
  options: TextCorpusCitationWindowOptions = {},
): TextCorpusCitationWindowSetV1 {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }
  if (!isTextCorpusRetrievalResultV1(result)) {
    throw new TypeError("textcorpus retrieval result must satisfy TextCorpusRetrievalResultV1");
  }
  if (collection.corpusId !== result.corpusId) {
    throw new Error(`textcorpus citation corpus mismatch: ${collection.corpusId} != ${result.corpusId}`);
  }
  const tokenWindow = Math.max(0, Math.floor(options.tokenWindow ?? 0));
  const byId = entryById(collection);
  const { selection } = selectTextCorpusEntries(collection);
  const windows = result.results.flatMap((queryResult) =>
    queryResult.hits.flatMap((hit): readonly TextCorpusCitationWindowV1[] => {
      const entry = byId.get(hit.docId);
      if (entry === undefined) return [];
      const range = windowRangeForHit(entry, hit, tokenWindow);
      const text = citationTextFromTokens(entry, range.tokenStart, range.tokenEnd);
      return [
        {
          schemaVersion: textCorpusRetrievalSchemaVersion,
          corpusId: collection.corpusId,
          evidenceClass: textCorpusEvidenceClassE2,
          queryId: queryResult.query.id,
          docId: entry.id,
          documentId: entry.document.documentId,
          viewId: entry.viewId,
          tokenLayerId: entry.tokenLayerId,
          tokenStart: range.tokenStart,
          tokenEnd: range.tokenEnd,
          text: text.text,
          textPolicy: text.textPolicy,
          ...(text.span ? { span: text.span } : {}),
          score: hit.score,
          formula: result.formula,
          loss: text.loss,
        },
      ];
    }),
  );
  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    evidenceClass: textCorpusEvidenceClassE2,
    selection,
    windows,
  };
}

function findTokenSequenceMatches(tokens: readonly string[], sequence: readonly string[]): readonly number[] {
  if (sequence.length === 0 || sequence.length > tokens.length) return [];
  const starts: number[] = [];
  for (let start = 0; start <= tokens.length - sequence.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < sequence.length; offset += 1) {
      if (tokens[start + offset] !== sequence[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) starts.push(start);
  }
  return starts;
}

export function groundTextCorpusQuote(
  collection: TextCorpusCollectionV1,
  options: TextCorpusQuoteGroundingOptions,
): TextCorpusQuoteGroundingResultV1 {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }
  if (!isNonEmptyString(options.docId)) {
    throw new TypeError("textcorpus quote grounding docId must be a non-empty string");
  }
  if (!Array.isArray(options.quoteTokens) || options.quoteTokens.length === 0 || !options.quoteTokens.every((token) => typeof token === "string")) {
    throw new TypeError("textcorpus quote grounding quoteTokens must be a non-empty string array");
  }
  const entry = entryById(collection).get(options.docId);
  if (entry === undefined) {
    throw new Error(`textcorpus quote grounding docId is not in the corpus: ${options.docId}`);
  }
  const tokenWindow = Math.max(0, Math.floor(options.tokenWindow ?? 0));
  const tokens = getEntryTokenTexts(entry);
  const starts = findTokenSequenceMatches(tokens, options.quoteTokens);
  const matches = starts.map((start): TextCorpusQuoteGroundingMatchV1 => {
    const tokenStart = Math.max(0, start - tokenWindow);
    const tokenEnd = Math.min(tokens.length, start + options.quoteTokens.length + tokenWindow);
    const text = citationTextFromTokens(entry, tokenStart, tokenEnd);
    return {
      docId: entry.id,
      documentId: entry.document.documentId,
      viewId: entry.viewId,
      tokenLayerId: entry.tokenLayerId,
      tokenStart,
      tokenEnd,
      text: text.text,
      textPolicy: text.textPolicy,
      ...(text.span ? { span: text.span } : {}),
      loss: text.loss,
    };
  });
  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    corpusId: collection.corpusId,
    evidenceClass: textCorpusEvidenceClassE2,
    docId: options.docId,
    quoteTokens: options.quoteTokens,
    status: matches.length === 0 ? "not-found" : matches.length === 1 ? "grounded" : "ambiguous",
    matches,
  };
}

export function stringifyTextCorpusRetrievalIndex(index: TextCorpusRetrievalIndexV1): string {
  if (!isTextCorpusRetrievalIndexV1(index)) {
    throw new TypeError("textcorpus retrieval index must satisfy TextCorpusRetrievalIndexV1");
  }
  return `${JSON.stringify(index, null, 2)}\n`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function retrievalIndexChecksum(index: TextCorpusRetrievalIndexV1): TextCorpusRetrievalIndexChecksum {
  return {
    algorithm: "fnv1a64-utf8",
    value: formatU64Hex(hash64Text(canonicalJson(index), { algo: "fnv1a64-utf8" })),
  };
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function isTextCorpusRetrievalIndexChecksum(
  value: unknown,
): value is TextCorpusRetrievalIndexChecksum {
  return (
    isRecord(value) &&
    value.algorithm === "fnv1a64-utf8" &&
    isNonEmptyString(value.value)
  );
}

function isNonNegativeIntegerValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function createTextCorpusRetrievalIndexStorageRef(
  artifact: TextCorpusRetrievalIndexArtifactV1,
  key: string,
  serialized: string,
): TextCorpusRetrievalIndexStorageRefV1 {
  const index = artifact.index;
  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    artifactType: "textcorpus-retrieval-index-storage-ref-v1",
    key,
    checksum: artifact.checksum,
    byteLength: utf8ByteLength(serialized),
    corpusId: index.corpusId,
    tokenSource: index.tokenSource,
    evidenceClass: index.evidenceClass,
    formula: index.formula,
    documentCount: index.documentOrder.length,
    termCount: index.termOrder.length,
    fieldCount: index.fieldOrder?.length ?? 0,
  };
}

export function parseTextCorpusRetrievalIndex(serialized: string): TextCorpusRetrievalIndexV1 {
  if (typeof serialized !== "string") {
    throw new TypeError("textcorpus retrieval index JSON must be a string");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`textcorpus retrieval index JSON parse failed: ${message}`);
  }
  if (!isTextCorpusRetrievalIndexV1(parsed)) {
    throw new TypeError("textcorpus retrieval index JSON must satisfy TextCorpusRetrievalIndexV1");
  }
  return parsed;
}

export function createTextCorpusRetrievalIndexArtifact(
  index: TextCorpusRetrievalIndexV1,
): TextCorpusRetrievalIndexArtifactV1 {
  if (!isTextCorpusRetrievalIndexV1(index)) {
    throw new TypeError("textcorpus retrieval index must satisfy TextCorpusRetrievalIndexV1");
  }
  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    artifactType: "textcorpus-retrieval-index-artifact-v1",
    index,
    checksum: retrievalIndexChecksum(index),
  };
}

export function isTextCorpusRetrievalIndexArtifactV1(
  value: unknown,
): value is TextCorpusRetrievalIndexArtifactV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    value.artifactType === "textcorpus-retrieval-index-artifact-v1" &&
    isTextCorpusRetrievalIndexV1(value.index) &&
    isTextCorpusRetrievalIndexChecksum(value.checksum) &&
    value.checksum.value === retrievalIndexChecksum(value.index).value
  );
}

export function isTextCorpusRetrievalIndexStorageRefV1(
  value: unknown,
): value is TextCorpusRetrievalIndexStorageRefV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    value.artifactType === "textcorpus-retrieval-index-storage-ref-v1" &&
    isNonEmptyString(value.key) &&
    isTextCorpusRetrievalIndexChecksum(value.checksum) &&
    isNonNegativeIntegerValue(value.byteLength) &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
    isTextCorpusEvidenceClass(value.evidenceClass) &&
    isRetrievalFormula(value.formula) &&
    isNonNegativeIntegerValue(value.documentCount) &&
    isNonNegativeIntegerValue(value.termCount) &&
    isNonNegativeIntegerValue(value.fieldCount)
  );
}

function assertTextCorpusRetrievalIndexStorageRefMatchesArtifact(
  ref: TextCorpusRetrievalIndexStorageRefV1,
  artifact: TextCorpusRetrievalIndexArtifactV1,
  serialized: string,
): void {
  const expected = createTextCorpusRetrievalIndexStorageRef(artifact, ref.key, serialized);
  if (ref.byteLength !== expected.byteLength) {
    throw new TypeError("textcorpus retrieval index storage ref byteLength does not match stored artifact");
  }
  if (
    ref.checksum.algorithm !== expected.checksum.algorithm ||
    ref.checksum.value !== expected.checksum.value
  ) {
    throw new TypeError("textcorpus retrieval index storage ref checksum does not match stored artifact");
  }
  if (
    ref.corpusId !== expected.corpusId ||
    ref.tokenSource !== expected.tokenSource ||
    ref.evidenceClass !== expected.evidenceClass ||
    ref.formula !== expected.formula ||
    ref.documentCount !== expected.documentCount ||
    ref.termCount !== expected.termCount ||
    ref.fieldCount !== expected.fieldCount
  ) {
    throw new TypeError("textcorpus retrieval index storage ref metadata does not match stored artifact");
  }
}

export async function saveTextCorpusRetrievalIndexArtifactToStore(
  artifact: TextCorpusRetrievalIndexArtifactV1,
  options: SaveTextCorpusRetrievalIndexArtifactOptions,
): Promise<TextCorpusRetrievalIndexStorageRefV1> {
  if (!isTextCorpusRetrievalIndexArtifactV1(artifact)) {
    throw new TypeError("textcorpus retrieval index artifact checksum or shape is invalid");
  }
  if (!isRecord(options) || !isNonEmptyString(options.key)) {
    throw new TypeError("textcorpus retrieval index storage key must be a non-empty string");
  }
  if (typeof options.writeText !== "function") {
    throw new TypeError("textcorpus retrieval index storage writeText must be a function");
  }
  const serialized = stringifyTextCorpusRetrievalIndexArtifact(artifact);
  await options.writeText(options.key, serialized);
  return createTextCorpusRetrievalIndexStorageRef(artifact, options.key, serialized);
}

export async function loadTextCorpusRetrievalIndexArtifactFromStore(
  ref: TextCorpusRetrievalIndexStorageRefV1,
  options: LoadTextCorpusRetrievalIndexArtifactOptions,
): Promise<TextCorpusRetrievalIndexArtifactV1> {
  if (!isTextCorpusRetrievalIndexStorageRefV1(ref)) {
    throw new TypeError("textcorpus retrieval index storage ref is invalid");
  }
  if (!isRecord(options) || typeof options.readText !== "function") {
    throw new TypeError("textcorpus retrieval index storage readText must be a function");
  }
  const serialized = await options.readText(ref.key);
  if (typeof serialized !== "string") {
    throw new TypeError("textcorpus retrieval index storage readText must return a string");
  }
  const artifact = parseTextCorpusRetrievalIndexArtifact(serialized);
  assertTextCorpusRetrievalIndexStorageRefMatchesArtifact(ref, artifact, serialized);
  return artifact;
}

export function stringifyTextCorpusRetrievalIndexArtifact(
  artifact: TextCorpusRetrievalIndexArtifactV1,
): string {
  if (!isTextCorpusRetrievalIndexArtifactV1(artifact)) {
    throw new TypeError("textcorpus retrieval index artifact checksum or shape is invalid");
  }
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function parseTextCorpusRetrievalIndexArtifact(
  serialized: string,
): TextCorpusRetrievalIndexArtifactV1 {
  if (typeof serialized !== "string") {
    throw new TypeError("textcorpus retrieval index artifact JSON must be a string");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`textcorpus retrieval index artifact JSON parse failed: ${message}`);
  }
  if (!isTextCorpusRetrievalIndexArtifactV1(parsed)) {
    throw new TypeError("textcorpus retrieval index artifact JSON must satisfy checksum and shape contracts");
  }
  return parsed;
}

export function isTextCorpusArtifactV1(value: unknown): value is TextCorpusArtifactV1 {
  return (
    isTextCorpusConcordanceResultV1(value) ||
    isTextCorpusFrequencyResultV1(value) ||
    isTextCorpusNgramResultV1(value) ||
    isTextCorpusCollocateResultV1(value) ||
    isTextCorpusCooccurrenceResultV1(value) ||
    isTextCorpusPairwiseRelationResultV1(value) ||
    isTextCorpusScoringResultV1(value) ||
    isTextCorpusRetrievalIndexV1(value) ||
    isTextCorpusRetrievalIndexArtifactV1(value) ||
    isTextCorpusRetrievalIndexStorageRefV1(value) ||
    isTextCorpusRetrievalResultV1(value) ||
    isTextCorpusRetrievalEvaluationResultV1(value) ||
    isTextCorpusCitationWindowSetV1(value) ||
    isTextCorpusQuoteGroundingResultV1(value)
  );
}

function isTextCorpusMetricEnvelopeMetricParameters(
  value: unknown,
): value is TextCorpusMetricEnvelopeMetricParameters {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, entryValue]) =>
        isNonEmptyString(key) &&
        (typeof entryValue === "string" ||
          (typeof entryValue === "number" && Number.isFinite(entryValue)) ||
          typeof entryValue === "boolean"),
    )
  );
}

function isTextCorpusMetricEnvelopeMetricV1(
  value: unknown,
): value is TextCorpusMetricEnvelopeMetricV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.metricId) &&
    isNonEmptyString(value.kind) &&
    ((typeof value.value === "number" && Number.isFinite(value.value)) || typeof value.value === "string") &&
    (value.unit === undefined || isNonEmptyString(value.unit)) &&
    (value.parameters === undefined || isTextCorpusMetricEnvelopeMetricParameters(value.parameters))
  );
}

export function isTextCorpusMetricEnvelopePayloadV1(
  value: unknown,
): value is TextCorpusMetricEnvelopePayloadV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.corpusId) &&
    isNonEmptyString(value.metricSetId) &&
    Array.isArray(value.metrics) &&
    value.metrics.length > 0 &&
    value.metrics.every((entry) => isTextCorpusMetricEnvelopeMetricV1(entry))
  );
}

function textCorpusMetric(
  metricId: string,
  kind: string,
  value: TextCorpusMetricEnvelopeMetricValue,
  options: {
    readonly unit?: string;
    readonly parameters?: TextCorpusMetricEnvelopeMetricParameters;
  } = {},
): TextCorpusMetricEnvelopeMetricV1 {
  return {
    metricId,
    kind,
    value,
    ...(options.unit === undefined ? {} : { unit: options.unit }),
    ...(options.parameters === undefined ? {} : { parameters: options.parameters }),
  };
}

function textCorpusSelectionMetrics(
  selection: TextCorpusSelectionProvenanceV1,
): readonly TextCorpusMetricEnvelopeMetricV1[] {
  return [
    textCorpusMetric("selection.document-count", "selection", selection.documentOrder.length, { unit: "documents" }),
    textCorpusMetric("selection.token-count", "selection", selection.tokenCount, { unit: "tokens" }),
  ];
}

function textCorpusPostingCount(index: TextCorpusRetrievalIndexV1): number {
  return Object.values(index.invertedIndex).reduce((sum, postings) => sum + postings.length, 0);
}

function textCorpusRetrievalHitCount(result: TextCorpusRetrievalResultV1): number {
  return result.results.reduce((sum, queryResult) => sum + queryResult.hits.length, 0);
}

function textCorpusRelationCount(
  result: TextCorpusPairwiseRelationResultV1,
  relation: TextCorpusPairwiseRelationLabel,
): number {
  return result.rows.filter((row) => row.relation === relation).length;
}

function textCorpusMetricSetIdForArtifact(artifact: TextCorpusArtifactV1): string {
  if (isTextCorpusRetrievalIndexArtifactV1(artifact)) {
    return textCorpusMetricSetIdForArtifact(artifact.index);
  }
  if (isTextCorpusRetrievalIndexStorageRefV1(artifact)) {
    return `textcorpus.retrieval-index-storage-ref:${artifact.corpusId}:${artifact.formula}`;
  }
  if (isTextCorpusConcordanceResultV1(artifact)) return `textcorpus.concordance:${artifact.corpusId}:${artifact.query}`;
  if (isTextCorpusFrequencyResultV1(artifact)) return `textcorpus.frequency:${artifact.corpusId}`;
  if (isTextCorpusNgramResultV1(artifact)) return `textcorpus.ngram:${artifact.corpusId}:n-${artifact.n}`;
  if (isTextCorpusCollocateResultV1(artifact)) return `textcorpus.collocate:${artifact.corpusId}:${artifact.term}:w-${artifact.window}`;
  if (isTextCorpusCooccurrenceResultV1(artifact)) return `textcorpus.cooccurrence:${artifact.corpusId}:w-${artifact.window}`;
  if (isTextCorpusPairwiseRelationResultV1(artifact)) return `textcorpus.pairwise:${artifact.corpusId}`;
  if (isTextCorpusScoringResultV1(artifact)) return `textcorpus.scoring:${artifact.corpusId}`;
  if (isTextCorpusRetrievalIndexV1(artifact)) return `textcorpus.retrieval-index:${artifact.corpusId}:${artifact.formula}`;
  if (isTextCorpusRetrievalResultV1(artifact)) return `textcorpus.retrieval-result:${artifact.corpusId}:${artifact.formula}`;
  if (isTextCorpusRetrievalEvaluationResultV1(artifact)) return `textcorpus.retrieval-evaluation:${artifact.corpusId}:${artifact.formula}:k-${artifact.k}`;
  if (isTextCorpusCitationWindowSetV1(artifact)) return `textcorpus.citation-windows:${artifact.corpusId}`;
  return `textcorpus.quote-grounding:${artifact.corpusId}:${artifact.docId}`;
}

export function exportTextCorpusMetricEnvelopePayloadV1(
  artifact: TextCorpusArtifactV1,
  options: TextCorpusMetricEnvelopePayloadOptions = {},
): TextCorpusMetricEnvelopePayloadV1 {
  if (!isTextCorpusArtifactV1(artifact)) {
    throw new TypeError("textcorpus metric envelope payload requires a known TextCorpus artifact");
  }
  const source = isTextCorpusRetrievalIndexArtifactV1(artifact) ? artifact.index : artifact;
  const metricSetId = options.metricSetId ?? textCorpusMetricSetIdForArtifact(source);
  if (!isNonEmptyString(metricSetId)) {
    throw new TypeError("textcorpus metricSetId must be a non-empty string");
  }
  const includeSelectionMetrics = options.includeSelectionMetrics ?? true;
  const metrics: TextCorpusMetricEnvelopeMetricV1[] = [];
  if (
    includeSelectionMetrics &&
    "selection" in source &&
    isTextCorpusSelectionProvenanceV1(source.selection)
  ) {
    metrics.push(...textCorpusSelectionMetrics(source.selection));
  }

  if (isTextCorpusConcordanceResultV1(source)) {
    metrics.push(textCorpusMetric("concordance.match-count", "concordance", source.rows.length, {
      unit: "matches",
      parameters: { query: source.query, window: source.window },
    }));
  } else if (isTextCorpusFrequencyResultV1(source)) {
    metrics.push(
      textCorpusMetric("frequency.term-count", "frequency", source.rows.length, { unit: "terms" }),
      textCorpusMetric("frequency.total-token-count", "frequency", source.rows.reduce((sum, row) => sum + row.count, 0), { unit: "tokens" }),
    );
  } else if (isTextCorpusNgramResultV1(source)) {
    metrics.push(
      textCorpusMetric("ngram.row-count", "ngram", source.rows.length, { unit: "ngrams", parameters: { n: source.n } }),
      textCorpusMetric("ngram.total-count", "ngram", source.rows.reduce((sum, row) => sum + row.count, 0), { unit: "ngrams", parameters: { n: source.n } }),
    );
  } else if (isTextCorpusCollocateResultV1(source)) {
    metrics.push(
      textCorpusMetric("collocate.row-count", "collocate", source.rows.length, { unit: "rows", parameters: { term: source.term, window: source.window } }),
      textCorpusMetric("collocate.total-count", "collocate", source.rows.reduce((sum, row) => sum + row.count, 0), { unit: "cooccurrences", parameters: { term: source.term, window: source.window } }),
    );
  } else if (isTextCorpusCooccurrenceResultV1(source)) {
    metrics.push(
      textCorpusMetric("cooccurrence.row-count", "cooccurrence", source.rows.length, { unit: "pairs", parameters: { window: source.window } }),
      textCorpusMetric("cooccurrence.total-count", "cooccurrence", source.rows.reduce((sum, row) => sum + row.count, 0), { unit: "pairs", parameters: { window: source.window } }),
    );
  } else if (isTextCorpusPairwiseRelationResultV1(source)) {
    metrics.push(
      textCorpusMetric("pairwise.row-count", "pairwise", source.rows.length, { unit: "relations" }),
      textCorpusMetric("pairwise.exact-duplicate-count", "pairwise", textCorpusRelationCount(source, "exact-duplicate"), { unit: "relations" }),
      textCorpusMetric("pairwise.near-duplicate-count", "pairwise", textCorpusRelationCount(source, "near-duplicate"), { unit: "relations" }),
      textCorpusMetric("pairwise.shared-reuse-count", "pairwise", textCorpusRelationCount(source, "shared-reuse"), { unit: "relations" }),
    );
  } else if (isTextCorpusScoringResultV1(source)) {
    metrics.push(
      textCorpusMetric("scoring.document-count", "scoring", source.documentOrder.length, { unit: "documents" }),
      textCorpusMetric("scoring.term-count", "scoring", source.termOrder.length, { unit: "terms" }),
      textCorpusMetric("scoring.query-count", "scoring", source.queries.length, { unit: "queries" }),
      textCorpusMetric("scoring.formula-count", "scoring", source.formulaSet.length, { unit: "formulas" }),
    );
  } else if (isTextCorpusRetrievalIndexV1(source)) {
    metrics.push(
      textCorpusMetric("retrieval-index.document-count", "retrieval", source.documentOrder.length, { unit: "documents", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-index.term-count", "retrieval", source.termOrder.length, { unit: "terms", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-index.average-document-length", "retrieval", source.averageDocumentLength, { unit: "tokens", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-index.posting-count", "retrieval", textCorpusPostingCount(source), { unit: "postings", parameters: { formula: source.formula } }),
    );
  } else if (isTextCorpusRetrievalIndexStorageRefV1(source)) {
    metrics.push(
      textCorpusMetric("retrieval-index-storage-ref.document-count", "retrieval", source.documentCount, { unit: "documents", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-index-storage-ref.term-count", "retrieval", source.termCount, { unit: "terms", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-index-storage-ref.field-count", "retrieval", source.fieldCount, { unit: "fields", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-index-storage-ref.byte-length", "retrieval", source.byteLength, { unit: "utf8-bytes", parameters: { formula: source.formula } }),
    );
  } else if (isTextCorpusRetrievalResultV1(source)) {
    metrics.push(
      textCorpusMetric("retrieval-result.query-count", "retrieval", source.results.length, { unit: "queries", parameters: { formula: source.formula } }),
      textCorpusMetric("retrieval-result.hit-count", "retrieval", textCorpusRetrievalHitCount(source), { unit: "hits", parameters: { formula: source.formula } }),
    );
  } else if (isTextCorpusRetrievalEvaluationResultV1(source)) {
    metrics.push(
      textCorpusMetric("retrieval-evaluation.query-count", "retrieval-evaluation", source.queries.length, { unit: "queries", parameters: { k: source.k, relevantGradeThreshold: source.relevantGradeThreshold } }),
      textCorpusMetric("retrieval-evaluation.precision-at-k", "retrieval-evaluation", source.summary.precisionAtK, { unit: "ratio", parameters: { k: source.k } }),
      textCorpusMetric("retrieval-evaluation.recall-at-k", "retrieval-evaluation", source.summary.recallAtK, { unit: "ratio", parameters: { k: source.k } }),
      textCorpusMetric("retrieval-evaluation.mrr", "retrieval-evaluation", source.summary.mrr, { unit: "ratio", parameters: { k: source.k } }),
      textCorpusMetric("retrieval-evaluation.ndcg-at-k", "retrieval-evaluation", source.summary.ndcgAtK, { unit: "ratio", parameters: { k: source.k } }),
    );
  } else if (isTextCorpusCitationWindowSetV1(source)) {
    metrics.push(
      textCorpusMetric("citation-window.window-count", "citation-window", source.windows.length, { unit: "windows" }),
      textCorpusMetric("citation-window.loss-count", "citation-window", source.windows.reduce((sum, window) => sum + window.loss.length, 0), { unit: "loss-records" }),
    );
  } else if (isTextCorpusQuoteGroundingResultV1(source)) {
    metrics.push(
      textCorpusMetric("quote-grounding.match-count", "quote-grounding", source.matches.length, { unit: "matches" }),
      textCorpusMetric("quote-grounding.status", "quote-grounding", source.status),
    );
  }

  const payload = {
    corpusId: source.corpusId,
    metricSetId,
    metrics,
  };
  if (!isTextCorpusMetricEnvelopePayloadV1(payload)) {
    throw new TypeError("textcorpus metric envelope payload could not be produced");
  }
  return payload;
}

export function stringifyTextCorpusArtifact(artifact: TextCorpusArtifactV1): string {
  if (!isTextCorpusArtifactV1(artifact)) {
    throw new TypeError("textcorpus artifact must satisfy a known TextCorpus artifact contract");
  }
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function parseTextCorpusArtifact(serialized: string): TextCorpusArtifactV1 {
  if (typeof serialized !== "string") {
    throw new TypeError("textcorpus artifact JSON must be a string");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`textcorpus artifact JSON parse failed: ${message}`);
  }
  if (!isTextCorpusArtifactV1(parsed)) {
    throw new TypeError("textcorpus artifact JSON must satisfy a known TextCorpus artifact contract");
  }
  return parsed;
}
