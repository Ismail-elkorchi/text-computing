import type {
	Annotation,
	SpanRef,
	TextDocument,
} from "@ismail-elkorchi/textdoc";
import { caseFold, nfkcCaseFold } from "@ismail-elkorchi/textfacts/casefold";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import {
	type NormalizationForm,
	normalize as normalizeUnicode,
} from "@ismail-elkorchi/textfacts/normalize";
import { segmentWords } from "@ismail-elkorchi/textfacts/segment";
import type { Stoplist, Wordlist } from "@ismail-elkorchi/textlex";
import { boundedEditDistance } from "@ismail-elkorchi/textlex/fuzzy";
import type { Lexicon } from "@ismail-elkorchi/textlex/lexicon";

export const packageName = "@ismail-elkorchi/textsearch" as const;

export type PackageName = typeof packageName;

export class TextSearchError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`${code}: ${message}`);
		this.name = "TextSearchError";
		this.code = code;
	}
}

function fail(code: string, message: string): never {
	throw new TextSearchError(code, message);
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

export type SearchDiagnosticSeverity = "info" | "warning" | "error";

export interface SearchDiagnostic {
	readonly code: string;
	readonly severity: SearchDiagnosticSeverity;
	readonly message: string;
	readonly indexId?: string;
	readonly docId?: string;
	readonly fieldId?: string;
	readonly queryPath?: string;
	readonly token?: string;
	readonly span?: SearchHitSpan;
	readonly metadata?: JsonObject;
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
			fail("TEXTSEARCH_JSON_STRING", `${path} contains a lone high surrogate`);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			fail("TEXTSEARCH_JSON_STRING", `${path} contains a lone low surrogate`);
		}
		index += 1;
	}
}

export function assertJsonValue(
	value: unknown,
	path = "$",
): asserts value is JsonValue {
	if (value === null || typeof value === "boolean") return;
	if (typeof value === "string") {
		assertJsonString(value, path);
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			fail("TEXTSEARCH_JSON_NUMBER", `${path} must be finite`);
		}
		return;
	}
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			assertJsonValue(value[index], `${path}[${index}]`);
		}
		return;
	}
	if (isPlainRecord(value)) {
		for (const key of Object.keys(value)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValue(value[key], `${path}.${key}`);
		}
		return;
	}
	fail("TEXTSEARCH_JSON_VALUE", `${path} must be an I-JSON value`);
}

export function assertJsonObject(
	value: unknown,
	path = "$",
): asserts value is JsonObject {
	assertJsonValue(value, path);
	if (!isPlainRecord(value)) {
		fail("TEXTSEARCH_JSON_OBJECT", `${path} must be a JSON object`);
	}
}

function stableJsonClone<T extends JsonValue>(value: T): T {
	if (value === null || typeof value !== "object") return value;
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonClone(entry)) as unknown as T;
	}
	const sorted: Record<string, JsonValue> = {};
	for (const key of Object.keys(value).sort(compareStrings)) {
		sorted[key] = stableJsonClone(
			(value as Record<string, JsonValue>)[key] as JsonValue,
		);
	}
	return sorted as T;
}

function stableStringify(value: JsonValue): string {
	return JSON.stringify(stableJsonClone(value));
}

function jsonObjectClone(
	value: Readonly<Record<string, unknown>> | undefined,
	path: string,
): JsonObject {
	const record = value ?? {};
	assertJsonObject(record, path);
	return stableJsonClone(record);
}

function jsonValueClone(value: unknown, path: string): JsonValue {
	assertJsonValue(value, path);
	return stableJsonClone(value);
}

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function compareNumbers(left: number, right: number): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function stableEntries<T>(record: Readonly<Record<string, T>>): [string, T][] {
	return Object.entries(record).sort(([left], [right]) =>
		compareStrings(left, right),
	);
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort(compareStrings);
}

function stableId(prefix: string, payload: JsonValue): string {
	return `${prefix}-${stableHash64(stableStringify(payload))}`;
}

function assertNonEmptyString(
	value: unknown,
	path: string,
): asserts value is string {
	if (typeof value !== "string" || value.length === 0) {
		fail("TEXTSEARCH_STRING", `${path} must be a non-empty string`);
	}
}

function assertFinite(value: number, path: string): number {
	if (!Number.isFinite(value)) {
		fail("TEXTSEARCH_NUMBER", `${path} must be finite`);
	}
	return value;
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
	return Object.freeze([...values]);
}

function freezeRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	return Object.freeze(Object.fromEntries(stableEntries(record)));
}

export interface SearchToken {
	readonly term: string;
	readonly position: number;
	readonly startCU: number;
	readonly endCU: number;
	readonly type?: string;
	readonly payload?: Readonly<Record<string, unknown>>;
}

export interface Analyzer {
	readonly id: string;
	analyze(
		text: string | TextDocument,
		options?: AnalyzeOptions,
	): Iterable<SearchToken>;
}

export interface AnalyzerOptions {
	readonly id?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly defaultViewId?: string;
	readonly tokenLayerId?: string;
	readonly language?: string;
	readonly script?: string;
	readonly resourceFingerprints?: readonly string[];
	readonly strict?: boolean;
}

export interface AnalyzeOptions {
	readonly viewId?: string;
	readonly tokenLayerId?: string;
	readonly includePayload?: boolean;
	readonly strict?: boolean;
}

export type TokenizerMode =
	| "unicode-word"
	| "whitespace"
	| "character"
	| "pattern";

export interface TokenizerComponent {
	readonly kind: "tokenizer";
	readonly mode?: TokenizerMode;
	readonly pattern?: string;
	readonly flags?: string;
	readonly tokenType?: string;
}

export interface NormalizerComponent {
	readonly kind: "normalizer";
	readonly form?: NormalizationForm | "nfkc-casefold";
	readonly lowercase?: boolean;
	readonly casefold?: boolean;
	readonly trim?: boolean;
}

export interface StopwordComponent {
	readonly kind: "stopwords";
	readonly words?: readonly string[];
	readonly wordlist?: Wordlist | Stoplist | StructuralWordlist;
	readonly casefold?: boolean;
}

export interface StemmerComponent {
	readonly kind: "stemmer";
	readonly map: Readonly<Record<string, string>>;
}

export interface SynonymComponent {
	readonly kind: "synonym";
	readonly map: Readonly<Record<string, string | readonly string[]>>;
	readonly includeOriginal?: boolean;
}

export interface LexiconComponent {
	readonly kind: "lexicon";
	readonly id?: string;
	readonly lexicon?: Lexicon | StructuralLexicon;
	readonly keys?: readonly string[];
	readonly map?: Readonly<Record<string, string | readonly string[]>>;
	readonly includeOriginal?: boolean;
	readonly casefold?: boolean;
}

export interface StructuralTransducer {
	apply?(input: string): string | readonly string[] | undefined;
	lookup?(input: string): string | readonly string[] | undefined;
	transduce?(
		input: string,
	): string | readonly string[] | Iterable<string> | undefined;
}

export interface FstComponent {
	readonly kind: "fst";
	readonly id: string;
	readonly transducer: StructuralTransducer;
	readonly includeOriginal?: boolean;
}

export interface NgramComponent {
	readonly kind: "ngram";
	readonly min: number;
	readonly max: number;
	readonly mode?: "token" | "character";
}

export interface PayloadComponent {
	readonly kind: "payload";
	readonly payload: Readonly<Record<string, unknown>>;
}

export interface CustomAnalyzerComponent {
	readonly kind: "custom";
	readonly id: string;
	transform(
		tokens: readonly SearchToken[],
		context: AnalyzerTransformContext,
	): Iterable<SearchToken>;
}

export type AnalyzerComponent =
	| TokenizerComponent
	| NormalizerComponent
	| StopwordComponent
	| StemmerComponent
	| SynonymComponent
	| LexiconComponent
	| FstComponent
	| NgramComponent
	| PayloadComponent
	| CustomAnalyzerComponent;

export interface AnalyzerTransformContext {
	readonly text: string;
	readonly inputKind: "string" | "document";
	readonly documentId?: string;
	readonly viewId?: string;
}

export interface StructuralWordlist {
	readonly forms?: readonly string[];
	readonly keys?: readonly string[];
	readonly entries?: readonly { readonly form: string }[];
}

function tokenPayload(
	payload: Readonly<Record<string, unknown>> | undefined,
	path: string,
): Readonly<Record<string, unknown>> | undefined {
	if (payload === undefined) return undefined;
	return jsonObjectClone(payload, path);
}

function normalizeSearchToken(token: SearchToken, path: string): SearchToken {
	assertNonEmptyString(token.term, `${path}.term`);
	if (!Number.isInteger(token.position) || token.position < 0) {
		fail(
			"TEXTSEARCH_TOKEN_POSITION",
			`${path}.position must be a non-negative integer`,
		);
	}
	if (
		!Number.isInteger(token.startCU) ||
		!Number.isInteger(token.endCU) ||
		token.startCU < 0 ||
		token.endCU < token.startCU
	) {
		fail("TEXTSEARCH_TOKEN_SPAN", `${path} must have a valid UTF-16 span`);
	}
	const payload = tokenPayload(token.payload, `${path}.payload`);
	return Object.freeze({
		term: token.term,
		position: token.position,
		startCU: token.startCU,
		endCU: token.endCU,
		...(token.type !== undefined ? { type: token.type } : {}),
		...(payload !== undefined ? { payload } : {}),
	});
}

function tokenizerFingerprint(component: TokenizerComponent): JsonObject {
	return {
		kind: "tokenizer",
		mode: component.mode ?? "unicode-word",
		...(component.pattern !== undefined ? { pattern: component.pattern } : {}),
		...(component.flags !== undefined ? { flags: component.flags } : {}),
		...(component.tokenType !== undefined
			? { tokenType: component.tokenType }
			: {}),
	};
}

function componentFingerprint(component: AnalyzerComponent): JsonObject {
	if (component.kind === "custom") {
		return { kind: "custom", id: component.id };
	}
	if (component.kind === "payload") {
		return {
			kind: "payload",
			payload: jsonObjectClone(component.payload, "$.component.payload"),
		};
	}
	if (component.kind === "stopwords") {
		return {
			kind: "stopwords",
			words: stopwordForms(component).sort(compareStrings),
			casefold: component.casefold ?? true,
		};
	}
	if (component.kind === "lexicon") {
		const lexiconId =
			isPlainRecord(component.lexicon) &&
			typeof component.lexicon.id === "string"
				? component.lexicon.id
				: undefined;
		return {
			kind: "lexicon",
			id: component.id ?? lexiconId ?? "lexicon",
			keys: lexiconComponentKeys(component),
			map: jsonObjectClone(component.map, "$.component.lexicon.map"),
			includeOriginal: component.includeOriginal ?? true,
			casefold: component.casefold ?? true,
		};
	}
	if (component.kind === "fst") {
		return {
			kind: "fst",
			id: component.id,
			includeOriginal: component.includeOriginal ?? true,
		};
	}
	if (component.kind === "tokenizer") return tokenizerFingerprint(component);
	return jsonValueClone(component, "$.component") as JsonObject;
}

function normalizeAnalyzerComponents(
	components: readonly AnalyzerComponent[],
): readonly AnalyzerComponent[] {
	return freezeArray(
		components.map((component, index) => {
			if (!isPlainRecord(component)) {
				fail(
					"TEXTSEARCH_ANALYZER_COMPONENT",
					`component ${index} must be an object`,
				);
			}
			if (component.kind === "custom") {
				assertNonEmptyString(component.id, `component ${index}.id`);
				if (typeof component.transform !== "function") {
					fail(
						"TEXTSEARCH_ANALYZER_COMPONENT",
						`component ${index}.transform must be a function`,
					);
				}
				return component;
			}
			componentFingerprint(component);
			return component;
		}),
	);
}

function textFromInput(
	input: string | TextDocument,
	options: AnalyzerOptions,
	runOptions: AnalyzeOptions,
): {
	readonly inputKind: "string" | "document";
	readonly text: string;
	readonly documentId?: string;
	readonly viewId?: string;
	readonly tokenLayerId?: string;
	readonly document?: TextDocument;
} {
	if (typeof input === "string") {
		return { inputKind: "string", text: input };
	}
	const viewId =
		runOptions.viewId ??
		options.defaultViewId ??
		(input.views.raw !== undefined
			? "raw"
			: Object.keys(input.views).sort(compareStrings)[0]);
	if (viewId === undefined || input.views[viewId] === undefined) {
		if (runOptions.strict ?? options.strict ?? true) {
			fail(
				"TEXTSEARCH_VIEW_MISSING",
				`document view is missing: ${viewId ?? "(none)"}`,
			);
		}
		return {
			inputKind: "document",
			text: "",
			documentId: input.id,
			document: input,
		};
	}
	const tokenLayerId = runOptions.tokenLayerId ?? options.tokenLayerId;
	return {
		inputKind: "document",
		text: input.views[viewId].text,
		documentId: input.id,
		viewId,
		...(tokenLayerId !== undefined ? { tokenLayerId } : {}),
		document: input,
	};
}

function whitespaceTokens(
	text: string,
	tokenType: string | undefined,
): SearchToken[] {
	const tokens: SearchToken[] = [];
	const pattern = /\S+/gu;
	let position = 0;
	for (const match of text.matchAll(pattern)) {
		const term = match[0];
		const start = match.index ?? 0;
		tokens.push({
			term,
			position,
			startCU: start,
			endCU: start + term.length,
			...(tokenType !== undefined ? { type: tokenType } : {}),
		});
		position += 1;
	}
	return tokens;
}

function characterTokens(
	text: string,
	tokenType: string | undefined,
): SearchToken[] {
	const tokens: SearchToken[] = [];
	let position = 0;
	for (let index = 0; index < text.length; ) {
		const codePoint = text.codePointAt(index);
		if (codePoint === undefined) break;
		const end = index + (codePoint > 0xffff ? 2 : 1);
		const term = text.slice(index, end);
		tokens.push({
			term,
			position,
			startCU: index,
			endCU: end,
			...(tokenType !== undefined ? { type: tokenType } : {}),
		});
		position += 1;
		index = end;
	}
	return tokens;
}

function unicodeWordTokens(
	text: string,
	tokenType: string | undefined,
): SearchToken[] {
	const tokens: SearchToken[] = [];
	let position = 0;
	for (const span of segmentWords(text)) {
		const term = text.slice(span.startCU, span.endCU);
		if (!/[\p{Letter}\p{Number}]/u.test(term)) continue;
		tokens.push({
			term,
			position,
			startCU: span.startCU,
			endCU: span.endCU,
			...(tokenType !== undefined ? { type: tokenType } : {}),
		});
		position += 1;
	}
	return tokens;
}

function patternTokens(
	component: TokenizerComponent,
	text: string,
): SearchToken[] {
	if (component.pattern === undefined || component.pattern.length === 0) {
		fail(
			"TEXTSEARCH_TOKENIZER_PATTERN",
			"pattern tokenizer requires a pattern",
		);
	}
	const flags = component.flags?.includes("g")
		? component.flags
		: `${component.flags ?? ""}g`;
	const pattern = new RegExp(component.pattern, flags);
	const tokens: SearchToken[] = [];
	let position = 0;
	for (const match of text.matchAll(pattern)) {
		const term = match[0];
		if (term.length === 0) continue;
		const start = match.index ?? 0;
		tokens.push({
			term,
			position,
			startCU: start,
			endCU: start + term.length,
			...(component.tokenType !== undefined
				? { type: component.tokenType }
				: {}),
		});
		position += 1;
	}
	return tokens;
}

function tokenize(
	component: TokenizerComponent | undefined,
	text: string,
): SearchToken[] {
	const mode = component?.mode ?? "unicode-word";
	if (mode === "whitespace")
		return whitespaceTokens(text, component?.tokenType);
	if (mode === "character") return characterTokens(text, component?.tokenType);
	if (mode === "pattern") {
		if (component === undefined) {
			fail(
				"TEXTSEARCH_TOKENIZER_PATTERN",
				"pattern tokenizer requires options",
			);
		}
		return patternTokens(component, text);
	}
	return unicodeWordTokens(text, component?.tokenType);
}

function annotationText(
	document: TextDocument,
	annotation: Annotation,
	viewId: string,
): string {
	const value = annotation.value;
	if (typeof value === "string") return value;
	if (isPlainRecord(value) && typeof value.text === "string") return value.text;
	const ref =
		annotation.spans.find((span) => span.viewId === viewId) ??
		annotation.spans[0];
	if (ref === undefined) return "";
	if (ref.span.unit !== "utf16-code-unit") {
		fail(
			"TEXTSEARCH_SPAN_UNIT",
			`annotation ${annotation.id} uses ${ref.span.unit}; UTF-16 coordinates are required for slicing`,
		);
	}
	const view = document.views[ref.viewId];
	if (view === undefined) return "";
	return view.text.slice(ref.span.start, ref.span.end);
}

function tokensFromLayer(
	input: ReturnType<typeof textFromInput>,
	tokenLayerId: string,
): SearchToken[] | undefined {
	if (input.document === undefined || input.viewId === undefined)
		return undefined;
	const layer = input.document.layers[tokenLayerId];
	if (layer === undefined) return undefined;
	return Object.values(layer.annotations)
		.filter((annotation) =>
			annotation.spans.some((span) => span.viewId === input.viewId),
		)
		.sort((left, right) => {
			const leftSpan = left.spans.find((span) => span.viewId === input.viewId);
			const rightSpan = right.spans.find(
				(span) => span.viewId === input.viewId,
			);
			return (
				compareNumbers(leftSpan?.span.start ?? 0, rightSpan?.span.start ?? 0) ||
				compareStrings(left.id, right.id)
			);
		})
		.map((annotation, position) => {
			const span =
				annotation.spans.find(
					(candidate) => candidate.viewId === input.viewId,
				) ?? annotation.spans[0];
			if (span === undefined) {
				fail(
					"TEXTSEARCH_TOKEN_LAYER",
					`annotation has no span: ${annotation.id}`,
				);
			}
			if (span.span.unit !== "utf16-code-unit") {
				fail(
					"TEXTSEARCH_SPAN_UNIT",
					`annotation ${annotation.id} uses ${span.span.unit}; UTF-16 coordinates are required`,
				);
			}
			return normalizeSearchToken(
				{
					term: annotationText(
						input.document as TextDocument,
						annotation,
						input.viewId as string,
					),
					position,
					startCU: span.span.start,
					endCU: span.span.end,
					type: annotation.type,
					payload: {
						annotationId: annotation.id,
						layerId: annotation.layer,
					},
				},
				`$.tokenLayer.${annotation.id}`,
			);
		});
}

function normalizeTokenTerm(
	term: string,
	component: NormalizerComponent,
): string {
	let next = term;
	if (component.form === "nfkc-casefold") {
		next = nfkcCaseFold(next);
	} else if (component.form !== undefined) {
		next = normalizeUnicode(next, component.form);
	}
	if (component.casefold === true) next = caseFold(next);
	if (component.lowercase === true) next = next.toLowerCase();
	if (component.trim === true) next = next.trim();
	return next;
}

function stopwordForms(component: StopwordComponent): string[] {
	const values = [
		...(component.words ?? []),
		...(component.wordlist?.forms ?? []),
		...(component.wordlist?.keys ?? []),
		...(component.wordlist?.entries?.map((entry) => entry.form) ?? []),
	];
	return uniqueSorted(values.filter((value) => value.length > 0));
}

function applyStopwords(
	tokens: readonly SearchToken[],
	component: StopwordComponent,
): SearchToken[] {
	const shouldFold = component.casefold ?? true;
	const blocked = new Set(
		stopwordForms(component).map((word) =>
			shouldFold ? caseFold(word) : word,
		),
	);
	return tokens.filter((token) => {
		const key = shouldFold ? caseFold(token.term) : token.term;
		return !blocked.has(key);
	});
}

function applySynonyms(
	tokens: readonly SearchToken[],
	component: SynonymComponent,
): SearchToken[] {
	const output: SearchToken[] = [];
	for (const token of tokens) {
		if (component.includeOriginal !== false) output.push(token);
		const replacements = component.map[token.term];
		if (replacements === undefined) continue;
		for (const replacement of Array.isArray(replacements)
			? replacements
			: [replacements]) {
			if (replacement.length === 0) continue;
			output.push(
				normalizeSearchToken(
					{
						...token,
						term: replacement,
						payload: {
							...(token.payload ?? {}),
							synonymOf: token.term,
						},
					},
					`$.synonym.${token.position}`,
				),
			);
		}
	}
	return output.sort(
		(left, right) =>
			compareNumbers(left.position, right.position) ||
			compareNumbers(left.startCU, right.startCU) ||
			compareStrings(left.term, right.term),
	);
}

function lexiconComponentKeys(component: LexiconComponent): string[] {
	const explicit = [...(component.keys ?? [])];
	if (component.lexicon !== undefined) {
		explicit.push(...(component.lexicon.index?.keys ?? []));
		explicit.push(
			...(component.lexicon.entries ?? []).flatMap((entry) => entry.forms),
		);
	}
	explicit.push(...Object.keys(component.map ?? {}));
	return uniqueSorted(explicit.filter((value) => value.length > 0));
}

function lexiconReplacements(
	component: LexiconComponent,
	term: string,
): readonly string[] {
	const shouldFold = component.casefold ?? true;
	const key = shouldFold ? caseFold(term) : term;
	const output: string[] = [];
	const mapped = component.map?.[term] ?? component.map?.[key];
	if (mapped !== undefined) {
		output.push(...(Array.isArray(mapped) ? mapped : [mapped]));
	}
	for (const entry of component.lexicon?.entries ?? []) {
		const forms = [...entry.forms];
		const matches = forms.some(
			(form) => (shouldFold ? caseFold(form) : form) === key,
		);
		if (!matches) continue;
		output.push(entry.canonical ?? forms[0] ?? term);
	}
	if (
		component.keys?.some(
			(candidate) => (shouldFold ? caseFold(candidate) : candidate) === key,
		)
	) {
		output.push(term);
	}
	return uniqueSorted(output.filter((value) => value.length > 0));
}

function applyLexiconComponent(
	tokens: readonly SearchToken[],
	component: LexiconComponent,
): SearchToken[] {
	const output: SearchToken[] = [];
	for (const token of tokens) {
		if (component.includeOriginal !== false) output.push(token);
		for (const replacement of lexiconReplacements(component, token.term)) {
			output.push(
				normalizeSearchToken(
					{
						...token,
						term: replacement,
						payload: {
							...(token.payload ?? {}),
							lexiconOf: token.term,
						},
					},
					`$.lexicon.${token.position}`,
				),
			);
		}
	}
	return output.sort(
		(left, right) =>
			compareNumbers(left.position, right.position) ||
			compareNumbers(left.startCU, right.startCU) ||
			compareStrings(left.term, right.term),
	);
}

function transducerOutputValues(
	component: FstComponent,
	term: string,
): string[] {
	const raw =
		component.transducer.apply?.(term) ??
		component.transducer.lookup?.(term) ??
		component.transducer.transduce?.(term);
	if (raw === undefined) return [];
	if (typeof raw === "string") return raw.length > 0 ? [raw] : [];
	return uniqueSorted([...raw].filter((value) => value.length > 0));
}

function applyFstComponent(
	tokens: readonly SearchToken[],
	component: FstComponent,
): SearchToken[] {
	const output: SearchToken[] = [];
	for (const token of tokens) {
		if (component.includeOriginal !== false) output.push(token);
		for (const replacement of transducerOutputValues(component, token.term)) {
			output.push(
				normalizeSearchToken(
					{
						...token,
						term: replacement,
						payload: {
							...(token.payload ?? {}),
							fstId: component.id,
							fstInput: token.term,
						},
					},
					`$.fst.${component.id}.${token.position}`,
				),
			);
		}
	}
	return output.sort(
		(left, right) =>
			compareNumbers(left.position, right.position) ||
			compareNumbers(left.startCU, right.startCU) ||
			compareStrings(left.term, right.term),
	);
}

function applyTokenNgrams(
	tokens: readonly SearchToken[],
	component: NgramComponent,
): SearchToken[] {
	if (!Number.isInteger(component.min) || !Number.isInteger(component.max)) {
		fail("TEXTSEARCH_NGRAM", "token n-gram sizes must be integers");
	}
	if (component.min < 1 || component.max < component.min) {
		fail("TEXTSEARCH_NGRAM", "token n-gram sizes are invalid");
	}
	const output: SearchToken[] = [];
	for (let start = 0; start < tokens.length; start += 1) {
		for (let size = component.min; size <= component.max; size += 1) {
			const slice = tokens.slice(start, start + size);
			if (slice.length !== size) continue;
			const first = slice[0];
			const last = slice[slice.length - 1];
			if (first === undefined || last === undefined) continue;
			output.push(
				normalizeSearchToken(
					{
						term: slice.map((token) => token.term).join(" "),
						position: first.position,
						startCU: first.startCU,
						endCU: last.endCU,
						type: "token.ngram",
					},
					`$.ngram.${start}.${size}`,
				),
			);
		}
	}
	return output;
}

function applyCharacterNgrams(
	tokens: readonly SearchToken[],
	component: NgramComponent,
): SearchToken[] {
	if (component.min < 1 || component.max < component.min) {
		fail("TEXTSEARCH_NGRAM", "character n-gram sizes are invalid");
	}
	const output: SearchToken[] = [];
	let position = 0;
	for (const token of tokens) {
		const starts: number[] = [];
		for (let index = 0; index < token.term.length; ) {
			starts.push(index);
			const codePoint = token.term.codePointAt(index);
			if (codePoint === undefined) break;
			index += codePoint > 0xffff ? 2 : 1;
		}
		starts.push(token.term.length);
		for (let left = 0; left < starts.length - 1; left += 1) {
			for (let size = component.min; size <= component.max; size += 1) {
				const right = left + size;
				if (right >= starts.length) continue;
				const startOffset = starts[left] ?? 0;
				const endOffset = starts[right] ?? startOffset;
				output.push(
					normalizeSearchToken(
						{
							term: token.term.slice(startOffset, endOffset),
							position,
							startCU: token.startCU + startOffset,
							endCU: token.startCU + endOffset,
							type: "character.ngram",
						},
						`$.charNgram.${position}`,
					),
				);
				position += 1;
			}
		}
	}
	return output;
}

function renumber(tokens: readonly SearchToken[]): SearchToken[] {
	return tokens.map((token, position) =>
		normalizeSearchToken(
			{
				...token,
				position,
			},
			`$.tokens.${position}`,
		),
	);
}

export function createAnalyzer(
	components: AnalyzerComponent[],
	options: AnalyzerOptions = {},
): Analyzer {
	const normalizedComponents = normalizeAnalyzerComponents(components);
	const metadata = jsonObjectClone(options.metadata, "$.metadata");
	const fingerprint = {
		components: normalizedComponents.map(componentFingerprint),
		metadata,
		defaultViewId: options.defaultViewId ?? null,
		tokenLayerId: options.tokenLayerId ?? null,
		language: options.language ?? null,
		script: options.script ?? null,
		resourceFingerprints: [...(options.resourceFingerprints ?? [])].sort(
			compareStrings,
		),
		strict: options.strict ?? true,
	};
	const id =
		options.id !== undefined && options.id.length > 0
			? options.id
			: stableId("analyzer", fingerprint);
	const analyzerOptions = Object.freeze({
		...options,
		metadata,
		resourceFingerprints: freezeArray(
			[...(options.resourceFingerprints ?? [])].sort(compareStrings),
		),
	});
	const analyzer: Analyzer = Object.freeze({
		id,
		analyze(input: string | TextDocument, runOptions: AnalyzeOptions = {}) {
			return analyzeWithComponents(
				normalizedComponents,
				analyzerOptions,
				input,
				runOptions,
			);
		},
	});
	return analyzer;
}

function analyzeWithComponents(
	components: readonly AnalyzerComponent[],
	options: AnalyzerOptions,
	input: string | TextDocument,
	runOptions: AnalyzeOptions,
): SearchToken[] {
	const inputText = textFromInput(input, options, runOptions);
	const context: AnalyzerTransformContext = {
		text: inputText.text,
		inputKind: inputText.inputKind,
		...(inputText.documentId !== undefined
			? { documentId: inputText.documentId }
			: {}),
		...(inputText.viewId !== undefined ? { viewId: inputText.viewId } : {}),
	};
	const explicitTokenizer = components.find(
		(component): component is TokenizerComponent =>
			component.kind === "tokenizer",
	);
	let tokens =
		inputText.tokenLayerId !== undefined && explicitTokenizer === undefined
			? (tokensFromLayer(inputText, inputText.tokenLayerId) ??
				tokenize(undefined, inputText.text))
			: tokenize(explicitTokenizer, inputText.text);
	for (const component of components) {
		if (component.kind === "tokenizer") continue;
		if (component.kind === "normalizer") {
			tokens = tokens
				.map((token, index) =>
					normalizeSearchToken(
						{
							...token,
							term: normalizeTokenTerm(token.term, component),
						},
						`$.normalizer.${index}`,
					),
				)
				.filter((token) => token.term.length > 0);
			continue;
		}
		if (component.kind === "stopwords") {
			tokens = applyStopwords(tokens, component);
			continue;
		}
		if (component.kind === "stemmer") {
			tokens = tokens.map((token, index) =>
				normalizeSearchToken(
					{
						...token,
						term: component.map[token.term] ?? token.term,
					},
					`$.stemmer.${index}`,
				),
			);
			continue;
		}
		if (component.kind === "synonym") {
			tokens = applySynonyms(tokens, component);
			continue;
		}
		if (component.kind === "lexicon") {
			tokens = applyLexiconComponent(tokens, component);
			continue;
		}
		if (component.kind === "fst") {
			tokens = applyFstComponent(tokens, component);
			continue;
		}
		if (component.kind === "ngram") {
			tokens =
				component.mode === "character"
					? applyCharacterNgrams(tokens, component)
					: applyTokenNgrams(tokens, component);
			continue;
		}
		if (component.kind === "payload") {
			const payload = jsonObjectClone(component.payload, "$.payload");
			tokens = tokens.map((token, index) =>
				normalizeSearchToken(
					{
						...token,
						payload: {
							...(token.payload ?? {}),
							...payload,
						},
					},
					`$.payload.${index}`,
				),
			);
			continue;
		}
		tokens = [...component.transform(tokens, context)].map((token, index) =>
			normalizeSearchToken(token, `$.custom.${component.id}.${index}`),
		);
	}
	return freezeArray(renumber(tokens)) as SearchToken[];
}

export function analyze(
	analyzer: Analyzer,
	input: string | TextDocument,
	options: AnalyzeOptions = {},
): SearchToken[] {
	return [...analyzer.analyze(input, options)].map((token, index) =>
		normalizeSearchToken(token, `$.analyze.${index}`),
	);
}

export type FieldSource =
	| { readonly kind: "view"; readonly viewId?: string }
	| {
			readonly kind: "annotation";
			readonly layerId: string;
			readonly annotationType?: string;
			readonly valueKey?: string;
	  }
	| { readonly kind: "metadata"; readonly key: string }
	| { readonly kind: "stored"; readonly key: string }
	| { readonly kind: "literal"; readonly value: string };

export interface FieldConfig {
	readonly id?: string;
	readonly source?: FieldSource;
	readonly analyzerId?: string;
	readonly boost?: number;
	readonly store?: boolean;
	readonly highlight?: boolean;
	readonly filterable?: boolean;
	readonly facetable?: boolean;
	readonly sortable?: boolean;
	readonly characterNgram?: { readonly min: number; readonly max: number };
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface IndexFieldConfig extends FieldConfig {
	readonly analyzer?: Analyzer;
}

export interface IndexSchema {
	readonly id?: string;
	readonly fields: Readonly<Record<string, IndexFieldConfig>>;
	readonly defaultAnalyzer?: Analyzer;
	readonly storedFields?: readonly string[];
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly version?: string;
}

export interface IndexOptions {
	readonly id?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly termVectors?: boolean;
	readonly positions?: boolean;
	readonly strict?: boolean;
}

export interface AddOptions {
	readonly documentId?: string;
	readonly onDuplicate?: "reject" | "replace";
	readonly storedFields?: Readonly<Record<string, unknown>>;
	readonly metadataBoosts?: Readonly<Record<string, number>>;
	readonly strict?: boolean;
}

export interface IndexStats {
	readonly documentCount: number;
	readonly fieldCount: number;
	readonly termCount: number;
	readonly postingCount: number;
	readonly tokenCount: number;
	readonly averageFieldLengths: Readonly<Record<string, number>>;
	readonly documentFrequencies: Readonly<Record<string, number>>;
	readonly version: string;
	readonly diagnostics: readonly SearchDiagnostic[];
}

export interface TermVectorEntry {
	readonly term: string;
	readonly count: number;
	readonly positions: readonly number[];
	readonly spans: readonly SearchHitSpan[];
}

export interface SearchIndex {
	readonly id: string;
	readonly fields: Readonly<Record<string, FieldConfig>>;
	readonly stats: IndexStats;
}

interface FieldValue {
	readonly text: string;
	readonly value: JsonValue;
	readonly viewId?: string;
	readonly baseStartCU: number;
	readonly annotationId?: string;
	readonly annotationType?: string;
}

interface IndexedField {
	readonly fieldId: string;
	readonly text: string;
	readonly viewId?: string;
	readonly tokens: readonly SearchToken[];
	readonly values: readonly JsonValue[];
}

interface IndexedAnnotation {
	readonly id: string;
	readonly layerId: string;
	readonly type: string;
	readonly value?: JsonValue;
	readonly spans: readonly SpanRef[];
}

interface IndexedDocument {
	readonly id: string;
	readonly document: TextDocument;
	readonly metadata: JsonObject;
	readonly fields: Readonly<Record<string, IndexedField>>;
	readonly annotations: readonly IndexedAnnotation[];
	readonly storedFields: JsonObject;
	readonly metadataBoosts: Readonly<Record<string, number>>;
}

interface IndexState {
	readonly id: string;
	readonly fields: Readonly<Record<string, FieldConfig>>;
	readonly analyzers: Readonly<Record<string, Analyzer>>;
	readonly defaultAnalyzer: Analyzer;
	readonly options: Required<
		Pick<IndexOptions, "termVectors" | "positions" | "strict">
	> & {
		readonly metadata: JsonObject;
	};
	readonly documents: Readonly<Record<string, IndexedDocument>>;
	readonly stats: IndexStats;
}

const indexStates = new WeakMap<SearchIndex, IndexState>();

const defaultAnalyzer = createAnalyzer(
	[
		{ kind: "tokenizer", mode: "unicode-word" },
		{ kind: "normalizer", form: "nfkc-casefold" },
	],
	{ id: "textsearch-default" },
);

function publicFieldConfig(
	fieldId: string,
	config: IndexFieldConfig,
): FieldConfig {
	const source = config.source ?? { kind: "view", viewId: "raw" };
	const metadata =
		config.metadata === undefined
			? undefined
			: jsonObjectClone(config.metadata, `$.fields.${fieldId}.metadata`);
	if (config.boost !== undefined)
		assertFinite(config.boost, `$.fields.${fieldId}.boost`);
	return Object.freeze({
		id: config.id ?? fieldId,
		source,
		analyzerId: config.analyzer?.id ?? config.analyzerId ?? defaultAnalyzer.id,
		boost: config.boost ?? 1,
		store: config.store ?? false,
		highlight: config.highlight ?? source.kind === "view",
		filterable: config.filterable ?? source.kind !== "view",
		facetable: config.facetable ?? source.kind !== "view",
		sortable: config.sortable ?? false,
		...(config.characterNgram !== undefined
			? {
					characterNgram: {
						min: config.characterNgram.min,
						max: config.characterNgram.max,
					},
				}
			: {}),
		...(metadata !== undefined ? { metadata } : {}),
	});
}

function attachIndexState(state: IndexState): SearchIndex {
	const index = Object.freeze({
		id: state.id,
		fields: freezeRecord(state.fields),
		stats: state.stats,
	});
	indexStates.set(index, state);
	return index;
}

function getIndexState(index: SearchIndex): IndexState {
	const state = indexStates.get(index);
	if (state === undefined) {
		fail("TEXTSEARCH_INDEX_STATE", "SearchIndex was not created by textsearch");
	}
	return state;
}

function buildStats(
	id: string,
	fields: Readonly<Record<string, FieldConfig>>,
	documents: Readonly<Record<string, IndexedDocument>>,
	diagnostics: readonly SearchDiagnostic[] = [],
): IndexStats {
	const docValues = Object.values(documents).sort((left, right) =>
		compareStrings(left.id, right.id),
	);
	const termDocs = new Map<string, Set<string>>();
	const averageFieldLengths: Record<string, number> = {};
	let tokenCount = 0;
	let postingCount = 0;
	for (const fieldId of Object.keys(fields).sort(compareStrings)) {
		let fieldTokenCount = 0;
		let fieldDocCount = 0;
		for (const doc of docValues) {
			const field = doc.fields[fieldId];
			if (field === undefined) continue;
			fieldDocCount += 1;
			fieldTokenCount += field.tokens.length;
			tokenCount += field.tokens.length;
			postingCount += field.tokens.length;
			for (const term of new Set(field.tokens.map((token) => token.term))) {
				const key = `${fieldId}\u0000${term}`;
				const docs = termDocs.get(key) ?? new Set<string>();
				docs.add(doc.id);
				termDocs.set(key, docs);
			}
		}
		averageFieldLengths[fieldId] =
			fieldDocCount === 0 ? 0 : fieldTokenCount / fieldDocCount;
	}
	const documentFrequencies: Record<string, number> = {};
	for (const [key, docs] of [...termDocs.entries()].sort(([left], [right]) =>
		compareStrings(left, right),
	)) {
		documentFrequencies[key] = docs.size;
	}
	return Object.freeze({
		documentCount: docValues.length,
		fieldCount: Object.keys(fields).length,
		termCount: uniqueSorted(
			docValues.flatMap((doc) =>
				Object.values(doc.fields).flatMap((field) =>
					field.tokens.map((token) => token.term),
				),
			),
		).length,
		postingCount,
		tokenCount,
		averageFieldLengths: freezeRecord(averageFieldLengths),
		documentFrequencies: freezeRecord(documentFrequencies),
		version: id,
		diagnostics: freezeArray(diagnostics),
	});
}

export function createIndex(
	schema: IndexSchema,
	options: IndexOptions = {},
): SearchIndex {
	if (
		!isPlainRecord(schema.fields) ||
		Object.keys(schema.fields).length === 0
	) {
		fail("TEXTSEARCH_INDEX_SCHEMA", "index schema requires at least one field");
	}
	const fields: Record<string, FieldConfig> = {};
	const analyzers: Record<string, Analyzer> = {};
	const schemaDefaultAnalyzer = schema.defaultAnalyzer ?? defaultAnalyzer;
	analyzers[schemaDefaultAnalyzer.id] = schemaDefaultAnalyzer;
	for (const [fieldId, config] of stableEntries(schema.fields)) {
		assertNonEmptyString(fieldId, "$.fields.key");
		const publicConfig = publicFieldConfig(fieldId, config);
		fields[fieldId] = publicConfig;
		const analyzer = config.analyzer ?? schemaDefaultAnalyzer;
		analyzers[publicConfig.analyzerId ?? analyzer.id] = analyzer;
	}
	const metadata = jsonObjectClone(
		{ ...(schema.metadata ?? {}), ...(options.metadata ?? {}) },
		"$.metadata",
	);
	const fingerprint = {
		fields: fields as JsonObject,
		metadata,
		version: schema.version ?? "0.1.0",
		options: {
			termVectors: options.termVectors ?? true,
			positions: options.positions ?? true,
			strict: options.strict ?? true,
		},
	};
	const id =
		options.id ??
		schema.id ??
		(fields.id?.id !== undefined
			? fields.id.id
			: stableId("index", fingerprint));
	const state: IndexState = {
		id,
		fields: freezeRecord(fields),
		analyzers: freezeRecord(analyzers),
		defaultAnalyzer: schemaDefaultAnalyzer,
		options: {
			metadata,
			termVectors: options.termVectors ?? true,
			positions: options.positions ?? true,
			strict: options.strict ?? true,
		},
		documents: freezeRecord({}),
		stats: buildStats(id, fields, {}),
	};
	return attachIndexState(state);
}

function firstViewId(doc: TextDocument): string {
	const viewId =
		doc.views.raw !== undefined
			? "raw"
			: Object.keys(doc.views).sort(compareStrings)[0];
	if (viewId === undefined) {
		fail("TEXTSEARCH_DOCUMENT_VIEW", `document ${doc.id} has no views`);
	}
	return viewId;
}

function textFromSpan(
	doc: TextDocument,
	ref: SpanRef,
	annotationId: string,
): string {
	if (ref.span.unit !== "utf16-code-unit") {
		fail(
			"TEXTSEARCH_SPAN_UNIT",
			`annotation ${annotationId} uses ${ref.span.unit}; UTF-16 coordinates are required for slicing`,
		);
	}
	const view = doc.views[ref.viewId];
	if (view === undefined) {
		fail("TEXTSEARCH_DOCUMENT_VIEW", `view is missing: ${ref.viewId}`);
	}
	if (ref.span.end > view.text.length) {
		fail("TEXTSEARCH_SPAN_RANGE", `span exceeds view text: ${annotationId}`);
	}
	return view.text.slice(ref.span.start, ref.span.end);
}

function valueByKey(value: unknown, key: string | undefined): unknown {
	if (key === undefined) return value;
	if (!isPlainRecord(value)) return undefined;
	return value[key];
}

function jsonScalarOrString(value: unknown, path: string): JsonValue {
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null
	) {
		return jsonValueClone(value, path);
	}
	if (value === undefined) return "";
	return jsonValueClone(String(value), path);
}

function extractFieldValues(
	doc: TextDocument,
	config: FieldConfig,
): FieldValue[] {
	const source = config.source ?? { kind: "view", viewId: "raw" };
	if (source.kind === "literal") {
		return [{ text: source.value, value: source.value, baseStartCU: 0 }];
	}
	if (source.kind === "stored") {
		return [];
	}
	if (source.kind === "metadata") {
		const value = doc.metadata[source.key];
		if (value === undefined) return [];
		const jsonValue = jsonScalarOrString(
			value,
			`$.documents.${doc.id}.metadata.${source.key}`,
		);
		return [{ text: String(jsonValue), value: jsonValue, baseStartCU: 0 }];
	}
	if (source.kind === "annotation") {
		const layer = doc.layers[source.layerId];
		if (layer === undefined) return [];
		return Object.values(layer.annotations)
			.filter(
				(annotation) =>
					source.annotationType === undefined ||
					annotation.type === source.annotationType,
			)
			.sort((left, right) => compareStrings(left.id, right.id))
			.map((annotation): FieldValue => {
				const rawValue = valueByKey(annotation.value, source.valueKey);
				const ref = annotation.spans[0];
				const spanText =
					ref === undefined ? "" : textFromSpan(doc, ref, annotation.id);
				const text =
					typeof rawValue === "string"
						? rawValue
						: isPlainRecord(rawValue) && typeof rawValue.text === "string"
							? rawValue.text
							: spanText;
				const value =
					rawValue === undefined
						? text
						: jsonScalarOrString(
								rawValue,
								`$.annotations.${annotation.id}.value`,
							);
				return {
					text,
					value,
					...(ref?.viewId !== undefined ? { viewId: ref.viewId } : {}),
					baseStartCU:
						ref?.span.unit === "utf16-code-unit" ? ref.span.start : 0,
					annotationId: annotation.id,
					annotationType: annotation.type,
				};
			});
	}
	const viewId = source.viewId ?? firstViewId(doc);
	const view = doc.views[viewId];
	if (view === undefined) {
		return [];
	}
	return [
		{
			text: view.text,
			value: view.text,
			viewId,
			baseStartCU: 0,
		},
	];
}

function collectDocumentAnnotations(doc: TextDocument): IndexedAnnotation[] {
	return Object.values(doc.layers)
		.flatMap((layer) =>
			Object.values(layer.annotations).map((annotation) => {
				const value =
					annotation.value === undefined
						? undefined
						: jsonValueClone(
								annotation.value,
								`$.annotations.${annotation.id}.value`,
							);
				return Object.freeze({
					id: annotation.id,
					layerId: layer.id,
					type: annotation.type,
					...(value !== undefined ? { value } : {}),
					spans: freezeArray(annotation.spans),
				});
			}),
		)
		.sort(
			(left, right) =>
				compareStrings(left.layerId, right.layerId) ||
				compareStrings(left.id, right.id),
		);
}

function indexDocument(
	state: IndexState,
	doc: TextDocument,
	options: AddOptions,
): IndexedDocument {
	assertNonEmptyString(doc.id, "$.document.id");
	const docId = options.documentId ?? doc.id;
	const metadata = jsonObjectClone(
		doc.metadata,
		`$.documents.${docId}.metadata`,
	);
	const storedFields = jsonObjectClone(
		options.storedFields,
		`$.documents.${docId}.storedFields`,
	);
	const metadataBoosts: Record<string, number> = {};
	for (const [key, value] of stableEntries(options.metadataBoosts ?? {})) {
		metadataBoosts[key] = assertFinite(value, `$.metadataBoosts.${key}`);
	}
	const fields: Record<string, IndexedField> = {};
	for (const [fieldId, config] of stableEntries(state.fields)) {
		const analyzer =
			state.analyzers[config.analyzerId ?? state.defaultAnalyzer.id] ??
			state.defaultAnalyzer;
		const values = extractFieldValues(doc, config);
		const tokens: SearchToken[] = [];
		const textParts: string[] = [];
		for (const value of values) {
			textParts.push(value.text);
			const analyzed = analyze(analyzer, value.text);
			for (const token of analyzed) {
				tokens.push(
					normalizeSearchToken(
						{
							...token,
							startCU: token.startCU + value.baseStartCU,
							endCU: token.endCU + value.baseStartCU,
							payload: {
								...(token.payload ?? {}),
								fieldId,
								...(value.viewId !== undefined ? { viewId: value.viewId } : {}),
								...(value.annotationId !== undefined
									? { annotationId: value.annotationId }
									: {}),
							},
						},
						`$.documents.${docId}.fields.${fieldId}.tokens.${tokens.length}`,
					),
				);
			}
		}
		if (config.characterNgram !== undefined) {
			tokens.push(
				...applyCharacterNgrams(tokens, {
					kind: "ngram",
					mode: "character",
					min: config.characterNgram.min,
					max: config.characterNgram.max,
				}),
			);
		}
		const viewId = values.find((value) => value.viewId !== undefined)?.viewId;
		fields[fieldId] = Object.freeze({
			fieldId,
			text: textParts.join("\n"),
			...(viewId !== undefined ? { viewId } : {}),
			tokens: freezeArray(renumber(tokens)),
			values: freezeArray(values.map((value) => value.value)),
		});
	}
	return Object.freeze({
		id: docId,
		document: doc,
		metadata,
		fields: freezeRecord(fields),
		annotations: freezeArray(collectDocumentAnnotations(doc)),
		storedFields,
		metadataBoosts: freezeRecord(metadataBoosts),
	});
}

export function addToIndex(
	index: SearchIndex,
	doc: TextDocument,
	options: AddOptions = {},
): SearchIndex {
	const state = getIndexState(index);
	const record = indexDocument(state, doc, options);
	const onDuplicate = options.onDuplicate ?? "reject";
	if (state.documents[record.id] !== undefined && onDuplicate === "reject") {
		fail(
			"TEXTSEARCH_DUPLICATE_DOCUMENT",
			`document already indexed: ${record.id}`,
		);
	}
	const documents: Record<string, IndexedDocument> = { ...state.documents };
	documents[record.id] = record;
	const stats = buildStats(
		state.id,
		state.fields,
		documents,
		state.stats.diagnostics,
	);
	return attachIndexState({
		...state,
		documents: freezeRecord(documents),
		stats,
	});
}

export function termVector(
	index: SearchIndex,
	docId: string,
	fieldId: string,
): TermVectorEntry[] {
	const state = getIndexState(index);
	const doc = state.documents[docId];
	if (doc === undefined) {
		fail("TEXTSEARCH_DOCUMENT_MISSING", `document is not indexed: ${docId}`);
	}
	const field = doc.fields[fieldId];
	if (field === undefined) {
		fail("TEXTSEARCH_FIELD_MISSING", `field is not indexed: ${fieldId}`);
	}
	const grouped = new Map<string, SearchToken[]>();
	for (const token of field.tokens) {
		grouped.set(token.term, [...(grouped.get(token.term) ?? []), token]);
	}
	return [...grouped.entries()]
		.sort(([left], [right]) => compareStrings(left, right))
		.map(([term, tokens]) =>
			Object.freeze({
				term,
				count: tokens.length,
				positions: freezeArray(tokens.map((token) => token.position)),
				spans: freezeArray(
					tokens.map((token) => {
						const viewId = tokenViewId(token, field.viewId);
						return {
							fieldId,
							term,
							startCU: token.startCU,
							endCU: token.endCU,
							position: token.position,
							...(viewId !== undefined ? { viewId } : {}),
						};
					}),
				),
			}),
		);
}

export type RankingModel =
	| { readonly kind: "boolean"; readonly coordination?: boolean }
	| {
			readonly kind: "tfidf";
			readonly idfSmoothing?: number;
			readonly normalize?: boolean;
	  }
	| {
			readonly kind: "bm25";
			readonly k1?: number;
			readonly b?: number;
			readonly idfSmoothing?: number;
	  }
	| {
			readonly kind: "bm25f";
			readonly k1?: number;
			readonly b?: number;
			readonly fieldWeights?: Readonly<Record<string, number>>;
	  }
	| {
			readonly kind: "language-model";
			readonly smoothing?: "dirichlet" | "jelinek-mercer";
			readonly mu?: number;
			readonly lambda?: number;
	  }
	| {
			readonly kind: "dfr";
			readonly id: string;
			score(context: RankingHookContext): number;
	  };

export interface RankingHookContext {
	readonly indexId: string;
	readonly docId: string;
	readonly queryTerms: readonly string[];
	readonly matchedTerms: readonly string[];
	readonly baseScore: number;
	readonly metadata: JsonObject;
}

export interface StaticBoost {
	readonly metadataKey: string;
	readonly value?: JsonValue;
	readonly boost: number;
}

export interface RerankHook {
	readonly id: string;
	rerank(context: RankingHookContext): number;
}

export type SearchQuery =
	| { readonly kind: "all" }
	| { readonly kind: "none" }
	| { readonly kind: "term"; readonly term: string; readonly field?: string }
	| {
			readonly kind: "terms";
			readonly terms: readonly string[];
			readonly operator?: "any" | "all";
			readonly field?: string;
	  }
	| {
			readonly kind: "phrase";
			readonly terms: readonly string[];
			readonly slop?: number;
			readonly field?: string;
	  }
	| {
			readonly kind: "proximity";
			readonly terms: readonly string[];
			readonly window: number;
			readonly ordered?: boolean;
			readonly field?: string;
	  }
	| {
			readonly kind: "boolean";
			readonly must?: readonly SearchQuery[];
			readonly should?: readonly SearchQuery[];
			readonly filter?: readonly SearchQuery[];
			readonly mustNot?: readonly SearchQuery[];
			readonly minimumShouldMatch?: number;
	  }
	| {
			readonly kind: "field";
			readonly field: string | readonly string[];
			readonly query: SearchQuery;
	  }
	| {
			readonly kind: "range";
			readonly field?: string;
			readonly metadataKey?: string;
			readonly gte?: string | number;
			readonly gt?: string | number;
			readonly lte?: string | number;
			readonly lt?: string | number;
	  }
	| {
			readonly kind: "wildcard";
			readonly pattern: string;
			readonly field?: string;
			readonly maxExpansions?: number;
	  }
	| {
			readonly kind: "prefix";
			readonly prefix: string;
			readonly field?: string;
			readonly maxExpansions?: number;
	  }
	| {
			readonly kind: "suffix";
			readonly suffix: string;
			readonly field?: string;
			readonly maxExpansions?: number;
	  }
	| {
			readonly kind: "fuzzy";
			readonly term: string;
			readonly maxDistance?: number;
			readonly prefixLength?: number;
			readonly field?: string;
			readonly maxExpansions?: number;
	  }
	| {
			readonly kind: "regex";
			readonly pattern: string;
			readonly field?: string;
			readonly maxExpansions?: number;
	  }
	| {
			readonly kind: "annotation";
			readonly layerId?: string;
			readonly type?: string;
			readonly value?: JsonValue;
	  }
	| {
			readonly kind: "metadata";
			readonly key: string;
			readonly value?: JsonValue;
	  }
	| {
			readonly kind: "cql";
			readonly source: string;
			readonly query?: SearchQuery;
	  };

export type Filter =
	| { readonly kind: "document"; readonly ids: readonly string[] }
	| {
			readonly kind: "metadata";
			readonly key: string;
			readonly value?: JsonValue;
	  }
	| {
			readonly kind: "field";
			readonly field: string;
			readonly value?: JsonValue;
	  }
	| {
			readonly kind: "range";
			readonly field?: string;
			readonly metadataKey?: string;
			readonly gte?: string | number;
			readonly gt?: string | number;
			readonly lte?: string | number;
			readonly lt?: string | number;
	  }
	| {
			readonly kind: "annotation";
			readonly layerId?: string;
			readonly type?: string;
			readonly value?: JsonValue;
	  }
	| { readonly kind: "query"; readonly query: SearchQuery }
	| { readonly kind: "and"; readonly filters: readonly Filter[] }
	| { readonly kind: "or"; readonly filters: readonly Filter[] }
	| { readonly kind: "not"; readonly filter: Filter };

export interface FacetRequest {
	readonly id?: string;
	readonly field?: string;
	readonly metadataKey?: string;
	readonly topN?: number;
	readonly includeMissing?: boolean;
	readonly ranges?: readonly FacetRange[];
}

export interface FacetRange {
	readonly id: string;
	readonly gte?: number;
	readonly gt?: number;
	readonly lte?: number;
	readonly lt?: number;
}

export interface FacetBucket {
	readonly value: string;
	readonly count: number;
}

export interface FacetResult {
	readonly id: string;
	readonly buckets: readonly FacetBucket[];
}

export interface HighlightOptions {
	readonly fields?: readonly string[];
	readonly fragmentSize?: number;
	readonly maxFragments?: number;
	readonly markerPrefix?: string;
	readonly markerSuffix?: string;
	readonly escapeHtml?: boolean;
}

export interface HighlightFragment {
	readonly fieldId: string;
	readonly viewId?: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly text: string;
	readonly markedText: string;
}

export interface SuggestionOptions {
	readonly source?: "index" | "lexicon" | "both";
	readonly maxDistance?: number;
	readonly prefix?: boolean;
	readonly maxCandidates?: number;
	readonly lexicon?: Lexicon | StructuralLexicon;
	readonly lexiconKeys?: readonly string[];
}

export interface SearchSuggestion {
	readonly term: string;
	readonly score: number;
	readonly distance?: number;
	readonly frequency: number;
	readonly source: "index" | "lexicon";
}

export interface SearchHitSpan {
	readonly fieldId: string;
	readonly term: string;
	readonly startCU: number;
	readonly endCU: number;
	readonly viewId?: string;
	readonly position: number;
}

export interface SearchFieldHit {
	readonly fieldId: string;
	readonly terms: readonly string[];
	readonly spans: readonly SearchHitSpan[];
}

export interface SearchResult {
	readonly docId: string;
	readonly score: number;
	readonly rank: number;
	readonly matchedFields: readonly SearchFieldHit[];
	readonly storedFields: JsonObject;
	readonly metadata: JsonObject;
	readonly highlights?: readonly HighlightFragment[];
	readonly facets?: readonly FacetResult[];
	readonly explanation?: SearchExplanationSummary;
	readonly diagnostics: readonly SearchDiagnostic[];
}

export interface SearchExplanationSummary {
	readonly model: string;
	readonly score: number;
	readonly matchedTerms: readonly string[];
}

export interface SearchExplanation {
	readonly indexId: string;
	readonly docId: string;
	readonly query: SearchQuery;
	readonly queryTerms: readonly string[];
	readonly matchingTerms: readonly string[];
	readonly fieldLengths: Readonly<Record<string, number>>;
	readonly termFrequencies: Readonly<Record<string, number>>;
	readonly documentFrequencies: Readonly<Record<string, number>>;
	readonly model: string;
	readonly score: number;
	readonly boosts: readonly StaticBoost[];
	readonly filterDecisions: readonly SearchDiagnostic[];
	readonly rerankSteps: readonly SearchDiagnostic[];
	readonly diagnostics: readonly SearchDiagnostic[];
}

export interface SearchOptions {
	readonly limit?: number;
	readonly offset?: number;
	readonly ranking?: RankingModel;
	readonly filters?: readonly Filter[];
	readonly facets?: readonly FacetRequest[];
	readonly highlight?: HighlightOptions | boolean;
	readonly explain?: boolean;
	readonly staticBoosts?: readonly StaticBoost[];
	readonly rerankHooks?: readonly RerankHook[];
	readonly strict?: boolean;
}

interface MatchRecord {
	readonly docId: string;
	readonly spans: readonly SearchHitSpan[];
	readonly terms: readonly string[];
}

interface EvalContext {
	readonly state: IndexState;
	readonly fieldScope?: readonly string[];
}

function allFieldIds(
	state: IndexState,
	scope: readonly string[] | undefined,
): readonly string[] {
	return scope ?? Object.keys(state.fields).sort(compareStrings);
}

function tokenViewId(
	token: SearchToken,
	fallback: string | undefined,
): string | undefined {
	const payload = token.payload;
	return payload !== undefined && typeof payload.viewId === "string"
		? payload.viewId
		: fallback;
}

function fieldTokens(
	doc: IndexedDocument,
	fieldId: string,
): readonly SearchToken[] {
	return doc.fields[fieldId]?.tokens ?? [];
}

function termCandidates(term: string): readonly string[] {
	return uniqueSorted([term, caseFold(term), nfkcCaseFold(term)]);
}

function tokenMatchesTerm(token: SearchToken, term: string): boolean {
	const candidates = termCandidates(term);
	return candidates.includes(token.term);
}

function mergeMatches(
	records: Iterable<MatchRecord>,
): Map<string, MatchRecord> {
	const merged = new Map<
		string,
		{ spans: SearchHitSpan[]; terms: Set<string> }
	>();
	for (const record of records) {
		const entry = merged.get(record.docId) ?? {
			spans: [],
			terms: new Set<string>(),
		};
		entry.spans.push(...record.spans);
		for (const term of record.terms) entry.terms.add(term);
		merged.set(record.docId, entry);
	}
	const output = new Map<string, MatchRecord>();
	for (const [docId, entry] of [...merged.entries()].sort(([left], [right]) =>
		compareStrings(left, right),
	)) {
		output.set(docId, {
			docId,
			spans: freezeArray(
				entry.spans.sort(
					(left, right) =>
						compareStrings(left.fieldId, right.fieldId) ||
						compareNumbers(left.startCU, right.startCU) ||
						compareNumbers(left.endCU, right.endCU) ||
						compareStrings(left.term, right.term),
				),
			),
			terms: freezeArray([...entry.terms].sort(compareStrings)),
		});
	}
	return output;
}

function allDocs(context: EvalContext): Map<string, MatchRecord> {
	return mergeMatches(
		Object.keys(context.state.documents)
			.sort(compareStrings)
			.map((docId) => ({ docId, spans: [], terms: [] })),
	);
}

function noneDocs(): Map<string, MatchRecord> {
	return new Map();
}

function termMatch(
	context: EvalContext,
	term: string,
	field: string | undefined,
): Map<string, MatchRecord> {
	const fieldIds =
		field === undefined
			? allFieldIds(context.state, context.fieldScope)
			: [field];
	const matches: MatchRecord[] = [];
	for (const doc of Object.values(context.state.documents)) {
		const spans: SearchHitSpan[] = [];
		for (const fieldId of fieldIds) {
			const fieldRecord = doc.fields[fieldId];
			if (fieldRecord === undefined) continue;
			for (const token of fieldRecord.tokens) {
				if (!tokenMatchesTerm(token, term)) continue;
				const viewId = tokenViewId(token, fieldRecord.viewId);
				spans.push({
					fieldId,
					term: token.term,
					startCU: token.startCU,
					endCU: token.endCU,
					position: token.position,
					...(viewId !== undefined ? { viewId } : {}),
				});
			}
		}
		if (spans.length > 0) {
			matches.push({ docId: doc.id, spans, terms: [term] });
		}
	}
	return mergeMatches(matches);
}

function unionMatch(
	inputs: readonly Map<string, MatchRecord>[],
): Map<string, MatchRecord> {
	return mergeMatches(inputs.flatMap((input) => [...input.values()]));
}

function intersectMatch(
	inputs: readonly Map<string, MatchRecord>[],
): Map<string, MatchRecord> {
	if (inputs.length === 0) return new Map();
	const [first, ...rest] = inputs;
	if (first === undefined) return new Map();
	const records: MatchRecord[] = [];
	for (const [docId, record] of first) {
		if (rest.every((input) => input.has(docId))) {
			const related = [
				record,
				...rest.map((input) => input.get(docId) as MatchRecord),
			];
			records.push(...related);
		}
	}
	return mergeMatches(records);
}

function subtractMatch(
	base: Map<string, MatchRecord>,
	excluded: Map<string, MatchRecord>,
): Map<string, MatchRecord> {
	return mergeMatches(
		[...base.values()].filter((record) => !excluded.has(record.docId)),
	);
}

function phraseMatch(
	context: EvalContext,
	query: Extract<SearchQuery, { kind: "phrase" }>,
): Map<string, MatchRecord> {
	const terms = query.terms.filter((term) => term.length > 0);
	if (terms.length === 0) return noneDocs();
	const fieldIds =
		query.field === undefined
			? allFieldIds(context.state, context.fieldScope)
			: [query.field];
	const slop = query.slop ?? 0;
	const records: MatchRecord[] = [];
	for (const doc of Object.values(context.state.documents)) {
		const spans: SearchHitSpan[] = [];
		for (const fieldId of fieldIds) {
			const fieldRecord = doc.fields[fieldId];
			if (fieldRecord === undefined) continue;
			const tokens = [...fieldRecord.tokens].sort((left, right) =>
				compareNumbers(left.position, right.position),
			);
			for (let index = 0; index < tokens.length; index += 1) {
				const first = tokens[index];
				if (first === undefined || !tokenMatchesTerm(first, terms[0] as string))
					continue;
				let previous = first;
				let matched = true;
				const matchedTokens = [first];
				for (let termIndex = 1; termIndex < terms.length; termIndex += 1) {
					const expected = terms[termIndex] as string;
					const next = tokens
						.slice(index + termIndex)
						.find(
							(candidate) =>
								candidate.position > previous.position &&
								candidate.position - previous.position <= slop + 1 &&
								tokenMatchesTerm(candidate, expected),
						);
					if (next === undefined) {
						matched = false;
						break;
					}
					matchedTokens.push(next);
					previous = next;
				}
				if (!matched) continue;
				const last = matchedTokens[matchedTokens.length - 1] ?? first;
				const viewId = tokenViewId(first, fieldRecord.viewId);
				spans.push({
					fieldId,
					term: terms.join(" "),
					startCU: first.startCU,
					endCU: last.endCU,
					position: first.position,
					...(viewId !== undefined ? { viewId } : {}),
				});
			}
		}
		if (spans.length > 0) records.push({ docId: doc.id, spans, terms });
	}
	return mergeMatches(records);
}

function proximityMatch(
	context: EvalContext,
	query: Extract<SearchQuery, { kind: "proximity" }>,
): Map<string, MatchRecord> {
	const terms = query.terms.filter((term) => term.length > 0);
	if (terms.length === 0) return noneDocs();
	const fieldIds =
		query.field === undefined
			? allFieldIds(context.state, context.fieldScope)
			: [query.field];
	const records: MatchRecord[] = [];
	for (const doc of Object.values(context.state.documents)) {
		const spans: SearchHitSpan[] = [];
		for (const fieldId of fieldIds) {
			const fieldRecord = doc.fields[fieldId];
			if (fieldRecord === undefined) continue;
			const matchedByTerm = terms.map((term) =>
				fieldRecord.tokens.filter((token) => tokenMatchesTerm(token, term)),
			);
			if (matchedByTerm.some((tokens) => tokens.length === 0)) continue;
			for (const first of matchedByTerm[0] ?? []) {
				const windowTokens = matchedByTerm.flatMap((tokens) =>
					tokens.filter(
						(token) =>
							Math.abs(token.position - first.position) <= query.window,
					),
				);
				const hasAllTerms = terms.every((term) =>
					windowTokens.some((token) => tokenMatchesTerm(token, term)),
				);
				if (!hasAllTerms) continue;
				const sorted = windowTokens.sort((left, right) =>
					compareNumbers(left.position, right.position),
				);
				if (
					query.ordered === true &&
					terms.some((term, index) => {
						const token = sorted[index];
						return token === undefined || !tokenMatchesTerm(token, term);
					})
				) {
					continue;
				}
				const last = sorted[sorted.length - 1] ?? first;
				const viewId = tokenViewId(first, fieldRecord.viewId);
				spans.push({
					fieldId,
					term: terms.join("~"),
					startCU: first.startCU,
					endCU: last.endCU,
					position: first.position,
					...(viewId !== undefined ? { viewId } : {}),
				});
			}
		}
		if (spans.length > 0) records.push({ docId: doc.id, spans, terms });
	}
	return mergeMatches(records);
}

function vocabulary(
	state: IndexState,
	field: string | undefined,
	scope: readonly string[] | undefined,
): string[] {
	const fieldIds = field === undefined ? allFieldIds(state, scope) : [field];
	return uniqueSorted(
		Object.values(state.documents).flatMap((doc) =>
			fieldIds.flatMap((fieldId) =>
				(doc.fields[fieldId]?.tokens ?? []).map((token) => token.term),
			),
		),
	);
}

function expandTerms(
	context: EvalContext,
	query:
		| Extract<SearchQuery, { kind: "wildcard" }>
		| Extract<SearchQuery, { kind: "prefix" }>
		| Extract<SearchQuery, { kind: "suffix" }>
		| Extract<SearchQuery, { kind: "regex" }>
		| Extract<SearchQuery, { kind: "fuzzy" }>,
): readonly string[] {
	const field = "field" in query ? query.field : undefined;
	const vocab = vocabulary(context.state, field, context.fieldScope);
	const max = query.maxExpansions ?? 128;
	let terms: string[] = [];
	if (query.kind === "prefix") {
		terms = vocab.filter((term) => term.startsWith(query.prefix));
	} else if (query.kind === "suffix") {
		terms = vocab.filter((term) => term.endsWith(query.suffix));
	} else if (query.kind === "wildcard") {
		const pattern = new RegExp(
			`^${query.pattern
				.replace(/[.+^${}()|[\]\\]/g, "\\$&")
				.replaceAll("*", ".*")
				.replaceAll("?", ".")}$`,
			"u",
		);
		terms = vocab.filter((term) => pattern.test(term));
	} else if (query.kind === "regex") {
		const pattern = new RegExp(query.pattern, "u");
		terms = vocab.filter((term) => pattern.test(term));
	} else {
		const maxDistance = query.maxDistance ?? 2;
		const prefix =
			query.prefixLength === undefined
				? ""
				: query.term.slice(0, query.prefixLength);
		terms = vocab.filter((term) => {
			if (prefix.length > 0 && !term.startsWith(prefix)) return false;
			return boundedEditDistance(query.term, term, maxDistance) !== undefined;
		});
	}
	return terms.sort(compareStrings).slice(0, max);
}

function rangeContains(
	value: JsonValue,
	query:
		| Extract<SearchQuery, { kind: "range" }>
		| Extract<Filter, { kind: "range" }>,
): boolean {
	const comparable =
		typeof value === "number" || typeof value === "string"
			? value
			: String(value);
	const compare = (boundary: string | number): number => {
		if (typeof comparable === "number" && typeof boundary === "number") {
			return compareNumbers(comparable, boundary);
		}
		return compareStrings(String(comparable), String(boundary));
	};
	if (query.gte !== undefined && compare(query.gte) < 0) return false;
	if (query.gt !== undefined && compare(query.gt) <= 0) return false;
	if (query.lte !== undefined && compare(query.lte) > 0) return false;
	if (query.lt !== undefined && compare(query.lt) >= 0) return false;
	return true;
}

function rangeMatch(
	context: EvalContext,
	query: Extract<SearchQuery, { kind: "range" }>,
): Map<string, MatchRecord> {
	const records = Object.values(context.state.documents)
		.filter((doc) => {
			if (query.metadataKey !== undefined) {
				const value = doc.metadata[query.metadataKey];
				return value !== undefined && rangeContains(value, query);
			}
			if (query.field !== undefined) {
				return (doc.fields[query.field]?.values ?? []).some((value) =>
					rangeContains(value, query),
				);
			}
			return false;
		})
		.map((doc) => ({ docId: doc.id, spans: [], terms: [] }));
	return mergeMatches(records);
}

function annotationMatches(
	annotation: IndexedAnnotation,
	query:
		| Extract<SearchQuery, { kind: "annotation" }>
		| Extract<Filter, { kind: "annotation" }>,
): boolean {
	if (query.layerId !== undefined && annotation.layerId !== query.layerId)
		return false;
	if (query.type !== undefined && annotation.type !== query.type) return false;
	if (
		query.value !== undefined &&
		stableStringify(annotation.value ?? null) !== stableStringify(query.value)
	) {
		return false;
	}
	return true;
}

function annotationMatch(
	context: EvalContext,
	query: Extract<SearchQuery, { kind: "annotation" }>,
): Map<string, MatchRecord> {
	return mergeMatches(
		Object.values(context.state.documents)
			.filter((doc) =>
				doc.annotations.some((annotation) =>
					annotationMatches(annotation, query),
				),
			)
			.map((doc) => ({ docId: doc.id, spans: [], terms: [] })),
	);
}

function metadataMatch(
	context: EvalContext,
	query: Extract<SearchQuery, { kind: "metadata" }>,
): Map<string, MatchRecord> {
	return mergeMatches(
		Object.values(context.state.documents)
			.filter((doc) => {
				const value = doc.metadata[query.key];
				if (query.value === undefined) return value !== undefined;
				return (
					value !== undefined &&
					stableStringify(value) === stableStringify(query.value)
				);
			})
			.map((doc) => ({ docId: doc.id, spans: [], terms: [] })),
	);
}

function evaluateQuery(
	context: EvalContext,
	query: SearchQuery,
): Map<string, MatchRecord> {
	if (query.kind === "all") return allDocs(context);
	if (query.kind === "none") return noneDocs();
	if (query.kind === "term") return termMatch(context, query.term, query.field);
	if (query.kind === "terms") {
		const matches = query.terms.map((term) =>
			termMatch(context, term, query.field),
		);
		return (query.operator ?? "any") === "all"
			? intersectMatch(matches)
			: unionMatch(matches);
	}
	if (query.kind === "phrase") return phraseMatch(context, query);
	if (query.kind === "proximity") return proximityMatch(context, query);
	if (query.kind === "boolean") {
		const must = (query.must ?? []).map((child) =>
			evaluateQuery(context, child),
		);
		const should = (query.should ?? []).map((child) =>
			evaluateQuery(context, child),
		);
		const filters = (query.filter ?? []).map((child) =>
			evaluateQuery(context, child),
		);
		const mustNot = unionMatch(
			(query.mustNot ?? []).map((child) => evaluateQuery(context, child)),
		);
		let current =
			must.length > 0
				? intersectMatch(must)
				: should.length > 0
					? unionMatch(should)
					: allDocs(context);
		if (should.length > 0 && query.minimumShouldMatch !== undefined) {
			const counts = new Map<string, number>();
			for (const input of should) {
				for (const docId of input.keys())
					counts.set(docId, (counts.get(docId) ?? 0) + 1);
			}
			current = mergeMatches(
				[...current.values()].filter(
					(record) =>
						(counts.get(record.docId) ?? 0) >= (query.minimumShouldMatch ?? 0),
				),
			);
		}
		if (filters.length > 0) current = intersectMatch([current, ...filters]);
		return subtractMatch(current, mustNot);
	}
	if (query.kind === "field") {
		const fieldScope = Array.isArray(query.field) ? query.field : [query.field];
		return evaluateQuery({ ...context, fieldScope }, query.query);
	}
	if (query.kind === "range") return rangeMatch(context, query);
	if (
		query.kind === "wildcard" ||
		query.kind === "prefix" ||
		query.kind === "suffix" ||
		query.kind === "regex" ||
		query.kind === "fuzzy"
	) {
		const field = "field" in query ? query.field : undefined;
		return unionMatch(
			expandTerms(context, query).map((term) =>
				termMatch(context, term, field),
			),
		);
	}
	if (query.kind === "annotation") return annotationMatch(context, query);
	if (query.kind === "metadata") return metadataMatch(context, query);
	return evaluateQuery(context, query.query ?? parseCql(query.source));
}

function docMatchesFilter(
	state: IndexState,
	doc: IndexedDocument,
	filter: Filter,
): boolean {
	if (filter.kind === "document") return filter.ids.includes(doc.id);
	if (filter.kind === "metadata") {
		const value = doc.metadata[filter.key];
		if (filter.value === undefined) return value !== undefined;
		return (
			value !== undefined &&
			stableStringify(value) === stableStringify(filter.value)
		);
	}
	if (filter.kind === "field") {
		const values = doc.fields[filter.field]?.values ?? [];
		if (filter.value === undefined) return values.length > 0;
		return values.some(
			(value) =>
				stableStringify(value) === stableStringify(filter.value as JsonValue),
		);
	}
	if (filter.kind === "range") {
		if (filter.metadataKey !== undefined) {
			const value = doc.metadata[filter.metadataKey];
			return value !== undefined && rangeContains(value, filter);
		}
		if (filter.field !== undefined) {
			return (doc.fields[filter.field]?.values ?? []).some((value) =>
				rangeContains(value, filter),
			);
		}
		return false;
	}
	if (filter.kind === "annotation") {
		return doc.annotations.some((annotation) =>
			annotationMatches(annotation, filter),
		);
	}
	if (filter.kind === "query") {
		return evaluateQuery({ state }, filter.query).has(doc.id);
	}
	if (filter.kind === "and") {
		return filter.filters.every((child) => docMatchesFilter(state, doc, child));
	}
	if (filter.kind === "or") {
		return filter.filters.some((child) => docMatchesFilter(state, doc, child));
	}
	return !docMatchesFilter(state, doc, filter.filter);
}

function queryTerms(query: SearchQuery): string[] {
	if (query.kind === "term") return [query.term];
	if (
		query.kind === "terms" ||
		query.kind === "phrase" ||
		query.kind === "proximity"
	) {
		return [...query.terms];
	}
	if (query.kind === "boolean") {
		return uniqueSorted(
			[
				...(query.must ?? []),
				...(query.should ?? []),
				...(query.filter ?? []),
				...(query.mustNot ?? []),
			].flatMap(queryTerms),
		);
	}
	if (query.kind === "field") return queryTerms(query.query);
	if (query.kind === "wildcard") return [query.pattern];
	if (query.kind === "prefix") return [query.prefix];
	if (query.kind === "suffix") return [query.suffix];
	if (query.kind === "fuzzy") return [query.term];
	if (query.kind === "regex") return [query.pattern];
	if (query.kind === "cql")
		return queryTerms(query.query ?? parseCql(query.source));
	return [];
}

function termFrequency(
	doc: IndexedDocument,
	fieldId: string,
	term: string,
): number {
	return fieldTokens(doc, fieldId).filter((token) =>
		tokenMatchesTerm(token, term),
	).length;
}

function documentFrequency(
	state: IndexState,
	fieldId: string,
	term: string,
): number {
	return Object.values(state.documents).filter((doc) =>
		fieldTokens(doc, fieldId).some((token) => tokenMatchesTerm(token, term)),
	).length;
}

function collectionFrequency(state: IndexState, term: string): number {
	return Object.values(state.documents).reduce(
		(total, doc) =>
			total +
			Object.keys(state.fields).reduce(
				(fieldTotal, fieldId) => fieldTotal + termFrequency(doc, fieldId, term),
				0,
			),
		0,
	);
}

export function scoreBoolean(
	match: MatchRecord,
	model: Extract<RankingModel, { kind: "boolean" }> = { kind: "boolean" },
): number {
	return model.coordination === true ? Math.max(1, match.terms.length) : 1;
}

export function scoreTfIdf(
	state: IndexState,
	doc: IndexedDocument,
	terms: readonly string[],
	model: Extract<RankingModel, { kind: "tfidf" }> = { kind: "tfidf" },
): number {
	const smoothing = model.idfSmoothing ?? 1;
	let score = 0;
	let length = 0;
	for (const fieldId of Object.keys(state.fields)) {
		length += fieldTokens(doc, fieldId).length;
		for (const term of terms) {
			const tf = termFrequency(doc, fieldId, term);
			if (tf === 0) continue;
			const df = documentFrequency(state, fieldId, term);
			const idf =
				Math.log((state.stats.documentCount + smoothing) / (df + smoothing)) +
				1;
			score += tf * idf;
		}
	}
	if (model.normalize !== false && length > 0) return score / Math.sqrt(length);
	return score;
}

export function scoreBm25(
	state: IndexState,
	doc: IndexedDocument,
	terms: readonly string[],
	model: Extract<RankingModel, { kind: "bm25" }> = { kind: "bm25" },
): number {
	const k1 = model.k1 ?? 1.2;
	const b = model.b ?? 0.75;
	let score = 0;
	for (const fieldId of Object.keys(state.fields)) {
		const length = fieldTokens(doc, fieldId).length;
		const avgLength = state.stats.averageFieldLengths[fieldId] ?? 0;
		if (avgLength === 0) continue;
		for (const term of terms) {
			const tf = termFrequency(doc, fieldId, term);
			if (tf === 0) continue;
			const df = documentFrequency(state, fieldId, term);
			const idf = Math.log(
				1 + (state.stats.documentCount - df + 0.5) / (df + 0.5),
			);
			const denominator = tf + k1 * (1 - b + b * (length / avgLength));
			score += idf * ((tf * (k1 + 1)) / denominator);
		}
	}
	return score;
}

export function scoreBm25f(
	state: IndexState,
	doc: IndexedDocument,
	terms: readonly string[],
	model: Extract<RankingModel, { kind: "bm25f" }> = { kind: "bm25f" },
): number {
	const weights = model.fieldWeights ?? {};
	const k1 = model.k1 ?? 1.2;
	const b = model.b ?? 0.75;
	let score = 0;
	for (const fieldId of Object.keys(state.fields)) {
		const fieldWeight = weights[fieldId] ?? state.fields[fieldId]?.boost ?? 1;
		const length = fieldTokens(doc, fieldId).length;
		const avgLength = state.stats.averageFieldLengths[fieldId] ?? 0;
		if (avgLength === 0) continue;
		for (const term of terms) {
			const tf = termFrequency(doc, fieldId, term);
			if (tf === 0) continue;
			const df = documentFrequency(state, fieldId, term);
			const idf = Math.log(
				1 + (state.stats.documentCount - df + 0.5) / (df + 0.5),
			);
			const denominator = tf + k1 * (1 - b + b * (length / avgLength));
			score += fieldWeight * idf * ((tf * (k1 + 1)) / denominator);
		}
	}
	return score;
}

export function scoreLanguageModel(
	state: IndexState,
	doc: IndexedDocument,
	terms: readonly string[],
	model: Extract<RankingModel, { kind: "language-model" }> = {
		kind: "language-model",
	},
): number {
	const totalTokens = Math.max(1, state.stats.tokenCount);
	const docLength = Math.max(
		1,
		Object.keys(state.fields).reduce(
			(total, fieldId) => total + fieldTokens(doc, fieldId).length,
			0,
		),
	);
	let score = 0;
	for (const term of terms) {
		const tf = Object.keys(state.fields).reduce(
			(total, fieldId) => total + termFrequency(doc, fieldId, term),
			0,
		);
		const collectionProbability =
			Math.max(collectionFrequency(state, term), 0.5) / totalTokens;
		if ((model.smoothing ?? "dirichlet") === "jelinek-mercer") {
			const lambda = model.lambda ?? 0.2;
			score += Math.log(
				(1 - lambda) * (tf / docLength) + lambda * collectionProbability,
			);
		} else {
			const mu = model.mu ?? 2000;
			score += Math.log((tf + mu * collectionProbability) / (docLength + mu));
		}
	}
	return score;
}

function scoreMatch(
	state: IndexState,
	doc: IndexedDocument,
	match: MatchRecord,
	queryTermsValue: readonly string[],
	options: SearchOptions,
): {
	readonly score: number;
	readonly rerankDiagnostics: readonly SearchDiagnostic[];
} {
	const model = options.ranking ?? { kind: "bm25" as const };
	let score =
		model.kind === "boolean"
			? scoreBoolean(match, model)
			: model.kind === "tfidf"
				? scoreTfIdf(state, doc, queryTermsValue, model)
				: model.kind === "bm25"
					? scoreBm25(state, doc, queryTermsValue, model)
					: model.kind === "bm25f"
						? scoreBm25f(state, doc, queryTermsValue, model)
						: model.kind === "language-model"
							? scoreLanguageModel(state, doc, queryTermsValue, model)
							: model.score({
									indexId: state.id,
									docId: doc.id,
									queryTerms: queryTermsValue,
									matchedTerms: match.terms,
									baseScore: match.terms.length,
									metadata: doc.metadata,
								});
	const diagnostics: SearchDiagnostic[] = [];
	for (const boost of options.staticBoosts ?? []) {
		assertFinite(boost.boost, "$.staticBoosts.boost");
		const metadataValue = doc.metadata[boost.metadataKey];
		const applies =
			boost.value === undefined ||
			(metadataValue !== undefined &&
				stableStringify(metadataValue) === stableStringify(boost.value));
		if (applies) score += boost.boost;
	}
	for (const [key, boost] of stableEntries(doc.metadataBoosts)) {
		score += boost;
		diagnostics.push({
			code: "TEXTSEARCH_METADATA_BOOST",
			severity: "info",
			message: `metadata boost applied: ${key}`,
			indexId: state.id,
			docId: doc.id,
		});
	}
	for (const hook of options.rerankHooks ?? []) {
		const next = hook.rerank({
			indexId: state.id,
			docId: doc.id,
			queryTerms: queryTermsValue,
			matchedTerms: match.terms,
			baseScore: score,
			metadata: doc.metadata,
		});
		assertFinite(next, `$.rerankHooks.${hook.id}`);
		diagnostics.push({
			code: "TEXTSEARCH_RERANK",
			severity: "info",
			message: `rerank hook applied: ${hook.id}`,
			indexId: state.id,
			docId: doc.id,
		});
		score = next;
	}
	assertFinite(score, "$.score");
	return { score, rerankDiagnostics: freezeArray(diagnostics) };
}

function matchedFields(
	spans: readonly SearchHitSpan[],
): readonly SearchFieldHit[] {
	const grouped = new Map<string, SearchHitSpan[]>();
	for (const span of spans) {
		grouped.set(span.fieldId, [...(grouped.get(span.fieldId) ?? []), span]);
	}
	return freezeArray(
		[...grouped.entries()]
			.sort(([left], [right]) => compareStrings(left, right))
			.map(([fieldId, fieldSpans]) =>
				Object.freeze({
					fieldId,
					terms: freezeArray(uniqueSorted(fieldSpans.map((span) => span.term))),
					spans: freezeArray(fieldSpans),
				}),
			),
	);
}

export function search(
	index: SearchIndex,
	query: SearchQuery,
	options: SearchOptions = {},
): SearchResult[] {
	const state = getIndexState(index);
	const queryValue =
		query.kind === "cql" ? (query.query ?? parseCql(query.source)) : query;
	const matches = evaluateQuery({ state }, queryValue);
	const terms = queryTerms(queryValue);
	const filtered = [...matches.values()].filter((match) => {
		const doc = state.documents[match.docId];
		return (
			doc !== undefined &&
			(options.filters ?? []).every((filter) =>
				docMatchesFilter(state, doc, filter),
			)
		);
	});
	const results = filtered
		.map((match) => {
			const doc = state.documents[match.docId];
			if (doc === undefined) return undefined;
			const { score, rerankDiagnostics } = scoreMatch(
				state,
				doc,
				match,
				terms,
				options,
			);
			const result: Omit<SearchResult, "rank"> = {
				docId: doc.id,
				score,
				matchedFields: matchedFields(match.spans),
				storedFields: doc.storedFields,
				metadata: doc.metadata,
				...(options.highlight !== undefined && options.highlight !== false
					? {
							highlights: highlight(
								index,
								doc.id,
								match.spans,
								options.highlight === true ? {} : options.highlight,
							),
						}
					: {}),
				...(options.facets !== undefined
					? {
							facets: facets(index, options.facets, {
								docIds: [...matches.keys()].sort(compareStrings),
							}),
						}
					: {}),
				...(options.explain === true
					? {
							explanation: {
								model: options.ranking?.kind ?? "bm25",
								score,
								matchedTerms: freezeArray(match.terms),
							},
						}
					: {}),
				diagnostics: rerankDiagnostics,
			};
			return result;
		})
		.filter(
			(result): result is Omit<SearchResult, "rank"> => result !== undefined,
		)
		.sort(
			(left, right) =>
				compareNumbers(right.score, left.score) ||
				compareStrings(left.docId, right.docId),
		);
	const offset = options.offset ?? 0;
	const limit = options.limit ?? results.length;
	return results.slice(offset, offset + limit).map((result, index) =>
		Object.freeze({
			...result,
			rank: offset + index + 1,
		}),
	);
}

export function explain(
	index: SearchIndex,
	query: SearchQuery,
	docId: string,
	options: SearchOptions = {},
): SearchExplanation {
	const state = getIndexState(index);
	const doc = state.documents[docId];
	if (doc === undefined) {
		fail("TEXTSEARCH_DOCUMENT_MISSING", `document is not indexed: ${docId}`);
	}
	const queryValue =
		query.kind === "cql" ? (query.query ?? parseCql(query.source)) : query;
	const matches = evaluateQuery({ state }, queryValue);
	const match = matches.get(docId) ?? { docId, spans: [], terms: [] };
	const terms = queryTerms(queryValue);
	const { score, rerankDiagnostics } = scoreMatch(state, doc, match, terms, {
		...options,
		explain: true,
	});
	const fieldLengths: Record<string, number> = {};
	const termFrequencies: Record<string, number> = {};
	const documentFrequencies: Record<string, number> = {};
	for (const fieldId of Object.keys(state.fields).sort(compareStrings)) {
		fieldLengths[fieldId] = fieldTokens(doc, fieldId).length;
		for (const term of terms) {
			const key = `${fieldId}\u0000${term}`;
			termFrequencies[key] = termFrequency(doc, fieldId, term);
			documentFrequencies[key] = documentFrequency(state, fieldId, term);
		}
	}
	return Object.freeze({
		indexId: state.id,
		docId,
		query: queryValue,
		queryTerms: freezeArray(terms),
		matchingTerms: freezeArray(match.terms),
		fieldLengths: freezeRecord(fieldLengths),
		termFrequencies: freezeRecord(termFrequencies),
		documentFrequencies: freezeRecord(documentFrequencies),
		model: options.ranking?.kind ?? "bm25",
		score,
		boosts: freezeArray(options.staticBoosts ?? []),
		filterDecisions: freezeArray([]),
		rerankSteps: rerankDiagnostics,
		diagnostics: freezeArray([]),
	});
}

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function mergeSpans(spans: readonly SearchHitSpan[]): SearchHitSpan[] {
	const sorted = [...spans].sort(
		(left, right) =>
			compareStrings(left.fieldId, right.fieldId) ||
			compareStrings(left.viewId ?? "", right.viewId ?? "") ||
			compareNumbers(left.startCU, right.startCU) ||
			compareNumbers(left.endCU, right.endCU),
	);
	const merged: SearchHitSpan[] = [];
	for (const span of sorted) {
		const previous = merged[merged.length - 1];
		if (
			previous !== undefined &&
			previous.fieldId === span.fieldId &&
			previous.viewId === span.viewId &&
			span.startCU <= previous.endCU
		) {
			merged[merged.length - 1] = {
				...previous,
				endCU: Math.max(previous.endCU, span.endCU),
				term: uniqueSorted([previous.term, span.term]).join(" "),
			};
		} else {
			merged.push(span);
		}
	}
	return merged;
}

export function highlight(
	index: SearchIndex,
	docId: string,
	spans: readonly SearchHitSpan[],
	options: HighlightOptions = {},
): HighlightFragment[] {
	const state = getIndexState(index);
	const doc = state.documents[docId];
	if (doc === undefined) {
		fail("TEXTSEARCH_DOCUMENT_MISSING", `document is not indexed: ${docId}`);
	}
	const fieldFilter = new Set(options.fields ?? Object.keys(state.fields));
	const prefix = options.markerPrefix ?? "<mark>";
	const suffix = options.markerSuffix ?? "</mark>";
	const fragmentSize = options.fragmentSize ?? 80;
	const maxFragments = options.maxFragments ?? 5;
	const shouldEscapeHtml = options.escapeHtml ?? true;
	const fragments: HighlightFragment[] = [];
	for (const span of mergeSpans(spans).filter((candidate) =>
		fieldFilter.has(candidate.fieldId),
	)) {
		const field = doc.fields[span.fieldId];
		if (field === undefined) continue;
		const sourceText =
			span.viewId !== undefined && doc.document.views[span.viewId] !== undefined
				? doc.document.views[span.viewId]?.text
				: field.text;
		if (sourceText === undefined) continue;
		if (
			span.startCU < 0 ||
			span.endCU > sourceText.length ||
			span.endCU < span.startCU
		) {
			fail(
				"TEXTSEARCH_HIGHLIGHT_SPAN",
				"highlight span is outside the source text",
			);
		}
		const half = Math.floor(fragmentSize / 2);
		const start = Math.max(0, span.startCU - half);
		const end = Math.min(sourceText.length, span.endCU + half);
		const before = sourceText.slice(start, span.startCU);
		const node = sourceText.slice(span.startCU, span.endCU);
		const after = sourceText.slice(span.endCU, end);
		const render = (value: string) =>
			shouldEscapeHtml ? escapeHtml(value) : value;
		fragments.push(
			Object.freeze({
				fieldId: span.fieldId,
				...(span.viewId !== undefined ? { viewId: span.viewId } : {}),
				startCU: start,
				endCU: end,
				text: sourceText.slice(start, end),
				markedText: `${render(before)}${prefix}${render(node)}${suffix}${render(after)}`,
			}),
		);
	}
	return fragments.slice(0, maxFragments);
}

export interface FacetOptions {
	readonly docIds?: readonly string[];
}

export function facets(
	index: SearchIndex,
	requests: readonly FacetRequest[],
	options: FacetOptions = {},
): FacetResult[] {
	return requests.map((request) => facet(index, request, options));
}

export function facet(
	index: SearchIndex,
	request: FacetRequest,
	options: FacetOptions = {},
): FacetResult {
	const state = getIndexState(index);
	const docIds = new Set(options.docIds ?? Object.keys(state.documents));
	const counts = new Map<string, number>();
	let missing = 0;
	for (const doc of Object.values(state.documents).filter((candidate) =>
		docIds.has(candidate.id),
	)) {
		let values: readonly JsonValue[] = [];
		if (request.metadataKey !== undefined) {
			const value = doc.metadata[request.metadataKey];
			values = value === undefined ? [] : [value];
		} else if (request.field !== undefined) {
			values = doc.fields[request.field]?.values ?? [];
		}
		if (request.ranges !== undefined) {
			for (const range of request.ranges) {
				if (
					values.some(
						(value) =>
							typeof value === "number" &&
							rangeContains(value, { kind: "range", ...range }),
					)
				) {
					counts.set(range.id, (counts.get(range.id) ?? 0) + 1);
				}
			}
			continue;
		}
		if (values.length === 0) {
			missing += 1;
			continue;
		}
		for (const value of values) {
			const key = String(value);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	if (request.includeMissing === true && missing > 0) {
		counts.set("(missing)", missing);
	}
	const buckets = [...counts.entries()]
		.sort(
			([leftValue, leftCount], [rightValue, rightCount]) =>
				compareNumbers(rightCount, leftCount) ||
				compareStrings(leftValue, rightValue),
		)
		.slice(0, request.topN ?? counts.size)
		.map(([value, count]) => Object.freeze({ value, count }));
	return Object.freeze({
		id: request.id ?? request.field ?? request.metadataKey ?? "facet",
		buckets: freezeArray(buckets),
	});
}

export interface StructuralLexicon {
	readonly index?: { readonly keys?: readonly string[] };
	readonly entries?: readonly {
		readonly forms: readonly string[];
		readonly canonical?: string;
	}[];
}

function lexiconCandidateKeys(options: SuggestionOptions): string[] {
	const explicit = [...(options.lexiconKeys ?? [])];
	const lexicon = options.lexicon;
	if (lexicon !== undefined) {
		explicit.push(...(lexicon.index?.keys ?? []));
		explicit.push(...(lexicon.entries ?? []).flatMap((entry) => entry.forms));
	}
	return uniqueSorted(explicit.filter((value) => value.length > 0));
}

export function suggest(
	index: SearchIndex,
	text: string,
	options: SuggestionOptions = {},
): SearchSuggestion[] {
	const state = getIndexState(index);
	const source = options.source ?? "both";
	const maxDistance = options.maxDistance ?? 2;
	const maxCandidates = options.maxCandidates ?? 10;
	const indexTerms =
		source === "lexicon"
			? []
			: vocabulary(state, undefined, undefined).map((term) => ({
					term,
					source: "index" as const,
					frequency: collectionFrequency(state, term),
				}));
	const lexiconTerms =
		source === "index"
			? []
			: lexiconCandidateKeys(options).map((term) => ({
					term,
					source: "lexicon" as const,
					frequency: 0,
				}));
	const query = caseFold(text);
	const suggestions: SearchSuggestion[] = [...indexTerms, ...lexiconTerms]
		.flatMap((candidate): SearchSuggestion[] => {
			const candidateKey = caseFold(candidate.term);
			const distance = candidateKey.startsWith(query)
				? 0
				: boundedEditDistance(query, candidateKey, maxDistance);
			if (distance === undefined) return [];
			const prefixBonus =
				options.prefix !== false && candidateKey.startsWith(query) ? 0.5 : 0;
			return [
				Object.freeze({
					term: candidate.term,
					score: 1 / (1 + distance) + prefixBonus + candidate.frequency / 1000,
					distance,
					frequency: candidate.frequency,
					source: candidate.source,
				}),
			];
		})
		.sort(
			(left, right) =>
				compareNumbers(right.score, left.score) ||
				compareNumbers(left.distance ?? 0, right.distance ?? 0) ||
				compareStrings(left.term, right.term) ||
				compareStrings(left.source, right.source),
		);
	return suggestions.slice(0, maxCandidates);
}

export interface CqlParseOptions {
	readonly defaultField?: string;
	readonly maxExpansions?: number;
}

type CqlTokenKind =
	| "word"
	| "phrase"
	| "and"
	| "or"
	| "not"
	| "lparen"
	| "rparen"
	| "colon";

interface CqlToken {
	readonly kind: CqlTokenKind;
	readonly value: string;
}

function tokenizeCql(source: string): CqlToken[] {
	const tokens: CqlToken[] = [];
	for (let index = 0; index < source.length; ) {
		const char = source[index];
		if (char === undefined) break;
		if (/\s/u.test(char)) {
			index += 1;
			continue;
		}
		if (char === "(") {
			tokens.push({ kind: "lparen", value: char });
			index += 1;
			continue;
		}
		if (char === ")") {
			tokens.push({ kind: "rparen", value: char });
			index += 1;
			continue;
		}
		if (char === ":") {
			tokens.push({ kind: "colon", value: char });
			index += 1;
			continue;
		}
		if (char === '"') {
			let end = index + 1;
			let value = "";
			for (; end < source.length; end += 1) {
				const next = source[end];
				if (next === undefined) break;
				if (next === "\\") {
					const escaped = source[end + 1];
					if (escaped !== undefined) {
						value += escaped;
						end += 1;
						continue;
					}
				}
				if (next === '"') break;
				value += next;
			}
			if (source[end] !== '"') fail("TEXTSEARCH_CQL", "unterminated phrase");
			tokens.push({ kind: "phrase", value });
			index = end + 1;
			continue;
		}
		let end = index;
		while (end < source.length && !/[\s():]/u.test(source[end] ?? "")) end += 1;
		const value = source.slice(index, end);
		const upper = value.toUpperCase();
		tokens.push({
			kind:
				upper === "AND"
					? "and"
					: upper === "OR"
						? "or"
						: upper === "NOT"
							? "not"
							: "word",
			value,
		});
		index = end;
	}
	return tokens;
}

class CqlParser {
	private index = 0;

	constructor(
		private readonly tokens: readonly CqlToken[],
		private readonly options: CqlParseOptions,
	) {}

	parse(): SearchQuery {
		const query = this.parseOr();
		if (this.peek() !== undefined) {
			fail("TEXTSEARCH_CQL", `unexpected token: ${this.peek()?.value ?? ""}`);
		}
		return query;
	}

	private peek(): CqlToken | undefined {
		return this.tokens[this.index];
	}

	private take(): CqlToken | undefined {
		const token = this.tokens[this.index];
		this.index += 1;
		return token;
	}

	private parseOr(): SearchQuery {
		let left = this.parseAnd();
		while (this.peek()?.kind === "or") {
			this.take();
			const right = this.parseAnd();
			left = { kind: "boolean", should: [left, right], minimumShouldMatch: 1 };
		}
		return left;
	}

	private parseAnd(): SearchQuery {
		const queries: SearchQuery[] = [this.parseUnary()];
		while (this.peek()?.kind === "and") {
			this.take();
			queries.push(this.parseUnary());
		}
		if (queries.length === 1) return queries[0] as SearchQuery;
		return { kind: "boolean", must: queries };
	}

	private parseUnary(): SearchQuery {
		if (this.peek()?.kind === "not") {
			this.take();
			return { kind: "boolean", mustNot: [this.parsePrimary()] };
		}
		return this.parsePrimary();
	}

	private parsePrimary(): SearchQuery {
		const token = this.take();
		if (token === undefined) fail("TEXTSEARCH_CQL", "expected query");
		if (token.kind === "lparen") {
			const query = this.parseOr();
			if (this.take()?.kind !== "rparen")
				fail("TEXTSEARCH_CQL", "expected closing parenthesis");
			return query;
		}
		if (token.kind === "phrase") {
			return {
				kind: "phrase",
				terms: token.value.split(/\s+/u).filter((value) => value.length > 0),
			};
		}
		if (token.kind !== "word")
			fail("TEXTSEARCH_CQL", `unexpected token: ${token.value}`);
		if (this.peek()?.kind === "colon") {
			this.take();
			const value = this.parsePrimary();
			return { kind: "field", field: token.value, query: value };
		}
		if (token.value.includes("*") || token.value.includes("?")) {
			return {
				kind: "wildcard",
				pattern: token.value,
				...(this.options.maxExpansions !== undefined
					? { maxExpansions: this.options.maxExpansions }
					: {}),
			};
		}
		if (token.value.endsWith("~")) {
			return { kind: "fuzzy", term: token.value.slice(0, -1) };
		}
		return {
			kind: "term",
			term: token.value,
			...(this.options.defaultField !== undefined
				? { field: this.options.defaultField }
				: {}),
		};
	}
}

export function parseCql(
	source: string,
	options: CqlParseOptions = {},
): SearchQuery {
	assertNonEmptyString(source, "$.cql");
	return new CqlParser(tokenizeCql(source), options).parse();
}

export function serializeCql(query: SearchQuery): string {
	if (query.kind === "term")
		return query.field === undefined
			? query.term
			: `${query.field}:${query.term}`;
	if (query.kind === "phrase")
		return `"${query.terms.join(" ").replaceAll('"', '\\"')}"`;
	if (query.kind === "prefix") return `${query.prefix}*`;
	if (query.kind === "suffix") return `*${query.suffix}`;
	if (query.kind === "wildcard") return query.pattern;
	if (query.kind === "fuzzy") return `${query.term}~`;
	if (query.kind === "field")
		return `${Array.isArray(query.field) ? query.field[0] : query.field}:${serializeCql(query.query)}`;
	if (query.kind === "boolean") {
		const must = (query.must ?? []).map(serializeCql);
		const should = (query.should ?? []).map(serializeCql);
		const mustNot = (query.mustNot ?? []).map(
			(child) => `NOT ${serializeCql(child)}`,
		);
		return [...must, ...should, ...mustNot].join(
			should.length > 0 ? " OR " : " AND ",
		);
	}
	return query.kind;
}

export function allQuery(): SearchQuery {
	return { kind: "all" };
}

export function noneQuery(): SearchQuery {
	return { kind: "none" };
}

export function termQuery(term: string, field?: string): SearchQuery {
	return { kind: "term", term, ...(field !== undefined ? { field } : {}) };
}

export function termsQuery(
	terms: readonly string[],
	options: { readonly field?: string; readonly operator?: "any" | "all" } = {},
): SearchQuery {
	return {
		kind: "terms",
		terms: freezeArray(terms),
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.operator !== undefined ? { operator: options.operator } : {}),
	};
}

export function phraseQuery(
	terms: readonly string[],
	options: { readonly field?: string; readonly slop?: number } = {},
): SearchQuery {
	return {
		kind: "phrase",
		terms: freezeArray(terms),
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.slop !== undefined ? { slop: options.slop } : {}),
	};
}

export function proximityQuery(
	terms: readonly string[],
	window: number,
	options: { readonly field?: string; readonly ordered?: boolean } = {},
): SearchQuery {
	return {
		kind: "proximity",
		terms: freezeArray(terms),
		window,
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.ordered !== undefined ? { ordered: options.ordered } : {}),
	};
}

export function booleanQuery(
	parts: Omit<Extract<SearchQuery, { kind: "boolean" }>, "kind">,
): SearchQuery {
	return { kind: "boolean", ...parts };
}

export function fieldQuery(
	field: string | readonly string[],
	query: SearchQuery,
): SearchQuery {
	return { kind: "field", field, query };
}

export function rangeQuery(
	options: Omit<Extract<SearchQuery, { kind: "range" }>, "kind">,
): SearchQuery {
	return { kind: "range", ...options };
}

export function wildcardQuery(
	pattern: string,
	options: { readonly field?: string; readonly maxExpansions?: number } = {},
): SearchQuery {
	return {
		kind: "wildcard",
		pattern,
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.maxExpansions !== undefined
			? { maxExpansions: options.maxExpansions }
			: {}),
	};
}

export function prefixQuery(
	prefix: string,
	options: { readonly field?: string; readonly maxExpansions?: number } = {},
): SearchQuery {
	return {
		kind: "prefix",
		prefix,
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.maxExpansions !== undefined
			? { maxExpansions: options.maxExpansions }
			: {}),
	};
}

export function suffixQuery(
	suffix: string,
	options: { readonly field?: string; readonly maxExpansions?: number } = {},
): SearchQuery {
	return {
		kind: "suffix",
		suffix,
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.maxExpansions !== undefined
			? { maxExpansions: options.maxExpansions }
			: {}),
	};
}

export function fuzzyQuery(
	term: string,
	options: {
		readonly field?: string;
		readonly maxDistance?: number;
		readonly prefixLength?: number;
		readonly maxExpansions?: number;
	} = {},
): SearchQuery {
	return {
		kind: "fuzzy",
		term,
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.maxDistance !== undefined
			? { maxDistance: options.maxDistance }
			: {}),
		...(options.prefixLength !== undefined
			? { prefixLength: options.prefixLength }
			: {}),
		...(options.maxExpansions !== undefined
			? { maxExpansions: options.maxExpansions }
			: {}),
	};
}

export function regexQuery(
	pattern: string,
	options: { readonly field?: string; readonly maxExpansions?: number } = {},
): SearchQuery {
	return {
		kind: "regex",
		pattern,
		...(options.field !== undefined ? { field: options.field } : {}),
		...(options.maxExpansions !== undefined
			? { maxExpansions: options.maxExpansions }
			: {}),
	};
}

export function annotationQuery(
	options: Omit<Extract<SearchQuery, { kind: "annotation" }>, "kind"> = {},
): SearchQuery {
	return { kind: "annotation", ...options };
}

export function metadataQuery(key: string, value?: JsonValue): SearchQuery {
	return {
		kind: "metadata",
		key,
		...(value !== undefined ? { value } : {}),
	};
}

export function documentFilter(ids: readonly string[]): Filter {
	return { kind: "document", ids: freezeArray(ids) };
}

export function metadataFilter(key: string, value?: JsonValue): Filter {
	return {
		kind: "metadata",
		key,
		...(value !== undefined ? { value } : {}),
	};
}

export function fieldFilter(field: string, value?: JsonValue): Filter {
	return {
		kind: "field",
		field,
		...(value !== undefined ? { value } : {}),
	};
}

export function rangeFilter(
	options: Omit<Extract<Filter, { kind: "range" }>, "kind">,
): Filter {
	return { kind: "range", ...options };
}

export function annotationFilter(
	options: Omit<Extract<Filter, { kind: "annotation" }>, "kind"> = {},
): Filter {
	return { kind: "annotation", ...options };
}

export function queryFilter(query: SearchQuery): Filter {
	return { kind: "query", query };
}

export function andFilter(filters: readonly Filter[]): Filter {
	return { kind: "and", filters: freezeArray(filters) };
}

export function orFilter(filters: readonly Filter[]): Filter {
	return { kind: "or", filters: freezeArray(filters) };
}

export function notFilter(filter: Filter): Filter {
	return { kind: "not", filter };
}
