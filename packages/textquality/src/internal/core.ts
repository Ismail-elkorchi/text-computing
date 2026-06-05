import {
	type Annotation,
	type AnnotationLayer,
	addAnnotation,
	addLayer,
	type Evidence,
	type EvidenceMode,
	type Exactness,
	type SpanRef,
	type TextDocument,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { wordFrequencies } from "@ismail-elkorchi/textfacts/facts";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { scanIntegrityFindings } from "@ismail-elkorchi/textfacts/integrity";
import { mixedScriptTokenFacts } from "@ismail-elkorchi/textfacts/security";
import {
	segmentSentences,
	segmentWords,
} from "@ismail-elkorchi/textfacts/segment";
import {
	hasWord,
	type Lexicon,
	lookup,
	type Wordlist,
} from "@ismail-elkorchi/textlex";
import {
	candidateHyphenationRepair,
	candidatePunctuation,
	candidateRepeatedCharacters,
	candidateSpacing,
	candidateSplitMerge,
} from "@ismail-elkorchi/textnorm";

export const packageName = "@ismail-elkorchi/textquality" as const;
export const packageVersion = "0.1.0" as const;

export type PackageName = typeof packageName;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type QualityFindingSeverity = "info" | "notice" | "warning" | "error";
export type QualityReportTarget = "document" | "corpus" | "annotation-layer";
export type QualityMetricMap = Readonly<Record<string, number>>;
export type QualityDimension =
	| "unicode-integrity"
	| "invisible-control"
	| "ocr-atr"
	| "noisy"
	| "language-mix"
	| "script-mix"
	| "morphology-coverage"
	| "duplicate-boilerplate"
	| "readability"
	| "lexical-diversity"
	| "sentence-complexity"
	| "paragraph-complexity"
	| "punctuation-whitespace"
	| "tokenization-segmentation"
	| "annotation"
	| "corpus"
	| "style"
	| "readiness";

export interface QualityFinding {
	readonly id: string;
	readonly kind: string;
	readonly spans?: readonly SpanRef[];
	readonly severity: QualityFindingSeverity;
	readonly message: string;
	readonly evidence: Evidence;
	readonly metrics?: QualityMetricMap;
}

export interface QualityReport {
	readonly id: string;
	readonly target: QualityReportTarget;
	readonly findings: readonly QualityFinding[];
	readonly metrics: QualityMetricMap;
	readonly summaries: JsonObject;
}

export interface QualityDiagnostic {
	readonly code: string;
	readonly severity: QualityFindingSeverity;
	readonly message: string;
	readonly reportId?: string;
	readonly docId?: string;
	readonly corpusId?: string;
	readonly layerId?: string;
	readonly annotationId?: string;
	readonly viewId?: string;
	readonly span?: SpanRef;
	readonly optionPath?: string;
	readonly metadata?: JsonObject;
}

export interface QualityProfile {
	readonly id?: string;
	readonly dimensions?: readonly QualityDimension[];
	readonly expectedLanguages?: readonly string[];
	readonly expectedScripts?: readonly string[];
	readonly requiredMetadataKeys?: readonly string[];
	readonly balanceKeys?: readonly string[];
	readonly thresholds?: Readonly<Record<string, number>>;
	readonly severity?: Partial<Record<string, QualityFindingSeverity>>;
	readonly resourceIds?: readonly string[];
	readonly ruleIds?: readonly string[];
	readonly metadata?: JsonObject;
}

export interface QualityStyleRule {
	readonly id: string;
	readonly kind: string;
	readonly message: string;
	readonly pattern: string;
	readonly flags?: string;
	readonly severity?: QualityFindingSeverity;
}

export interface AnnotationQualityOptions {
	readonly layerIds?: readonly string[];
	readonly requireEvidence?: boolean;
	readonly allowNonUtf16Spans?: boolean;
	readonly reportEmptyLayers?: boolean;
}

export interface NoisyTextOptions {
	readonly wordlists?: readonly Wordlist[];
	readonly lexicons?: readonly Lexicon[];
	readonly knownWords?: readonly string[];
	readonly maxExamples?: number;
	readonly includeTextNormCandidates?: boolean;
}

export interface OcrQualityOptions {
	readonly confusionCharacters?: readonly string[];
	readonly includeTextNormCandidates?: boolean;
	readonly maxExamples?: number;
}

export interface DocumentQualityOptions {
	readonly id?: string;
	readonly viewId?: string;
	readonly dimensions?: readonly QualityDimension[];
	readonly profile?: QualityProfile;
	readonly lexicons?: readonly Lexicon[];
	readonly wordlists?: readonly Wordlist[];
	readonly knownWords?: readonly string[];
	readonly styleRules?: readonly QualityStyleRule[];
	readonly annotation?: AnnotationQualityOptions;
	readonly ocr?: OcrQualityOptions;
	readonly noisy?: NoisyTextOptions;
	readonly maxFindings?: number;
	readonly strict?: boolean;
	readonly producer?: string;
	readonly optionsHash?: string;
}

export interface CorpusDocumentRef {
	readonly id: string;
	readonly metadata: JsonObject;
}

export interface StructuralTextCorpus {
	readonly id: string;
	readonly documents: readonly CorpusDocumentRef[];
	readonly indexes?: JsonObject;
	readonly metadata: JsonObject;
}

export type TextCorpus = StructuralTextCorpus;

export interface CorpusQualityOptions {
	readonly id?: string;
	readonly requiredMetadataKeys?: readonly string[];
	readonly balanceKeys?: readonly string[];
	readonly documentReports?: readonly QualityReport[];
	readonly expectedDocumentIds?: readonly string[];
	readonly maxFindings?: number;
	readonly strict?: boolean;
	readonly producer?: string;
	readonly optionsHash?: string;
	readonly profile?: QualityProfile;
}

export interface QualityAnnotateOptions extends DocumentQualityOptions {
	readonly layerId?: string;
	readonly layerType?: string;
	readonly annotationType?: string;
	readonly minSeverity?: QualityFindingSeverity;
	readonly maxAnnotations?: number;
	readonly onExistingAnnotation?: "skip" | "error";
}

interface TextSpan {
	readonly startCU: number;
	readonly endCU: number;
}

interface TextToken {
	readonly text: string;
	readonly span: TextSpan;
}

interface ReportBuildOptions {
	readonly id?: string | undefined;
	readonly targetId: string;
	readonly target: QualityReportTarget;
	readonly metrics?: QualityMetricMap;
	readonly summaries?: JsonObject;
	readonly optionsHash?: string | undefined;
}

interface FindingInput {
	readonly targetId: string;
	readonly kind: string;
	readonly severity: QualityFindingSeverity;
	readonly message: string;
	readonly evidence: Evidence;
	readonly spans?: readonly SpanRef[];
	readonly metrics?: QualityMetricMap;
}

const severityRank: Readonly<Record<QualityFindingSeverity, number>> = {
	info: 0,
	notice: 1,
	warning: 2,
	error: 3,
};

const allDocumentDimensions: readonly QualityDimension[] = [
	"unicode-integrity",
	"invisible-control",
	"punctuation-whitespace",
	"tokenization-segmentation",
	"ocr-atr",
	"noisy",
	"language-mix",
	"script-mix",
	"morphology-coverage",
	"duplicate-boilerplate",
	"readability",
	"lexical-diversity",
	"sentence-complexity",
	"paragraph-complexity",
	"annotation",
	"style",
	"readiness",
];

export class TextQualityError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`${code}: ${message}`);
		this.name = "TextQualityError";
		this.code = code;
	}
}

function fail(code: string, message: string): never {
	throw new TextQualityError(code, message);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.prototype.toString.call(value) === "[object Object]"
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
			fail("TEXTQUALITY_JSON_STRING", `${path} contains a lone high surrogate`);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			fail("TEXTQUALITY_JSON_STRING", `${path} contains a lone low surrogate`);
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
			fail("TEXTQUALITY_JSON_NUMBER", `${path} must be finite`);
		}
		return;
	}
	if (Array.isArray(value)) {
		if (seen.has(value)) fail("TEXTQUALITY_JSON_CYCLE", `${path} is cyclic`);
		seen.add(value);
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValueInner(value[index], `${path}[${index}]`, seen);
		}
		seen.delete(value);
		return;
	}
	if (isPlainRecord(value)) {
		if (seen.has(value)) fail("TEXTQUALITY_JSON_CYCLE", `${path} is cyclic`);
		seen.add(value);
		for (const key of Object.keys(value)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValueInner(value[key], `${path}.${key}`, seen);
		}
		seen.delete(value);
		return;
	}
	fail("TEXTQUALITY_JSON_VALUE", `${path} must be an I-JSON value`);
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
		fail("TEXTQUALITY_JSON_OBJECT", `${path} must be a JSON object`);
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

function stableStringify(value: JsonValue): string {
	return JSON.stringify(stableJsonClone(value));
}

function stableId(prefix: string, payload: JsonValue): string {
	return `${prefix}-${stableHash64(stableStringify(payload))}`;
}

function finiteMetric(value: number, path: string): number {
	if (!Number.isFinite(value)) {
		fail("TEXTQUALITY_METRIC", `${path} must be finite`);
	}
	return Object.is(value, -0) ? 0 : value;
}

function metricRecord(
	input: Readonly<Record<string, number>> | undefined,
	path: string,
): QualityMetricMap {
	const metrics: Record<string, number> = {};
	for (const [key, value] of Object.entries(input ?? {}).sort(
		([left], [right]) => compareStrings(left, right),
	)) {
		assertJsonString(key, `${path}.key`);
		metrics[key] = finiteMetric(value, `${path}.${key}`);
	}
	return Object.freeze(metrics);
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
	return Object.freeze([...new Set(values)].sort(compareStrings));
}

function threshold(
	profile: QualityProfile | undefined,
	key: string,
	fallback: number,
): number {
	const value = profile?.thresholds?.[key];
	return value === undefined ? fallback : finiteMetric(value, `profile.${key}`);
}

function selectedDimensions(
	options: DocumentQualityOptions,
): readonly QualityDimension[] {
	return uniqueSorted(
		options.dimensions ?? options.profile?.dimensions ?? allDocumentDimensions,
	) as readonly QualityDimension[];
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
		fail("TEXTQUALITY_VIEW_MISSING", "document has no views");
	return first;
}

function resolveView(
	doc: TextDocument,
	viewId?: string,
): { id: string; text: string } {
	const id = viewId ?? firstViewId(doc);
	const view = doc.views[id];
	if (view === undefined) {
		fail("TEXTQUALITY_VIEW_MISSING", `view is missing: ${id}`);
	}
	return { id, text: view.text };
}

function spanRef(viewId: string, startCU: number, endCU: number): SpanRef {
	return {
		viewId,
		span: {
			start: startCU,
			end: endCU,
			unit: "utf16-code-unit",
		},
	};
}

function spanStart(ref: SpanRef | undefined): number {
	return ref?.span.start ?? Number.POSITIVE_INFINITY;
}

function spanEnd(ref: SpanRef | undefined): number {
	return ref?.span.end ?? Number.POSITIVE_INFINITY;
}

function optionHash(seed: JsonValue): string {
	return stableHash64(stableStringify(seed));
}

export function qualityEvidence(
	inputViewIds: readonly string[],
	options: {
		readonly mode?: EvidenceMode;
		readonly exactness?: Exactness;
		readonly producer?: string | undefined;
		readonly resourceIds?: readonly string[] | undefined;
		readonly ruleIds?: readonly string[] | undefined;
		readonly statisticalModelIds?: readonly string[] | undefined;
		readonly corpusIds?: readonly string[] | undefined;
		readonly optionsHash?: string | undefined;
	} = {},
): Evidence {
	const evidence: Evidence = {
		mode: options.mode ?? "algorithm",
		exactness: options.exactness ?? "E1",
		producer: options.producer ?? "textquality",
		packageName,
		packageVersion,
		inputViewIds: uniqueSorted(inputViewIds),
		...(options.resourceIds !== undefined
			? { resourceIds: uniqueSorted(options.resourceIds) }
			: {}),
		...(options.ruleIds !== undefined
			? { ruleIds: uniqueSorted(options.ruleIds) }
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
	};
	return Object.freeze(evidence);
}

function finding(input: FindingInput): QualityFinding {
	const metrics = metricRecord(input.metrics, `finding.${input.kind}.metrics`);
	const payload: JsonObject = {
		targetId: input.targetId,
		kind: input.kind,
		severity: input.severity,
		message: input.message,
		spans: (input.spans ?? []).map((ref) => ({
			viewId: ref.viewId,
			start: ref.span.start,
			end: ref.span.end,
			unit: ref.span.unit,
		})),
		metrics,
	};
	const result: QualityFinding = {
		id: stableId("quality", payload),
		kind: input.kind,
		...(input.spans !== undefined && input.spans.length > 0
			? { spans: Object.freeze([...input.spans]) }
			: {}),
		severity: input.severity,
		message: input.message,
		evidence: input.evidence,
		...(Object.keys(metrics).length > 0 ? { metrics } : {}),
	};
	return Object.freeze(result);
}

export function compareQualityFindings(
	left: QualityFinding,
	right: QualityFinding,
): number {
	const severity = severityRank[right.severity] - severityRank[left.severity];
	if (severity !== 0) return severity;
	const kind = compareStrings(left.kind, right.kind);
	if (kind !== 0) return kind;
	const leftSpan = left.spans?.[0];
	const rightSpan = right.spans?.[0];
	return (
		compareStrings(leftSpan?.viewId ?? "", rightSpan?.viewId ?? "") ||
		compareNumbers(spanStart(leftSpan), spanStart(rightSpan)) ||
		compareNumbers(spanEnd(leftSpan), spanEnd(rightSpan)) ||
		compareStrings(left.id, right.id)
	);
}

function severityCounts(findings: readonly QualityFinding[]): JsonObject {
	return {
		info: findings.filter((entry) => entry.severity === "info").length,
		notice: findings.filter((entry) => entry.severity === "notice").length,
		warning: findings.filter((entry) => entry.severity === "warning").length,
		error: findings.filter((entry) => entry.severity === "error").length,
	};
}

export function summarizeQualityReport(report: QualityReport): JsonObject {
	const kindCounts: Record<string, number> = {};
	for (const finding of report.findings) {
		kindCounts[finding.kind] = (kindCounts[finding.kind] ?? 0) + 1;
	}
	const topKinds = Object.entries(kindCounts)
		.sort(
			([leftKind, leftCount], [rightKind, rightCount]) =>
				rightCount - leftCount || compareStrings(leftKind, rightKind),
		)
		.slice(0, 10)
		.map(([kind, count]) => ({ kind, count }));
	return stableJsonClone({
		severityCounts: severityCounts(report.findings),
		findingKinds: topKinds,
	});
}

export function buildQualityReport(
	findings: readonly QualityFinding[],
	options: ReportBuildOptions,
): QualityReport {
	const sortedFindings = Object.freeze(
		[...findings].sort(compareQualityFindings),
	);
	const severityMetrics: Record<string, number> = {
		"findings.total": sortedFindings.length,
		"findings.info": sortedFindings.filter((entry) => entry.severity === "info")
			.length,
		"findings.notice": sortedFindings.filter(
			(entry) => entry.severity === "notice",
		).length,
		"findings.warning": sortedFindings.filter(
			(entry) => entry.severity === "warning",
		).length,
		"findings.error": sortedFindings.filter(
			(entry) => entry.severity === "error",
		).length,
	};
	const metrics = metricRecord(
		{ ...options.metrics, ...severityMetrics },
		"report.metrics",
	);
	const summaries = jsonObjectClone(
		options.summaries ?? {},
		"report.summaries",
	);
	const id =
		options.id ??
		stableId("quality-report", {
			target: options.target,
			targetId: options.targetId,
			findingIds: sortedFindings.map((entry) => entry.id),
			metrics,
			optionsHash: options.optionsHash ?? "",
		});
	const report: QualityReport = {
		id,
		target: options.target,
		findings: sortedFindings,
		metrics,
		summaries: stableJsonClone({
			...summaries,
			...summarizeQualityReport({
				id,
				target: options.target,
				findings: sortedFindings,
				metrics,
				summaries: {},
			}),
		}),
	};
	return Object.freeze(report);
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

function sentenceSpans(text: string): readonly TextSpan[] {
	return Object.freeze(
		[...segmentSentences(text)].map((span) => ({
			startCU: span.startCU,
			endCU: span.endCU,
		})),
	);
}

function paragraphSpans(text: string): readonly TextSpan[] {
	const spans: TextSpan[] = [];
	let start = 0;
	const pattern = /\n\s*\n/gu;
	for (const match of text.matchAll(pattern)) {
		const index = match.index;
		if (index > start) spans.push({ startCU: start, endCU: index });
		start = index + match[0].length;
	}
	if (start < text.length) spans.push({ startCU: start, endCU: text.length });
	return Object.freeze(spans);
}

function lineSpans(text: string): readonly TextSpan[] {
	const spans: TextSpan[] = [];
	let start = 0;
	for (let index = 0; index < text.length; index += 1) {
		if (text[index] !== "\n") continue;
		spans.push({ startCU: start, endCU: index });
		start = index + 1;
	}
	spans.push({ startCU: start, endCU: text.length });
	return Object.freeze(spans);
}

function normalizedToken(value: string): string {
	return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function unicodeIntegrityQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	return Object.freeze(
		scanIntegrityFindings(text, {
			...(options.maxFindings !== undefined
				? { maxFindings: options.maxFindings }
				: {}),
		}).map((entry) => {
			const span = entry.span as { startCU: number; endCU: number };
			return finding({
				targetId: doc.id,
				kind: `unicode.${entry.kind}`,
				severity: entry.kind === "lone-surrogate" ? "error" : "warning",
				message: `Unicode integrity finding: ${entry.kind}`,
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
				metrics: { "unicode.code_point": entry.codePoint },
			});
		}),
	);
}

function invisibleControlQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions,
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	for (let index = 0; index < text.length; index += 1) {
		const code = text.charCodeAt(index);
		const isControl =
			(code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
			(code >= 0x7f && code <= 0x9f);
		if (!isControl) continue;
		findings.push(
			finding({
				targetId: doc.id,
				kind: "unicode.invisible-control",
				severity: "warning",
				message: "Invisible or control character is present",
				evidence,
				spans: [spanRef(viewId, index, index + 1)],
				metrics: { "unicode.code_unit": code },
			}),
		);
	}
	return Object.freeze(findings);
}

function isHorizontalWhitespace(value: string): boolean {
	return value === " " || value === "\t";
}

function isLineTerminator(value: string): boolean {
	return value === "\n" || value === "\r";
}

function isWhitespace(value: string): boolean {
	return (
		isHorizontalWhitespace(value) ||
		isLineTerminator(value) ||
		value === "\f" ||
		value === "\v" ||
		value === "\u00a0"
	);
}

function isPunctuationMark(value: string): boolean {
	return (
		value === "!" ||
		value === "?" ||
		value === "." ||
		value === "," ||
		value === ";" ||
		value === ":"
	);
}

function isQuoteMark(value: string): boolean {
	return value === '"' || value === "'" || value === "“" || value === "”";
}

function repeatedRunSpans(
	text: string,
	predicate: (value: string) => boolean,
	minLength: number,
): readonly TextSpan[] {
	const spans: TextSpan[] = [];
	let start = -1;
	for (let index = 0; index <= text.length; index += 1) {
		const matches = index < text.length && predicate(text[index] ?? "");
		if (matches && start < 0) {
			start = index;
			continue;
		}
		if (matches) continue;
		if (start >= 0 && index - start >= minLength) {
			spans.push({ startCU: start, endCU: index });
		}
		start = -1;
	}
	return Object.freeze(spans);
}

function trailingHorizontalWhitespaceSpans(text: string): readonly TextSpan[] {
	const spans: TextSpan[] = [];
	let lineStart = 0;
	for (let index = 0; index <= text.length; ) {
		if (index < text.length && text[index] !== "\n" && text[index] !== "\r") {
			index += 1;
			continue;
		}
		const lineEnd = index;
		let trailingStart = lineEnd;
		while (
			trailingStart > lineStart &&
			isHorizontalWhitespace(text[trailingStart - 1] ?? "")
		) {
			trailingStart -= 1;
		}
		if (trailingStart < lineEnd) {
			spans.push({ startCU: trailingStart, endCU: lineEnd });
		}
		if (index >= text.length) break;
		if (text[index] === "\r" && text[index + 1] === "\n") index += 2;
		else index += 1;
		lineStart = index;
	}
	return Object.freeze(spans);
}

function hasMixedLineEndings(text: string): boolean {
	let hasCrLf = false;
	let hasBareLf = false;
	for (let index = 0; index < text.length; index += 1) {
		if (text[index] !== "\n") continue;
		if (index > 0 && text[index - 1] === "\r") hasCrLf = true;
		else hasBareLf = true;
		if (hasCrLf && hasBareLf) return true;
	}
	return false;
}

function leadingWhitespaceBeforePunctuationSpans(
	text: string,
): readonly TextSpan[] {
	const spans: TextSpan[] = [];
	for (let index = 0; index < text.length; index += 1) {
		if (!isPunctuationMark(text[index] ?? "")) continue;
		if (index === 0 || !isWhitespace(text[index - 1] ?? "")) continue;
		let start = index - 1;
		while (start > 0 && isWhitespace(text[start - 1] ?? "")) start -= 1;
		spans.push({ startCU: start, endCU: index + 1 });
	}
	return Object.freeze(spans);
}

function unbalancedQuoteLineSpans(text: string): readonly TextSpan[] {
	const spans: TextSpan[] = [];
	let lineStart = 0;
	for (let index = 0; index <= text.length; ) {
		if (index < text.length && text[index] !== "\n" && text[index] !== "\r") {
			index += 1;
			continue;
		}
		const lineEnd = index;
		let quoteCount = 0;
		let firstQuote = -1;
		for (let cursor = lineStart; cursor < lineEnd; cursor += 1) {
			if (!isQuoteMark(text[cursor] ?? "")) continue;
			if (firstQuote < 0) firstQuote = cursor;
			quoteCount += 1;
		}
		if (firstQuote >= 0 && quoteCount % 2 === 1) {
			spans.push({ startCU: firstQuote, endCU: lineEnd });
		}
		if (index >= text.length) break;
		if (text[index] === "\r" && text[index + 1] === "\n") index += 2;
		else index += 1;
		lineStart = index;
	}
	return Object.freeze(spans);
}

export function whitespaceQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	for (const span of repeatedRunSpans(text, isHorizontalWhitespace, 2)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "whitespace.repeated",
				severity: "notice",
				message: "Repeated horizontal whitespace",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
				metrics: { "whitespace.run_length": span.endCU - span.startCU },
			}),
		);
	}
	for (const span of trailingHorizontalWhitespaceSpans(text)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "whitespace.trailing",
				severity: "notice",
				message: "Trailing whitespace",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
			}),
		);
	}
	for (const span of repeatedRunSpans(text, (value) => value === "\n", 3)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "whitespace.excess-blank-lines",
				severity: "notice",
				message: "Excess blank lines",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
				metrics: { "whitespace.line_breaks": span.endCU - span.startCU },
			}),
		);
	}
	if (hasMixedLineEndings(text)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "whitespace.mixed-line-endings",
				severity: "warning",
				message: "Mixed line ending styles",
				evidence,
				metrics: { "whitespace.code_units": text.length },
			}),
		);
	}
	return Object.freeze(findings);
}

export function punctuationQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	for (const span of repeatedRunSpans(text, isPunctuationMark, 3)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "punctuation.repeated",
				severity: "notice",
				message: "Repeated punctuation sequence",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
				metrics: { "punctuation.run_length": span.endCU - span.startCU },
			}),
		);
	}
	for (const span of leadingWhitespaceBeforePunctuationSpans(text)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "punctuation.leading-space",
				severity: "notice",
				message: "Whitespace before punctuation",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
			}),
		);
	}
	for (const span of unbalancedQuoteLineSpans(text)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "punctuation.unbalanced-quote",
				severity: "notice",
				message: "Potentially unbalanced quote mark",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
			}),
		);
	}
	return Object.freeze(findings);
}

export function segmentationQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E1",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	for (const layer of Object.values(doc.layers).sort((left, right) =>
		compareStrings(left.id, right.id),
	)) {
		if (
			layer.viewId !== undefined &&
			layer.viewId !== viewId &&
			doc.views[layer.viewId] === undefined
		) {
			findings.push(
				finding({
					targetId: doc.id,
					kind: "segmentation.layer-view-missing",
					severity: "error",
					message: `Layer view is missing: ${layer.id}`,
					evidence,
					metrics: {
						"annotation.count": Object.keys(layer.annotations).length,
					},
				}),
			);
		}
		if (!/^(token|segment|sentence|paragraph)\./u.test(layer.type)) continue;
		let previousEnd = 0;
		for (const annotation of Object.values(layer.annotations).sort(
			(left, right) => compareStrings(left.id, right.id),
		)) {
			const ref = annotation.spans[0];
			if (ref === undefined) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "segmentation.empty-span",
						severity: "warning",
						message: `Segment annotation has no span: ${annotation.id}`,
						evidence,
					}),
				);
				continue;
			}
			if (ref.span.unit !== "utf16-code-unit") {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "segmentation.non-utf16-span",
						severity: "warning",
						message: `Segment span is not UTF-16 code-unit based: ${annotation.id}`,
						evidence,
						spans: [ref],
					}),
				);
				continue;
			}
			if (ref.viewId !== viewId) continue;
			if (ref.span.end > text.length) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "segmentation.span-out-of-range",
						severity: "error",
						message: `Segment span exceeds view text length: ${annotation.id}`,
						evidence,
						spans: [ref],
					}),
				);
			}
			if (ref.span.start < previousEnd) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "segmentation.overlap",
						severity: "warning",
						message: `Segment overlaps a previous segment: ${annotation.id}`,
						evidence,
						spans: [ref],
					}),
				);
			}
			if (ref.span.start === ref.span.end) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "segmentation.empty-segment",
						severity: "notice",
						message: `Segment span is empty: ${annotation.id}`,
						evidence,
						spans: [ref],
					}),
				);
			}
			previousEnd = Math.max(previousEnd, ref.span.end);
			const value = annotation.value;
			if (
				isPlainRecord(value) &&
				typeof value.text === "string" &&
				ref.span.end <= text.length &&
				value.text !== text.slice(ref.span.start, ref.span.end)
			) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "segmentation.text-mismatch",
						severity: "warning",
						message: `Segment text does not match the selected view: ${annotation.id}`,
						evidence,
						spans: [ref],
					}),
				);
			}
		}
	}
	return Object.freeze(findings);
}

function duplicateAndBoilerplateFindings(
	doc: TextDocument,
	options: DocumentQualityOptions,
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	const normalizedLines = new Map<string, TextSpan[]>();
	for (const span of lineSpans(text)) {
		const line = text.slice(span.startCU, span.endCU).trim();
		if (line.length < 8) continue;
		const key = normalizedToken(line);
		const bucket = normalizedLines.get(key);
		if (bucket === undefined) normalizedLines.set(key, [span]);
		else bucket.push(span);
	}
	for (const [line, spans] of normalizedLines) {
		if (spans.length < 2) continue;
		findings.push(
			finding({
				targetId: doc.id,
				kind: "duplicate.repeated-line",
				severity: "notice",
				message: "Repeated line text",
				evidence,
				spans: spans
					.slice(0, 3)
					.map((span) => spanRef(viewId, span.startCU, span.endCU)),
				metrics: {
					"duplicate.count": spans.length,
					"duplicate.normalized_length": line.length,
				},
			}),
		);
	}
	for (const span of paragraphSpans(text)) {
		const paragraph = text.slice(span.startCU, span.endCU);
		const tokens = textTokens(paragraph);
		if (tokens.length < 12) continue;
		const unique = new Set(tokens.map((token) => normalizedToken(token.text)));
		const ratio = unique.size / tokens.length;
		if (
			ratio >
			threshold(options.profile, "low_information.type_token_ratio", 0.25)
		) {
			continue;
		}
		findings.push(
			finding({
				targetId: doc.id,
				kind: "boilerplate.low-information-span",
				severity: "notice",
				message: "Low-information paragraph candidate",
				evidence,
				spans: [spanRef(viewId, span.startCU, span.endCU)],
				metrics: { "lexical.type_token_ratio": ratio },
			}),
		);
	}
	return Object.freeze(findings);
}

function scriptMixQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions,
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	for (const token of mixedScriptTokenFacts(text, {
		...(options.maxFindings !== undefined
			? { maxTokens: options.maxFindings }
			: {}),
	})) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "script.mixed-token",
				severity: "warning",
				message: "Mixed-script token",
				evidence,
				spans: [spanRef(viewId, token.spanCU.startCU, token.spanCU.endCU)],
				metrics: { "script.count": token.scripts.length },
			}),
		);
	}
	const expectedScripts = options.profile?.expectedScripts ?? [];
	if (expectedScripts.length > 0) {
		const expected = new Set(expectedScripts);
		for (const token of mixedScriptTokenFacts(text, {
			maxTokens: 500,
			wordFilter: "all",
		})) {
			for (const script of token.scripts) {
				if (expected.has(script)) continue;
				findings.push(
					finding({
						targetId: doc.id,
						kind: "script.unexpected",
						severity: "notice",
						message: `Unexpected script in token: ${script}`,
						evidence,
						spans: [spanRef(viewId, token.spanCU.startCU, token.spanCU.endCU)],
					}),
				);
			}
		}
	}
	return Object.freeze(findings);
}

function normalizeLanguageTag(value: string): string {
	return value.trim().replace(/_/gu, "-").toLocaleLowerCase("en-US");
}

function metadataLanguages(
	metadata: Readonly<Record<string, unknown>> | undefined,
): readonly string[] {
	const values: string[] = [];
	for (const key of ["language", "languages", "lang", "locale"]) {
		const value = metadata?.[key];
		if (typeof value === "string") values.push(value);
		else if (Array.isArray(value)) {
			for (const entry of value) {
				if (typeof entry === "string") values.push(entry);
			}
		}
	}
	return uniqueSorted(
		values
			.map((value) => normalizeLanguageTag(value))
			.filter((value) => value.length > 0),
	);
}

function lexicalResourceIds(
	options: DocumentQualityOptions,
): readonly string[] {
	return uniqueSorted([
		...(options.wordlists ?? []).map((entry) => entry.id),
		...(options.noisy?.wordlists ?? []).map((entry) => entry.id),
		...(options.lexicons ?? []).map((entry) => entry.id),
		...(options.noisy?.lexicons ?? []).map((entry) => entry.id),
	]);
}

function tokenLanguages(
	token: string,
	options: DocumentQualityOptions,
): readonly string[] {
	const languages: string[] = [];
	const tokenKey = normalizedToken(token);
	for (const wordlist of [
		...(options.wordlists ?? []),
		...(options.noisy?.wordlists ?? []),
	]) {
		for (const entry of wordlist.entries) {
			if (entry.language === undefined) continue;
			if (normalizedToken(entry.form) === tokenKey) {
				languages.push(entry.language);
			}
		}
	}
	for (const lexicon of [
		...(options.lexicons ?? []),
		...(options.noisy?.lexicons ?? []),
	]) {
		for (const match of lookup(lexicon, token, {
			mode: ["exact", "normalized", "casefold"],
		})) {
			if (match.language !== undefined) languages.push(match.language);
		}
	}
	return uniqueSorted(
		languages
			.map((language) => normalizeLanguageTag(language))
			.filter((language) => language.length > 0),
	);
}

export function languageMixQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const resourceIds = lexicalResourceIds(options);
	const evidence = qualityEvidence([viewId], {
		mode: resourceIds.length > 0 ? "lexicon" : "algorithm",
		exactness: resourceIds.length > 0 ? "E1" : "E3",
		producer: options.producer,
		resourceIds,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	const expectedLanguages = new Set(
		(options.profile?.expectedLanguages ?? [])
			.map((language) => normalizeLanguageTag(language))
			.filter((language) => language.length > 0),
	);
	const declaredLanguages = uniqueSorted([
		...metadataLanguages(doc.metadata),
		...Object.values(doc.sources).flatMap((source) =>
			metadataLanguages(source.metadata),
		),
	]);
	if (declaredLanguages.length > 1) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "language.mixed-metadata",
				severity: "notice",
				message: "Document metadata declares multiple languages",
				evidence,
				metrics: { "language.metadata_count": declaredLanguages.length },
			}),
		);
	}
	for (const language of declaredLanguages) {
		if (expectedLanguages.size === 0 || expectedLanguages.has(language)) {
			continue;
		}
		findings.push(
			finding({
				targetId: doc.id,
				kind: "language.unexpected-metadata",
				severity: "notice",
				message: `Document metadata declares an unexpected language: ${language}`,
				evidence,
			}),
		);
	}
	const tokens = textTokens(text);
	if (resourceIds.length === 0 || tokens.length === 0) {
		return Object.freeze(findings);
	}
	const counts = new Map<string, number>();
	let covered = 0;
	let unexpectedExamples = 0;
	for (const token of tokens) {
		const languages = tokenLanguages(token.text, options);
		if (languages.length === 0) continue;
		covered += 1;
		for (const language of languages) {
			counts.set(language, (counts.get(language) ?? 0) + 1);
			if (
				expectedLanguages.size > 0 &&
				!expectedLanguages.has(language) &&
				unexpectedExamples < 10
			) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "language.unexpected-token",
						severity: "notice",
						message: `Token matched an unexpected language resource: ${language}`,
						evidence,
						spans: [spanRef(viewId, token.span.startCU, token.span.endCU)],
					}),
				);
				unexpectedExamples += 1;
			}
		}
	}
	const coverage = covered / tokens.length;
	if (coverage < threshold(options.profile, "language.coverage_ratio", 0.5)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "language.coverage-low",
				severity: "notice",
				message: "Supplied language resources cover few tokens",
				evidence,
				metrics: {
					"language.coverage_ratio": coverage,
					"language.covered_tokens": covered,
					"language.token_count": tokens.length,
				},
			}),
		);
	}
	if (counts.size > 1) {
		const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
		const largest = Math.max(0, ...counts.values());
		findings.push(
			finding({
				targetId: doc.id,
				kind: "language.mixed-profile",
				severity: "warning",
				message: "Tokens match more than one language resource",
				evidence,
				metrics: {
					"language.count": counts.size,
					"language.largest_share": total === 0 ? 0 : largest / total,
				},
			}),
		);
	}
	return Object.freeze(findings);
}

function annotationSpanOverlaps(left: SpanRef, right: SpanRef): boolean {
	return (
		left.viewId === right.viewId &&
		left.span.unit === "utf16-code-unit" &&
		right.span.unit === "utf16-code-unit" &&
		left.span.start < right.span.end &&
		right.span.start < left.span.end
	);
}

function firstUtf16Span(annotation: Annotation): SpanRef | undefined {
	return annotation.spans.find((ref) => ref.span.unit === "utf16-code-unit");
}

function layerTypeMatches(
	layer: AnnotationLayer,
	prefixes: readonly string[],
): boolean {
	return prefixes.some(
		(prefix) => layer.type.startsWith(prefix) || layer.id.startsWith(prefix),
	);
}

function tokenSpansFromDocument(
	doc: TextDocument,
	viewId: string,
	text: string,
): readonly SpanRef[] {
	const spans = Object.values(doc.layers)
		.filter((layer) => layerTypeMatches(layer, ["token.", "subtoken."]))
		.flatMap((layer) =>
			Object.values(layer.annotations)
				.map(firstUtf16Span)
				.filter(
					(ref): ref is SpanRef =>
						ref !== undefined &&
						ref.viewId === viewId &&
						ref.span.start <= ref.span.end,
				),
		);
	if (spans.length > 0) return Object.freeze(spans);
	return Object.freeze(
		textTokens(text).map((token) =>
			spanRef(viewId, token.span.startCU, token.span.endCU),
		),
	);
}

export function morphologyCoverageQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E1",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const tokenSpans = tokenSpansFromDocument(doc, viewId, text);
	if (tokenSpans.length === 0) return [];
	const morphologyLayers = Object.values(doc.layers).filter((layer) =>
		layerTypeMatches(layer, ["morph.", "morpheme.", "lemma.", "stem."]),
	);
	const morphologySpans = morphologyLayers.flatMap((layer) =>
		Object.values(layer.annotations)
			.map(firstUtf16Span)
			.filter((ref): ref is SpanRef => ref !== undefined),
	);
	const covered = tokenSpans.filter((tokenSpan) =>
		morphologySpans.some((morphologySpan) =>
			annotationSpanOverlaps(tokenSpan, morphologySpan),
		),
	).length;
	const coverage = covered / tokenSpans.length;
	const findings: QualityFinding[] = [];
	if (morphologyLayers.length === 0) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "morphology.coverage-missing",
				severity: "notice",
				message: "No morphology, morpheme, lemma, or stem layers are present",
				evidence,
				metrics: {
					"morphology.coverage_ratio": 0,
					"morphology.token_count": tokenSpans.length,
				},
			}),
		);
		return Object.freeze(findings);
	}
	if (
		coverage < threshold(options.profile, "morphology.coverage_ratio", 0.75)
	) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "morphology.coverage-low",
				severity: "notice",
				message: "Morphology annotations cover few token spans",
				evidence,
				metrics: {
					"morphology.coverage_ratio": coverage,
					"morphology.covered_tokens": covered,
					"morphology.token_count": tokenSpans.length,
					"morphology.layer_count": morphologyLayers.length,
				},
			}),
		);
	}
	return Object.freeze(findings);
}

function tokenCovered(
	token: string,
	options: DocumentQualityOptions,
): boolean | undefined {
	const knownWords = options.knownWords ?? options.noisy?.knownWords ?? [];
	if (knownWords.length > 0) {
		const known = new Set(knownWords.map((entry) => normalizedToken(entry)));
		if (known.has(normalizedToken(token))) return true;
	}
	const wordlists = [
		...(options.wordlists ?? []),
		...(options.noisy?.wordlists ?? []),
	];
	for (const wordlist of wordlists) {
		if (hasWord(wordlist, token)) return true;
	}
	const lexicons = [
		...(options.lexicons ?? []),
		...(options.noisy?.lexicons ?? []),
	];
	for (const lexicon of lexicons) {
		if (
			lookup(lexicon, token, { mode: ["exact", "normalized", "casefold"] })
				.length > 0
		) {
			return true;
		}
	}
	if (
		knownWords.length === 0 &&
		wordlists.length === 0 &&
		lexicons.length === 0
	) {
		return undefined;
	}
	return false;
}

function oovQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions,
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const tokens = textTokens(text);
	const evidence = qualityEvidence([viewId], {
		mode: "lexicon",
		exactness: "E1",
		producer: options.producer,
		resourceIds: [
			...(options.wordlists ?? []).map((entry) => entry.id),
			...(options.noisy?.wordlists ?? []).map((entry) => entry.id),
			...(options.lexicons ?? []).map((entry) => entry.id),
			...(options.noisy?.lexicons ?? []).map((entry) => entry.id),
		],
		optionsHash: options.optionsHash,
	});
	let covered = 0;
	let uncovered = 0;
	const findings: QualityFinding[] = [];
	const maxExamples = options.noisy?.maxExamples ?? 10;
	for (const token of tokens) {
		const result = tokenCovered(token.text, options);
		if (result === undefined) return [];
		if (result) {
			covered += 1;
			continue;
		}
		uncovered += 1;
		if (findings.length >= maxExamples) continue;
		findings.push(
			finding({
				targetId: doc.id,
				kind: "lexical.oov-token",
				severity: "notice",
				message: "Token is outside supplied lexical resources",
				evidence,
				spans: [spanRef(viewId, token.span.startCU, token.span.endCU)],
			}),
		);
	}
	const total = covered + uncovered;
	if (
		total > 0 &&
		uncovered / total > threshold(options.profile, "lexical.oov_rate", 0.2)
	) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "lexical.oov-profile",
				severity: "warning",
				message: "OOV rate exceeds quality profile threshold",
				evidence,
				metrics: {
					"lexical.oov_rate": uncovered / total,
					"lexical.covered_tokens": covered,
					"lexical.uncovered_tokens": uncovered,
				},
			}),
		);
	}
	return Object.freeze(findings);
}

function textNormCandidateFindings(
	doc: TextDocument,
	options: DocumentQualityOptions,
	mode: "ocr" | "noisy",
): readonly QualityFinding[] {
	const include =
		mode === "ocr"
			? options.ocr?.includeTextNormCandidates
			: options.noisy?.includeTextNormCandidates;
	if (include === false) return [];
	const viewId = resolveView(doc, options.viewId).id;
	const evidence = qualityEvidence([viewId], {
		mode: "composite",
		exactness: "E3",
		producer: options.producer,
		resourceIds: ["textnorm-candidates"],
		optionsHash: options.optionsHash,
	});
	const candidates =
		mode === "ocr"
			? candidateHyphenationRepair(doc, {
					sourceViewId: viewId,
					diagnosticMode: true,
				})
			: [
					...candidateRepeatedCharacters(doc, {
						sourceViewId: viewId,
						diagnosticMode: true,
					}),
					...candidatePunctuation(doc, {
						sourceViewId: viewId,
						diagnosticMode: true,
					}),
					...candidateSpacing(doc, {
						sourceViewId: viewId,
						diagnosticMode: true,
					}),
					...candidateSplitMerge(doc, {
						sourceViewId: viewId,
						diagnosticMode: true,
					}),
				];
	return Object.freeze(
		candidates.slice(0, 20).map((candidate) =>
			finding({
				targetId: doc.id,
				kind:
					mode === "ocr"
						? "ocr.hyphenation-candidate"
						: `noisy.${candidate.kind}-candidate`,
				severity: "info",
				message:
					mode === "ocr"
						? "Line-break hyphenation candidate reported by textnorm"
						: "Normalization candidate reported by textnorm",
				evidence,
				spans: [candidate.source],
				metrics:
					candidate.score !== undefined
						? { [`${mode}.candidate_score`]: candidate.score.value }
						: {},
			}),
		),
	);
}

export function noisyTextQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E0",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [...oovQualityFindings(doc, options)];
	for (const match of text.matchAll(/([\p{Letter}])\1{3,}/giu)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "noisy.repeated-character",
				severity: "notice",
				message: "Repeated character sequence",
				evidence,
				spans: [spanRef(viewId, match.index, match.index + match[0].length)],
				metrics: { "noisy.run_length": match[0].length },
			}),
		);
	}
	for (const match of text.matchAll(/\b[\p{Letter}]*\d[\p{Letter}\d]*\b/giu)) {
		if (!/[A-Za-z]/u.test(match[0])) continue;
		findings.push(
			finding({
				targetId: doc.id,
				kind: "noisy.alphanumeric-token",
				severity: "notice",
				message: "Token mixes letters and digits",
				evidence,
				spans: [spanRef(viewId, match.index, match.index + match[0].length)],
			}),
		);
	}
	findings.push(...textNormCandidateFindings(doc, options, "noisy"));
	return Object.freeze(findings);
}

export function ocrQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const evidence = qualityEvidence([viewId], {
		exactness: "E1",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	const confusionCharacters = options.ocr?.confusionCharacters ?? [
		"�",
		"¬",
		"¦",
		"¤",
	];
	for (const character of confusionCharacters) {
		let index = text.indexOf(character);
		while (index >= 0) {
			findings.push(
				finding({
					targetId: doc.id,
					kind: "ocr.confusion-character",
					severity: "warning",
					message: "OCR/ATR confusion character candidate",
					evidence,
					spans: [spanRef(viewId, index, index + character.length)],
				}),
			);
			index = text.indexOf(character, index + character.length);
		}
	}
	for (const match of text.matchAll(/[\p{Letter}]-\n[\p{Letter}]/giu)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "ocr.line-break-hyphenation",
				severity: "notice",
				message: "Line-break hyphenation artifact candidate",
				evidence,
				spans: [spanRef(viewId, match.index, match.index + match[0].length)],
			}),
		);
	}
	for (const match of text.matchAll(/\b\p{Letter}{24,}\b/giu)) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "ocr.likely-merged-token",
				severity: "notice",
				message: "Long token may contain a merge error",
				evidence,
				spans: [spanRef(viewId, match.index, match.index + match[0].length)],
				metrics: { "token.code_units": match[0].length },
			}),
		);
	}
	findings.push(...textNormCandidateFindings(doc, options, "ocr"));
	return Object.freeze(findings);
}

export function lexicalDiversityMetrics(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): QualityMetricMap {
	const text = resolveView(doc, options.viewId).text;
	const tokens = textTokens(text).map((token) => normalizedToken(token.text));
	const unique = new Set(tokens);
	const hapax = [
		...wordFrequencies(text, { filter: "word-like" }).items,
	].filter((item) => item.count === 1).length;
	return metricRecord(
		{
			"lexical.token_count": tokens.length,
			"lexical.type_count": unique.size,
			...(tokens.length > 0
				? {
						"lexical.type_token_ratio": unique.size / tokens.length,
						"lexical.hapax_ratio": hapax / tokens.length,
					}
				: {}),
		},
		"lexical.metrics",
	);
}

export function readabilityMetrics(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): QualityMetricMap {
	const text = resolveView(doc, options.viewId).text;
	const tokens = textTokens(text);
	const sentences = sentenceSpans(text).filter(
		(span) => text.slice(span.startCU, span.endCU).trim().length > 0,
	);
	const paragraphs = paragraphSpans(text);
	const tokenCodeUnits = tokens.reduce(
		(sum, token) => sum + token.text.length,
		0,
	);
	const sentenceCodeUnits = sentences.reduce(
		(sum, span) => sum + span.endCU - span.startCU,
		0,
	);
	const paragraphCodeUnits = paragraphs.reduce(
		(sum, span) => sum + span.endCU - span.startCU,
		0,
	);
	return metricRecord(
		{
			"readability.word_count": tokens.length,
			"readability.sentence_count": sentences.length,
			"readability.paragraph_count": paragraphs.length,
			...(tokens.length > 0
				? {
						"readability.average_token_code_units":
							tokenCodeUnits / tokens.length,
					}
				: {}),
			...(sentences.length > 0
				? {
						"readability.words_per_sentence": tokens.length / sentences.length,
						"sentence.average_code_units": sentenceCodeUnits / sentences.length,
					}
				: {}),
			...(paragraphs.length > 0
				? {
						"paragraph.average_code_units":
							paragraphCodeUnits / paragraphs.length,
					}
				: {}),
		},
		"readability.metrics",
	);
}

function readabilityQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions,
): readonly QualityFinding[] {
	const { id: viewId } = resolveView(doc, options.viewId);
	const metrics = readabilityMetrics(doc, options);
	const evidence = qualityEvidence([viewId], {
		exactness: "E2",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	const wordsPerSentence = metrics["readability.words_per_sentence"];
	if (
		wordsPerSentence !== undefined &&
		wordsPerSentence >
			threshold(options.profile, "readability.words_per_sentence", 30)
	) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "readability.long-sentences",
				severity: "notice",
				message: "Sentence length exceeds readability profile threshold",
				evidence,
				metrics: { "readability.words_per_sentence": wordsPerSentence },
			}),
		);
	}
	const lexical = lexicalDiversityMetrics(doc, options);
	const typeTokenRatio = lexical["lexical.type_token_ratio"];
	if (
		typeTokenRatio !== undefined &&
		typeTokenRatio < threshold(options.profile, "lexical.type_token_ratio", 0.3)
	) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "readability.low-lexical-diversity",
				severity: "notice",
				message: "Lexical diversity is below quality profile threshold",
				evidence,
				metrics: { "lexical.type_token_ratio": typeTokenRatio },
			}),
		);
	}
	return Object.freeze(findings);
}

export function annotationQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId } = resolveView(doc, options.viewId);
	const annotationOptions = options.annotation ?? {};
	const evidence = qualityEvidence([viewId], {
		exactness: "E1",
		producer: options.producer,
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	const validation = validateTextDocument(doc);
	for (const diagnostic of validation.diagnostics) {
		findings.push(
			finding({
				targetId: doc.id,
				kind: "annotation.document-validation",
				severity: "error",
				message: diagnostic,
				evidence,
			}),
		);
	}
	const layerIds = new Set(
		annotationOptions.layerIds ?? Object.keys(doc.layers),
	);
	for (const layer of Object.values(doc.layers).sort((left, right) =>
		compareStrings(left.id, right.id),
	)) {
		if (!layerIds.has(layer.id)) continue;
		const annotations = Object.values(layer.annotations);
		if (
			(annotationOptions.reportEmptyLayers ?? true) &&
			annotations.length === 0
		) {
			findings.push(
				finding({
					targetId: doc.id,
					kind: "annotation.sparsity.empty-layer",
					severity: "notice",
					message: `Annotation layer is empty: ${layer.id}`,
					evidence,
					metrics: { "annotation.count": 0 },
				}),
			);
		}
		for (const annotation of annotations) {
			if (
				(annotationOptions.requireEvidence ?? true) &&
				annotation.evidence.inputViewIds.length === 0
			) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "annotation.evidence-gap",
						severity: "warning",
						message: `Annotation evidence has no input views: ${annotation.id}`,
						evidence,
					}),
				);
			}
			for (const ref of annotation.spans) {
				if (doc.views[ref.viewId] === undefined) {
					findings.push(
						finding({
							targetId: doc.id,
							kind: "annotation.span-view-missing",
							severity: "error",
							message: `Annotation references a missing view: ${annotation.id}`,
							evidence,
							spans: [ref],
						}),
					);
				}
				if (
					ref.span.unit !== "utf16-code-unit" &&
					!(annotationOptions.allowNonUtf16Spans ?? false)
				) {
					findings.push(
						finding({
							targetId: doc.id,
							kind: "annotation.non-utf16-span",
							severity: "warning",
							message: `Annotation span is not UTF-16 code-unit based: ${annotation.id}`,
							evidence,
							spans: [ref],
						}),
					);
				}
			}
			for (const alternative of annotation.alternatives ?? []) {
				if (
					alternative.score !== undefined &&
					!Number.isFinite(alternative.score.value)
				) {
					findings.push(
						finding({
							targetId: doc.id,
							kind: "annotation.non-finite-score",
							severity: "error",
							message: `Annotation alternative score is non-finite: ${annotation.id}`,
							evidence,
						}),
					);
				}
			}
		}
		const sorted = annotations
			.flatMap((annotation) =>
				annotation.spans
					.filter((ref) => ref.span.unit === "utf16-code-unit")
					.map((ref) => ({ annotation, ref })),
			)
			.sort(
				(left, right) =>
					compareStrings(left.ref.viewId, right.ref.viewId) ||
					compareNumbers(left.ref.span.start, right.ref.span.start) ||
					compareNumbers(left.ref.span.end, right.ref.span.end),
			);
		for (let index = 1; index < sorted.length; index += 1) {
			const previous = sorted[index - 1];
			const current = sorted[index];
			if (
				previous === undefined ||
				current === undefined ||
				previous.ref.viewId !== current.ref.viewId
			) {
				continue;
			}
			if (current.ref.span.start < previous.ref.span.end) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "annotation.conflict.overlap",
						severity: "notice",
						message: "Annotations overlap within the same layer",
						evidence,
						spans: [previous.ref, current.ref],
					}),
				);
			}
		}
	}
	for (const graph of Object.values(doc.graphs)) {
		for (const node of Object.values(graph.nodes)) {
			const layer =
				node.layerId === undefined ? undefined : doc.layers[node.layerId];
			const exists =
				layer?.annotations[node.annotationId] !== undefined ||
				Object.values(doc.layers).some(
					(candidateLayer) =>
						candidateLayer.annotations[node.annotationId] !== undefined,
				);
			if (!exists) {
				findings.push(
					finding({
						targetId: doc.id,
						kind: "annotation.graph-reference-missing",
						severity: "error",
						message: `Graph node references a missing annotation: ${node.id}`,
						evidence,
					}),
				);
			}
		}
	}
	return Object.freeze(findings);
}

export function styleQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const { id: viewId, text } = resolveView(doc, options.viewId);
	const rules = options.styleRules ?? [];
	const evidence = qualityEvidence([viewId], {
		mode: "rule",
		exactness: "E1",
		producer: options.producer,
		ruleIds: rules.map((rule) => rule.id),
		optionsHash: options.optionsHash,
	});
	const findings: QualityFinding[] = [];
	for (const rule of rules) {
		const flags = rule.flags?.includes("g")
			? rule.flags
			: `${rule.flags ?? ""}g`;
		const pattern = new RegExp(rule.pattern, flags);
		for (const match of text.matchAll(pattern)) {
			findings.push(
				finding({
					targetId: doc.id,
					kind: `style.${rule.kind}`,
					severity: rule.severity ?? "notice",
					message: rule.message,
					evidence,
					spans: [spanRef(viewId, match.index, match.index + match[0].length)],
				}),
			);
		}
	}
	return Object.freeze(findings);
}

export function documentQualityFindings(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): readonly QualityFinding[] {
	const dimensions = new Set(selectedDimensions(options));
	const findings: QualityFinding[] = [];
	if (dimensions.has("unicode-integrity")) {
		findings.push(...unicodeIntegrityQualityFindings(doc, options));
	}
	if (dimensions.has("invisible-control")) {
		findings.push(...invisibleControlQualityFindings(doc, options));
	}
	if (dimensions.has("punctuation-whitespace")) {
		findings.push(...whitespaceQualityFindings(doc, options));
		findings.push(...punctuationQualityFindings(doc, options));
	}
	if (dimensions.has("tokenization-segmentation")) {
		findings.push(...segmentationQualityFindings(doc, options));
	}
	if (dimensions.has("ocr-atr"))
		findings.push(...ocrQualityFindings(doc, options));
	if (dimensions.has("noisy")) {
		findings.push(...noisyTextQualityFindings(doc, options));
	}
	if (dimensions.has("script-mix")) {
		findings.push(...scriptMixQualityFindings(doc, options));
	}
	if (dimensions.has("language-mix")) {
		findings.push(...languageMixQualityFindings(doc, options));
	}
	if (dimensions.has("morphology-coverage")) {
		findings.push(...morphologyCoverageQualityFindings(doc, options));
	}
	if (dimensions.has("duplicate-boilerplate")) {
		findings.push(...duplicateAndBoilerplateFindings(doc, options));
	}
	if (
		dimensions.has("readability") ||
		dimensions.has("lexical-diversity") ||
		dimensions.has("sentence-complexity") ||
		dimensions.has("paragraph-complexity")
	) {
		findings.push(...readabilityQualityFindings(doc, options));
	}
	if (dimensions.has("annotation")) {
		findings.push(...annotationQualityFindings(doc, options));
	}
	if (dimensions.has("style"))
		findings.push(...styleQualityFindings(doc, options));
	if (dimensions.has("readiness")) {
		const errorCount = findings.filter(
			(entry) => entry.severity === "error",
		).length;
		const warningCount = findings.filter(
			(entry) => entry.severity === "warning",
		).length;
		if (
			errorCount > 0 ||
			warningCount > threshold(options.profile, "readiness.warning_count", 3)
		) {
			const viewId = resolveView(doc, options.viewId).id;
			findings.push(
				finding({
					targetId: doc.id,
					kind: "readiness.processing-risk",
					severity: errorCount > 0 ? "error" : "warning",
					message: "Quality findings indicate processing readiness risk",
					evidence: qualityEvidence([viewId], {
						mode: "composite",
						exactness: "E3",
						producer: options.producer,
						optionsHash: options.optionsHash,
					}),
					metrics: {
						"readiness.error_findings": errorCount,
						"readiness.warning_findings": warningCount,
					},
				}),
			);
		}
	}
	const max = options.maxFindings ?? findings.length;
	return Object.freeze(findings.sort(compareQualityFindings).slice(0, max));
}

function documentMetrics(
	doc: TextDocument,
	options: DocumentQualityOptions,
): QualityMetricMap {
	const text = resolveView(doc, options.viewId).text;
	return metricRecord(
		{
			...readabilityMetrics(doc, options),
			...lexicalDiversityMetrics(doc, options),
			"document.code_units": text.length,
			"document.view_count": Object.keys(doc.views).length,
			"document.layer_count": Object.keys(doc.layers).length,
		},
		"document.metrics",
	);
}

export function analyzeDocumentQuality(
	doc: TextDocument,
	options: DocumentQualityOptions = {},
): QualityReport {
	const validation = validateTextDocument(doc);
	if (!validation.ok && options.strict) {
		fail(
			"TEXTQUALITY_INVALID_DOCUMENT",
			`document failed validation: ${validation.diagnostics.join("; ")}`,
		);
	}
	const viewId = resolveView(doc, options.viewId).id;
	const hash =
		options.optionsHash ??
		optionHash({
			target: "document",
			docId: doc.id,
			viewId,
			dimensions: selectedDimensions(options),
			profileId: options.profile?.id ?? "",
		});
	const findings = documentQualityFindings(doc, {
		...options,
		optionsHash: hash,
	});
	return buildQualityReport(findings, {
		id: options.id,
		target: "document",
		targetId: doc.id,
		metrics: documentMetrics(doc, options),
		summaries: {
			documentId: doc.id,
			viewId,
			dimensions: selectedDimensions(options),
		},
		optionsHash: hash,
	});
}

function assertCorpus(corpus: TextCorpus): void {
	if (typeof corpus.id !== "string" || corpus.id.length === 0) {
		fail("TEXTQUALITY_CORPUS_ID", "corpus id must be a non-empty string");
	}
	assertJsonObject(corpus.metadata, "corpus.metadata");
	if (!Array.isArray(corpus.documents)) {
		fail("TEXTQUALITY_CORPUS_DOCUMENTS", "corpus documents must be an array");
	}
	for (const [index, doc] of corpus.documents.entries()) {
		if (typeof doc.id !== "string" || doc.id.length === 0) {
			fail(
				"TEXTQUALITY_CORPUS_DOCUMENT_ID",
				`document ${index} has invalid id`,
			);
		}
		assertJsonObject(doc.metadata, `corpus.documents[${index}].metadata`);
	}
}

export function corpusQualityFindings(
	corpus: TextCorpus,
	options: CorpusQualityOptions = {},
): readonly QualityFinding[] {
	assertCorpus(corpus);
	const hash =
		options.optionsHash ??
		optionHash({
			target: "corpus",
			corpusId: corpus.id,
			requiredMetadataKeys:
				options.requiredMetadataKeys ??
				options.profile?.requiredMetadataKeys ??
				[],
			balanceKeys: options.balanceKeys ?? options.profile?.balanceKeys ?? [],
		});
	const evidence = qualityEvidence([], {
		mode: "corpus",
		exactness: "E2",
		producer: options.producer,
		corpusIds: [corpus.id],
		optionsHash: hash,
	});
	const findings: QualityFinding[] = [];
	const ids = new Set<string>();
	for (const doc of corpus.documents) {
		if (ids.has(doc.id)) {
			findings.push(
				finding({
					targetId: corpus.id,
					kind: "corpus.duplicate-document-id",
					severity: "error",
					message: `Duplicate corpus document id: ${doc.id}`,
					evidence,
				}),
			);
		}
		ids.add(doc.id);
	}
	const expectedIds = new Set(options.expectedDocumentIds ?? []);
	for (const id of [...expectedIds].sort(compareStrings)) {
		if (!ids.has(id)) {
			findings.push(
				finding({
					targetId: corpus.id,
					kind: "corpus.missing-document",
					severity: "warning",
					message: `Expected corpus document is missing: ${id}`,
					evidence,
				}),
			);
		}
	}
	const requiredKeys =
		options.requiredMetadataKeys ?? options.profile?.requiredMetadataKeys ?? [];
	for (const key of requiredKeys) {
		let missing = 0;
		for (const doc of corpus.documents) {
			if (doc.metadata[key] === undefined || doc.metadata[key] === "")
				missing += 1;
		}
		if (missing > 0) {
			findings.push(
				finding({
					targetId: corpus.id,
					kind: "corpus.metadata-gap",
					severity: "warning",
					message: `Corpus metadata key is missing in documents: ${key}`,
					evidence,
					metrics: {
						"corpus.missing_documents": missing,
						"corpus.metadata_coverage":
							corpus.documents.length === 0
								? 0
								: (corpus.documents.length - missing) / corpus.documents.length,
					},
				}),
			);
		}
	}
	const balanceKeys = options.balanceKeys ?? options.profile?.balanceKeys ?? [];
	for (const key of balanceKeys) {
		const counts = new Map<string, number>();
		for (const doc of corpus.documents) {
			const value = doc.metadata[key];
			const label =
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean"
					? String(value)
					: "<missing>";
			counts.set(label, (counts.get(label) ?? 0) + 1);
		}
		const countValues = [...counts.values()];
		const max = Math.max(0, ...countValues);
		const ratio =
			corpus.documents.length === 0 ? 0 : max / corpus.documents.length;
		if (ratio > 0.8 && corpus.documents.length > 1) {
			findings.push(
				finding({
					targetId: corpus.id,
					kind: "corpus.imbalance",
					severity: "notice",
					message: `Corpus partition is imbalanced: ${key}`,
					evidence,
					metrics: {
						"corpus.partition_largest_share": ratio,
						"corpus.partition_count": counts.size,
					},
				}),
			);
		}
	}
	for (const report of options.documentReports ?? []) {
		if (
			report.metrics["findings.error"] !== undefined &&
			report.metrics["findings.error"] > 0
		) {
			findings.push(
				finding({
					targetId: corpus.id,
					kind: "corpus.document-quality-errors",
					severity: "warning",
					message: `Document quality report contains errors: ${report.id}`,
					evidence,
					metrics: {
						"document.error_findings": report.metrics["findings.error"],
					},
				}),
			);
		}
	}
	return Object.freeze(
		findings
			.sort(compareQualityFindings)
			.slice(0, options.maxFindings ?? findings.length),
	);
}

export function analyzeCorpusQuality(
	corpus: TextCorpus,
	options: CorpusQualityOptions = {},
): QualityReport {
	const findings = corpusQualityFindings(corpus, options);
	const requiredKeys =
		options.requiredMetadataKeys ?? options.profile?.requiredMetadataKeys ?? [];
	let presentSlots = 0;
	let totalSlots = 0;
	for (const key of requiredKeys) {
		for (const doc of corpus.documents) {
			totalSlots += 1;
			if (doc.metadata[key] !== undefined && doc.metadata[key] !== "")
				presentSlots += 1;
		}
	}
	return buildQualityReport(findings, {
		id: options.id,
		target: "corpus",
		targetId: corpus.id,
		metrics: {
			"corpus.document_count": corpus.documents.length,
			"corpus.metadata_required_slots": totalSlots,
			...(totalSlots > 0
				? { "corpus.metadata_coverage": presentSlots / totalSlots }
				: {}),
		},
		summaries: {
			corpusId: corpus.id,
			requiredMetadataKeys: requiredKeys,
			balanceKeys: options.balanceKeys ?? options.profile?.balanceKeys ?? [],
		},
		optionsHash: options.optionsHash,
	});
}

function severityAtLeast(
	severity: QualityFindingSeverity,
	minimum: QualityFindingSeverity,
): boolean {
	return severityRank[severity] >= severityRank[minimum];
}

function annotationValue(
	finding: QualityFinding,
	reportId: string,
): JsonObject {
	return stableJsonClone({
		reportId,
		findingId: finding.id,
		kind: finding.kind,
		severity: finding.severity,
		message: finding.message,
		metrics: finding.metrics ?? {},
	});
}

function annotationExists(doc: TextDocument, annotationId: string): boolean {
	return Object.values(doc.layers).some(
		(layer) => layer.annotations[annotationId] !== undefined,
	);
}

export function annotateQuality(
	doc: TextDocument,
	options: QualityAnnotateOptions = {},
): TextDocument {
	const report = analyzeDocumentQuality(doc, options);
	const viewId = resolveView(doc, options.viewId).id;
	const layerId = options.layerId ?? "quality.findings";
	const layerType = options.layerType ?? "quality.findings";
	const annotationType = options.annotationType ?? "quality.finding";
	const minSeverity = options.minSeverity ?? "info";
	const maxAnnotations = options.maxAnnotations ?? report.findings.length;
	let output = doc;
	if (output.layers[layerId] === undefined) {
		const layer: AnnotationLayer<JsonObject> = {
			id: layerId,
			type: layerType,
			viewId,
			annotations: {},
			metadata: { packageName, reportId: report.id },
		};
		output = addLayer(output, layer);
	}
	let added = 0;
	for (const qualityFinding of report.findings) {
		if (!severityAtLeast(qualityFinding.severity, minSeverity)) continue;
		if (added >= maxAnnotations) break;
		const annotationId = stableId("quality-annotation", {
			docId: doc.id,
			layerId,
			reportId: report.id,
			findingId: qualityFinding.id,
		});
		if (annotationExists(output, annotationId)) {
			if ((options.onExistingAnnotation ?? "skip") === "error") {
				fail(
					"TEXTQUALITY_DUPLICATE_QUALITY_MARK",
					`quality annotation already exists: ${annotationId}`,
				);
			}
			continue;
		}
		const annotation: Annotation<JsonObject> = {
			id: annotationId,
			layer: layerId,
			type: annotationType,
			spans: qualityFinding.spans ?? [],
			value: annotationValue(qualityFinding, report.id),
			features: qualityFinding.metrics ?? {},
			evidence: qualityFinding.evidence,
		};
		output = addAnnotation(output, annotation);
		added += 1;
	}
	return output;
}
