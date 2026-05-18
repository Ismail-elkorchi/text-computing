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
export const textCorpusTokenSource = "explicit-textdoc-token-layer" as const;
export const textCorpusTfRawCountFormula = "tf.raw-count" as const;
export const textCorpusDfDocumentCountFormula = "df.document-count" as const;
export const textCorpusTfidfSklearnSmoothRawFormula = "tfidf.sklearn-smooth-raw" as const;
export const textCorpusBm25OkapiFormula = "bm25.okapi.k1-1.5.b-0.75" as const;
export const textCorpusBm25fFormula = "bm25f.k1-1.2.b-0.75.fielded" as const;

export type PackageName = typeof packageName;
export type TextCorpusCollectionSchemaVersion = typeof textCorpusCollectionSchemaVersion;
export type TextCorpusScoringSchemaVersion = typeof textCorpusScoringSchemaVersion;
export type TextCorpusRetrievalSchemaVersion = typeof textCorpusRetrievalSchemaVersion;
export type TextCorpusRetrievalQrelsSchemaVersion = typeof textCorpusRetrievalQrelsSchemaVersion;
export type TextCorpusRetrievalEvaluationSchemaVersion =
  typeof textCorpusRetrievalEvaluationSchemaVersion;
export type TextCorpusTokenSource = typeof textCorpusTokenSource;
export type TextCorpusFormulaId =
  | typeof textCorpusTfRawCountFormula
  | typeof textCorpusDfDocumentCountFormula
  | typeof textCorpusTfidfSklearnSmoothRawFormula
  | typeof textCorpusBm25OkapiFormula
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

export interface TextCorpusDocumentScore {
  readonly docId: string;
  readonly score: number;
}

export interface TextCorpusDocumentTermScores {
  readonly id: string;
  readonly length: number;
  readonly tf: readonly TextCorpusTermValue[];
  readonly tfidf: readonly TextCorpusTermValue[];
}

export interface TextCorpusQueryScores {
  readonly id: string;
  readonly bm25: readonly TextCorpusDocumentScore[];
}

export interface TextCorpusScoringOptions {
  readonly queries?: readonly TextCorpusQuery[];
  readonly tolerance?: number;
}

export interface TextCorpusScoringResultV1 {
  readonly schemaVersion: TextCorpusScoringSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
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
}

export type TextCorpusQueryClauseOperator = "should" | "must" | "must-not";

export interface TextCorpusParsedQueryClause {
  readonly term: string;
  readonly operator: TextCorpusQueryClauseOperator;
  readonly field?: string;
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

export interface TextCorpusRetrievalResultV1 {
  readonly schemaVersion: TextCorpusRetrievalSchemaVersion;
  readonly corpusId: string;
  readonly tokenSource: TextCorpusTokenSource;
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
  readonly judgments: readonly TextCorpusRelevanceJudgment[];
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
  readonly formula: TextCorpusRetrievalFormulaId;
  readonly k: number;
  readonly relevantGradeThreshold: number;
  readonly tolerance: number;
  readonly summary: TextCorpusRetrievalEvaluationSummary;
  readonly queries: readonly TextCorpusRetrievalQueryEvaluation[];
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

function getEntryTokenTexts(entry: TextCorpusEntry): readonly string[] {
  const tokenLayer = findTokenLayer(entry.document, entry.tokenLayerId, entry.viewId);
  if (!tokenLayer) {
    throw new Error(
      `entry ${entry.id} references missing token layer ${entry.tokenLayerId} in view ${entry.viewId}`,
    );
  }

  return tokenLayer.annotations
    .filter((annotation) => annotation.lifecycle.state === "active")
    .map((annotation) => resolveTokenText(entry.document, annotation));
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

function bm25OkapiScore(
  termFrequency: number,
  documentLength: number,
  averageDocumentLength: number,
  idf: number,
): number {
  if (termFrequency <= 0 || averageDocumentLength <= 0 || idf === 0) return 0;
  const k1 = 1.5;
  const b = 0.75;
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
    Array.isArray(value.formulaSet) &&
    value.formulaSet.every(
      (entry) =>
        entry === textCorpusTfRawCountFormula ||
        entry === textCorpusDfDocumentCountFormula ||
        entry === textCorpusTfidfSklearnSmoothRawFormula ||
        entry === textCorpusBm25OkapiFormula,
    ) &&
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
        isTermValueArray(entry.tfidf),
    ) &&
    Array.isArray(value.queries) &&
    value.queries.every(
      (entry) =>
        isRecord(entry) &&
        isNonEmptyString(entry.id) &&
        isDocumentScoreArray(entry.bm25),
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
        (clause.field === undefined || isNonEmptyString(clause.field)),
    )
  );
}

export function isTextCorpusRetrievalIndexV1(value: unknown): value is TextCorpusRetrievalIndexV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textCorpusRetrievalSchemaVersion &&
    isNonEmptyString(value.corpusId) &&
    value.tokenSource === textCorpusTokenSource &&
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

export function computeTextCorpusScoring(
  collection: TextCorpusCollectionV1,
  options: TextCorpusScoringOptions = {},
): TextCorpusScoringResultV1 {
  if (!isTextCorpusCollectionV1(collection)) {
    throw new TypeError("textcorpus collection must satisfy TextCorpusCollectionV1");
  }

  const queries = options.queries ?? [];
  validateQueries(queries);
  const documentOrder = collection.entries.map((entry) => entry.id);
  const tokenLists = collection.entries.map((entry) => getEntryTokenTexts(entry));
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
  const documentCount = collection.entries.length;
  const averageDocumentLength =
    tokenLists.reduce((sum, tokens) => sum + tokens.length, 0) / Math.max(1, documentCount);

  const documents = collection.entries.map((entry, index) => {
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
    return {
      id: entry.id,
      length: tokenLists[index]?.length ?? 0,
      tf,
      tfidf,
    };
  });

  const queryScores = queries.map((query) => ({
    id: query.id,
    bm25: collection.entries.map((entry, index) => {
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
  }));

  return {
    schemaVersion: textCorpusScoringSchemaVersion,
    corpusId: collection.corpusId,
    tokenSource: textCorpusTokenSource,
    formulaSet: [
      textCorpusTfRawCountFormula,
      textCorpusDfDocumentCountFormula,
      textCorpusTfidfSklearnSmoothRawFormula,
      textCorpusBm25OkapiFormula,
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

function parseQuerySegment(rawSegment: string): readonly TextCorpusParsedQueryClause[] {
  if (rawSegment.length === 0) return [];
  let operator: TextCorpusQueryClauseOperator = "should";
  let segment = rawSegment;
  if (segment.startsWith("+")) {
    operator = "must";
    segment = segment.slice(1);
  } else if (segment.startsWith("-")) {
    operator = "must-not";
    segment = segment.slice(1);
  }

  if (segment.length === 0) return [];
  const fieldSeparator = segment.indexOf(":");
  const field =
    fieldSeparator > 0 ? normalizeQueryTokens(segment.slice(0, fieldSeparator))[0] : undefined;
  const value = fieldSeparator > 0 ? segment.slice(fieldSeparator + 1) : segment;
  return normalizeQueryTokens(value).map((term) => ({
    term,
    operator,
    ...(field ? { field } : {}),
  }));
}

function parseQueryClauses(raw: string): readonly TextCorpusParsedQueryClause[] {
  return raw.split(/\s+/u).flatMap(parseQuerySegment);
}

export function parseTextCorpusQuery(
  raw: string,
  options: TextCorpusParseQueryOptions = {},
): TextCorpusParsedQuery {
  if (typeof raw !== "string") {
    throw new TypeError("textcorpus query raw text must be a string");
  }
  const clauses = parseQueryClauses(raw);
  const tokens = clauses.map((clause) => clause.term);
  const id = options.id ?? `query:${tokens.join("-") || "empty"}`;
  if (!isNonEmptyString(id)) {
    throw new TypeError("textcorpus parsed query id must be a non-empty string");
  }
  return { id, raw, tokens, clauses };
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

  const documents = collection.entries.map((entry) => {
    const tokens = getEntryTokenTexts(entry);
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
    .map((clause) => clause.term);
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
      if (clause.field === undefined) return [{ term: clause.term }];
      if (!fieldSet.has(clause.field)) return [];
      return [{ term: clause.term, field: clause.field }];
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

function documentMatchesClause(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  clause: TextCorpusParsedQueryClause,
): boolean {
  if (clause.field !== undefined) {
    if ((index.fieldOrder ?? []).includes(clause.field)) {
      return fieldTokens(document, clause.field).includes(clause.term);
    }
    return metadataTokens(document, clause.field).includes(clause.term);
  }
  return positionsForTerm(index, clause.term, document.id).length > 0;
}

function documentMatchesQuery(
  index: TextCorpusRetrievalIndexV1,
  document: TextCorpusRetrievalDocument,
  query: TextCorpusParsedQuery,
): boolean {
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

export function searchTextCorpusRetrievalIndex(
  index: TextCorpusRetrievalIndexV1,
  queries: readonly TextCorpusParsedQuery[],
  options: TextCorpusRetrievalSearchOptions = {},
): TextCorpusRetrievalResultV1 {
  if (!isTextCorpusRetrievalIndexV1(index)) {
    throw new TypeError("textcorpus retrieval index must satisfy TextCorpusRetrievalIndexV1");
  }
  if (!Array.isArray(queries) || !queries.every((query) => isTextCorpusParsedQuery(query))) {
    throw new TypeError("textcorpus retrieval queries must be parsed query objects");
  }
  const topK = Math.max(0, Math.floor(options.topK ?? 10));
  const snippetWindow = Math.max(0, Math.floor(options.snippetWindow ?? 2));
  const documentById = new Map(index.documents.map((document) => [document.id, document]));

  const results = queries.map((query) => {
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
      const snippet = createRetrievalSnippet(document, tokensForSnippet, snippetWindow);
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
      hits: hits.slice(0, topK),
    };
  });

  return {
    schemaVersion: textCorpusRetrievalSchemaVersion,
    corpusId: index.corpusId,
    tokenSource: textCorpusTokenSource,
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

export function stringifyTextCorpusRetrievalIndex(index: TextCorpusRetrievalIndexV1): string {
  if (!isTextCorpusRetrievalIndexV1(index)) {
    throw new TypeError("textcorpus retrieval index must satisfy TextCorpusRetrievalIndexV1");
  }
  return `${JSON.stringify(index, null, 2)}\n`;
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
