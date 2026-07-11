import {
	type Annotation,
	type AnnotationGraph,
	type AnnotationGraphEdge,
	type AnnotationGraphNode,
	type AnnotationLayer,
	addAnnotation,
	addGraph,
	addLayer,
	type Evidence,
	type SpanMap,
	type SpanMapEntry,
	type SpanRef,
	type TextDocument,
	type TextView,
	updateAnnotation,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { applyDown, compileRegex, type Fst } from "@ismail-elkorchi/textfst";
import type { Gazetteer, Lexicon } from "@ismail-elkorchi/textlex";

export const packageName = "@ismail-elkorchi/textrules" as const;
export const packageVersion = "0.1.0" as const;

export type PackageName = typeof packageName;

export type RuleDiagnosticSeverity = "info" | "warning" | "error";
export type RuleConflictPolicy =
	| "keep-all"
	| "first"
	| "priority"
	| "longest"
	| "non-overlap";
export type RuleProcessorKind =
	| "tokenizer"
	| "sentence-splitter"
	| "lemmatizer"
	| "stemmer"
	| "chunker"
	| "entity-recognizer"
	| "relation-extractor"
	| "event-extractor"
	| "time-extractor"
	| "quantity-extractor"
	| "citation-extractor"
	| "coreference-resolver"
	| "quote-attributor"
	| "style-checker"
	| "transfer-processor"
	| "generic";

export interface RuleDiagnostic {
	readonly code: string;
	readonly severity: RuleDiagnosticSeverity;
	readonly message: string;
	readonly ruleId?: string;
	readonly phase?: string;
	readonly path?: string;
	readonly context?: Readonly<Record<string, unknown>>;
}

export interface RuleSet {
	readonly id: string;
	readonly version: string;
	readonly rules: readonly Rule[];
	readonly resources?: readonly string[];
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Rule {
	readonly id: string;
	readonly phase?: string;
	readonly priority?: number;
	readonly when: Pattern;
	readonly action: readonly RuleAction[];
	readonly options?: Readonly<Record<string, unknown>>;
}

export type Pattern =
	| CharPattern
	| TokenPattern
	| AnnotationPattern
	| DependencyPattern
	| TreePattern
	| SequencePattern
	| BooleanPattern;

interface PatternBase {
	readonly capture?: string;
}

export interface CharPattern extends PatternBase {
	readonly kind: "char";
	readonly viewId?: string;
	readonly text?: string;
	readonly pattern?: string;
	readonly useFst?: boolean;
	readonly span?: SpanRef["span"];
}

export interface TokenPattern extends PatternBase {
	readonly kind: "token";
	readonly layerId?: string;
	readonly text?: string;
	readonly lemma?: string;
	readonly pos?: string;
	readonly index?: number;
	readonly features?: Readonly<Record<string, unknown>>;
}

export interface AnnotationPattern extends PatternBase {
	readonly kind: "annotation";
	readonly layerId?: string;
	readonly annotationId?: string;
	readonly type?: string;
	readonly value?: Readonly<Record<string, unknown>>;
	readonly features?: Readonly<Record<string, unknown>>;
}

export interface DependencyPattern extends PatternBase {
	readonly kind: "dependency";
	readonly graphId?: string;
	readonly relation?: string;
	readonly sourceAnnotationId?: string;
	readonly targetAnnotationId?: string;
}

export interface TreePattern extends PatternBase {
	readonly kind: "tree";
	readonly graphId?: string;
	readonly layerId?: string;
	readonly type?: string;
	readonly parentType?: string;
	readonly childType?: string;
}

export interface SequencePattern extends PatternBase {
	readonly kind: "sequence";
	readonly patterns: readonly Pattern[];
	readonly ordered?: boolean;
	readonly maxGap?: number;
}

export interface BooleanPattern extends PatternBase {
	readonly kind: "boolean";
	readonly all?: readonly Pattern[];
	readonly any?: readonly Pattern[];
	readonly not?: readonly Pattern[];
}

export type RuleAction =
	| CreateAnnotationAction
	| SetFeaturesAction
	| RewriteAction
	| SplitTokensAction
	| MergeTokensAction
	| RetokenizeAction
	| GraphAction
	| DiagnosticAction
	| ConstraintAction
	| FeatureAction;

interface ActionBase {
	readonly id?: string;
}

export interface CreateAnnotationAction extends ActionBase {
	readonly kind: "annotate";
	readonly layerId: string;
	readonly layerType: string;
	readonly annotationType?: string;
	readonly annotationId?: string;
	readonly value?: Readonly<Record<string, unknown>>;
	readonly features?: Readonly<Record<string, unknown>>;
	readonly spans?: readonly SpanRef[];
	readonly viewId?: string;
}

export interface SetFeaturesAction extends ActionBase {
	readonly kind: "set-features";
	readonly annotationId?: string;
	readonly capture?: string;
	readonly features: Readonly<Record<string, unknown>>;
}

export interface RewriteAction extends ActionBase {
	readonly kind: "rewrite";
	readonly sourceViewId?: string;
	readonly targetViewId: string;
	readonly viewKind?: TextView["kind"];
	readonly replacement?: string;
	readonly replacements?: Readonly<Record<string, string>>;
	readonly spanMapId?: string;
}

export interface SplitTokensAction extends ActionBase {
	readonly kind: "split-tokens";
	readonly layerId?: string;
	readonly viewId?: string;
	readonly pattern?: string;
}

export interface MergeTokensAction extends ActionBase {
	readonly kind: "merge-tokens";
	readonly layerId: string;
	readonly annotationId?: string;
	readonly tokenIds?: readonly string[];
}

export interface RetokenizeAction extends ActionBase {
	readonly kind: "retokenize";
	readonly layerId?: string;
	readonly viewId?: string;
	readonly pattern?: string;
}

export interface GraphAction extends ActionBase {
	readonly kind: "graph";
	readonly graphId: string;
	readonly graphKind?: string;
	readonly relation: string;
	readonly sourceAnnotationId?: string;
	readonly targetAnnotationId?: string;
	readonly sourceCapture?: string;
	readonly targetCapture?: string;
	readonly annotationId?: string;
}

export interface DiagnosticAction extends ActionBase {
	readonly kind: "diagnostic";
	readonly code: string;
	readonly severity?: RuleDiagnosticSeverity;
	readonly message: string;
}

export interface ConstraintAction extends ActionBase {
	readonly kind: "constraint";
	readonly code: string;
	readonly message: string;
	readonly severity?: RuleDiagnosticSeverity;
}

export interface FeatureAction extends ActionBase {
	readonly kind: "feature";
	readonly layerId?: string;
	readonly name: string;
	readonly value: unknown;
}

export interface RuleCompileOptions {
	readonly defaultPhase?: string;
	readonly defaultPriority?: number;
	readonly resources?: Readonly<Record<string, unknown>>;
	readonly lexicons?: Readonly<Record<string, Lexicon>>;
	readonly gazetteers?: Readonly<Record<string, Gazetteer>>;
	readonly fsts?: Readonly<Record<string, Fst>>;
	readonly conflictPolicy?: RuleConflictPolicy;
	readonly strictJson?: boolean;
	readonly diagnostics?: "throw" | "collect";
}

export interface MatchOptions {
	readonly viewId?: string;
	readonly layerId?: string;
	readonly phases?: readonly string[];
	readonly maxMatches?: number;
	readonly conflictPolicy?: RuleConflictPolicy;
	readonly strictSpans?: boolean;
}

export interface ApplyRuleOptions extends MatchOptions {
	readonly evidenceProducer?: string;
	readonly replaceLayers?: boolean;
	readonly sourceViewId?: string;
	readonly targetViewId?: string;
	readonly viewKind?: TextView["kind"];
	readonly spanMapId?: string;
	readonly validate?: boolean;
}

export interface RewriteViewOptions extends MatchOptions {
	readonly sourceViewId?: string;
	readonly targetViewId?: string;
	readonly viewKind?: TextView["kind"];
	readonly spanMapId?: string;
	readonly validate?: boolean;
}

export interface RuleProcessorOptions extends ApplyRuleOptions {
	readonly id?: string;
	readonly version?: string;
	readonly label?: string;
	readonly kind?: RuleProcessorKind;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly requiredLayers?: readonly string[];
	readonly producedLayers?: readonly string[];
}

export interface CompiledRule {
	readonly id: string;
	readonly phase: string;
	readonly priority: number;
	readonly sourceIndex: number;
	readonly when: Pattern;
	readonly action: readonly RuleAction[];
	readonly options: Readonly<Record<string, unknown>>;
}

export interface CompiledRuleSet {
	readonly id: string;
	readonly version: string;
	readonly rules: readonly CompiledRule[];
	readonly resources: readonly string[];
	readonly metadata: Readonly<Record<string, unknown>>;
	readonly diagnostics: readonly RuleDiagnostic[];
	readonly conflictPolicy: RuleConflictPolicy;
}

export type RuleCaptureKind =
	| "span"
	| "annotation"
	| "graph-edge"
	| "tree"
	| "text"
	| "sequence";

export interface RuleCapture {
	readonly kind: RuleCaptureKind;
	readonly name: string;
	readonly text?: string;
	readonly spans?: readonly SpanRef[];
	readonly annotationIds?: readonly string[];
	readonly graphIds?: readonly string[];
	readonly edgeIds?: readonly string[];
	readonly value?: unknown;
}

export interface RuleMatch {
	readonly id: string;
	readonly ruleId: string;
	readonly phase: string;
	readonly priority: number;
	readonly rank: number;
	readonly captures: Readonly<Record<string, RuleCapture>>;
	readonly spans: readonly SpanRef[];
	readonly annotationIds: readonly string[];
	readonly graphIds: readonly string[];
	readonly edgeIds: readonly string[];
	readonly diagnostics: readonly RuleDiagnostic[];
}

export interface TextProcessor {
	readonly id: string;
	readonly version: string;
	readonly packageName: typeof packageName;
	readonly kind: RuleProcessorKind;
	readonly metadata: Readonly<Record<string, unknown>>;
	readonly requires: readonly string[];
	readonly produces: readonly string[];
	process(document: TextDocument): TextDocument | Promise<TextDocument>;
}

interface PatternResult {
	readonly text?: string;
	readonly spans: readonly SpanRef[];
	readonly annotationIds: readonly string[];
	readonly graphIds: readonly string[];
	readonly edgeIds: readonly string[];
	readonly captures: Readonly<Record<string, RuleCapture>>;
}

type JsonValue =
	| null
	| string
	| number
	| boolean
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

const defaultPhase = "main";
const defaultPriority = 0;

function stableCompare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function orderedRecord<T>(
	record: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(record).sort(([left], [right]) =>
				stableCompare(left, right),
			),
		),
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function assertNonEmpty(
	value: unknown,
	label: string,
): asserts value is string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError(`${label} must be a non-empty string.`);
	}
}

function assertOptionalNonEmpty(
	value: unknown,
	label: string,
): asserts value is string | undefined {
	if (value !== undefined) assertNonEmpty(value, label);
}

function assertOptionalFiniteNumber(
	value: unknown,
	label: string,
): asserts value is number | undefined {
	if (
		value !== undefined &&
		(typeof value !== "number" || !Number.isFinite(value))
	) {
		throw new TypeError(`${label} must be a finite number.`);
	}
}

function assertJsonValue(
	value: unknown,
	label: string,
): asserts value is JsonValue {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}
	if (typeof value === "number") {
		if (Number.isFinite(value)) return;
		throw new TypeError(`${label} must be finite JSON number.`);
	}
	if (Array.isArray(value)) {
		for (const [index, entry] of value.entries()) {
			assertJsonValue(entry, `${label}[${index}]`);
		}
		return;
	}
	if (isRecord(value)) {
		for (const [key, entry] of Object.entries(value)) {
			assertJsonValue(entry, `${label}.${key}`);
		}
		return;
	}
	throw new TypeError(`${label} must be an I-JSON value.`);
}

function cloneJson<T>(value: T, label: string): T {
	assertJsonValue(value, label);
	return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		Object.freeze(value);
		for (const child of Object.values(value as Record<string, unknown>)) {
			deepFreeze(child);
		}
	}
	return value;
}

function firstView(doc: TextDocument): TextView {
	const view = Object.values(doc.views).sort((left, right) =>
		stableCompare(left.id, right.id),
	)[0];
	if (view === undefined) throw new TypeError("document has no text view.");
	return view;
}

function viewFor(doc: TextDocument, viewId?: string): TextView {
	if (viewId === undefined) return firstView(doc);
	const view = doc.views[viewId];
	if (view === undefined) throw new TypeError(`view is missing: ${viewId}`);
	return view;
}

function evidence(
	ruleId: string,
	inputViewIds: readonly string[],
	options: ApplyRuleOptions = {},
): Evidence {
	const views = inputViewIds.length > 0 ? inputViewIds : ["raw"];
	return {
		mode: "rule",
		exactness: "E1",
		producer: options.evidenceProducer ?? packageName,
		packageName,
		packageVersion,
		ruleIds: [ruleId],
		inputViewIds: views,
	};
}

function stableId(parts: readonly (string | number | undefined)[]): string {
	const tokens = parts
		.filter((part): part is string | number => part !== undefined)
		.map((part) => String(part));
	const prefix =
		tokens[0]?.replaceAll(/[^A-Za-z0-9_.:-]+/g, "-").slice(0, 48) ??
		"generated";
	return `${prefix}:${stableHash64(JSON.stringify(tokens))}`;
}

function annotationEntries(
	doc: TextDocument,
	layerId?: string,
): readonly {
	layer: AnnotationLayer;
	annotation: Annotation;
}[] {
	const layers =
		layerId === undefined
			? Object.values(doc.layers)
			: doc.layers[layerId] === undefined
				? []
				: [doc.layers[layerId]];
	return layers
		.flatMap((layer) =>
			Object.values(layer.annotations).map((annotation) => ({
				layer,
				annotation,
			})),
		)
		.sort(
			(left, right) =>
				stableCompare(left.layer.id, right.layer.id) ||
				stableCompare(left.annotation.id, right.annotation.id),
		);
}

function annotationText(doc: TextDocument, annotation: Annotation): string {
	const value = annotation.value;
	if (isRecord(value) && typeof value.text === "string") return value.text;
	const ref = annotation.spans[0];
	if (ref === undefined || ref.span.unit !== "utf16-code-unit") return "";
	const view = doc.views[ref.viewId];
	return view?.text.slice(ref.span.start, ref.span.end) ?? "";
}

function valueMatches(
	actual: unknown,
	expected: Readonly<Record<string, unknown>> | undefined,
): boolean {
	if (expected === undefined) return true;
	if (!isRecord(actual)) return false;
	return Object.entries(expected).every(
		([key, value]) => actual[key] === value,
	);
}

function featureMatches(
	actual: Readonly<Record<string, unknown>> | undefined,
	expected: Readonly<Record<string, unknown>> | undefined,
): boolean {
	if (expected === undefined) return true;
	if (actual === undefined) return false;
	return Object.entries(expected).every(
		([key, value]) => actual[key] === value,
	);
}

function captureFromResult(
	name: string,
	kind: RuleCaptureKind,
	result: Omit<PatternResult, "captures"> & { readonly text?: string },
): RuleCapture {
	return {
		name,
		kind,
		...(result.text !== undefined ? { text: result.text } : {}),
		...(result.spans.length > 0 ? { spans: result.spans } : {}),
		...(result.annotationIds.length > 0
			? { annotationIds: result.annotationIds }
			: {}),
		...(result.graphIds.length > 0 ? { graphIds: result.graphIds } : {}),
		...(result.edgeIds.length > 0 ? { edgeIds: result.edgeIds } : {}),
	};
}

function withCapture(
	pattern: Pattern,
	kind: RuleCaptureKind,
	result: Omit<PatternResult, "captures"> & { readonly text?: string },
): PatternResult {
	if (pattern.capture === undefined) return { ...result, captures: {} };
	return {
		...result,
		captures: {
			[pattern.capture]: captureFromResult(pattern.capture, kind, result),
		},
	};
}

function charResults(
	doc: TextDocument,
	pattern: CharPattern,
	options: MatchOptions,
): readonly PatternResult[] {
	const view = viewFor(doc, pattern.viewId ?? options.viewId);
	if (pattern.span !== undefined) {
		if (pattern.span.unit !== "utf16-code-unit") {
			if (options.strictSpans !== false) {
				throw new TypeError("char span must use utf16-code-unit coordinates.");
			}
			return [];
		}
		const text = view.text.slice(pattern.span.start, pattern.span.end);
		return [
			withCapture(pattern, "span", {
				text,
				spans: [{ viewId: view.id, span: pattern.span }],
				annotationIds: [],
				graphIds: [],
				edgeIds: [],
			}),
		];
	}
	if (pattern.text !== undefined) {
		const results: PatternResult[] = [];
		let offset = view.text.indexOf(pattern.text);
		while (offset >= 0) {
			const end = offset + pattern.text.length;
			results.push(
				withCapture(pattern, "span", {
					text: pattern.text,
					spans: [
						{
							viewId: view.id,
							span: { start: offset, end, unit: "utf16-code-unit" },
						},
					],
					annotationIds: [],
					graphIds: [],
					edgeIds: [],
				}),
			);
			offset = view.text.indexOf(pattern.text, Math.max(end, offset + 1));
		}
		return results;
	}
	if (pattern.pattern !== undefined) {
		if (pattern.useFst === true) {
			const fst = compileRegex(pattern.pattern);
			const results: PatternResult[] = [];
			for (let start = 0; start < view.text.length; start += 1) {
				for (let end = start + 1; end <= view.text.length; end += 1) {
					const text = view.text.slice(start, end);
					const accepted = applyDown(fst, text, { maxResults: 1 }).some(
						(result) =>
							result.output === text && result.consumed === text.length,
					);
					if (!accepted) continue;
					results.push(
						withCapture(pattern, "span", {
							text,
							spans: [
								{
									viewId: view.id,
									span: {
										start,
										end,
										unit: "utf16-code-unit",
									},
								},
							],
							annotationIds: [],
							graphIds: [],
							edgeIds: [],
						}),
					);
				}
			}
			return results;
		}
		const regex = new RegExp(pattern.pattern, "gu");
		return [...view.text.matchAll(regex)].map((match) => {
			const start = match.index;
			const text = match[0];
			return withCapture(pattern, "span", {
				text,
				spans: [
					{
						viewId: view.id,
						span: { start, end: start + text.length, unit: "utf16-code-unit" },
					},
				],
				annotationIds: [],
				graphIds: [],
				edgeIds: [],
			});
		});
	}
	return [];
}

function tokenResults(
	doc: TextDocument,
	pattern: TokenPattern,
	options: MatchOptions,
): readonly PatternResult[] {
	return annotationEntries(doc, pattern.layerId ?? options.layerId)
		.filter(({ layer }) => layer.type.startsWith("token."))
		.filter(({ annotation }) => {
			const value = isRecord(annotation.value) ? annotation.value : {};
			if (pattern.index !== undefined && value.index !== pattern.index)
				return false;
			const text = annotationText(doc, annotation);
			if (pattern.text !== undefined && text !== pattern.text) return false;
			if (pattern.lemma !== undefined && value.lemma !== pattern.lemma)
				return false;
			if (pattern.pos !== undefined && value.pos !== pattern.pos) return false;
			return featureMatches(annotation.features, pattern.features);
		})
		.map(({ annotation }) =>
			withCapture(pattern, "annotation", {
				text: annotationText(doc, annotation),
				spans: annotation.spans,
				annotationIds: [annotation.id],
				graphIds: [],
				edgeIds: [],
			}),
		);
}

function annotationResults(
	doc: TextDocument,
	pattern: AnnotationPattern,
	options: MatchOptions,
): readonly PatternResult[] {
	return annotationEntries(doc, pattern.layerId ?? options.layerId)
		.filter(({ annotation }) =>
			pattern.annotationId === undefined
				? true
				: annotation.id === pattern.annotationId,
		)
		.filter(({ annotation }) =>
			pattern.type === undefined ? true : annotation.type === pattern.type,
		)
		.filter(({ annotation }) => valueMatches(annotation.value, pattern.value))
		.filter(({ annotation }) =>
			featureMatches(annotation.features, pattern.features),
		)
		.map(({ annotation }) =>
			withCapture(pattern, "annotation", {
				text: annotationText(doc, annotation),
				spans: annotation.spans,
				annotationIds: [annotation.id],
				graphIds: [],
				edgeIds: [],
			}),
		);
}

function graphNodeByAnnotation(
	graph: AnnotationGraph,
	annotationId: string,
): string | undefined {
	return Object.values(graph.nodes).find(
		(node) => node.annotationId === annotationId,
	)?.id;
}

function graphSelection(
	graphs: Readonly<Record<string, AnnotationGraph>>,
	graphId: string | undefined,
): readonly AnnotationGraph[] {
	if (graphId === undefined) return Object.values(graphs);
	const graph = graphs[graphId];
	return graph === undefined ? [] : [graph];
}

function dependencyResults(
	doc: TextDocument,
	pattern: DependencyPattern,
): readonly PatternResult[] {
	return graphSelection(doc.graphs, pattern.graphId)
		.filter((graph) => graph.kind === "dependency" || graph.kind === "parse")
		.flatMap((graph) =>
			Object.values(graph.edges)
				.filter((edge) =>
					pattern.relation === undefined
						? true
						: edge.relation === pattern.relation,
				)
				.filter((edge) => {
					if (pattern.sourceAnnotationId !== undefined) {
						const source = graphNodeByAnnotation(
							graph,
							pattern.sourceAnnotationId,
						);
						if (source !== edge.source) return false;
					}
					if (pattern.targetAnnotationId !== undefined) {
						const target = graphNodeByAnnotation(
							graph,
							pattern.targetAnnotationId,
						);
						if (target !== edge.target) return false;
					}
					return true;
				})
				.map((edge) =>
					withCapture(pattern, "graph-edge", {
						spans: [],
						annotationIds:
							edge.annotationId === undefined ? [] : [edge.annotationId],
						graphIds: [graph.id],
						edgeIds: [edge.id],
					}),
				),
		);
}

function treeResults(
	doc: TextDocument,
	pattern: TreePattern,
	options: MatchOptions,
): readonly PatternResult[] {
	const annotationMatches = annotationEntries(
		doc,
		pattern.layerId ?? options.layerId,
	)
		.filter(({ layer, annotation }) =>
			pattern.type === undefined
				? layer.type.includes("tree") ||
					layer.type.includes("parse") ||
					annotation.type.includes("tree") ||
					annotation.type.includes("phrase")
				: annotation.type === pattern.type,
		)
		.map(({ annotation }) =>
			withCapture(pattern, "tree", {
				text: annotationText(doc, annotation),
				spans: annotation.spans,
				annotationIds: [annotation.id],
				graphIds: [],
				edgeIds: [],
			}),
		);
	if (annotationMatches.length > 0) return annotationMatches;
	return graphSelection(doc.graphs, pattern.graphId)
		.filter((graph) => graph.kind === "parse")
		.flatMap((graph) =>
			Object.values(graph.nodes).map((node) =>
				withCapture(pattern, "tree", {
					spans: [],
					annotationIds: [node.annotationId],
					graphIds: [graph.id],
					edgeIds: [],
				}),
			),
		);
}

function mergePatternResults(
	pattern: Pattern,
	results: readonly PatternResult[],
): PatternResult {
	const merged = {
		spans: results.flatMap((result) => result.spans),
		annotationIds: results.flatMap((result) => result.annotationIds),
		graphIds: results.flatMap((result) => result.graphIds),
		edgeIds: results.flatMap((result) => result.edgeIds),
		captures: Object.assign({}, ...results.map((result) => result.captures)),
	};
	if (pattern.capture === undefined) return merged;
	return {
		...merged,
		captures: {
			...merged.captures,
			[pattern.capture]: {
				name: pattern.capture,
				kind: "sequence",
				spans: merged.spans,
				annotationIds: merged.annotationIds,
				graphIds: merged.graphIds,
				edgeIds: merged.edgeIds,
			},
		},
	};
}

function spansOrdered(spans: readonly SpanRef[]): boolean {
	for (let index = 1; index < spans.length; index += 1) {
		const previous = spans[index - 1];
		const current = spans[index];
		if (previous === undefined || current === undefined) return false;
		if (previous.viewId !== current.viewId) return false;
		if (previous.span.unit !== current.span.unit) return false;
		if (previous.span.end > current.span.start) return false;
	}
	return true;
}

function sequenceResults(
	doc: TextDocument,
	pattern: SequencePattern,
	options: MatchOptions,
): readonly PatternResult[] {
	const parts = pattern.patterns.map((part) =>
		evaluatePattern(doc, part, options),
	);
	if (parts.some((part) => part.length === 0)) return [];
	let combinations: readonly (readonly PatternResult[])[] = [[]];
	for (const part of parts) {
		const next: PatternResult[][] = [];
		for (const combination of combinations) {
			for (const result of part) {
				const candidate = [...combination, result];
				const merged = mergePatternResults(pattern, candidate);
				if (pattern.ordered !== false && !spansOrdered(merged.spans)) continue;
				next.push(candidate);
				if (next.length >= (options.maxMatches ?? Number.POSITIVE_INFINITY)) {
					break;
				}
			}
			if (next.length >= (options.maxMatches ?? Number.POSITIVE_INFINITY))
				break;
		}
		combinations = next;
		if (combinations.length === 0) return [];
	}
	return combinations.map((combination) =>
		mergePatternResults(pattern, combination),
	);
}

function booleanResults(
	doc: TextDocument,
	pattern: BooleanPattern,
	options: MatchOptions,
): readonly PatternResult[] {
	const all = pattern.all ?? [];
	const any = pattern.any ?? [];
	const not = pattern.not ?? [];
	if (not.some((part) => evaluatePattern(doc, part, options).length > 0))
		return [];
	const allResults = all.map((part) => evaluatePattern(doc, part, options));
	if (allResults.some((part) => part.length === 0)) return [];
	const anyResults = any.flatMap((part) => evaluatePattern(doc, part, options));
	if (any.length > 0 && anyResults.length === 0) return [];
	const selected = [
		...allResults.map((part) => part[0]).filter((part) => part !== undefined),
		...(any.length > 0
			? [anyResults[0]].filter((part) => part !== undefined)
			: []),
	];
	return [mergePatternResults(pattern, selected)];
}

function evaluatePattern(
	doc: TextDocument,
	pattern: Pattern,
	options: MatchOptions,
): readonly PatternResult[] {
	if (pattern.kind === "char") return charResults(doc, pattern, options);
	if (pattern.kind === "token") return tokenResults(doc, pattern, options);
	if (pattern.kind === "annotation")
		return annotationResults(doc, pattern, options);
	if (pattern.kind === "dependency") return dependencyResults(doc, pattern);
	if (pattern.kind === "tree") return treeResults(doc, pattern, options);
	if (pattern.kind === "sequence")
		return sequenceResults(doc, pattern, options);
	return booleanResults(doc, pattern, options);
}

function assertPattern(pattern: Pattern, path: string): void {
	if (!isRecord(pattern)) throw new TypeError(`${path} must be a pattern.`);
	const kind = pattern.kind;
	if (
		kind !== "char" &&
		kind !== "token" &&
		kind !== "annotation" &&
		kind !== "dependency" &&
		kind !== "tree" &&
		kind !== "sequence" &&
		kind !== "boolean"
	) {
		throw new TypeError(`${path}.kind is not a final pattern kind.`);
	}
	if (kind === "sequence") {
		if (!Array.isArray(pattern.patterns) || pattern.patterns.length === 0) {
			throw new TypeError(`${path}.patterns must be a non-empty array.`);
		}
		for (const [index, entry] of pattern.patterns.entries()) {
			assertPattern(entry, `${path}.patterns[${index}]`);
		}
	}
	if (kind === "boolean") {
		for (const key of ["all", "any", "not"] as const) {
			const patterns = pattern[key];
			if (patterns !== undefined) {
				if (!Array.isArray(patterns)) {
					throw new TypeError(`${path}.${key} must be an array.`);
				}
				for (const [index, entry] of patterns.entries()) {
					assertPattern(entry, `${path}.${key}[${index}]`);
				}
			}
		}
	}
}

function assertAction(action: RuleAction, path: string): void {
	if (!isRecord(action)) throw new TypeError(`${path} must be an action.`);
	const kind = action.kind;
	if (
		kind !== "annotate" &&
		kind !== "set-features" &&
		kind !== "rewrite" &&
		kind !== "split-tokens" &&
		kind !== "merge-tokens" &&
		kind !== "retokenize" &&
		kind !== "graph" &&
		kind !== "diagnostic" &&
		kind !== "constraint" &&
		kind !== "feature"
	) {
		throw new TypeError(`${path}.kind is not a final action kind.`);
	}
	if (kind === "annotate") {
		assertNonEmpty(action.layerId, `${path}.layerId`);
		assertNonEmpty(action.layerType, `${path}.layerType`);
	}
	if (kind === "rewrite")
		assertNonEmpty(action.targetViewId, `${path}.targetViewId`);
	if (kind === "set-features") cloneJson(action.features, `${path}.features`);
	if (kind === "graph") {
		assertNonEmpty(action.graphId, `${path}.graphId`);
		assertNonEmpty(action.relation, `${path}.relation`);
	}
	if (kind === "diagnostic" || kind === "constraint") {
		assertNonEmpty(action.code, `${path}.code`);
		assertNonEmpty(action.message, `${path}.message`);
	}
	if (kind === "feature") assertNonEmpty(action.name, `${path}.name`);
}

function assertStringArray(value: unknown, path: string): readonly string[] {
	if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
	return Object.freeze(
		value.map((entry, index) => {
			assertNonEmpty(entry, `${path}[${index}]`);
			return entry;
		}),
	);
}

export function compileRuleSet(
	ruleSet: RuleSet,
	options: RuleCompileOptions = {},
): CompiledRuleSet {
	assertNonEmpty(ruleSet.id, "ruleSet.id");
	assertNonEmpty(ruleSet.version, "ruleSet.version");
	assertOptionalNonEmpty(options.defaultPhase, "options.defaultPhase");
	assertOptionalFiniteNumber(
		options.defaultPriority,
		"options.defaultPriority",
	);
	if (!Array.isArray(ruleSet.rules)) {
		throw new TypeError("ruleSet.rules must be an array.");
	}
	const resources =
		ruleSet.resources === undefined
			? []
			: assertStringArray(ruleSet.resources, "ruleSet.resources");
	cloneJson(ruleSet.metadata ?? {}, "ruleSet.metadata");
	const seen = new Set<string>();
	const diagnostics: RuleDiagnostic[] = [];
	const rules = ruleSet.rules.map((rule, sourceIndex): CompiledRule => {
		assertNonEmpty(rule.id, `ruleSet.rules[${sourceIndex}].id`);
		assertOptionalNonEmpty(rule.phase, `ruleSet.rules[${sourceIndex}].phase`);
		assertOptionalFiniteNumber(
			rule.priority,
			`ruleSet.rules[${sourceIndex}].priority`,
		);
		if (seen.has(rule.id)) throw new TypeError(`duplicate rule id: ${rule.id}`);
		seen.add(rule.id);
		assertPattern(rule.when, `ruleSet.rules[${sourceIndex}].when`);
		if (!Array.isArray(rule.action) || rule.action.length === 0) {
			throw new TypeError(`rule ${rule.id} must define at least one action.`);
		}
		for (const [actionIndex, action] of rule.action.entries()) {
			assertAction(
				action,
				`ruleSet.rules[${sourceIndex}].action[${actionIndex}]`,
			);
		}
		cloneJson(rule.options ?? {}, `ruleSet.rules[${sourceIndex}].options`);
		return deepFreeze({
			id: rule.id,
			phase: rule.phase ?? options.defaultPhase ?? defaultPhase,
			priority: rule.priority ?? options.defaultPriority ?? defaultPriority,
			sourceIndex,
			when: cloneJson(rule.when, `ruleSet.rules[${sourceIndex}].when`),
			action: cloneJson(rule.action, `ruleSet.rules[${sourceIndex}].action`),
			options: cloneJson(
				rule.options ?? {},
				`ruleSet.rules[${sourceIndex}].options`,
			),
		});
	});
	return deepFreeze({
		id: ruleSet.id,
		version: ruleSet.version,
		rules: rules.sort(
			(left, right) =>
				stableCompare(left.phase, right.phase) ||
				right.priority - left.priority ||
				left.sourceIndex - right.sourceIndex ||
				stableCompare(left.id, right.id),
		),
		resources: Object.freeze([...resources].sort(stableCompare)),
		metadata: cloneJson(ruleSet.metadata ?? {}, "ruleSet.metadata"),
		diagnostics,
		conflictPolicy: options.conflictPolicy ?? "keep-all",
	});
}

function compareRuleMatch(left: RuleMatch, right: RuleMatch): number {
	const leftSpan = left.spans[0]?.span;
	const rightSpan = right.spans[0]?.span;
	return (
		stableCompare(left.phase, right.phase) ||
		right.priority - left.priority ||
		(leftSpan?.start ?? 0) - (rightSpan?.start ?? 0) ||
		(rightSpan?.end ?? 0) -
			(rightSpan?.start ?? 0) -
			((leftSpan?.end ?? 0) - (leftSpan?.start ?? 0)) ||
		stableCompare(left.ruleId, right.ruleId) ||
		stableCompare(left.id, right.id)
	);
}

function matchesOverlap(left: RuleMatch, right: RuleMatch): boolean {
	return left.spans.some((leftSpan) =>
		right.spans.some(
			(rightSpan) =>
				leftSpan.viewId === rightSpan.viewId &&
				leftSpan.span.unit === rightSpan.span.unit &&
				leftSpan.span.start < rightSpan.span.end &&
				rightSpan.span.start < leftSpan.span.end,
		),
	);
}

function matchLength(match: RuleMatch): number {
	return match.spans.reduce(
		(total, span) => total + Math.max(0, span.span.end - span.span.start),
		0,
	);
}

function resolveMatchConflicts(
	matches: readonly RuleMatch[],
	policy: RuleConflictPolicy,
): readonly RuleMatch[] {
	if (policy === "keep-all") return matches;
	if (policy === "first") return matches.slice(0, 1);
	const ordered =
		policy === "longest"
			? [...matches].sort(
					(left, right) =>
						matchLength(right) - matchLength(left) ||
						compareRuleMatch(left, right),
				)
			: [...matches];
	const selected: RuleMatch[] = [];
	for (const match of ordered) {
		if (selected.some((existing) => matchesOverlap(existing, match))) continue;
		selected.push(match);
	}
	return selected.sort(compareRuleMatch);
}

export function matchRules(
	doc: TextDocument,
	rules: CompiledRuleSet,
	options: MatchOptions = {},
): RuleMatch[] {
	const phases =
		options.phases === undefined ? undefined : new Set(options.phases);
	const matches: RuleMatch[] = [];
	for (const rule of rules.rules) {
		if (phases !== undefined && !phases.has(rule.phase)) continue;
		for (const [index, result] of evaluatePattern(
			doc,
			rule.when,
			options,
		).entries()) {
			matches.push({
				id: stableId([rules.id, rule.phase, rule.id, index]),
				ruleId: rule.id,
				phase: rule.phase,
				priority: rule.priority,
				rank: 0,
				captures: orderedRecord(result.captures),
				spans: Object.freeze([...result.spans]),
				annotationIds: Object.freeze(
					[...new Set(result.annotationIds)].sort(stableCompare),
				),
				graphIds: Object.freeze(
					[...new Set(result.graphIds)].sort(stableCompare),
				),
				edgeIds: Object.freeze(
					[...new Set(result.edgeIds)].sort(stableCompare),
				),
				diagnostics: Object.freeze([]),
			});
		}
	}
	const resolved = resolveMatchConflicts(
		matches.sort(compareRuleMatch),
		options.conflictPolicy ?? rules.conflictPolicy,
	);
	return resolved
		.slice(0, options.maxMatches ?? matches.length)
		.map((match, rank) => Object.freeze({ ...match, rank }));
}

function selectedPhases(
	rules: CompiledRuleSet,
	requested: readonly string[] | undefined,
): readonly string[] {
	const allowed = requested === undefined ? undefined : new Set(requested);
	return Object.freeze(
		[...new Set(rules.rules.map((rule) => rule.phase))].filter((phase) =>
			allowed === undefined ? true : allowed.has(phase),
		),
	);
}

function ensureLayer(
	doc: TextDocument,
	layerId: string,
	layerType: string,
	viewId?: string,
	replace = false,
): TextDocument {
	if (doc.layers[layerId] === undefined) {
		return addLayer(doc, {
			id: layerId,
			type: layerType,
			...(viewId === undefined ? {} : { viewId }),
			annotations: {},
		});
	}
	if (!replace) return doc;
	return {
		...doc,
		layers: orderedRecord({
			...doc.layers,
			[layerId]: {
				id: layerId,
				type: layerType,
				...(viewId === undefined ? {} : { viewId }),
				annotations: {},
			},
		}),
	};
}

function annotationById(
	doc: TextDocument,
	annotationId: string,
): Annotation | undefined {
	for (const layer of Object.values(doc.layers)) {
		const annotation = layer.annotations[annotationId];
		if (annotation !== undefined) return annotation;
	}
	return undefined;
}

function captureAnnotationId(
	match: RuleMatch,
	captureName: string | undefined,
): string | undefined {
	if (captureName === undefined) return undefined;
	return match.captures[captureName]?.annotationIds?.[0];
}

function addOrReplaceViewWithSpanMap(
	doc: TextDocument,
	view: TextView,
	spanMap: SpanMap,
): TextDocument {
	return {
		...doc,
		views: orderedRecord({ ...doc.views, [view.id]: view }),
		spanMaps: orderedRecord({ ...doc.spanMaps, [spanMap.id]: spanMap }),
	};
}

interface RewriteResult {
	readonly text: string;
	readonly entries: readonly SpanMapEntry[];
}

function rewriteRelation(sourceLength: number, targetLength: number) {
	if (sourceLength === 0) return "inserted" as const;
	if (targetLength === 0) return "deleted" as const;
	if (sourceLength < targetLength) return "expanded" as const;
	if (sourceLength > targetLength) return "contracted" as const;
	return "normalized" as const;
}

function rewriteEntry(
	sourceStart: number,
	sourceEnd: number,
	targetStart: number,
	targetEnd: number,
	relation: SpanMapEntry["relation"],
): SpanMapEntry {
	return Object.freeze({
		source: Object.freeze({
			start: sourceStart,
			end: sourceEnd,
			unit: "utf16-code-unit" as const,
		}),
		target: Object.freeze({
			start: targetStart,
			end: targetEnd,
			unit: "utf16-code-unit" as const,
		}),
		relation,
	});
}

function spanRewrite(
	source: string,
	start: number,
	end: number,
	replacement: string,
): RewriteResult {
	const entries: SpanMapEntry[] = [];
	if (start > 0) entries.push(rewriteEntry(0, start, 0, start, "identity"));
	entries.push(
		rewriteEntry(
			start,
			end,
			start,
			start + replacement.length,
			rewriteRelation(end - start, replacement.length),
		),
	);
	if (end < source.length) {
		entries.push(
			rewriteEntry(
				end,
				source.length,
				start + replacement.length,
				start + replacement.length + source.length - end,
				"identity",
			),
		);
	}
	return {
		text: `${source.slice(0, start)}${replacement}${source.slice(end)}`,
		entries: Object.freeze(entries),
	};
}

function literalRewrites(
	source: string,
	replacements: Readonly<Record<string, string>>,
): RewriteResult | undefined {
	const rules = Object.entries(replacements)
		.filter(([input]) => input.length > 0)
		.sort(
			([left], [right]) =>
				right.length - left.length || stableCompare(left, right),
		);
	if (rules.length === 0) return undefined;
	const text: string[] = [];
	const entries: SpanMapEntry[] = [];
	let sourceCursor = 0;
	let equalStart = 0;
	let targetCursor = 0;
	let changed = false;
	while (sourceCursor < source.length) {
		const rule = rules.find(([input]) =>
			source.startsWith(input, sourceCursor),
		);
		if (rule === undefined) {
			sourceCursor += 1;
			continue;
		}
		const [input, output] = rule;
		if (equalStart < sourceCursor) {
			const equalText = source.slice(equalStart, sourceCursor);
			text.push(equalText);
			entries.push(
				rewriteEntry(
					equalStart,
					sourceCursor,
					targetCursor,
					targetCursor + equalText.length,
					"identity",
				),
			);
			targetCursor += equalText.length;
		}
		text.push(output);
		entries.push(
			rewriteEntry(
				sourceCursor,
				sourceCursor + input.length,
				targetCursor,
				targetCursor + output.length,
				rewriteRelation(input.length, output.length),
			),
		);
		targetCursor += output.length;
		sourceCursor += input.length;
		equalStart = sourceCursor;
		changed = changed || input !== output;
	}
	if (equalStart < source.length) {
		const equalText = source.slice(equalStart);
		text.push(equalText);
		entries.push(
			rewriteEntry(
				equalStart,
				source.length,
				targetCursor,
				targetCursor + equalText.length,
				"identity",
			),
		);
	}
	return changed
		? { text: text.join(""), entries: Object.freeze(entries) }
		: undefined;
}

function rewrittenText(
	source: string,
	sourceViewId: string,
	match: RuleMatch,
	action: RewriteAction,
): RewriteResult {
	if (action.replacement !== undefined) {
		const span = match.spans[0];
		if (span?.viewId === sourceViewId && span.span.unit === "utf16-code-unit") {
			return spanRewrite(
				source,
				span.span.start,
				span.span.end,
				action.replacement,
			);
		}
		return spanRewrite(source, 0, source.length, action.replacement);
	}
	const rewritten = literalRewrites(source, action.replacements ?? {});
	if (rewritten !== undefined) return rewritten;
	const span = match.spans[0];
	if (span?.viewId === sourceViewId && span.span.unit === "utf16-code-unit") {
		return spanRewrite(source, span.span.start, span.span.end, "");
	}
	return {
		text: source,
		entries: Object.freeze([
			rewriteEntry(0, source.length, 0, source.length, "identity"),
		]),
	};
}

function applyRewrite(
	doc: TextDocument,
	match: RuleMatch,
	action: RewriteAction,
	options: ApplyRuleOptions | RewriteViewOptions,
): TextDocument {
	const sourceView = viewFor(doc, action.sourceViewId ?? options.sourceViewId);
	const rewrite = rewrittenText(sourceView.text, sourceView.id, match, action);
	const targetText = rewrite.text;
	const targetViewId = options.targetViewId ?? action.targetViewId;
	const spanMapId =
		options.spanMapId ?? action.spanMapId ?? `${targetViewId}:span-map`;
	const spanMap: SpanMap = {
		id: spanMapId,
		sourceViewId: sourceView.id,
		targetViewId,
		entries: rewrite.entries,
	};
	return addOrReplaceViewWithSpanMap(
		doc,
		{
			id: targetViewId,
			kind: options.viewKind ?? action.viewKind ?? "normalized",
			text: targetText,
			sourceViewId: sourceView.id,
			spanMapId,
			transform: {
				kind: "rule-rewrite",
				producer: packageName,
				version: packageVersion,
				sourceViewId: sourceView.id,
			},
		},
		spanMap,
	);
}

function tokenize(view: TextView, pattern = "\\S+"): readonly Annotation[] {
	const regex = new RegExp(pattern, "gu");
	return [...view.text.matchAll(regex)].map((match, index) => {
		const text = match[0];
		const start = match.index;
		const id = stableId(["token", view.id, index, start, start + text.length]);
		return {
			id,
			layer: `${view.id}:tokens`,
			type: "token.word",
			spans: [
				{
					viewId: view.id,
					span: { start, end: start + text.length, unit: "utf16-code-unit" },
				},
			],
			value: { index, text },
			evidence: evidence("tokenizer", [view.id]),
		};
	});
}

function applyTokenize(
	doc: TextDocument,
	action: SplitTokensAction | RetokenizeAction,
): TextDocument {
	const view = viewFor(doc, action.viewId);
	const layerId = action.layerId ?? `${view.id}:tokens`;
	const annotations = orderedRecord(
		Object.fromEntries(
			tokenize(view, action.pattern).map((annotation) => [
				annotation.id,
				{ ...annotation, layer: layerId },
			]),
		),
	);
	const layer: AnnotationLayer = {
		id: layerId,
		type: "token.word",
		viewId: view.id,
		annotations,
	};
	return {
		...doc,
		layers: orderedRecord({ ...doc.layers, [layerId]: layer }),
	};
}

function applyGraphAction(
	doc: TextDocument,
	match: RuleMatch,
	action: GraphAction,
): TextDocument {
	const sourceAnnotationId =
		action.sourceAnnotationId ??
		captureAnnotationId(match, action.sourceCapture);
	const targetAnnotationId =
		action.targetAnnotationId ??
		captureAnnotationId(match, action.targetCapture);
	if (sourceAnnotationId === undefined || targetAnnotationId === undefined)
		return doc;
	const source = annotationById(doc, sourceAnnotationId);
	const target = annotationById(doc, targetAnnotationId);
	if (source === undefined || target === undefined) return doc;
	const sourceNode: AnnotationGraphNode = {
		id: stableId([action.graphId, "node", sourceAnnotationId]),
		annotationId: sourceAnnotationId,
		layerId: source.layer,
	};
	const targetNode: AnnotationGraphNode = {
		id: stableId([action.graphId, "node", targetAnnotationId]),
		annotationId: targetAnnotationId,
		layerId: target.layer,
	};
	const edge: AnnotationGraphEdge = {
		id: stableId([
			action.graphId,
			action.relation,
			sourceAnnotationId,
			targetAnnotationId,
		]),
		source: sourceNode.id,
		target: targetNode.id,
		relation: action.relation,
		...(action.annotationId === undefined
			? {}
			: { annotationId: action.annotationId }),
	};
	const existing = doc.graphs[action.graphId];
	const graph: AnnotationGraph = {
		id: action.graphId,
		kind: existing?.kind ?? action.graphKind ?? "link",
		nodes: orderedRecord({
			...(existing?.nodes ?? {}),
			[sourceNode.id]: sourceNode,
			[targetNode.id]: targetNode,
		}),
		edges: orderedRecord({ ...(existing?.edges ?? {}), [edge.id]: edge }),
		...(existing?.metadata === undefined
			? {}
			: { metadata: existing.metadata }),
	};
	if (existing === undefined) return addGraph(doc, graph);
	return {
		...doc,
		graphs: orderedRecord({ ...doc.graphs, [graph.id]: graph }),
	};
}

function applyAction(
	doc: TextDocument,
	rule: CompiledRule,
	match: RuleMatch,
	action: RuleAction,
	actionIndex: number,
	options: ApplyRuleOptions,
): TextDocument {
	if (action.kind === "annotate") {
		const spans = action.spans ?? match.spans;
		const viewId = action.viewId ?? spans[0]?.viewId;
		const withLayer = ensureLayer(
			doc,
			action.layerId,
			action.layerType,
			viewId,
			options.replaceLayers === true &&
				doc.layers[action.layerId] === undefined,
		);
		const annotation: Annotation<Readonly<Record<string, unknown>>> = {
			id:
				action.annotationId ??
				stableId([rule.id, match.rank, actionIndex, action.layerId]),
			layer: action.layerId,
			type: action.annotationType ?? action.layerType,
			spans,
			value: cloneJson(
				{
					...(action.value ?? {}),
					ruleId: rule.id,
					matchId: match.id,
				},
				"annotation.value",
			),
			...(action.features === undefined
				? {}
				: { features: cloneJson(action.features, "annotation.features") }),
			evidence: evidence(
				rule.id,
				spans.map((span) => span.viewId),
				options,
			),
		};
		return addAnnotation(withLayer, annotation);
	}
	if (action.kind === "set-features") {
		const annotationId =
			action.annotationId ?? captureAnnotationId(match, action.capture);
		if (annotationId === undefined) return doc;
		const current = annotationById(doc, annotationId);
		if (current === undefined) return doc;
		return updateAnnotation(doc, {
			...current,
			features: orderedRecord({
				...(current.features ?? {}),
				...cloneJson(action.features, "features"),
			}),
		});
	}
	if (action.kind === "rewrite")
		return applyRewrite(doc, match, action, options);
	if (action.kind === "split-tokens" || action.kind === "retokenize") {
		return applyTokenize(doc, action);
	}
	if (action.kind === "merge-tokens") {
		const ids = action.tokenIds ?? match.annotationIds;
		const tokens = ids
			.map((id) => annotationById(doc, id))
			.filter((entry): entry is Annotation => entry !== undefined);
		if (tokens.length === 0) return doc;
		const spans = tokens.flatMap((token) => token.spans);
		const text = tokens.map((token) => annotationText(doc, token)).join("");
		const withLayer = ensureLayer(
			doc,
			action.layerId,
			"token.word",
			spans[0]?.viewId,
		);
		return addAnnotation(withLayer, {
			id: action.annotationId ?? stableId([rule.id, "merged", match.rank]),
			layer: action.layerId,
			type: "token.word",
			spans,
			value: { index: 0, text },
			evidence: evidence(
				rule.id,
				spans.map((span) => span.viewId),
				options,
			),
		});
	}
	if (action.kind === "graph") return applyGraphAction(doc, match, action);
	if (action.kind === "diagnostic" || action.kind === "constraint") {
		const layerId = "rule.diagnostics";
		const withLayer = ensureLayer(doc, layerId, "quality.diagnostic");
		return addAnnotation(withLayer, {
			id: stableId([rule.id, action.kind, action.code, match.rank]),
			layer: layerId,
			type: "quality.diagnostic",
			spans: match.spans,
			value: {
				code: action.code,
				severity: action.severity ?? "warning",
				message: action.message,
				ruleId: rule.id,
			},
			evidence: evidence(
				rule.id,
				match.spans.map((span) => span.viewId),
				options,
			),
		});
	}
	const layerId = action.layerId ?? "rule.features";
	const withLayer = ensureLayer(doc, layerId, "classification.feature");
	return addAnnotation(withLayer, {
		id: stableId([rule.id, "feature", action.name, match.rank]),
		layer: layerId,
		type: "classification.feature",
		spans: match.spans,
		value: { name: action.name, value: action.value },
		evidence: evidence(
			rule.id,
			match.spans.map((span) => span.viewId),
			options,
		),
	});
}

export function applyRules(
	doc: TextDocument,
	rules: CompiledRuleSet,
	options: ApplyRuleOptions = {},
): TextDocument {
	let current = doc;
	for (const phase of selectedPhases(rules, options.phases)) {
		for (const match of matchRules(current, rules, {
			...options,
			phases: [phase],
		})) {
			const rule = rules.rules.find((entry) => entry.id === match.ruleId);
			if (rule === undefined) continue;
			for (const [actionIndex, action] of rule.action.entries()) {
				current = applyAction(
					current,
					rule,
					match,
					action,
					actionIndex,
					options,
				);
			}
		}
	}
	if (options.validate === false) return current;
	const validation = validateTextDocument(current);
	if (!validation.ok) {
		throw new TypeError(
			`textrules produced invalid document: ${validation.diagnostics.join(",")}`,
		);
	}
	return current;
}

export function rewriteView(
	doc: TextDocument,
	rules: CompiledRuleSet,
	options: RewriteViewOptions = {},
): TextDocument {
	let current = doc;
	for (const phase of selectedPhases(rules, options.phases)) {
		for (const match of matchRules(current, rules, {
			...options,
			phases: [phase],
		})) {
			const rule = rules.rules.find((entry) => entry.id === match.ruleId);
			if (rule === undefined) continue;
			for (const action of rule.action) {
				if (action.kind === "rewrite") {
					current = applyRewrite(current, match, action, options);
				}
			}
		}
	}
	if (options.validate === false) return current;
	const validation = validateTextDocument(current);
	if (!validation.ok) {
		throw new TypeError(
			`textrules rewrite produced invalid document: ${validation.diagnostics.join(",")}`,
		);
	}
	return current;
}

export function createRuleProcessor(
	rules: CompiledRuleSet,
	options: RuleProcessorOptions = {},
): TextProcessor {
	const kind = options.kind ?? "generic";
	return Object.freeze({
		id: options.id ?? `${rules.id}:processor`,
		version: options.version ?? rules.version,
		packageName,
		kind,
		metadata: orderedRecord(options.metadata ?? {}),
		requires: Object.freeze(
			[...(options.requiredLayers ?? [])].sort(stableCompare),
		),
		produces: Object.freeze(
			[...(options.producedLayers ?? [])].sort(stableCompare),
		),
		process(document: TextDocument): TextDocument {
			return applyRules(document, rules, options);
		},
	});
}

export interface GrammarDefinition {
	readonly id: string;
	readonly kind:
		| "local"
		| "annotation-regex"
		| "token-regex"
		| "dependency"
		| "tree"
		| "phrase"
		| "feature-constraint"
		| "agreement"
		| "transfer";
	readonly rules?: readonly Rule[];
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ConstraintResult {
	readonly ok: boolean;
	readonly diagnostics: readonly RuleDiagnostic[];
}

const grammarKinds = [
	"local",
	"annotation-regex",
	"token-regex",
	"dependency",
	"tree",
	"phrase",
	"feature-constraint",
	"agreement",
	"transfer",
] as const;

export function validateGrammar(grammar: GrammarDefinition): GrammarDefinition {
	assertNonEmpty(grammar.id, "grammar.id");
	assertNonEmpty(grammar.kind, "grammar.kind");
	if (!grammarKinds.includes(grammar.kind)) {
		throw new TypeError("grammar.kind is not a final grammar kind.");
	}
	cloneJson(grammar.metadata ?? {}, "grammar.metadata");
	if (grammar.rules !== undefined) {
		compileRuleSet({
			id: `${grammar.id}:rules`,
			version: packageVersion,
			rules: grammar.rules,
		});
	}
	return deepFreeze({
		id: grammar.id,
		kind: grammar.kind,
		...(grammar.rules === undefined ? {} : { rules: [...grammar.rules] }),
		metadata: grammar.metadata ?? {},
	});
}

export function checkFeatureConstraint(
	annotation: Annotation,
	required: Readonly<Record<string, unknown>>,
): ConstraintResult {
	const ok = featureMatches(annotation.features, required);
	return {
		ok,
		diagnostics: ok
			? []
			: [
					{
						code: "textrules.constraint.feature",
						severity: "warning",
						message: `annotation ${annotation.id} does not satisfy required features`,
					},
				],
	};
}

export function checkAgreement(
	left: Annotation,
	right: Annotation,
	features: readonly string[],
): ConstraintResult {
	const missing = features.filter(
		(feature) => left.features?.[feature] !== right.features?.[feature],
	);
	return {
		ok: missing.length === 0,
		diagnostics: missing.map((feature) => ({
			code: "textrules.constraint.agreement",
			severity: "warning" as const,
			message: `feature does not agree: ${feature}`,
			context: { left: left.id, right: right.id, feature },
		})),
	};
}

function processorFromRules(
	kind: RuleProcessorKind,
	rules: RuleSet | CompiledRuleSet,
	options: RuleProcessorOptions = {},
): TextProcessor {
	const compiled = "diagnostics" in rules ? rules : compileRuleSet(rules);
	return createRuleProcessor(compiled, { ...options, kind });
}

export interface RuleProcessorFactory {
	readonly create: (
		rules: RuleSet | CompiledRuleSet,
		options?: RuleProcessorOptions,
	) => TextProcessor;
}

function processorFactory(kind: RuleProcessorKind): RuleProcessorFactory {
	return Object.freeze({
		create(
			rules: RuleSet | CompiledRuleSet,
			options: RuleProcessorOptions = {},
		): TextProcessor {
			return processorFromRules(kind, rules, options);
		},
	});
}

export const RuleTokenizer = processorFactory("tokenizer");
export const RuleSentenceSplitter = processorFactory("sentence-splitter");
export const RuleLemmatizer = processorFactory("lemmatizer");
export const RuleStemmer = processorFactory("stemmer");
export const RuleChunker = processorFactory("chunker");
export const RuleEntityRecognizer = processorFactory("entity-recognizer");
export const RuleRelationExtractor = processorFactory("relation-extractor");
export const RuleEventExtractor = processorFactory("event-extractor");
export const RuleTimeExtractor = processorFactory("time-extractor");
export const RuleQuantityExtractor = processorFactory("quantity-extractor");
export const RuleCitationExtractor = processorFactory("citation-extractor");
export const RuleCoreferenceResolver = processorFactory("coreference-resolver");
export const RuleQuoteAttributor = processorFactory("quote-attributor");
export const RuleStyleChecker = processorFactory("style-checker");
export const RuleTransferProcessor = processorFactory("transfer-processor");

export function extractorRuleSet(
	id: string,
	pattern: Pattern,
	layerType: string,
): RuleSet {
	return {
		id,
		version: packageVersion,
		rules: [
			{
				id: `${id}:extract`,
				when: pattern,
				action: [
					{
						kind: "annotate",
						layerId: id,
						layerType,
						annotationType: layerType,
					},
				],
			},
		],
	};
}
