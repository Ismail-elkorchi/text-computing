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
export const textCorpusTokenSource = "explicit-textdoc-token-layer" as const;
export const textCorpusTfRawCountFormula = "tf.raw-count" as const;
export const textCorpusDfDocumentCountFormula = "df.document-count" as const;
export const textCorpusTfidfSklearnSmoothRawFormula = "tfidf.sklearn-smooth-raw" as const;
export const textCorpusBm25OkapiFormula = "bm25.okapi.k1-1.5.b-0.75" as const;

export type PackageName = typeof packageName;
export type TextCorpusCollectionSchemaVersion = typeof textCorpusCollectionSchemaVersion;
export type TextCorpusScoringSchemaVersion = typeof textCorpusScoringSchemaVersion;
export type TextCorpusTokenSource = typeof textCorpusTokenSource;
export type TextCorpusFormulaId =
  | typeof textCorpusTfRawCountFormula
  | typeof textCorpusDfDocumentCountFormula
  | typeof textCorpusTfidfSklearnSmoothRawFormula
  | typeof textCorpusBm25OkapiFormula;

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
