import type { TextCorpus } from "@ismail-elkorchi/textcorpus";
import type { ParallelRecord } from "@ismail-elkorchi/textdata";
import {
	type Annotation,
	type AnnotationLayer,
	addAnnotation,
	addLayer,
	addViewWithSpanMap,
	createDocument,
	type Evidence,
	type EvidenceMode,
	type Exactness,
	type Score,
	type SpanMapEntry,
	type SpanRef,
	type TextDocument,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import {
	segmentSentences,
	segmentWords,
} from "@ismail-elkorchi/textfacts/segment";
import { applyDown, type Fst } from "@ismail-elkorchi/textfst";
import { type Lexicon, lookup, type Wordlist } from "@ismail-elkorchi/textlex";
import {
	applyRules,
	type CompiledRuleSet,
	rewriteView,
} from "@ismail-elkorchi/textrules";

export const packageName = "@ismail-elkorchi/textparallel" as const;
export const packageVersion = "0.1.0" as const;

export type PackageName = typeof packageName;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type AlignmentRelation =
	| "equivalent"
	| "partial"
	| "inserted"
	| "deleted"
	| "reordered"
	| "unknown";

export type ParallelDiagnosticSeverity = "info" | "warning" | "error";

export interface ParallelDiagnostic {
	readonly code: string;
	readonly severity: ParallelDiagnosticSeverity;
	readonly message: string;
	readonly docId?: string;
	readonly corpusId?: string;
	readonly tmId?: string;
	readonly linkId?: string;
	readonly source?: SpanRef;
	readonly target?: SpanRef;
	readonly optionPath?: string;
	readonly resourceId?: string;
	readonly metadata?: JsonObject;
}

export interface AlignmentLink {
	readonly source: SpanRef;
	readonly target: SpanRef;
	readonly relation: AlignmentRelation;
	readonly score?: Score;
	readonly evidence: Evidence;
}

export interface ParallelDocument {
	readonly id: string;
	readonly sourceDoc: TextDocument;
	readonly targetDoc: TextDocument;
	readonly links: readonly AlignmentLink[];
	readonly metadata: JsonObject;
}

export interface ParallelCorpus {
	readonly id: string;
	readonly documents: readonly ParallelDocument[];
	readonly sourceLanguage?: string;
	readonly targetLanguage?: string;
	readonly indexes: JsonObject;
	readonly metadata: JsonObject;
}

export type CorpusReference = TextCorpus;

export interface BilingualDictionaryEntry {
	readonly source: string;
	readonly target: string;
	readonly weight?: number;
	readonly sourceLanguage?: string;
	readonly targetLanguage?: string;
	readonly metadata?: JsonObject;
}

export interface BaseParallelOptions {
	readonly id?: string;
	readonly sourceViewId?: string;
	readonly targetViewId?: string;
	readonly strict?: boolean;
	readonly producer?: string;
	readonly optionsHash?: string;
	readonly resourceIds?: readonly string[];
	readonly maxLinks?: number;
}

export interface SentenceAlignmentModel {
	readonly id: string;
	readonly kind: "sentence-alignment";
	readonly examples: number;
	readonly averageLengthRatio: number;
	readonly metadata: JsonObject;
}

export interface WordAlignmentModel {
	readonly id: string;
	readonly kind: "word-alignment";
	readonly examples: number;
	readonly dictionary: readonly BilingualDictionaryEntry[];
	readonly metadata: JsonObject;
}

export interface SentenceAlignOptions extends BaseParallelOptions {
	readonly sourceLayerId?: string;
	readonly targetLayerId?: string;
	readonly anchors?: readonly AlignmentLink[];
	readonly model?: SentenceAlignmentModel;
	readonly lengthWeight?: number;
	readonly lexicalWeight?: number;
}

export interface WordAlignOptions extends BaseParallelOptions {
	readonly sourceTokenLayerId?: string;
	readonly targetTokenLayerId?: string;
	readonly dictionaries?: readonly BilingualDictionaryEntry[];
	readonly sourceLexicons?: readonly Lexicon[];
	readonly targetLexicons?: readonly Lexicon[];
	readonly fsts?: readonly Fst[];
	readonly model?: WordAlignmentModel;
	readonly minScore?: number;
	readonly allowNullLinks?: boolean;
}

export interface ParallelDocumentOptions {
	readonly id?: string | undefined;
	readonly links?: readonly AlignmentLink[] | undefined;
	readonly metadata?: JsonObject | undefined;
	readonly strict?: boolean | undefined;
}

export interface ParallelCorpusOptions {
	readonly id?: string | undefined;
	readonly sourceLanguage?: string | undefined;
	readonly targetLanguage?: string | undefined;
	readonly metadata?: JsonObject | undefined;
	readonly strict?: boolean | undefined;
}

export interface TmOptions {
	readonly id?: string;
	readonly sourceViewId?: string;
	readonly targetViewId?: string;
	readonly duplicatePolicy?: "collapse" | "preserve";
	readonly metadata?: JsonObject;
	readonly normalize?: boolean;
	readonly casefold?: boolean;
	readonly producer?: string;
	readonly optionsHash?: string;
}

export interface TranslationMemoryRow {
	readonly id: string;
	readonly sourceText: string;
	readonly targetText: string;
	readonly sourceDocId: string;
	readonly targetDocId: string;
	readonly source?: SpanRef;
	readonly target?: SpanRef;
	readonly relation: AlignmentRelation;
	readonly metadata: JsonObject;
	readonly evidence: Evidence;
}

export interface TranslationMemory {
	readonly id: string;
	readonly rows: readonly TranslationMemoryRow[];
	readonly indexes: JsonObject;
	readonly metadata: JsonObject;
}

export interface TmSearchOptions {
	readonly maxHits?: number;
	readonly minScore?: number;
	readonly normalize?: boolean;
	readonly casefold?: boolean;
	readonly metadata?: JsonObject;
}

export interface TranslationMemoryHit {
	readonly row: TranslationMemoryRow;
	readonly sourceText: string;
	readonly targetText: string;
	readonly score: Score;
	readonly rank: number;
	readonly matchKind: "exact" | "normalized" | "prefix" | "token-overlap";
	readonly evidence: Evidence;
	readonly metadata: JsonObject;
}

export interface BilingualTermOptions {
	readonly maxCandidates?: number;
	readonly minCount?: number;
	readonly maxTermTokens?: number;
	readonly stoplists?: readonly Wordlist[];
	readonly producer?: string;
	readonly optionsHash?: string;
}

export interface BilingualTermCandidate {
	readonly id: string;
	readonly sourceText: string;
	readonly targetText: string;
	readonly count: number;
	readonly documentCount: number;
	readonly score: Score;
	readonly rank: number;
	readonly evidence: Evidence;
	readonly features: JsonObject;
}

export interface BilingualLexiconOptions {
	readonly maxCandidates?: number;
	readonly minCount?: number;
	readonly dictionaries?: readonly BilingualDictionaryEntry[];
	readonly wordAlign?: WordAlignOptions;
	readonly producer?: string;
	readonly optionsHash?: string;
}

export interface BilingualLexiconCandidate {
	readonly id: string;
	readonly sourceForm: string;
	readonly targetForm: string;
	readonly count: number;
	readonly score: Score;
	readonly rank: number;
	readonly candidateType: "cooccurrence" | "dictionary" | "fst";
	readonly evidence: Evidence;
	readonly features: JsonObject;
}

export interface CollocationComparisonOptions {
	readonly maxResults?: number;
	readonly minCount?: number;
	readonly producer?: string;
	readonly optionsHash?: string;
}

export interface ParallelCollocationComparison {
	readonly id: string;
	readonly sourceCollocation: readonly [string, string];
	readonly targetCollocation: readonly [string, string];
	readonly count: number;
	readonly score: Score;
	readonly rank: number;
	readonly evidence: Evidence;
	readonly features: JsonObject;
}

export interface TransferResources {
	readonly dictionaries?: readonly BilingualDictionaryEntry[];
	readonly lexicons?: readonly Lexicon[];
	readonly fsts?: readonly Fst[];
	readonly rulesets?: readonly CompiledRuleSet[];
	readonly metadata?: JsonObject;
}

export interface TransferOptions {
	readonly id?: string;
	readonly sourceViewId?: string;
	readonly targetViewId?: string;
	readonly annotationLayerId?: string;
	readonly annotationType?: string;
	readonly output?: "annotation" | "view" | "both";
	readonly applyRules?: boolean;
	readonly applyRuleRewrites?: boolean;
	readonly maxAlternatives?: number;
	readonly producer?: string;
	readonly optionsHash?: string;
	readonly strict?: boolean;
}

export interface AlignmentAnnotateOptions {
	readonly layerId?: string;
	readonly annotationType?: string;
	readonly producer?: string;
	readonly optionsHash?: string;
}

interface TextSpan {
	readonly startCU: number;
	readonly endCU: number;
}

interface TextToken {
	readonly text: string;
	readonly span: TextSpan;
}

interface PairCount {
	readonly source: string;
	readonly target: string;
	readonly docIds: Set<string>;
	readonly sourceCount: number;
	readonly targetCount: number;
	count: number;
}

const relationRank: Readonly<Record<AlignmentRelation, number>> = {
	equivalent: 0,
	partial: 1,
	reordered: 2,
	inserted: 3,
	deleted: 4,
	unknown: 5,
};

export class TextParallelError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`${code}: ${message}`);
		this.name = "TextParallelError";
		this.code = code;
	}
}

function fail(code: string, message: string): never {
	throw new TextParallelError(code, message);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	if (Object.prototype.toString.call(value) !== "[object Object]") {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	if (prototype === null) return true;
	const objectConstructor = (prototype as { readonly constructor?: unknown })
		.constructor;
	return (
		typeof objectConstructor === "function" &&
		Function.prototype.toString.call(objectConstructor) ===
			Function.prototype.toString.call(Object)
	);
}

function assertJsonString(value: string, path: string): void {
	for (let index = 0; index < value.length; ) {
		const codeUnit = value.charCodeAt(index);
		if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (next >= 0xdc00 && next <= 0xdfff) {
				index += 2;
				continue;
			}
			fail(
				"TEXTPARALLEL_JSON_STRING",
				`${path} contains a lone high surrogate`,
			);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			fail("TEXTPARALLEL_JSON_STRING", `${path} contains a lone low surrogate`);
		}
		index += 1;
	}
}

function assertJsonValueInner(
	value: unknown,
	path: string,
	seen: WeakSet<object>,
): asserts value is JsonValue {
	if (value === null || typeof value === "boolean") return;
	if (typeof value === "string") {
		assertJsonString(value, path);
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			fail("TEXTPARALLEL_JSON_NUMBER", `${path} must be finite`);
		}
		return;
	}
	if (Array.isArray(value)) {
		if (seen.has(value)) fail("TEXTPARALLEL_JSON_CYCLE", `${path} is cyclic`);
		seen.add(value);
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValueInner(value[index], `${path}[${index}]`, seen);
		}
		seen.delete(value);
		return;
	}
	if (isPlainRecord(value)) {
		if (seen.has(value)) fail("TEXTPARALLEL_JSON_CYCLE", `${path} is cyclic`);
		seen.add(value);
		for (const key of Object.keys(value)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValueInner(value[key], `${path}.${key}`, seen);
		}
		seen.delete(value);
		return;
	}
	fail("TEXTPARALLEL_JSON_VALUE", `${path} must be an I-JSON value`);
}

export function assertJsonValue(
	value: unknown,
	path = "$",
): asserts value is JsonValue {
	assertJsonValueInner(value, path, new WeakSet<object>());
}

export function assertJsonObject(
	value: unknown,
	path = "$",
): asserts value is JsonObject {
	assertJsonValue(value, path);
	if (!isPlainRecord(value)) {
		fail("TEXTPARALLEL_JSON_OBJECT", `${path} must be a JSON object`);
	}
}

function stableJsonClone<T extends JsonValue>(value: T): T {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) {
		return Object.freeze(
			value.map((entry) => stableJsonClone(entry)),
		) as unknown as T;
	}
	const output: Record<string, JsonValue> = {};
	for (const key of Object.keys(value).sort(compareStrings)) {
		output[key] = stableJsonClone(
			(value as Record<string, JsonValue>)[key] as JsonValue,
		);
	}
	return Object.freeze(output) as T;
}

function jsonObjectClone(value: unknown, path: string): JsonObject {
	const input = value ?? {};
	assertJsonObject(input, path);
	return stableJsonClone(input);
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function compareNumbers(left: number, right: number): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function finiteNumber(value: number, path: string): number {
	if (!Number.isFinite(value))
		fail("TEXTPARALLEL_NUMBER", `${path} must be finite`);
	return Object.is(value, -0) ? 0 : value;
}

function stableStringify(value: JsonValue): string {
	return JSON.stringify(stableJsonClone(value));
}

function stableId(prefix: string, payload: JsonValue): string {
	return `${prefix}-${stableHash64(stableStringify(payload))}`;
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
	return Object.freeze([...new Set(values)].sort(compareStrings));
}

function optionHash(seed: JsonValue): string {
	return stableHash64(stableStringify(seed));
}

function score(kind: Score["kind"], value: number, scale?: string): Score {
	return Object.freeze({
		kind,
		value: finiteNumber(value, "score.value"),
		...(scale !== undefined ? { scale } : {}),
	});
}

function scoreValue(value: Score | undefined, fallback = 0): number {
	return value?.value ?? fallback;
}

export function parallelEvidence(
	inputViewIds: readonly string[],
	options: {
		readonly mode?: EvidenceMode | undefined;
		readonly exactness?: Exactness | undefined;
		readonly producer?: string | undefined;
		readonly resourceIds?: readonly string[] | undefined;
		readonly ruleIds?: readonly string[] | undefined;
		readonly fstIds?: readonly string[] | undefined;
		readonly grammarIds?: readonly string[] | undefined;
		readonly statisticalModelIds?: readonly string[] | undefined;
		readonly corpusIds?: readonly string[] | undefined;
		readonly optionsHash?: string | undefined;
	} = {},
): Evidence {
	return Object.freeze({
		mode: options.mode ?? "algorithm",
		exactness: options.exactness ?? "E1",
		producer: options.producer ?? "textparallel",
		packageName,
		packageVersion,
		inputViewIds: uniqueSorted(inputViewIds),
		...(options.resourceIds !== undefined
			? { resourceIds: uniqueSorted(options.resourceIds) }
			: {}),
		...(options.ruleIds !== undefined
			? { ruleIds: uniqueSorted(options.ruleIds) }
			: {}),
		...(options.fstIds !== undefined
			? { fstIds: uniqueSorted(options.fstIds) }
			: {}),
		...(options.grammarIds !== undefined
			? { grammarIds: uniqueSorted(options.grammarIds) }
			: {}),
		...(options.statisticalModelIds !== undefined
			? { statisticalModelIds: uniqueSorted(options.statisticalModelIds) }
			: {}),
		...(options.corpusIds !== undefined
			? { corpusIds: uniqueSorted(options.corpusIds) }
			: {}),
		...(options.optionsHash !== undefined
			? { optionsHash: options.optionsHash }
			: {}),
	});
}

function firstViewId(doc: TextDocument): string {
	const raw = Object.values(doc.views).find((view) => view.kind === "raw");
	if (raw !== undefined) return raw.id;
	const decoded = Object.values(doc.views).find(
		(view) => view.kind === "decoded",
	);
	if (decoded !== undefined) return decoded.id;
	const first = Object.keys(doc.views).sort(compareStrings)[0];
	if (first === undefined)
		fail("TEXTPARALLEL_VIEW_MISSING", "document has no views");
	return first;
}

function resolveView(
	doc: TextDocument,
	viewId?: string,
): { id: string; text: string } {
	const id = viewId ?? firstViewId(doc);
	const view = doc.views[id];
	if (view === undefined) {
		fail("TEXTPARALLEL_VIEW_MISSING", `view is missing: ${id}`);
	}
	return { id, text: view.text };
}

function fullSpanRef(doc: TextDocument, viewId?: string): SpanRef {
	const view = resolveView(doc, viewId);
	return spanRef(view.id, 0, view.text.length);
}

function spanRef(viewId: string, start: number, end: number): SpanRef {
	return { viewId, span: { start, end, unit: "utf16-code-unit" } };
}

function zeroSpanRef(viewId: string, offset: number): SpanRef {
	return spanRef(viewId, offset, offset);
}

function assertUtf16Span(doc: TextDocument, ref: SpanRef, path: string): void {
	const view = doc.views[ref.viewId];
	if (view === undefined) {
		fail("TEXTPARALLEL_SPAN_VIEW", `${path} references a missing view`);
	}
	if (ref.span.unit !== "utf16-code-unit") {
		fail("TEXTPARALLEL_SPAN_UNIT", `${path} must use utf16-code-unit`);
	}
	if (ref.span.end > view.text.length) {
		fail("TEXTPARALLEL_SPAN_RANGE", `${path} exceeds view text length`);
	}
}

function textForRef(doc: TextDocument, ref: SpanRef): string {
	assertUtf16Span(doc, ref, "span");
	return doc.views[ref.viewId]?.text.slice(ref.span.start, ref.span.end) ?? "";
}

function validateDocument(
	doc: TextDocument,
	strict: boolean | undefined,
): void {
	const validation = validateTextDocument(doc);
	if (!validation.ok && strict) {
		fail(
			"TEXTPARALLEL_INVALID_DOCUMENT",
			`document failed validation: ${validation.diagnostics.join("; ")}`,
		);
	}
}

function compareSpanRefs(left: SpanRef, right: SpanRef): number {
	return (
		compareStrings(left.viewId, right.viewId) ||
		compareNumbers(left.span.start, right.span.start) ||
		compareNumbers(left.span.end, right.span.end) ||
		compareStrings(left.span.unit, right.span.unit)
	);
}

export function compareAlignmentLinks(
	left: AlignmentLink,
	right: AlignmentLink,
): number {
	return (
		compareSpanRefs(left.source, right.source) ||
		compareSpanRefs(left.target, right.target) ||
		compareNumbers(relationRank[left.relation], relationRank[right.relation]) ||
		compareNumbers(scoreValue(right.score), scoreValue(left.score)) ||
		compareStrings(
			stableStringify(linkPayload(left)),
			stableStringify(linkPayload(right)),
		)
	);
}

function linkPayload(link: AlignmentLink): JsonObject {
	return {
		sourceViewId: link.source.viewId,
		sourceStart: link.source.span.start,
		sourceEnd: link.source.span.end,
		sourceUnit: link.source.span.unit,
		targetViewId: link.target.viewId,
		targetStart: link.target.span.start,
		targetEnd: link.target.span.end,
		targetUnit: link.target.span.unit,
		relation: link.relation,
		score: link.score?.value ?? null,
	};
}

export function buildAlignmentLink(input: {
	readonly source: SpanRef;
	readonly target: SpanRef;
	readonly relation?: AlignmentRelation;
	readonly score?: Score | undefined;
	readonly evidence: Evidence;
}): AlignmentLink {
	if (input.score !== undefined)
		finiteNumber(input.score.value, "alignment.score");
	return Object.freeze({
		source: input.source,
		target: input.target,
		relation: input.relation ?? "unknown",
		...(input.score !== undefined ? { score: input.score } : {}),
		evidence: input.evidence,
	});
}

function normalizedToken(value: string): string {
	return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function normalizedText(
	value: string,
	options: { readonly normalize?: boolean; readonly casefold?: boolean } = {},
): string {
	const normalized =
		options.normalize === false ? value : value.normalize("NFKC");
	return options.casefold === false
		? normalized
		: normalized.toLocaleLowerCase("en-US");
}

function textTokens(text: string): readonly TextToken[] {
	const tokens: TextToken[] = [];
	for (const span of segmentWords(text)) {
		const startCU = span.startCU;
		const endCU = span.endCU;
		const value = text.slice(startCU, endCU);
		if (/[\p{Letter}\p{Number}]/u.test(value)) {
			tokens.push({ text: value, span: { startCU, endCU } });
		}
	}
	return Object.freeze(tokens);
}

function sentenceRefsFromText(
	viewId: string,
	text: string,
): readonly SpanRef[] {
	const refs = [...segmentSentences(text)]
		.map((span) => spanRef(viewId, span.startCU, span.endCU))
		.filter(
			(ref) => text.slice(ref.span.start, ref.span.end).trim().length > 0,
		);
	return Object.freeze(refs);
}

function tokenRefsFromText(
	viewId: string,
	text: string,
): readonly { ref: SpanRef; text: string }[] {
	return Object.freeze(
		textTokens(text).map((token) => ({
			ref: spanRef(viewId, token.span.startCU, token.span.endCU),
			text: token.text,
		})),
	);
}

function refsFromLayer(
	doc: TextDocument,
	layerId: string | undefined,
	viewId: string,
): readonly SpanRef[] | undefined {
	if (layerId === undefined) return undefined;
	const layer = doc.layers[layerId];
	if (layer === undefined) return undefined;
	const refs = Object.values(layer.annotations)
		.flatMap((annotation) => annotation.spans)
		.filter(
			(ref) => ref.viewId === viewId && ref.span.unit === "utf16-code-unit",
		)
		.sort(compareSpanRefs);
	return Object.freeze(refs);
}

function tokenRefsFromLayer(
	doc: TextDocument,
	layerId: string | undefined,
	viewId: string,
): readonly { ref: SpanRef; text: string }[] | undefined {
	if (layerId === undefined) return undefined;
	const refs = refsFromLayer(doc, layerId, viewId);
	if (refs === undefined) return undefined;
	return Object.freeze(
		refs.map((ref) => ({ ref, text: textForRef(doc, ref) })),
	);
}

function sentenceRefs(
	doc: TextDocument,
	viewId: string,
	layerId: string | undefined,
): readonly SpanRef[] {
	const fromLayer = refsFromLayer(doc, layerId, viewId);
	if (fromLayer !== undefined && fromLayer.length > 0) return fromLayer;
	return sentenceRefsFromText(viewId, resolveView(doc, viewId).text);
}

function tokenRefs(
	doc: TextDocument,
	viewId: string,
	layerId: string | undefined,
): readonly { ref: SpanRef; text: string }[] {
	const fromLayer = tokenRefsFromLayer(doc, layerId, viewId);
	if (fromLayer !== undefined && fromLayer.length > 0) return fromLayer;
	return tokenRefsFromText(viewId, resolveView(doc, viewId).text);
}

function tokenOverlap(left: string, right: string): number {
	const leftTokens = new Set(
		textTokens(left).map((token) => normalizedToken(token.text)),
	);
	const rightTokens = new Set(
		textTokens(right).map((token) => normalizedToken(token.text)),
	);
	if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
	let shared = 0;
	for (const token of leftTokens) {
		if (rightTokens.has(token)) shared += 1;
	}
	return (2 * shared) / (leftTokens.size + rightTokens.size);
}

interface SentenceAlignmentStep {
	readonly sourceStart: number;
	readonly sourceCount: number;
	readonly targetStart: number;
	readonly targetCount: number;
	readonly value: number;
}

function combinedRef(
	refs: readonly SpanRef[],
	start: number,
	count: number,
	viewId: string,
	emptyOffset: number,
): SpanRef {
	if (count === 0) return zeroSpanRef(viewId, emptyOffset);
	const first = refs[start];
	const last = refs[start + count - 1];
	if (first === undefined || last === undefined) {
		fail(
			"TEXTPARALLEL_ALIGNMENT_RANGE",
			"alignment step is outside sentence spans",
		);
	}
	return spanRef(viewId, first.span.start, last.span.end);
}

function sentenceStepScore(
	sourceText: string,
	targetText: string,
	sourceCount: number,
	targetCount: number,
	options: SentenceAlignOptions,
): number {
	const lengthWeight = finiteNumber(
		options.lengthWeight ?? 0.7,
		"lengthWeight",
	);
	const lexicalWeight = finiteNumber(
		options.lexicalWeight ?? 0.3,
		"lexicalWeight",
	);
	if (
		lengthWeight < 0 ||
		lexicalWeight < 0 ||
		lengthWeight + lexicalWeight === 0
	) {
		fail(
			"TEXTPARALLEL_ALIGNMENT_WEIGHT",
			"sentence alignment weights must be non-negative with a positive sum",
		);
	}
	if (sourceCount === 0 || targetCount === 0) {
		return -0.45 * (lengthWeight + lexicalWeight);
	}
	const ratio = options.model?.averageLengthRatio ?? 1;
	const expectedTargetLength = Math.max(1, sourceText.length * ratio);
	const lengthScore = Math.max(
		0,
		1 -
			Math.abs(targetText.length - expectedTargetLength) /
				Math.max(targetText.length, expectedTargetLength),
	);
	const mergePenalty = 0.05 * Math.max(0, sourceCount + targetCount - 2);
	return (
		lengthWeight * lengthScore +
		lexicalWeight * tokenOverlap(sourceText, targetText) -
		mergePenalty
	);
}

function dynamicSentenceSteps(
	source: TextDocument,
	target: TextDocument,
	sourceRefs: readonly SpanRef[],
	targetRefs: readonly SpanRef[],
	sourceStart: number,
	sourceEnd: number,
	targetStart: number,
	targetEnd: number,
	options: SentenceAlignOptions,
): SentenceAlignmentStep[] {
	const sourceView = resolveView(source, options.sourceViewId);
	const targetView = resolveView(target, options.targetViewId);
	const sourceCount = sourceEnd - sourceStart;
	const targetCount = targetEnd - targetStart;
	const width = targetCount + 1;
	const scores = Array.from(
		{ length: (sourceCount + 1) * (targetCount + 1) },
		() => Number.NEGATIVE_INFINITY,
	);
	const previous = new Map<number, SentenceAlignmentStep>();
	scores[0] = 0;
	const moves = Object.freeze([
		[1, 1],
		[1, 2],
		[2, 1],
		[1, 0],
		[0, 1],
	] as const);
	for (let sourceOffset = 0; sourceOffset <= sourceCount; sourceOffset += 1) {
		for (let targetOffset = 0; targetOffset <= targetCount; targetOffset += 1) {
			const index = sourceOffset * width + targetOffset;
			const base = scores[index] ?? Number.NEGATIVE_INFINITY;
			if (!Number.isFinite(base)) continue;
			for (const [sourceMove, targetMove] of moves) {
				if (
					sourceOffset + sourceMove > sourceCount ||
					targetOffset + targetMove > targetCount
				) {
					continue;
				}
				const absoluteSource = sourceStart + sourceOffset;
				const absoluteTarget = targetStart + targetOffset;
				const sourceRef = combinedRef(
					sourceRefs,
					absoluteSource,
					sourceMove,
					sourceView.id,
					sourceView.text.length,
				);
				const targetRef = combinedRef(
					targetRefs,
					absoluteTarget,
					targetMove,
					targetView.id,
					targetView.text.length,
				);
				const value = sentenceStepScore(
					sourceMove === 0 ? "" : textForRef(source, sourceRef),
					targetMove === 0 ? "" : textForRef(target, targetRef),
					sourceMove,
					targetMove,
					options,
				);
				const nextSource = sourceOffset + sourceMove;
				const nextTarget = targetOffset + targetMove;
				const nextIndex = nextSource * width + nextTarget;
				const candidate = base + value;
				if (candidate <= (scores[nextIndex] ?? Number.NEGATIVE_INFINITY)) {
					continue;
				}
				scores[nextIndex] = candidate;
				previous.set(nextIndex, {
					sourceStart: absoluteSource,
					sourceCount: sourceMove,
					targetStart: absoluteTarget,
					targetCount: targetMove,
					value,
				});
			}
		}
	}
	const steps: SentenceAlignmentStep[] = [];
	let sourceOffset = sourceCount;
	let targetOffset = targetCount;
	while (sourceOffset > 0 || targetOffset > 0) {
		const step = previous.get(sourceOffset * width + targetOffset);
		if (step === undefined) {
			fail(
				"TEXTPARALLEL_ALIGNMENT_PATH",
				"sentence alignment has no valid path",
			);
		}
		steps.push(step);
		sourceOffset -= step.sourceCount;
		targetOffset -= step.targetCount;
	}
	return steps.reverse();
}

function anchorRange(
	refs: readonly SpanRef[],
	anchor: SpanRef,
): readonly [number, number] | undefined {
	const included = refs
		.map((ref, index) => ({ ref, index }))
		.filter(
			({ ref }) =>
				ref.viewId === anchor.viewId &&
				ref.span.start >= anchor.span.start &&
				ref.span.end <= anchor.span.end,
		);
	if (included.length === 0) return undefined;
	return [included[0]?.index ?? 0, (included.at(-1)?.index ?? 0) + 1];
}

export function alignSentences(
	source: TextDocument,
	target: TextDocument,
	options: SentenceAlignOptions = {},
): readonly AlignmentLink[] {
	validateDocument(source, options.strict);
	validateDocument(target, options.strict);
	const sourceView = resolveView(source, options.sourceViewId);
	const targetView = resolveView(target, options.targetViewId);
	const sourceRefs = sentenceRefs(source, sourceView.id, options.sourceLayerId);
	const targetRefs = sentenceRefs(target, targetView.id, options.targetLayerId);
	const hash =
		options.optionsHash ??
		optionHash({
			task: "sentence-align",
			sourceDoc: source.id,
			targetDoc: target.id,
			sourceViewId: sourceView.id,
			targetViewId: targetView.id,
			sourceLayerId: options.sourceLayerId ?? "",
			targetLayerId: options.targetLayerId ?? "",
			modelId: options.model?.id ?? "",
			lengthWeight: options.lengthWeight ?? 0.7,
			lexicalWeight: options.lexicalWeight ?? 0.3,
		});
	const evidence = parallelEvidence([sourceView.id, targetView.id], {
		mode: options.model === undefined ? "algorithm" : "statistical",
		exactness: options.model === undefined ? "E1" : "E2",
		producer: options.producer,
		resourceIds: options.resourceIds,
		statisticalModelIds:
			options.model === undefined ? undefined : [options.model.id],
		optionsHash: hash,
	});
	const anchored = (options.anchors ?? [])
		.map((link) => ({
			link,
			sourceRange: anchorRange(sourceRefs, link.source),
			targetRange: anchorRange(targetRefs, link.target),
		}))
		.filter(
			(
				value,
			): value is {
				readonly link: AlignmentLink;
				readonly sourceRange: readonly [number, number];
				readonly targetRange: readonly [number, number];
			} => value.sourceRange !== undefined && value.targetRange !== undefined,
		)
		.sort(
			(left, right) =>
				left.sourceRange[0] - right.sourceRange[0] ||
				left.targetRange[0] - right.targetRange[0],
		);
	const steps: SentenceAlignmentStep[] = [];
	const links: AlignmentLink[] = [];
	let sourceCursor = 0;
	let targetCursor = 0;
	for (const anchor of anchored) {
		if (
			anchor.sourceRange[0] < sourceCursor ||
			anchor.targetRange[0] < targetCursor
		) {
			fail(
				"TEXTPARALLEL_ANCHOR_ORDER",
				"sentence anchors must be monotonic and non-overlapping",
			);
		}
		steps.push(
			...dynamicSentenceSteps(
				source,
				target,
				sourceRefs,
				targetRefs,
				sourceCursor,
				anchor.sourceRange[0],
				targetCursor,
				anchor.targetRange[0],
				options,
			),
		);
		links.push(anchor.link);
		sourceCursor = anchor.sourceRange[1];
		targetCursor = anchor.targetRange[1];
	}
	steps.push(
		...dynamicSentenceSteps(
			source,
			target,
			sourceRefs,
			targetRefs,
			sourceCursor,
			sourceRefs.length,
			targetCursor,
			targetRefs.length,
			options,
		),
	);
	for (const step of steps) {
		const sourceRef = combinedRef(
			sourceRefs,
			step.sourceStart,
			step.sourceCount,
			sourceView.id,
			sourceView.text.length,
		);
		const targetRef = combinedRef(
			targetRefs,
			step.targetStart,
			step.targetCount,
			targetView.id,
			targetView.text.length,
		);
		const relation: AlignmentRelation =
			step.sourceCount === 0
				? "inserted"
				: step.targetCount === 0
					? "deleted"
					: step.sourceCount === 1 &&
							step.targetCount === 1 &&
							step.value >= 0.55
						? "equivalent"
						: "partial";
		links.push(
			buildAlignmentLink({
				source: sourceRef,
				target: targetRef,
				relation,
				score: score("weight", Math.max(0, step.value), "dynamic-programming"),
				evidence,
			}),
		);
	}
	return Object.freeze(
		links
			.sort(compareAlignmentLinks)
			.slice(0, options.maxLinks ?? links.length),
	);
}

function dictionaryTargets(
	sourceText: string,
	dictionaries: readonly BilingualDictionaryEntry[],
): readonly { target: string; weight: number }[] {
	const key = normalizedToken(sourceText);
	return Object.freeze(
		dictionaries
			.filter((entry) => normalizedToken(entry.source) === key)
			.map((entry) => ({
				target: entry.target,
				weight: finiteNumber(entry.weight ?? 1, "dictionary.weight"),
			}))
			.sort(
				(left, right) =>
					compareNumbers(right.weight, left.weight) ||
					compareStrings(left.target, right.target),
			),
	);
}

function fstTargets(
	sourceText: string,
	fsts: readonly Fst[],
): readonly { target: string; weight: number; fstId: string }[] {
	const values = fsts.flatMap((fst) =>
		applyDown(fst, sourceText, { maxResults: 4 }).map((result) => ({
			target: result.output,
			weight: result.weight === undefined ? 0.8 : 1 / (1 + result.weight),
			fstId: fst.id,
		})),
	);
	return Object.freeze(
		values.sort(
			(left, right) =>
				compareNumbers(right.weight, left.weight) ||
				compareStrings(left.target, right.target) ||
				compareStrings(left.fstId, right.fstId),
		),
	);
}

function lexiconHints(
	sourceText: string,
	sourceLexicons: readonly Lexicon[],
): readonly string[] {
	return uniqueSorted(
		sourceLexicons.flatMap((lexicon) =>
			lookup(lexicon, sourceText, {
				mode: ["exact", "normalized", "casefold"],
			}).flatMap((match) => [
				match.canonical ?? match.form,
				...(match.entry.variants ?? []),
				...(match.entry.aliases ?? []),
			]),
		),
	);
}

function wordPairScore(
	sourceText: string,
	targetText: string,
	positionScore: number,
	options: WordAlignOptions,
): {
	value: number;
	type: "dictionary" | "fst" | "lexicon" | "surface" | "position";
} {
	const sourceKey = normalizedToken(sourceText);
	const targetKey = normalizedToken(targetText);
	for (const entry of dictionaryTargets(sourceText, [
		...(options.dictionaries ?? []),
		...(options.model?.dictionary ?? []),
	])) {
		if (normalizedToken(entry.target) === targetKey) {
			return {
				value: 1.4 * entry.weight + 0.2 * positionScore,
				type: "dictionary",
			};
		}
	}
	for (const entry of fstTargets(sourceText, options.fsts ?? [])) {
		if (normalizedToken(entry.target) === targetKey) {
			return { value: 1.1 * entry.weight + 0.2 * positionScore, type: "fst" };
		}
	}
	const hints = new Set(lexiconHints(sourceText, options.sourceLexicons ?? []));
	if (hints.has(targetText) || hints.has(targetKey)) {
		return { value: 0.9 + 0.2 * positionScore, type: "lexicon" };
	}
	if (sourceKey === targetKey) {
		return { value: 0.8 + 0.2 * positionScore, type: "surface" };
	}
	return { value: 0.2 * positionScore, type: "position" };
}

function maximumWeightAssignment(
	weights: readonly (readonly number[])[],
): readonly number[] {
	const size = weights.length;
	if (size === 0) return Object.freeze([]);
	const u = Array.from({ length: size + 1 }, () => 0);
	const v = Array.from({ length: size + 1 }, () => 0);
	const matching = Array.from({ length: size + 1 }, () => 0);
	const path = Array.from({ length: size + 1 }, () => 0);
	for (let row = 1; row <= size; row += 1) {
		matching[0] = row;
		let column = 0;
		const minimum = Array.from(
			{ length: size + 1 },
			() => Number.POSITIVE_INFINITY,
		);
		const used = Array.from({ length: size + 1 }, () => false);
		do {
			used[column] = true;
			const matchedRow = matching[column] ?? 0;
			let delta = Number.POSITIVE_INFINITY;
			let nextColumn = 0;
			for (
				let candidateColumn = 1;
				candidateColumn <= size;
				candidateColumn += 1
			) {
				if (used[candidateColumn]) continue;
				const cost =
					-(weights[matchedRow - 1]?.[candidateColumn - 1] ?? 0) -
					(u[matchedRow] ?? 0) -
					(v[candidateColumn] ?? 0);
				if (cost < (minimum[candidateColumn] ?? Number.POSITIVE_INFINITY)) {
					minimum[candidateColumn] = cost;
					path[candidateColumn] = column;
				}
				if ((minimum[candidateColumn] ?? Number.POSITIVE_INFINITY) < delta) {
					delta = minimum[candidateColumn] ?? Number.POSITIVE_INFINITY;
					nextColumn = candidateColumn;
				}
			}
			for (
				let candidateColumn = 0;
				candidateColumn <= size;
				candidateColumn += 1
			) {
				if (used[candidateColumn]) {
					const matched = matching[candidateColumn] ?? 0;
					u[matched] = (u[matched] ?? 0) + delta;
					v[candidateColumn] = (v[candidateColumn] ?? 0) - delta;
				} else {
					minimum[candidateColumn] =
						(minimum[candidateColumn] ?? Number.POSITIVE_INFINITY) - delta;
				}
			}
			column = nextColumn;
		} while ((matching[column] ?? 0) !== 0);
		do {
			const previousColumn = path[column] ?? 0;
			matching[column] = matching[previousColumn] ?? 0;
			column = previousColumn;
		} while (column !== 0);
	}
	const assignment = Array.from({ length: size }, () => -1);
	for (let column = 1; column <= size; column += 1) {
		const row = matching[column] ?? 0;
		if (row > 0) assignment[row - 1] = column - 1;
	}
	return Object.freeze(assignment);
}

export function alignWords(
	source: TextDocument,
	target: TextDocument,
	options: WordAlignOptions = {},
): readonly AlignmentLink[] {
	validateDocument(source, options.strict);
	validateDocument(target, options.strict);
	const sourceView = resolveView(source, options.sourceViewId);
	const targetView = resolveView(target, options.targetViewId);
	const sourceTokens = tokenRefs(
		source,
		sourceView.id,
		options.sourceTokenLayerId,
	);
	const targetTokens = tokenRefs(
		target,
		targetView.id,
		options.targetTokenLayerId,
	);
	const hash =
		options.optionsHash ??
		optionHash({
			task: "word-align",
			sourceDoc: source.id,
			targetDoc: target.id,
			sourceViewId: sourceView.id,
			targetViewId: targetView.id,
			dictionaries: (options.dictionaries ?? []).map((entry) => [
				entry.source,
				entry.target,
			]),
			modelId: options.model?.id ?? "",
		});
	const evidence = parallelEvidence([sourceView.id, targetView.id], {
		mode: "composite",
		exactness: options.model === undefined ? "E1" : "E2",
		producer: options.producer,
		resourceIds: [
			...(options.resourceIds ?? []),
			...(options.sourceLexicons ?? []).map((lexicon) => lexicon.id),
			...(options.targetLexicons ?? []).map((lexicon) => lexicon.id),
		],
		fstIds: (options.fsts ?? []).map((fst) => fst.id),
		statisticalModelIds:
			options.model === undefined ? undefined : [options.model.id],
		optionsHash: hash,
	});
	const minScore = finiteNumber(options.minScore ?? 0.35, "minScore");
	const size = sourceTokens.length + targetTokens.length;
	const candidates = sourceTokens.map((sourceToken, sourceIndex) =>
		targetTokens.map((targetToken, targetIndex) => {
			const distance = Math.abs(
				(sourceIndex + 0.5) / Math.max(1, sourceTokens.length) -
					(targetIndex + 0.5) / Math.max(1, targetTokens.length),
			);
			return wordPairScore(
				sourceToken.text,
				targetToken.text,
				1 - Math.min(1, distance),
				options,
			);
		}),
	);
	const weights = Array.from({ length: size }, (_row, row) =>
		Array.from({ length: size }, (_column, column) => {
			if (row >= sourceTokens.length || column >= targetTokens.length) return 0;
			const value = candidates[row]?.[column]?.value ?? 0;
			return value >= minScore ? value : 0;
		}),
	);
	const assignment = maximumWeightAssignment(weights);
	const usedTargets = new Set<number>();
	const links: AlignmentLink[] = [];
	for (const [sourceIndex, sourceToken] of sourceTokens.entries()) {
		const targetIndex = assignment[sourceIndex] ?? -1;
		const selected =
			targetIndex >= 0 && targetIndex < targetTokens.length
				? candidates[sourceIndex]?.[targetIndex]
				: undefined;
		const targetToken = targetTokens[targetIndex];
		if (
			selected !== undefined &&
			targetToken !== undefined &&
			selected.value >= minScore
		) {
			usedTargets.add(targetIndex);
			links.push(
				buildAlignmentLink({
					source: sourceToken.ref,
					target: targetToken.ref,
					relation: selected.type === "position" ? "unknown" : "equivalent",
					score: score("weight", selected.value, selected.type),
					evidence,
				}),
			);
			continue;
		}
		if (options.allowNullLinks ?? true) {
			links.push(
				buildAlignmentLink({
					source: sourceToken.ref,
					target: zeroSpanRef(targetView.id, targetView.text.length),
					relation: "deleted",
					score: score("weight", 0, "null"),
					evidence,
				}),
			);
		}
	}
	if (options.allowNullLinks ?? true) {
		for (const [targetIndex, targetToken] of targetTokens.entries()) {
			if (usedTargets.has(targetIndex)) continue;
			links.push(
				buildAlignmentLink({
					source: zeroSpanRef(sourceView.id, sourceView.text.length),
					target: targetToken.ref,
					relation: "inserted",
					score: score("weight", 0, "null"),
					evidence,
				}),
			);
		}
	}
	return Object.freeze(
		links
			.sort(compareAlignmentLinks)
			.slice(0, options.maxLinks ?? links.length),
	);
}

export function trainSentenceAligner(
	examples: Iterable<ParallelDocument>,
	options: { readonly id?: string; readonly metadata?: JsonObject } = {},
): SentenceAlignmentModel {
	let examplesCount = 0;
	let ratioTotal = 0;
	for (const doc of examples) {
		for (const link of doc.links) {
			const sourceLength = textForRef(doc.sourceDoc, link.source).length;
			const targetLength = textForRef(doc.targetDoc, link.target).length;
			if (sourceLength === 0 || targetLength === 0) continue;
			ratioTotal += targetLength / sourceLength;
			examplesCount += 1;
		}
	}
	const averageLengthRatio =
		examplesCount === 0 ? 1 : ratioTotal / examplesCount;
	const metadata = jsonObjectClone(
		options.metadata,
		"sentenceAligner.metadata",
	);
	return Object.freeze({
		id:
			options.id ??
			stableId("sentence-aligner", {
				examples: examplesCount,
				averageLengthRatio,
				metadata,
			}),
		kind: "sentence-alignment",
		examples: examplesCount,
		averageLengthRatio: finiteNumber(
			averageLengthRatio,
			"sentenceAligner.averageLengthRatio",
		),
		metadata,
	});
}

export function trainWordAligner(
	examples: Iterable<ParallelDocument>,
	options: {
		readonly id?: string;
		readonly metadata?: JsonObject;
		readonly iterations?: number;
		readonly maxEntries?: number;
		readonly minProbability?: number;
	} = {},
): WordAlignmentModel {
	const iterations = options.iterations ?? 8;
	const maxEntries = options.maxEntries ?? 256;
	const minProbability = options.minProbability ?? 0.01;
	if (!Number.isInteger(iterations) || iterations <= 0) {
		fail("TEXTPARALLEL_WORD_TRAINING", "iterations must be a positive integer");
	}
	if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
		fail("TEXTPARALLEL_WORD_TRAINING", "maxEntries must be a positive integer");
	}
	if (
		!Number.isFinite(minProbability) ||
		minProbability < 0 ||
		minProbability > 1
	) {
		fail(
			"TEXTPARALLEL_WORD_TRAINING",
			"minProbability must be between zero and one",
		);
	}
	const sentencePairs: Array<{
		readonly source: readonly string[];
		readonly target: readonly string[];
	}> = [];
	const sourceForms = new Map<string, string>();
	const targetForms = new Map<string, string>();
	const candidateTargets = new Map<string, Set<string>>();
	let examplesCount = 0;
	for (const doc of examples) {
		for (const link of doc.links) {
			if (link.relation !== "equivalent" && link.relation !== "partial")
				continue;
			const sourceText = textForRef(doc.sourceDoc, link.source).trim();
			const targetText = textForRef(doc.targetDoc, link.target).trim();
			if (sourceText.length === 0 || targetText.length === 0) continue;
			const sourceTokens = textTokens(sourceText).map((token) => {
				const normalized = normalizedToken(token.text);
				if (!sourceForms.has(normalized))
					sourceForms.set(normalized, token.text);
				return normalized;
			});
			const targetTokens = textTokens(targetText).map((token) => {
				const normalized = normalizedToken(token.text);
				if (!targetForms.has(normalized))
					targetForms.set(normalized, token.text);
				return normalized;
			});
			if (sourceTokens.length === 0 || targetTokens.length === 0) continue;
			sentencePairs.push({ source: sourceTokens, target: targetTokens });
			for (const sourceToken of new Set(sourceTokens)) {
				const targets = candidateTargets.get(sourceToken) ?? new Set<string>();
				for (const targetToken of targetTokens) targets.add(targetToken);
				candidateTargets.set(sourceToken, targets);
			}
			examplesCount += 1;
		}
	}
	let probabilities = new Map<string, number>();
	for (const [sourceToken, targets] of candidateTargets) {
		const initial = 1 / Math.max(1, targets.size);
		for (const targetToken of targets) {
			probabilities.set(`${sourceToken}\u0000${targetToken}`, initial);
		}
	}
	for (let iteration = 0; iteration < iterations; iteration += 1) {
		const expectedCounts = new Map<string, number>();
		const sourceTotals = new Map<string, number>();
		for (const pair of sentencePairs) {
			for (
				let targetIndex = 0;
				targetIndex < pair.target.length;
				targetIndex += 1
			) {
				const targetToken = pair.target[targetIndex] as string;
				const contributions = pair.source.map((sourceToken, sourceIndex) => {
					const lexical =
						probabilities.get(`${sourceToken}\u0000${targetToken}`) ?? 0;
					const distance = Math.abs(
						(sourceIndex + 0.5) / pair.source.length -
							(targetIndex + 0.5) / pair.target.length,
					);
					return lexical * Math.exp(-3 * distance);
				});
				const denominator = contributions.reduce(
					(sum, value) => sum + value,
					0,
				);
				if (denominator === 0) continue;
				for (
					let sourceIndex = 0;
					sourceIndex < pair.source.length;
					sourceIndex += 1
				) {
					const sourceToken = pair.source[sourceIndex] as string;
					const key = `${sourceToken}\u0000${targetToken}`;
					const contribution = (contributions[sourceIndex] ?? 0) / denominator;
					expectedCounts.set(
						key,
						(expectedCounts.get(key) ?? 0) + contribution,
					);
					sourceTotals.set(
						sourceToken,
						(sourceTotals.get(sourceToken) ?? 0) + contribution,
					);
				}
			}
		}
		probabilities = new Map(
			[...expectedCounts].map(([key, count]) => {
				const separator = key.indexOf("\u0000");
				const sourceToken = key.slice(0, separator);
				return [
					key,
					count / Math.max(1e-12, sourceTotals.get(sourceToken) ?? 0),
				];
			}),
		);
	}
	const dictionary = Object.freeze(
		[...probabilities]
			.map(([key, probability]) => {
				const separator = key.indexOf("\u0000");
				const source = key.slice(0, separator);
				const target = key.slice(separator + 1);
				return {
					source: sourceForms.get(source) ?? source,
					target: targetForms.get(target) ?? target,
					weight: probability,
				};
			})
			.filter((entry) => entry.weight >= minProbability)
			.sort(
				(left, right) =>
					compareNumbers(right.weight, left.weight) ||
					compareStrings(left.source, right.source) ||
					compareStrings(left.target, right.target),
			)
			.slice(0, maxEntries),
	);
	const metadata = jsonObjectClone(options.metadata, "wordAligner.metadata");
	return Object.freeze({
		id:
			options.id ??
			stableId("word-aligner", {
				examples: examplesCount,
				iterations,
				dictionary,
				metadata,
			}),
		kind: "word-alignment",
		examples: examplesCount,
		dictionary,
		metadata,
	});
}

export function createParallelDocument(
	sourceDoc: TextDocument,
	targetDoc: TextDocument,
	options: ParallelDocumentOptions = {},
): ParallelDocument {
	validateDocument(sourceDoc, options.strict);
	validateDocument(targetDoc, options.strict);
	const metadata = jsonObjectClone(
		options.metadata,
		"parallelDocument.metadata",
	);
	const links = Object.freeze(
		[...(options.links ?? [])].sort(compareAlignmentLinks),
	);
	return Object.freeze({
		id:
			options.id ??
			stableId("parallel-doc", {
				sourceDocId: sourceDoc.id,
				targetDocId: targetDoc.id,
				linkCount: links.length,
				metadata,
			}),
		sourceDoc,
		targetDoc,
		links,
		metadata,
	});
}

function metadataWithLanguage(language: string | undefined): JsonObject {
	return language === undefined ? {} : { language };
}

function spanRefPayload(ref: SpanRef): JsonObject {
	return {
		viewId: ref.viewId,
		span: {
			start: ref.span.start,
			end: ref.span.end,
			unit: ref.span.unit,
		},
	};
}

export function parallelDocumentsFromRecords(
	records: Iterable<ParallelRecord>,
	options: { readonly strict?: boolean; readonly producer?: string } = {},
): readonly ParallelDocument[] {
	const docs: ParallelDocument[] = [];
	for (const record of records) {
		const sourceDoc =
			record.sourceDocument ??
			createDocument(record.sourceText ?? "", {
				id: `${record.id}:source`,
				metadata: metadataWithLanguage(record.sourceLanguage),
			});
		const targetDoc =
			record.targetDocument ??
			createDocument(record.targetText ?? "", {
				id: `${record.id}:target`,
				metadata: metadataWithLanguage(record.targetLanguage),
			});
		const sourceViewId = firstViewId(sourceDoc);
		const targetViewId = firstViewId(targetDoc);
		const evidence = parallelEvidence([sourceViewId, targetViewId], {
			mode: "manual",
			exactness: "E1",
			producer: options.producer,
		});
		const links = (record.alignments ?? []).map((link) =>
			buildAlignmentLink({
				source: link.source,
				target: link.target,
				relation: isAlignmentRelation(link.relation)
					? link.relation
					: "unknown",
				...(link.confidence === undefined
					? {}
					: { score: score("probability", link.confidence) }),
				evidence,
			}),
		);
		docs.push(
			createParallelDocument(sourceDoc, targetDoc, {
				id: record.id,
				links,
				metadata: jsonObjectClone(
					record.metadata,
					`record.${record.id}.metadata`,
				),
				strict: options.strict,
			}),
		);
	}
	return Object.freeze(
		docs.sort((left, right) => compareStrings(left.id, right.id)),
	);
}

function isAlignmentRelation(value: unknown): value is AlignmentRelation {
	return (
		value === "equivalent" ||
		value === "partial" ||
		value === "inserted" ||
		value === "deleted" ||
		value === "reordered" ||
		value === "unknown"
	);
}

export function createParallelCorpus(
	documents: Iterable<ParallelDocument>,
	options: ParallelCorpusOptions = {},
): ParallelCorpus {
	const docs = [...documents].sort((left, right) =>
		compareStrings(left.id, right.id),
	);
	const seen = new Set<string>();
	for (const doc of docs) {
		if (seen.has(doc.id))
			fail(
				"TEXTPARALLEL_DUPLICATE_DOC",
				`duplicate parallel document id: ${doc.id}`,
			);
		seen.add(doc.id);
	}
	const relationCounts: Record<string, number> = {};
	let linkCount = 0;
	for (const doc of docs) {
		for (const link of doc.links) {
			linkCount += 1;
			relationCounts[link.relation] = (relationCounts[link.relation] ?? 0) + 1;
		}
	}
	const metadata = jsonObjectClone(options.metadata, "parallelCorpus.metadata");
	return Object.freeze({
		id:
			options.id ??
			stableId("parallel-corpus", {
				documentIds: docs.map((doc) => doc.id),
				sourceLanguage: options.sourceLanguage ?? "",
				targetLanguage: options.targetLanguage ?? "",
			}),
		documents: Object.freeze(docs),
		...(options.sourceLanguage !== undefined
			? { sourceLanguage: options.sourceLanguage }
			: {}),
		...(options.targetLanguage !== undefined
			? { targetLanguage: options.targetLanguage }
			: {}),
		indexes: stableJsonClone({
			documents: docs.length,
			links: linkCount,
			relations: relationCounts,
		}),
		metadata,
	});
}

function tmRowFromLink(
	doc: ParallelDocument,
	link: AlignmentLink,
	evidence: Evidence,
): TranslationMemoryRow | undefined {
	const sourceText = textForRef(doc.sourceDoc, link.source).trim();
	const targetText = textForRef(doc.targetDoc, link.target).trim();
	if (sourceText.length === 0 || targetText.length === 0) return undefined;
	const metadata = stableJsonClone({
		parallelDocumentId: doc.id,
		relation: link.relation,
	});
	return Object.freeze({
		id: stableId("tm-row", {
			docId: doc.id,
			sourceText,
			targetText,
			source: spanRefPayload(link.source),
			target: spanRefPayload(link.target),
			relation: link.relation,
		}),
		sourceText,
		targetText,
		sourceDocId: doc.sourceDoc.id,
		targetDocId: doc.targetDoc.id,
		source: link.source,
		target: link.target,
		relation: link.relation,
		metadata,
		evidence,
	});
}

export function buildTranslationMemory(
	docs: Iterable<ParallelDocument>,
	options: TmOptions = {},
): TranslationMemory {
	const docList = [...docs].sort((left, right) =>
		compareStrings(left.id, right.id),
	);
	const hash =
		options.optionsHash ??
		optionHash({
			task: "translation-memory",
			docIds: docList.map((doc) => doc.id),
			duplicatePolicy: options.duplicatePolicy ?? "collapse",
		});
	const evidence = parallelEvidence(
		uniqueSorted(
			docList.flatMap((doc) => [
				firstViewId(doc.sourceDoc),
				firstViewId(doc.targetDoc),
			]),
		),
		{
			mode: "corpus",
			exactness: "E2",
			producer: options.producer,
			corpusIds: docList.map((doc) => doc.id),
			optionsHash: hash,
		},
	);
	const rows: TranslationMemoryRow[] = [];
	const seen = new Set<string>();
	for (const doc of docList) {
		const candidateLinks =
			doc.links.length === 0
				? [
						buildAlignmentLink({
							source: fullSpanRef(doc.sourceDoc, options.sourceViewId),
							target: fullSpanRef(doc.targetDoc, options.targetViewId),
							relation: "equivalent",
							score: score("weight", 1),
							evidence,
						}),
					]
				: doc.links;
		for (const link of candidateLinks) {
			if (link.relation === "inserted" || link.relation === "deleted") continue;
			const row = tmRowFromLink(doc, link, evidence);
			if (row === undefined) continue;
			const dedupeKey = `${normalizedText(row.sourceText)}\u0000${normalizedText(row.targetText)}`;
			if (
				(options.duplicatePolicy ?? "collapse") === "collapse" &&
				seen.has(dedupeKey)
			) {
				continue;
			}
			seen.add(dedupeKey);
			rows.push(row);
		}
	}
	const sortedRows = Object.freeze(
		rows.sort((left, right) => compareStrings(left.id, right.id)),
	);
	const index: Record<string, readonly string[]> = {};
	for (const row of sortedRows) {
		const key = normalizedText(row.sourceText, options);
		index[key] = Object.freeze(
			[...(index[key] ?? []), row.id].sort(compareStrings),
		);
	}
	const metadata = jsonObjectClone(
		options.metadata,
		"translationMemory.metadata",
	);
	return Object.freeze({
		id:
			options.id ??
			stableId("tm", {
				rowIds: sortedRows.map((row) => row.id),
				metadata,
			}),
		rows: sortedRows,
		indexes: stableJsonClone({
			keys: Object.keys(index).sort(compareStrings),
			rowCount: sortedRows.length,
		}),
		metadata,
	});
}

function tmHitScore(
	query: string,
	row: TranslationMemoryRow,
	options: TmSearchOptions,
): { value: number; kind: TranslationMemoryHit["matchKind"] } {
	const queryKey = normalizedText(query, options);
	const rowKey = normalizedText(row.sourceText, options);
	if (queryKey === rowKey) return { value: 1, kind: "exact" };
	if (rowKey.startsWith(queryKey) || queryKey.startsWith(rowKey)) {
		return { value: 0.86, kind: "prefix" };
	}
	if (rowKey.includes(queryKey) || queryKey.includes(rowKey)) {
		return { value: 0.74, kind: "normalized" };
	}
	return { value: tokenOverlap(query, row.sourceText), kind: "token-overlap" };
}

function metadataMatches(
	metadata: JsonObject,
	filter: JsonObject | undefined,
): boolean {
	if (filter === undefined) return true;
	for (const [key, value] of Object.entries(filter)) {
		if (metadata[key] !== value) return false;
	}
	return true;
}

export function searchTranslationMemory(
	tm: TranslationMemory,
	query: string,
	options: TmSearchOptions = {},
): readonly TranslationMemoryHit[] {
	assertJsonObject(tm.metadata, "tm.metadata");
	const minScore = options.minScore ?? 0.01;
	const hits = tm.rows
		.filter((row) => metadataMatches(row.metadata, options.metadata))
		.map((row) => {
			const result = tmHitScore(query, row, options);
			return {
				row,
				result,
			};
		})
		.filter(({ result }) => result.value >= minScore)
		.sort(
			(left, right) =>
				compareNumbers(right.result.value, left.result.value) ||
				compareStrings(left.row.id, right.row.id),
		)
		.slice(0, options.maxHits ?? 20)
		.map(
			({ row, result }, index): TranslationMemoryHit => ({
				row,
				sourceText: row.sourceText,
				targetText: row.targetText,
				score: score("weight", result.value, result.kind),
				rank: index + 1,
				matchKind: result.kind,
				evidence: parallelEvidence([], {
					mode: "search",
					exactness: "E2",
					producer: "textparallel",
					resourceIds: [tm.id],
				}),
				metadata: stableJsonClone({ tmId: tm.id, rowId: row.id }),
			}),
		);
	return Object.freeze(hits);
}

function stoplisted(term: string, stoplists: readonly Wordlist[]): boolean {
	const tokens = textTokens(term).map((token) => token.text);
	return (
		tokens.length > 0 &&
		tokens.every((token) =>
			stoplists.some(
				(wordlist) =>
					wordlist.keys.includes(normalizedToken(token)) ||
					wordlist.forms.some(
						(form) => normalizedToken(form) === normalizedToken(token),
					),
			),
		)
	);
}

function pairCountsFromLinks(
	corpus: ParallelCorpus,
	options: BilingualTermOptions = {},
): readonly PairCount[] {
	const maxTermTokens = options.maxTermTokens ?? 3;
	if (!Number.isInteger(maxTermTokens) || maxTermTokens <= 0) {
		fail(
			"TEXTPARALLEL_TERM_LENGTH",
			"maxTermTokens must be a positive integer",
		);
	}
	const counts = new Map<
		string,
		{ source: string; target: string; docIds: Set<string>; count: number }
	>();
	const sourceCounts = new Map<string, number>();
	const targetCounts = new Map<string, number>();
	for (const doc of corpus.documents) {
		for (const link of doc.links) {
			if (link.relation === "inserted" || link.relation === "deleted") continue;
			const sourceTokens = textTokens(textForRef(doc.sourceDoc, link.source));
			const targetTokens = textTokens(textForRef(doc.targetDoc, link.target));
			if (sourceTokens.length === 0 || targetTokens.length === 0) continue;
			for (let start = 0; start < sourceTokens.length; start += 1) {
				for (
					let length = 1;
					length <= maxTermTokens && start + length <= sourceTokens.length;
					length += 1
				) {
					const projectedStart = Math.min(
						targetTokens.length - 1,
						Math.floor((start / sourceTokens.length) * targetTokens.length),
					);
					const projectedEnd = Math.min(
						targetTokens.length,
						Math.max(
							projectedStart + 1,
							Math.ceil(
								((start + length) / sourceTokens.length) * targetTokens.length,
							),
						),
					);
					const targetEnd = Math.min(
						projectedEnd,
						projectedStart + maxTermTokens,
					);
					const sourceText = sourceTokens
						.slice(start, start + length)
						.map((token) => token.text)
						.join(" ");
					const targetText = targetTokens
						.slice(projectedStart, targetEnd)
						.map((token) => token.text)
						.join(" ");
					if (stoplisted(sourceText, options.stoplists ?? [])) continue;
					if (stoplisted(targetText, options.stoplists ?? [])) continue;
					const sourceKey = normalizedText(sourceText);
					const targetKey = normalizedText(targetText);
					const key = `${sourceKey}\u0000${targetKey}`;
					const item = counts.get(key) ?? {
						source: sourceText,
						target: targetText,
						docIds: new Set<string>(),
						count: 0,
					};
					item.count += 1;
					item.docIds.add(doc.id);
					counts.set(key, item);
					sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);
					targetCounts.set(targetKey, (targetCounts.get(targetKey) ?? 0) + 1);
				}
			}
		}
	}
	return Object.freeze(
		[...counts].map(([key, item]) => {
			const separator = key.indexOf("\u0000");
			return {
				...item,
				sourceCount: sourceCounts.get(key.slice(0, separator)) ?? item.count,
				targetCount: targetCounts.get(key.slice(separator + 1)) ?? item.count,
			};
		}),
	);
}

export function extractBilingualTerms(
	corpus: ParallelCorpus,
	options: BilingualTermOptions = {},
): readonly BilingualTermCandidate[] {
	const hash =
		options.optionsHash ??
		optionHash({
			task: "bilingual-terms",
			corpusId: corpus.id,
			minCount: options.minCount ?? 1,
			maxTermTokens: options.maxTermTokens ?? 3,
		});
	const evidence = parallelEvidence([], {
		mode: "corpus",
		exactness: "E2",
		producer: options.producer,
		corpusIds: [corpus.id],
		optionsHash: hash,
	});
	const candidates = pairCountsFromLinks(corpus, options)
		.filter((item) => item.count >= (options.minCount ?? 1))
		.map((item) => {
			const association =
				(2 * item.count) / Math.max(1, item.sourceCount + item.targetCount);
			return {
				item,
				association,
				value:
					association *
					Math.log1p(item.count) *
					(1 + item.docIds.size / Math.max(1, corpus.documents.length)),
			};
		})
		.sort(
			(left, right) =>
				compareNumbers(right.value, left.value) ||
				compareNumbers(right.item.count, left.item.count) ||
				compareNumbers(right.item.docIds.size, left.item.docIds.size) ||
				compareStrings(left.item.source, right.item.source) ||
				compareStrings(left.item.target, right.item.target),
		)
		.slice(0, options.maxCandidates ?? 50)
		.map(({ item, association, value }, index): BilingualTermCandidate => {
			return {
				id: stableId("biterm", {
					corpusId: corpus.id,
					source: item.source,
					target: item.target,
				}),
				sourceText: item.source,
				targetText: item.target,
				count: item.count,
				documentCount: item.docIds.size,
				score: score("association", value, "aligned-ngram-dice"),
				rank: index + 1,
				evidence,
				features: stableJsonClone({
					corpusId: corpus.id,
					sourceTokenCount: textTokens(item.source).length,
					targetTokenCount: textTokens(item.target).length,
					association,
				}),
			};
		});
	return Object.freeze(candidates);
}

export function induceBilingualLexicon(
	corpus: ParallelCorpus,
	options: BilingualLexiconOptions = {},
): readonly BilingualLexiconCandidate[] {
	const counts = new Map<
		string,
		{
			source: string;
			target: string;
			count: number;
			type: BilingualLexiconCandidate["candidateType"];
		}
	>();
	for (const doc of corpus.documents) {
		for (const link of alignWords(doc.sourceDoc, doc.targetDoc, {
			...options.wordAlign,
			dictionaries: [
				...(options.wordAlign?.dictionaries ?? []),
				...(options.dictionaries ?? []),
			],
			allowNullLinks: false,
		})) {
			if (link.relation !== "equivalent" && link.relation !== "partial")
				continue;
			const sourceText = textForRef(doc.sourceDoc, link.source).trim();
			const targetText = textForRef(doc.targetDoc, link.target).trim();
			if (sourceText.length === 0 || targetText.length === 0) continue;
			const key = `${normalizedToken(sourceText)}\u0000${normalizedToken(targetText)}`;
			const type =
				link.score?.scale === "dictionary"
					? "dictionary"
					: link.score?.scale === "fst"
						? "fst"
						: "cooccurrence";
			const item = counts.get(key) ?? {
				source: sourceText,
				target: targetText,
				count: 0,
				type,
			};
			item.count += 1;
			counts.set(key, item);
		}
	}
	for (const entry of options.dictionaries ?? []) {
		const key = `${normalizedToken(entry.source)}\u0000${normalizedToken(entry.target)}`;
		const item = counts.get(key) ?? {
			source: entry.source,
			target: entry.target,
			count: 0,
			type: "dictionary" as const,
		};
		item.count += finiteNumber(entry.weight ?? 1, "dictionary.weight");
		counts.set(key, item);
	}
	const hash =
		options.optionsHash ??
		optionHash({ task: "bilingual-lexicon", corpusId: corpus.id });
	const evidence = parallelEvidence([], {
		mode: "composite",
		exactness: "E2",
		producer: options.producer,
		corpusIds: [corpus.id],
		optionsHash: hash,
	});
	const candidates = [...counts.values()]
		.filter((item) => item.count >= (options.minCount ?? 1))
		.sort(
			(left, right) =>
				compareNumbers(right.count, left.count) ||
				compareStrings(left.source, right.source) ||
				compareStrings(left.target, right.target),
		)
		.slice(0, options.maxCandidates ?? 100)
		.map(
			(item, index): BilingualLexiconCandidate => ({
				id: stableId("bilex", {
					corpusId: corpus.id,
					source: item.source,
					target: item.target,
				}),
				sourceForm: item.source,
				targetForm: item.target,
				count: item.count,
				score: score("association", item.count, "support"),
				rank: index + 1,
				candidateType: item.type,
				evidence,
				features: stableJsonClone({ corpusId: corpus.id }),
			}),
		);
	return Object.freeze(candidates);
}

export function compareParallelCollocations(
	corpus: ParallelCorpus,
	options: CollocationComparisonOptions = {},
): readonly ParallelCollocationComparison[] {
	const counts = new Map<
		string,
		{
			source: readonly [string, string];
			target: readonly [string, string];
			count: number;
		}
	>();
	for (const doc of corpus.documents) {
		for (const link of doc.links) {
			const sourceTokens = textTokens(
				textForRef(doc.sourceDoc, link.source),
			).map((token) => normalizedToken(token.text));
			const targetTokens = textTokens(
				textForRef(doc.targetDoc, link.target),
			).map((token) => normalizedToken(token.text));
			for (
				let sourceIndex = 1;
				sourceIndex < sourceTokens.length;
				sourceIndex += 1
			) {
				const sourceLeft = sourceTokens[sourceIndex - 1];
				const sourceRight = sourceTokens[sourceIndex];
				if (sourceLeft === undefined || sourceRight === undefined) continue;
				for (
					let targetIndex = 1;
					targetIndex < targetTokens.length;
					targetIndex += 1
				) {
					const targetLeft = targetTokens[targetIndex - 1];
					const targetRight = targetTokens[targetIndex];
					if (targetLeft === undefined || targetRight === undefined) continue;
					const key = `${sourceLeft} ${sourceRight}\u0000${targetLeft} ${targetRight}`;
					const item = counts.get(key) ?? {
						source: [sourceLeft, sourceRight] as const,
						target: [targetLeft, targetRight] as const,
						count: 0,
					};
					item.count += 1;
					counts.set(key, item);
				}
			}
		}
	}
	const hash =
		options.optionsHash ??
		optionHash({ task: "parallel-collocations", corpusId: corpus.id });
	const evidence = parallelEvidence([], {
		mode: "corpus",
		exactness: "E2",
		producer: options.producer,
		corpusIds: [corpus.id],
		optionsHash: hash,
	});
	return Object.freeze(
		[...counts.values()]
			.filter((item) => item.count >= (options.minCount ?? 1))
			.sort(
				(left, right) =>
					compareNumbers(right.count, left.count) ||
					compareStrings(left.source.join(" "), right.source.join(" ")) ||
					compareStrings(left.target.join(" "), right.target.join(" ")),
			)
			.slice(0, options.maxResults ?? 50)
			.map(
				(item, index): ParallelCollocationComparison => ({
					id: stableId("parallel-collocation", {
						corpusId: corpus.id,
						source: item.source,
						target: item.target,
					}),
					sourceCollocation: item.source,
					targetCollocation: item.target,
					count: item.count,
					score: score("association", item.count, "aligned-bigram-count"),
					rank: index + 1,
					evidence,
					features: stableJsonClone({ corpusId: corpus.id }),
				}),
			),
	);
}

function transferToken(
	token: string,
	resources: TransferResources,
): { text: string; score: number; source: string } {
	const dictionary = dictionaryTargets(token, resources.dictionaries ?? [])[0];
	if (dictionary !== undefined) {
		return {
			text: dictionary.target,
			score: dictionary.weight,
			source: "dictionary",
		};
	}
	for (const lexicon of resources.lexicons ?? []) {
		const match = lookup(lexicon, token, {
			mode: ["exact", "normalized", "casefold"],
			maxResults: 1,
		})[0];
		const target = match?.features?.target;
		if (typeof target === "string") {
			return { text: target, score: match?.score ?? 0, source: "lexicon" };
		}
	}
	const fst = fstTargets(token, resources.fsts ?? [])[0];
	if (fst !== undefined) {
		return { text: fst.target, score: fst.weight, source: "fst" };
	}
	return { text: token, score: 0, source: "identity" };
}

function transferText(
	text: string,
	resources: TransferResources,
): {
	readonly text: string;
	readonly entries: readonly SpanMapEntry[];
	readonly changes: number;
} {
	const tokens = textTokens(text);
	let output = "";
	let cursor = 0;
	let changes = 0;
	const entries: SpanMapEntry[] = [];
	for (const token of tokens) {
		output += text.slice(cursor, token.span.startCU);
		const targetStart = output.length;
		const transferred = transferToken(token.text, resources);
		output += transferred.text;
		const targetEnd = output.length;
		if (transferred.text !== token.text) changes += 1;
		entries.push({
			source: {
				start: token.span.startCU,
				end: token.span.endCU,
				unit: "utf16-code-unit",
			},
			target: {
				start: targetStart,
				end: targetEnd,
				unit: "utf16-code-unit",
			},
			relation:
				transferred.text === token.text
					? "identity"
					: transferred.text.length === token.text.length
						? "normalized"
						: transferred.text.length > token.text.length
							? "expanded"
							: "contracted",
			...(transferred.score > 0 ? { cost: 1 / transferred.score } : {}),
		});
		cursor = token.span.endCU;
	}
	output += text.slice(cursor);
	return Object.freeze({
		text: output,
		entries: Object.freeze(entries),
		changes,
	});
}

function annotationExists(doc: TextDocument, annotationId: string): boolean {
	return Object.values(doc.layers).some(
		(layer) => layer.annotations[annotationId] !== undefined,
	);
}

function ensureLayer(
	doc: TextDocument,
	layer: AnnotationLayer<JsonObject>,
): TextDocument {
	if (doc.layers[layer.id] !== undefined) return doc;
	return addLayer(doc, layer);
}

export function shallowTransfer(
	doc: TextDocument,
	resources: TransferResources,
	options: TransferOptions = {},
): TextDocument {
	validateDocument(doc, options.strict);
	assertJsonObject(resources.metadata ?? {}, "transfer.resources.metadata");
	let outputDoc = doc;
	for (const ruleset of resources.rulesets ?? []) {
		if (options.applyRules === true) outputDoc = applyRules(outputDoc, ruleset);
		if (options.applyRuleRewrites === true)
			outputDoc = rewriteView(outputDoc, ruleset);
	}
	const view = resolveView(outputDoc, options.sourceViewId);
	const transferred = transferText(view.text, resources);
	const hash =
		options.optionsHash ??
		optionHash({
			task: "shallow-transfer",
			docId: outputDoc.id,
			viewId: view.id,
			targetViewId: options.targetViewId ?? "translation.transfer",
			dictionaries: (resources.dictionaries ?? []).map((entry) => [
				entry.source,
				entry.target,
			]),
			fsts: (resources.fsts ?? []).map((fst) => fst.id),
			rulesets: (resources.rulesets ?? []).map((ruleset) => ruleset.id),
		});
	const evidence = parallelEvidence([view.id], {
		mode: "composite",
		exactness: "E1",
		producer: options.producer,
		resourceIds: [
			...(resources.lexicons ?? []).map((lexicon) => lexicon.id),
			...((resources.metadata?.resourceIds as readonly string[] | undefined) ??
				[]),
		],
		fstIds: (resources.fsts ?? []).map((fst) => fst.id),
		ruleIds: (resources.rulesets ?? []).flatMap((ruleset) =>
			ruleset.rules.map((rule) => rule.id),
		),
		grammarIds: (resources.rulesets ?? []).map((ruleset) => ruleset.id),
		optionsHash: hash,
	});
	const outputMode = options.output ?? "annotation";
	const targetViewId = options.targetViewId ?? "translation.transfer";
	if (outputMode === "view" || outputMode === "both") {
		const spanMapId = `${targetViewId}.span-map`;
		outputDoc = addViewWithSpanMap(
			outputDoc,
			{
				id: targetViewId,
				kind: "task",
				text: transferred.text,
				sourceViewId: view.id,
				spanMapId,
				transform: {
					kind: "shallow-transfer",
					producer: packageName,
					algorithm: "lexicon-fst-rule-transfer",
					version: packageVersion,
					sourceViewId: view.id,
					optionsHash: hash,
				},
			},
			{
				id: spanMapId,
				sourceViewId: view.id,
				targetViewId,
				entries: transferred.entries,
			},
		);
	}
	if (outputMode === "annotation" || outputMode === "both") {
		const layerId = options.annotationLayerId ?? "translation.transfer";
		outputDoc = ensureLayer(outputDoc, {
			id: layerId,
			type: "translation.transfer",
			viewId: view.id,
			annotations: {},
			metadata: { packageName, targetViewId },
		});
		const annotationId =
			options.id ??
			stableId("translation-transfer", {
				docId: outputDoc.id,
				viewId: view.id,
				targetText: transferred.text,
				optionsHash: hash,
			});
		if (!annotationExists(outputDoc, annotationId)) {
			const annotation: Annotation<JsonObject> = {
				id: annotationId,
				layer: layerId,
				type: options.annotationType ?? "translation.transfer",
				spans: [spanRef(view.id, 0, view.text.length)],
				value: stableJsonClone({
					targetText: transferred.text,
					targetViewId,
					changeCount: transferred.changes,
				}),
				features: {
					"translation.change_count": transferred.changes,
					"translation.output_code_units": transferred.text.length,
				},
				evidence,
			};
			outputDoc = addAnnotation(outputDoc, annotation);
		}
	}
	return outputDoc;
}

export function annotateAlignment(
	doc: ParallelDocument,
	options: AlignmentAnnotateOptions = {},
): ParallelDocument {
	const sourceViewId = firstViewId(doc.sourceDoc);
	const targetViewId = firstViewId(doc.targetDoc);
	const hash =
		options.optionsHash ??
		optionHash({
			task: "annotate-alignment",
			parallelDocumentId: doc.id,
			linkCount: doc.links.length,
		});
	const layerId = options.layerId ?? "alignment.links";
	let sourceDoc = ensureLayer(doc.sourceDoc, {
		id: layerId,
		type: "alignment.link",
		viewId: sourceViewId,
		annotations: {},
		metadata: { packageName, targetDocId: doc.targetDoc.id },
	});
	for (const [index, link] of doc.links.entries()) {
		const annotationId = stableId("alignment-link", {
			parallelDocumentId: doc.id,
			index,
			source: spanRefPayload(link.source),
			target: spanRefPayload(link.target),
			relation: link.relation,
			optionsHash: hash,
		});
		if (annotationExists(sourceDoc, annotationId)) continue;
		const annotation: Annotation<JsonObject> = {
			id: annotationId,
			layer: layerId,
			type: options.annotationType ?? "alignment.link",
			spans: [link.source],
			value: stableJsonClone({
				parallelDocumentId: doc.id,
				targetDocId: doc.targetDoc.id,
				target: spanRefPayload(link.target),
				relation: link.relation,
				score: link.score?.value ?? null,
			}),
			features:
				link.score === undefined ? {} : { "alignment.score": link.score.value },
			evidence: parallelEvidence([sourceViewId, targetViewId], {
				mode: "composite",
				exactness: "E1",
				producer: options.producer,
				optionsHash: hash,
			}),
		};
		sourceDoc = addAnnotation(sourceDoc, annotation);
	}
	return createParallelDocument(sourceDoc, doc.targetDoc, {
		id: doc.id,
		links: doc.links,
		metadata: doc.metadata,
	});
}
