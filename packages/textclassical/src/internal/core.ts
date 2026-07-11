import type {
	Annotation,
	AnnotationLayer,
	Evidence,
	Score,
	SpanRef,
	TextDocument,
} from "@ismail-elkorchi/textdoc";
import { addLayer } from "@ismail-elkorchi/textdoc/layer";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";

export const packageName = "@ismail-elkorchi/textclassical" as const;
export const packageVersion = "0.1.0" as const;
export type PackageName = typeof packageName;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

export type DiagnosticSeverity = "info" | "notice" | "warning" | "error";

export interface TextClassicalDiagnostic {
	readonly code: string;
	readonly severity: DiagnosticSeverity;
	readonly message: string;
	readonly path?: string;
	readonly context?: JsonValue;
}

export interface ClassicalModelMetadata {
	readonly id: string;
	readonly packageName: PackageName;
	readonly packageVersion: typeof packageVersion;
	readonly kind: string;
	readonly featureSpaceId?: string;
	readonly seed?: number;
	readonly optionsHash?: string;
	readonly resources?: readonly string[];
	readonly citations?: readonly string[];
	readonly diagnostics?: readonly TextClassicalDiagnostic[];
}

export interface FeatureContext {
	readonly viewId: string;
	readonly viewText: string;
	readonly document: TextDocument;
	readonly options: FeatureOptions;
	readonly spec: FeatureSpec;
	readonly index: number;
}

export type FeatureMap = Readonly<Record<string, number>>;

export interface FeatureRecord {
	readonly id: string;
	readonly features: FeatureMap;
	readonly namespace?: string;
	readonly documentId?: string;
	readonly spanRef?: SpanRef;
	readonly metadata?: JsonValue;
}

export type FeatureExtractorOutput =
	| FeatureMap
	| FeatureRecord
	| readonly (FeatureMap | FeatureRecord)[];

export type FeatureExtractor = (
	document: TextDocument,
	context: FeatureContext,
) => FeatureExtractorOutput;

export interface FeatureSpec {
	readonly id: string;
	readonly extract: FeatureExtractor;
	readonly namespace?: string;
}

export interface FeatureOptions {
	readonly viewId?: string;
	readonly tokenLayerId?: string;
	readonly annotationLayerIds?: readonly string[];
	readonly namespace?: string;
	readonly vectorizer?: Vectorizer;
	readonly includeEmptyVectors?: boolean;
	readonly metadata?: JsonValue;
}

export interface FeatureVector {
	readonly ids: readonly number[];
	readonly values: readonly number[];
	readonly featureSpaceId: string;
	readonly recordId?: string;
}

export interface FeatureSpace {
	readonly id: string;
	readonly ids: Readonly<Record<string, number>>;
	readonly keys: readonly string[];
	readonly size: number;
	readonly hashing?: {
		readonly buckets: number;
	};
}

export interface Vectorizer {
	readonly id: string;
	readonly featureSpaceId: string;
	readonly featureSpace: FeatureSpace;
	readonly mode: "dictionary" | "hashing";
	readonly lowercase?: boolean;
	readonly normalize?: "none" | "l1" | "l2";
	readonly metadata?: JsonValue;
}

export interface VectorizerOptions {
	readonly id?: string;
	readonly mode?: "dictionary" | "hashing";
	readonly hashBuckets?: number;
	readonly minDocumentFrequency?: number;
	readonly maxFeatures?: number;
	readonly lowercase?: boolean;
	readonly normalize?: "none" | "l1" | "l2";
	readonly metadata?: JsonValue;
}

export interface SparseMatrix {
	readonly rowPointers: readonly number[];
	readonly columnIds: readonly number[];
	readonly values: readonly number[];
	readonly rowCount: number;
	readonly columnCount: number;
	readonly featureSpaceId: string;
	readonly rowIds: readonly string[];
	readonly metadata?: JsonValue;
}

export interface LabeledFeatureRecord extends FeatureRecord {
	readonly label: string;
	readonly weight?: number;
}

export type ClassicalClassifierKind =
	| "naive-bayes"
	| "maxent"
	| "perceptron"
	| "averaged-perceptron"
	| "linear-svm"
	| "logistic-regression";

export interface TrainClassifierOptions {
	readonly kind: ClassicalClassifierKind;
	readonly labels?: readonly string[];
	readonly vectorizer?: Vectorizer;
	readonly vectorizerOptions?: VectorizerOptions;
	readonly iterations?: number;
	readonly learningRate?: number;
	readonly regularization?: number;
	readonly smoothing?: number;
	readonly seed?: number;
	readonly metadata?: JsonValue;
}

export interface LabelScore {
	readonly label: string;
	readonly score: Score;
	readonly probability?: number;
}

export interface ClassificationResult {
	readonly label: string;
	readonly rankings: readonly LabelScore[];
	readonly scores: readonly Score[];
	readonly diagnostics: readonly TextClassicalDiagnostic[];
}

export interface ClassicalClassifier {
	readonly id: string;
	readonly kind: ClassicalClassifierKind;
	readonly labels: readonly string[];
	readonly featureSpaceId: string;
	readonly vectorizer: Vectorizer;
	readonly metadata: ClassicalModelMetadata;
	readonly parameters:
		| {
				readonly family: "naive-bayes";
				readonly logPriors: readonly number[];
				readonly logLikelihoods: readonly (readonly number[])[];
		  }
		| {
				readonly family: "linear";
				readonly weights: readonly (readonly number[])[];
				readonly biases: readonly number[];
		  };
}

export interface ClassifyDocOptions extends FeatureOptions {
	readonly featureSpecs?: readonly FeatureSpec[];
	readonly layerId?: string;
	readonly annotationId?: string;
	readonly exactness?: Evidence["exactness"];
}

export type SequenceModelKind = "hmm" | "memm" | "crf" | "perceptron-sequence";

export interface SequenceSample {
	readonly id?: string;
	readonly tokens: readonly string[];
	readonly labels: readonly string[];
	readonly spans?: readonly SpanRef[];
	readonly weight?: number;
	readonly metadata?: JsonValue;
}

export interface SequenceInput {
	readonly tokens: readonly string[];
	readonly spans?: readonly SpanRef[];
	readonly metadata?: JsonValue;
}

export interface TrainSequenceOptions {
	readonly kind: SequenceModelKind;
	readonly labels?: readonly string[];
	readonly iterations?: number;
	readonly learningRate?: number;
	readonly smoothing?: number;
	readonly regularization?: number;
	readonly seed?: number;
	readonly metadata?: JsonValue;
}

export interface TagOptions {
	readonly beamSize?: number;
}

export interface SequenceTagResult {
	readonly labels: readonly string[];
	readonly score: Score;
	readonly alternatives: readonly (readonly LabelScore[])[];
	readonly diagnostics: readonly TextClassicalDiagnostic[];
}

export interface SequenceTagger {
	readonly id: string;
	readonly kind: SequenceModelKind;
	readonly labels: readonly string[];
	readonly featureSpaceId?: string;
	readonly metadata: ClassicalModelMetadata;
	readonly parameters:
		| {
				readonly family: "hmm";
				readonly vocabulary: readonly string[];
				readonly logInitial: readonly number[];
				readonly logTransitions: readonly (readonly number[])[];
				readonly logEmissions: Readonly<Record<string, readonly number[]>>;
				readonly unknownEmission: readonly number[];
		  }
		| {
				readonly family: "linear-chain";
				readonly featureSpace: FeatureSpace;
				readonly weights: readonly (readonly number[])[];
				readonly transitions: readonly (readonly number[])[];
		  };
}

export interface AnnotateSequenceOptions {
	readonly viewId?: string;
	readonly layerId?: string;
	readonly annotationType?: string;
	readonly task?: "pos" | "chunk" | "ner" | "slot" | "custom";
	readonly exactness?: Evidence["exactness"];
}

export interface TokenSequence {
	readonly id?: string;
	readonly tokens: readonly string[];
	readonly metadata?: JsonValue;
}

export type SmoothingKind =
	| "mle"
	| "laplace"
	| "lidstone"
	| "witten-bell"
	| "good-turing"
	| "kneser-ney"
	| "absolute-discount"
	| "stupid-backoff";

export interface TrainNgramLmOptions {
	readonly order: number;
	readonly smoothing: SmoothingKind;
	readonly alpha?: number;
	readonly discount?: number;
	readonly backoffWeight?: number;
	readonly includeBoundaryTokens?: boolean;
	readonly metadata?: JsonValue;
}

export interface NgramLanguageModel {
	readonly id: string;
	readonly order: number;
	readonly smoothing: SmoothingKind;
	readonly vocabulary: readonly string[];
	readonly counts: Readonly<Record<string, number>>;
	readonly contextCounts: Readonly<Record<string, number>>;
	readonly totalTokens: number;
	readonly alpha: number;
	readonly discount: number;
	readonly backoffWeight: number;
	readonly includeBoundaryTokens: boolean;
	readonly metadata: ClassicalModelMetadata;
}

export interface DocumentTermVector {
	readonly id: string;
	readonly ids: readonly number[];
	readonly values: readonly number[];
	readonly featureSpaceId?: string;
	readonly metadata?: JsonValue;
}

export interface LdaOptions {
	readonly topicCount: number;
	readonly iterations?: number;
	readonly alpha?: number;
	readonly beta?: number;
	readonly seed?: number;
	readonly metadata?: JsonValue;
}

export interface TopicModel {
	readonly id: string;
	readonly topicCount: number;
	readonly vocabularySize: number;
	readonly topicTermProbabilities: readonly (readonly number[])[];
	readonly documentTopicProbabilities: Readonly<
		Record<string, readonly number[]>
	>;
	readonly metadata: ClassicalModelMetadata;
}

export interface TopicDistribution {
	readonly topics: readonly LabelScore[];
	readonly probabilities: readonly number[];
	readonly diagnostics: readonly TextClassicalDiagnostic[];
}

export interface ClusterOptions {
	readonly algorithm?: "kmeans" | "agglomerative";
	readonly k: number;
	readonly maxIterations?: number;
	readonly seed?: number;
	readonly metadata?: JsonValue;
}

export interface ClusterResult {
	readonly algorithm: "kmeans" | "agglomerative";
	readonly assignments: readonly number[];
	readonly clusters: readonly {
		readonly id: string;
		readonly rowIds: readonly string[];
		readonly centroid: readonly number[];
	}[];
	readonly diagnostics: readonly TextClassicalDiagnostic[];
}

export interface LanguageIdentifier {
	readonly classifier: ClassicalClassifier;
}

export interface SentimentClassifier {
	readonly classifier: ClassicalClassifier;
	readonly positiveLexicon: readonly string[];
	readonly negativeLexicon: readonly string[];
}

export interface SummarySentence {
	readonly index: number;
	readonly text: string;
	readonly span: SpanRef;
	readonly score: Score;
}

export interface SummaryResult {
	readonly sentences: readonly SummarySentence[];
	readonly diagnostics: readonly TextClassicalDiagnostic[];
}

export interface SummaryOptions {
	readonly viewId?: string;
	readonly method?: "centroid" | "graph" | "frequency" | "lexical-cohesion";
	readonly sentenceCount?: number;
}

export interface ParserToken {
	readonly id: string;
	readonly text: string;
	readonly lemma?: string;
	readonly pos?: string;
}

export interface DependencyParseEdge {
	readonly head: string;
	readonly dependent: string;
	readonly relation: string;
	readonly score: Score;
}

export interface ParserTrainingEdge {
	readonly head: string;
	readonly dependent: string;
	readonly relation: string;
}

export interface ParserTrainingSample {
	readonly id?: string;
	readonly tokens: readonly ParserToken[];
	readonly edges: readonly ParserTrainingEdge[];
	readonly weight?: number;
	readonly metadata?: JsonValue;
}

export interface TrainParserOptions {
	readonly labels?: readonly string[];
	readonly iterations?: number;
	readonly learningRate?: number;
	readonly metadata?: JsonValue;
}

export type ParserAction =
	| "SHIFT"
	| `LEFT_ARC:${string}`
	| `RIGHT_ARC:${string}`;

export interface ClassicalParser {
	readonly id: string;
	readonly kind: "transition-perceptron";
	readonly labels: readonly string[];
	readonly actions: readonly ParserAction[];
	readonly weights: Readonly<
		Record<ParserAction, Readonly<Record<string, number>>>
	>;
	readonly metadata: ClassicalModelMetadata;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function compareText(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
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
			throw new TypeError(`${path} must be I-JSON safe: lone high surrogate.`);
		}
		if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
			throw new TypeError(`${path} must be I-JSON safe: lone low surrogate.`);
		}
		index += 1;
	}
}

export function assertJsonValue(
	value: unknown,
	path = "$",
): asserts value is JsonValue {
	if (value === null) return;
	const valueType = typeof value;
	if (valueType === "string") {
		assertJsonString(value as string, path);
		return;
	}
	if (valueType === "boolean") return;
	if (valueType === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError(`${path} must be I-JSON safe: number is not finite.`);
		}
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((entry, index) => {
			assertJsonValue(entry, `${path}[${index}]`);
		});
		return;
	}
	if (isPlainRecord(value)) {
		for (const [key, entry] of Object.entries(value).sort(([a], [b]) =>
			compareText(a, b),
		)) {
			assertJsonString(key, `${path}.key`);
			assertJsonValue(entry, `${path}.${key}`);
		}
		return;
	}
	throw new TypeError(`${path} must be I-JSON safe.`);
}

export function stableJsonClone<T extends JsonValue>(value: T): T {
	assertJsonValue(value);
	if (Array.isArray(value)) {
		return value.map((entry) => stableJsonClone(entry)) as unknown as T;
	}
	if (isPlainRecord(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => compareText(left, right))
				.map(([key, entry]) => [key, stableJsonClone(entry as JsonValue)]),
		) as T;
	}
	return value;
}

export function stableStringify(value: unknown): string {
	assertJsonValue(value);
	return JSON.stringify(stableJsonClone(value as JsonValue));
}

function finite(value: number, label: string): number {
	if (!Number.isFinite(value)) {
		throw new TypeError(`${label} must be finite.`);
	}
	return value;
}

function stableHashValue(value: JsonValue): string {
	return stableHash64(stableStringify(value));
}

function hashToIndex(key: string, buckets: number): number {
	return Number.parseInt(stableHash64(key).slice(0, 12), 16) % buckets;
}

function sortedUnique(values: Iterable<string>): readonly string[] {
	return Object.freeze([...new Set(values)].sort(compareText));
}

function orderedRecord<T>(
	entries: Iterable<readonly [string, T]>,
): Readonly<Record<string, T>> {
	return Object.freeze(
		Object.fromEntries(
			[...entries].sort(([left], [right]) => compareText(left, right)),
		),
	);
}

function metadataFor(
	kind: string,
	options: JsonValue,
	extra: Partial<ClassicalModelMetadata> = {},
): ClassicalModelMetadata {
	const optionsHash = stableHashValue(options);
	const metadata: ClassicalModelMetadata = {
		id: `${kind}:${optionsHash}`,
		packageName,
		packageVersion,
		kind,
		optionsHash,
		...extra,
	};
	assertJsonValue(metadata);
	return metadata;
}

function modelMetadataExtra(
	featureSpaceId: string | undefined,
	seed: number | undefined,
): Partial<ClassicalModelMetadata> {
	return {
		...(featureSpaceId !== undefined ? { featureSpaceId } : {}),
		...(seed !== undefined ? { seed } : {}),
	};
}

function resolveView(document: TextDocument, viewId?: string) {
	const resolvedId =
		viewId ??
		(document.views.raw !== undefined
			? "raw"
			: Object.keys(document.views).sort(compareText)[0]);
	if (resolvedId === undefined || document.views[resolvedId] === undefined) {
		throw new Error(`textclassical view is missing: ${viewId ?? "default"}`);
	}
	return document.views[resolvedId];
}

interface TokenSpan {
	readonly text: string;
	readonly start: number;
	readonly end: number;
}

function tokenizeWithSpans(text: string): readonly TokenSpan[] {
	const tokens: TokenSpan[] = [];
	const pattern = /[\p{L}\p{M}\p{N}_'-]+|[^\s]/gu;
	for (const match of text.matchAll(pattern)) {
		const token = match[0];
		const start = match.index ?? 0;
		tokens.push({ text: token, start, end: start + token.length });
	}
	return Object.freeze(tokens);
}

function tokenShape(token: string): string {
	let result = "";
	for (const char of token) {
		if (/\p{Lu}/u.test(char)) result += "A";
		else if (/\p{Ll}/u.test(char)) result += "a";
		else if (/\p{N}/u.test(char)) result += "0";
		else if (/\p{P}/u.test(char)) result += ".";
		else result += "x";
	}
	return result;
}

function normalizeFeatureKey(key: string, vectorizer?: Vectorizer): string {
	return vectorizer?.lowercase === true ? key.toLocaleLowerCase("und") : key;
}

function normalizeFeatureMap(
	features: Readonly<Record<string, number>>,
): FeatureMap {
	const entries = Object.entries(features)
		.filter(([, value]) => value !== 0)
		.map(([key, value]) => {
			assertJsonString(key, `feature key ${key}`);
			return [key, finite(value, `feature ${key}`)] as const;
		})
		.sort(([left], [right]) => compareText(left, right));
	return orderedRecord(entries);
}

function isFeatureRecord(
	value: FeatureMap | FeatureRecord,
): value is FeatureRecord {
	return (
		isPlainRecord(value) &&
		isPlainRecord(value.features) &&
		typeof value.id === "string"
	);
}

function featureRecordFromMap(
	id: string,
	features: FeatureMap,
	namespace: string | undefined,
	documentId: string,
): FeatureRecord {
	return {
		id,
		features: normalizeFeatureMap(features),
		...(namespace !== undefined ? { namespace } : {}),
		documentId,
	};
}

function materializeFeatureRecords(
	output: FeatureExtractorOutput,
	spec: FeatureSpec,
	document: TextDocument,
): readonly FeatureRecord[] {
	const outputs = Array.isArray(output) ? output : [output];
	return outputs.map((entry, index) => {
		if (isFeatureRecord(entry)) {
			assertJsonValue(entry.metadata ?? null);
			return {
				...entry,
				features: normalizeFeatureMap(entry.features),
				...(entry.namespace !== undefined
					? { namespace: entry.namespace }
					: spec.namespace !== undefined
						? { namespace: spec.namespace }
						: {}),
			};
		}
		return featureRecordFromMap(
			`${document.id}:${spec.id}:${index}`,
			entry,
			spec.namespace,
			document.id,
		);
	});
}

export function textFeatureSpec(id = "text"): FeatureSpec {
	return {
		id,
		namespace: "text",
		extract(document, context) {
			const tokens = tokenizeWithSpans(context.viewText);
			const features: Record<string, number> = {
				bias: 1,
				"char.length": context.viewText.length,
				"token.count": tokens.length,
			};
			for (const token of tokens) {
				const lower = token.text.toLocaleLowerCase("und");
				features[`token=${lower}`] = (features[`token=${lower}`] ?? 0) + 1;
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export function charNgramFeatureSpec(
	min = 3,
	max = min,
	id = "char-ngram",
): FeatureSpec {
	return {
		id,
		namespace: "char",
		extract(document, context) {
			const features: Record<string, number> = {};
			const chars = [...context.viewText];
			for (let size = min; size <= max; size += 1) {
				for (let index = 0; index + size <= chars.length; index += 1) {
					const gram = chars.slice(index, index + size).join("");
					features[`char${size}=${gram}`] =
						(features[`char${size}=${gram}`] ?? 0) + 1;
				}
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export function wordNgramFeatureSpec(
	min = 1,
	max = min,
	id = "word-ngram",
): FeatureSpec {
	return {
		id,
		namespace: "word",
		extract(document, context) {
			const tokens = tokenizeWithSpans(context.viewText).map((token) =>
				token.text.toLocaleLowerCase("und"),
			);
			const features: Record<string, number> = {};
			for (let size = min; size <= max; size += 1) {
				for (let index = 0; index + size <= tokens.length; index += 1) {
					const gram = tokens.slice(index, index + size).join(" ");
					features[`word${size}=${gram}`] =
						(features[`word${size}=${gram}`] ?? 0) + 1;
				}
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export function shapeFeatureSpec(id = "shape"): FeatureSpec {
	return {
		id,
		namespace: "shape",
		extract(document, context) {
			const features: Record<string, number> = {};
			for (const token of tokenizeWithSpans(context.viewText)) {
				const shape = tokenShape(token.text);
				features[`shape=${shape}`] = (features[`shape=${shape}`] ?? 0) + 1;
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export function affixFeatureSpec(length = 3, id = "affix"): FeatureSpec {
	return {
		id,
		namespace: "affix",
		extract(document, context) {
			const features: Record<string, number> = {};
			for (const token of tokenizeWithSpans(context.viewText)) {
				const lower = token.text.toLocaleLowerCase("und");
				if (lower.length >= length) {
					const prefix = lower.slice(0, length);
					const suffix = lower.slice(-length);
					features[`prefix=${prefix}`] =
						(features[`prefix=${prefix}`] ?? 0) + 1;
					features[`suffix=${suffix}`] =
						(features[`suffix=${suffix}`] ?? 0) + 1;
				}
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export function tokenWindowFeatureSpec(
	radius = 1,
	id = "token-window",
): FeatureSpec {
	return {
		id,
		namespace: "window",
		extract(document, context) {
			const tokens = tokenizeWithSpans(context.viewText).map((token) =>
				token.text.toLocaleLowerCase("und"),
			);
			return tokens.map((token, index) => {
				const features: Record<string, number> = { [`token=${token}`]: 1 };
				for (let offset = -radius; offset <= radius; offset += 1) {
					if (offset === 0) continue;
					const neighbor = tokens[index + offset];
					if (neighbor !== undefined) {
						features[`w${offset}=${neighbor}`] = 1;
					}
				}
				return featureRecordFromMap(
					`${document.id}:${context.spec.id}:${index}`,
					features,
					context.spec.namespace,
					document.id,
				);
			});
		},
	};
}

export function annotationFeatureSpec(
	layerIds?: readonly string[],
	id = "annotation",
): FeatureSpec {
	return {
		id,
		namespace: "annotation",
		extract(document, context) {
			const selectedLayerIds =
				layerIds ??
				context.options.annotationLayerIds ??
				Object.keys(document.layers);
			const features: Record<string, number> = {};
			for (const layerId of selectedLayerIds) {
				const layer = document.layers[layerId];
				if (layer === undefined) continue;
				features[`layer=${layer.type}`] =
					(features[`layer=${layer.type}`] ?? 0) + 1;
				for (const annotation of Object.values(layer.annotations)) {
					features[`annotation.type=${annotation.type}`] =
						(features[`annotation.type=${annotation.type}`] ?? 0) + 1;
				}
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export function lexiconFeatureSpec(
	entries: readonly string[],
	id = "lexicon",
): FeatureSpec {
	const lexicon = sortedUnique(
		entries.map((entry) => entry.toLocaleLowerCase("und")),
	);
	return {
		id,
		namespace: "lexical",
		extract(document, context) {
			const text = ` ${context.viewText.toLocaleLowerCase("und")} `;
			const features: Record<string, number> = {};
			for (const entry of lexicon) {
				if (text.includes(` ${entry} `)) {
					features[`lexicon=${entry}`] = 1;
				}
			}
			return featureRecordFromMap(
				`${document.id}:${context.spec.id}`,
				features,
				context.spec.namespace,
				document.id,
			);
		},
	};
}

export const gazetteerFeatureSpec = lexiconFeatureSpec;
export const posFeatureSpec = annotationFeatureSpec;
export const fstFeatureSpec = annotationFeatureSpec;

function collectFeatureRecords(
	document: TextDocument,
	specs: readonly FeatureSpec[],
	options: FeatureOptions = {},
): readonly FeatureRecord[] {
	const view = resolveView(document, options.viewId);
	const records = specs.flatMap((spec, index) => {
		const output = spec.extract(document, {
			viewId: view.id,
			viewText: view.text,
			document,
			options,
			spec,
			index,
		});
		return materializeFeatureRecords(output, spec, document);
	});
	if (records.length === 0 && options.includeEmptyVectors === true) {
		return [
			featureRecordFromMap(
				`${document.id}:empty`,
				{},
				options.namespace,
				document.id,
			),
		];
	}
	return Object.freeze(records);
}

export function extractFeatures(
	document: TextDocument,
	spec: readonly FeatureSpec[],
	options: FeatureOptions = {},
): FeatureVector[] {
	const records = collectFeatureRecords(document, spec, options);
	const vectorizer = options.vectorizer ?? fitVectorizer(records);
	return matrixRows(transformVectorizer(vectorizer, records));
}

export function fitVectorizer(
	samples: Iterable<FeatureRecord>,
	options: VectorizerOptions = {},
): Vectorizer {
	assertJsonValue(options.metadata ?? null);
	const records = [...samples];
	for (const record of records) {
		assertJsonValue(record.metadata ?? null);
	}
	const mode = options.mode ?? "dictionary";
	const normalize = options.normalize ?? "none";
	const lowercase = options.lowercase ?? false;
	if (mode === "hashing") {
		const buckets = options.hashBuckets ?? 4096;
		if (!Number.isInteger(buckets) || buckets <= 0) {
			throw new RangeError("hashBuckets must be a positive integer.");
		}
		const id =
			options.id ??
			`feature-space:${stableHashValue({ mode, buckets, lowercase, normalize })}`;
		const featureSpace: FeatureSpace = {
			id,
			ids: {},
			keys: [],
			size: buckets,
			hashing: { buckets },
		};
		return {
			id,
			featureSpaceId: id,
			featureSpace,
			mode,
			lowercase,
			normalize,
			...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
		};
	}

	const documentFrequency = new Map<string, number>();
	for (const record of records) {
		const seen = new Set<string>();
		for (const key of Object.keys(record.features)) {
			seen.add(lowercase ? key.toLocaleLowerCase("und") : key);
		}
		for (const key of seen) {
			documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
		}
	}
	const minimum = options.minDocumentFrequency ?? 1;
	const keys = [...documentFrequency.entries()]
		.filter(([, frequency]) => frequency >= minimum)
		.sort(
			([leftKey, leftFrequency], [rightKey, rightFrequency]) =>
				rightFrequency - leftFrequency || compareText(leftKey, rightKey),
		)
		.slice(0, options.maxFeatures ?? Number.POSITIVE_INFINITY)
		.map(([key]) => key)
		.sort(compareText);
	const ids = orderedRecord(keys.map((key, index) => [key, index] as const));
	const id =
		options.id ??
		`feature-space:${stableHashValue({ keys, lowercase, normalize })}`;
	const featureSpace: FeatureSpace = {
		id,
		ids,
		keys: Object.freeze(keys),
		size: keys.length,
	};
	return {
		id,
		featureSpaceId: id,
		featureSpace,
		mode,
		lowercase,
		normalize,
		...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
	};
}

function normalizeVectorValues(
	entries: readonly (readonly [number, number])[],
	normalize: Vectorizer["normalize"],
): readonly (readonly [number, number])[] {
	if (normalize === "none" || normalize === undefined) return entries;
	const denominator =
		normalize === "l1"
			? entries.reduce((total, [, value]) => total + Math.abs(value), 0)
			: Math.sqrt(
					entries.reduce((total, [, value]) => total + value * value, 0),
				);
	if (denominator === 0) return entries;
	return entries.map(([id, value]) => [id, value / denominator] as const);
}

function vectorFromRecord(
	vectorizer: Vectorizer,
	record: FeatureRecord,
): FeatureVector {
	const merged = new Map<number, number>();
	for (const [rawKey, rawValue] of Object.entries(record.features)) {
		const key = normalizeFeatureKey(rawKey, vectorizer);
		const id =
			vectorizer.mode === "hashing"
				? hashToIndex(key, vectorizer.featureSpace.size)
				: vectorizer.featureSpace.ids[key];
		if (id === undefined) continue;
		merged.set(id, (merged.get(id) ?? 0) + rawValue);
	}
	const entries = normalizeVectorValues(
		[...merged.entries()].sort(([left], [right]) => left - right),
		vectorizer.normalize,
	);
	return {
		ids: Object.freeze(entries.map(([id]) => id)),
		values: Object.freeze(
			entries.map(([, value]) => finite(value, "feature value")),
		),
		featureSpaceId: vectorizer.featureSpaceId,
		recordId: record.id,
	};
}

export function transformVectorizer(
	vectorizer: Vectorizer,
	samples: Iterable<FeatureRecord>,
): SparseMatrix {
	const vectors = [...samples].map((sample) =>
		vectorFromRecord(vectorizer, sample),
	);
	const rowPointers: number[] = [0];
	const columnIds: number[] = [];
	const values: number[] = [];
	const rowIds: string[] = [];
	for (const vector of vectors) {
		columnIds.push(...vector.ids);
		values.push(...vector.values);
		rowPointers.push(columnIds.length);
		rowIds.push(vector.recordId ?? `row-${rowIds.length}`);
	}
	return {
		rowPointers: Object.freeze(rowPointers),
		columnIds: Object.freeze(columnIds),
		values: Object.freeze(values),
		rowCount: vectors.length,
		columnCount: vectorizer.featureSpace.size,
		featureSpaceId: vectorizer.featureSpaceId,
		rowIds: Object.freeze(rowIds),
	};
}

function matrixRows(matrix: SparseMatrix): FeatureVector[] {
	const rows: FeatureVector[] = [];
	for (let row = 0; row < matrix.rowCount; row += 1) {
		const start = matrix.rowPointers[row] ?? 0;
		const end = matrix.rowPointers[row + 1] ?? start;
		rows.push({
			ids: Object.freeze(matrix.columnIds.slice(start, end)),
			values: Object.freeze(matrix.values.slice(start, end)),
			featureSpaceId: matrix.featureSpaceId,
			...(matrix.rowIds[row] !== undefined
				? { recordId: matrix.rowIds[row] }
				: {}),
		});
	}
	return rows;
}

function dot(weights: readonly number[], vector: FeatureVector): number {
	let score = 0;
	for (let index = 0; index < vector.ids.length; index += 1) {
		const id = vector.ids[index] ?? 0;
		score += (weights[id] ?? 0) * (vector.values[index] ?? 0);
	}
	return score;
}

function softmax(scores: readonly number[]): readonly number[] {
	const max = Math.max(...scores);
	const exps = scores.map((score) => Math.exp(score - max));
	const total = exps.reduce((sum, value) => sum + value, 0);
	return Object.freeze(exps.map((value) => value / total));
}

function labelIndexMap(
	labels: readonly string[],
): Readonly<Record<string, number>> {
	return orderedRecord(labels.map((label, index) => [label, index] as const));
}

function validateLabels(labels: readonly string[]): readonly string[] {
	if (labels.length === 0) throw new Error("at least one label is required.");
	for (const label of labels) {
		assertJsonString(label, "label");
		if (label.length === 0)
			throw new Error("labels must be non-empty strings.");
	}
	return Object.freeze([...labels]);
}

export function trainClassifier(
	samples: Iterable<LabeledFeatureRecord>,
	options: TrainClassifierOptions,
): ClassicalClassifier {
	assertJsonValue(options.metadata ?? null);
	const records = [...samples];
	if (records.length === 0)
		throw new Error("trainClassifier requires at least one sample.");
	const labels = validateLabels(
		options.labels ?? sortedUnique(records.map((record) => record.label)),
	);
	const labelIds = labelIndexMap(labels);
	for (const record of records) {
		if (labelIds[record.label] === undefined) {
			throw new Error(`sample label is not declared: ${record.label}`);
		}
		if (record.weight !== undefined) finite(record.weight, "sample weight");
	}
	const vectorizer =
		options.vectorizer ?? fitVectorizer(records, options.vectorizerOptions);
	const rows = matrixRows(transformVectorizer(vectorizer, records));
	const featureCount = Math.max(1, vectorizer.featureSpace.size);
	const classifier =
		options.kind === "naive-bayes"
			? trainNaiveBayes(
					records,
					rows,
					labels,
					featureCount,
					vectorizer,
					options,
				)
			: trainLinearClassifier(
					records,
					rows,
					labels,
					featureCount,
					vectorizer,
					options,
				);
	return classifier;
}

function trainNaiveBayes(
	records: readonly LabeledFeatureRecord[],
	rows: readonly FeatureVector[],
	labels: readonly string[],
	featureCount: number,
	vectorizer: Vectorizer,
	options: TrainClassifierOptions,
): ClassicalClassifier {
	const smoothing = options.smoothing ?? 1;
	if (smoothing <= 0 || !Number.isFinite(smoothing)) {
		throw new RangeError("smoothing must be finite and positive.");
	}
	const labelIds = labelIndexMap(labels);
	const classCounts = labels.map(() => 0);
	const featureSums = labels.map(() =>
		Array.from({ length: featureCount }, () => 0),
	);
	const totals = labels.map(() => 0);
	for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
		const labelId = labelIds[records[rowIndex]?.label ?? ""];
		if (labelId === undefined) continue;
		const weight = records[rowIndex]?.weight ?? 1;
		classCounts[labelId] = (classCounts[labelId] ?? 0) + weight;
		const row = rows[rowIndex];
		if (row === undefined) continue;
		const sums = featureSums[labelId];
		if (sums === undefined) continue;
		for (let index = 0; index < row.ids.length; index += 1) {
			const featureId = row.ids[index] ?? 0;
			const value = (row.values[index] ?? 0) * weight;
			sums[featureId] = (sums[featureId] ?? 0) + value;
			totals[labelId] = (totals[labelId] ?? 0) + value;
		}
	}
	const sampleTotal = classCounts.reduce((sum, value) => sum + value, 0);
	const logPriors = classCounts.map((count) =>
		Math.log((count + smoothing) / (sampleTotal + smoothing * labels.length)),
	);
	const logLikelihoods = featureSums.map((row, labelId) => {
		const denominator = (totals[labelId] ?? 0) + smoothing * featureCount;
		return Object.freeze(
			row.map((value) => Math.log((value + smoothing) / denominator)),
		);
	});
	const metadata = metadataFor(
		"naive-bayes",
		{
			kind: options.kind,
			smoothing,
			labels,
			featureSpaceId: vectorizer.featureSpaceId,
		},
		modelMetadataExtra(vectorizer.featureSpaceId, options.seed),
	);
	return {
		id: metadata.id,
		kind: "naive-bayes",
		labels,
		featureSpaceId: vectorizer.featureSpaceId,
		vectorizer,
		metadata,
		parameters: { family: "naive-bayes", logPriors, logLikelihoods },
	};
}

function trainLinearClassifier(
	records: readonly LabeledFeatureRecord[],
	rows: readonly FeatureVector[],
	labels: readonly string[],
	featureCount: number,
	vectorizer: Vectorizer,
	options: TrainClassifierOptions,
): ClassicalClassifier {
	const iterations = options.iterations ?? 12;
	const learningRate = options.learningRate ?? 0.2;
	const regularization = options.regularization ?? 0;
	const labelIds = labelIndexMap(labels);
	const weights = labels.map(() =>
		Array.from({ length: featureCount }, () => 0),
	);
	const biases = labels.map(() => 0);
	const totals = labels.map(() =>
		Array.from({ length: featureCount }, () => 0),
	);
	const biasTotals = labels.map(() => 0);
	let steps = 0;
	for (let iteration = 0; iteration < iterations; iteration += 1) {
		for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
			const row = rows[rowIndex];
			const label = records[rowIndex]?.label;
			if (row === undefined || label === undefined) continue;
			const gold = labelIds[label];
			if (gold === undefined) continue;
			const scores = weights.map(
				(rowWeights, labelId) => dot(rowWeights, row) + (biases[labelId] ?? 0),
			);
			if (
				options.kind === "perceptron" ||
				options.kind === "averaged-perceptron"
			) {
				const predicted = argmax(scores, labels);
				if (predicted !== gold) {
					updateLinear(weights, biases, row, gold, learningRate);
					updateLinear(weights, biases, row, predicted, -learningRate);
				}
			} else if (options.kind === "linear-svm") {
				for (let labelId = 0; labelId < labels.length; labelId += 1) {
					if (labelId === gold) continue;
					const margin = 1 + (scores[labelId] ?? 0) - (scores[gold] ?? 0);
					if (margin > 0) {
						updateLinear(weights, biases, row, gold, learningRate);
						updateLinear(weights, biases, row, labelId, -learningRate);
					}
				}
			} else {
				const probabilities = softmax(scores);
				for (let labelId = 0; labelId < labels.length; labelId += 1) {
					const gradient =
						(labelId === gold ? 1 : 0) - (probabilities[labelId] ?? 0);
					updateLinear(weights, biases, row, labelId, learningRate * gradient);
				}
			}
			if (regularization > 0) {
				for (const rowWeights of weights) {
					for (let index = 0; index < rowWeights.length; index += 1) {
						rowWeights[index] =
							(rowWeights[index] ?? 0) * (1 - learningRate * regularization);
					}
				}
			}
			steps += 1;
			if (options.kind === "averaged-perceptron") {
				for (let labelId = 0; labelId < weights.length; labelId += 1) {
					const totalRow = totals[labelId];
					const weightRow = weights[labelId];
					if (totalRow === undefined || weightRow === undefined) continue;
					for (let featureId = 0; featureId < featureCount; featureId += 1) {
						totalRow[featureId] =
							(totalRow[featureId] ?? 0) + (weightRow[featureId] ?? 0);
					}
					biasTotals[labelId] =
						(biasTotals[labelId] ?? 0) + (biases[labelId] ?? 0);
				}
			}
		}
	}
	const finalWeights =
		options.kind === "averaged-perceptron" && steps > 0
			? totals.map((row) => Object.freeze(row.map((value) => value / steps)))
			: weights.map((row) => Object.freeze([...row]));
	const finalBiases =
		options.kind === "averaged-perceptron" && steps > 0
			? Object.freeze(biasTotals.map((value) => value / steps))
			: Object.freeze([...biases]);
	const metadata = metadataFor(
		options.kind,
		{
			kind: options.kind,
			iterations,
			learningRate,
			regularization,
			labels,
			featureSpaceId: vectorizer.featureSpaceId,
		},
		modelMetadataExtra(vectorizer.featureSpaceId, options.seed),
	);
	return {
		id: metadata.id,
		kind: options.kind,
		labels,
		featureSpaceId: vectorizer.featureSpaceId,
		vectorizer,
		metadata,
		parameters: {
			family: "linear",
			weights: finalWeights,
			biases: finalBiases,
		},
	};
}

function updateLinear(
	weights: number[][],
	biases: number[],
	vector: FeatureVector,
	labelId: number,
	scale: number,
): void {
	const row = weights[labelId];
	if (row === undefined) return;
	for (let index = 0; index < vector.ids.length; index += 1) {
		const featureId = vector.ids[index] ?? 0;
		row[featureId] =
			(row[featureId] ?? 0) + scale * (vector.values[index] ?? 0);
	}
	biases[labelId] = (biases[labelId] ?? 0) + scale;
}

function argmax(scores: readonly number[], labels: readonly string[]): number {
	let selected = 0;
	for (let index = 1; index < scores.length; index += 1) {
		const current = scores[index] ?? Number.NEGATIVE_INFINITY;
		const previous = scores[selected] ?? Number.NEGATIVE_INFINITY;
		if (
			current > previous ||
			(current === previous &&
				compareText(labels[index] ?? "", labels[selected] ?? "") < 0)
		) {
			selected = index;
		}
	}
	return selected;
}

export function classify(
	classifier: ClassicalClassifier,
	features: FeatureVector,
): ClassificationResult {
	if (features.featureSpaceId !== classifier.featureSpaceId) {
		throw new Error("feature vector belongs to a different feature space.");
	}
	const params = classifier.parameters;
	const rawScores =
		params.family === "naive-bayes"
			? params.logPriors.map((prior, labelId) => {
					let score = prior;
					for (let index = 0; index < features.ids.length; index += 1) {
						const featureId = features.ids[index] ?? 0;
						score +=
							(features.values[index] ?? 0) *
							(params.logLikelihoods[labelId]?.[featureId] ?? 0);
					}
					return score;
				})
			: params.weights.map(
					(weights, labelId) =>
						dot(weights, features) + (params.biases[labelId] ?? 0),
				);
	const probabilities =
		classifier.kind === "naive-bayes" ||
		classifier.kind === "maxent" ||
		classifier.kind === "logistic-regression"
			? softmax(rawScores)
			: undefined;
	const rankings = rawScores
		.map((score, index) => ({
			label: classifier.labels[index] ?? "",
			score: {
				kind:
					classifier.kind === "linear-svm" ||
					classifier.kind === "perceptron" ||
					classifier.kind === "averaged-perceptron"
						? "margin"
						: "logprob",
				value: finite(score, "classification score"),
				scale: "textclassical",
			} satisfies Score,
			...(probabilities !== undefined
				? { probability: probabilities[index] ?? 0 }
				: {}),
		}))
		.sort(
			(left, right) =>
				right.score.value - left.score.value ||
				compareText(left.label, right.label),
		);
	return {
		label: rankings[0]?.label ?? "",
		rankings: Object.freeze(rankings),
		scores: Object.freeze(rankings.map((entry) => entry.score)),
		diagnostics: [],
	};
}

function scoreJson(score: Score | undefined): JsonValue {
	if (score === undefined) return null;
	return {
		kind: score.kind,
		value: score.value,
		...(score.scale !== undefined ? { scale: score.scale } : {}),
	};
}

function aggregateVectors(
	vectors: readonly FeatureVector[],
	featureSpaceId: string,
): FeatureVector {
	const merged = new Map<number, number>();
	for (const vector of vectors) {
		for (let index = 0; index < vector.ids.length; index += 1) {
			const id = vector.ids[index] ?? 0;
			merged.set(id, (merged.get(id) ?? 0) + (vector.values[index] ?? 0));
		}
	}
	const entries = [...merged.entries()].sort(([left], [right]) => left - right);
	return {
		ids: Object.freeze(entries.map(([id]) => id)),
		values: Object.freeze(entries.map(([, value]) => value)),
		featureSpaceId,
	};
}

function statisticalEvidence(
	modelId: string,
	inputViewIds: readonly string[],
	exactness: Evidence["exactness"],
	options: JsonValue,
): Evidence {
	return {
		mode: "statistical",
		exactness,
		producer: packageName,
		packageName,
		packageVersion,
		statisticalModelIds: [modelId],
		inputViewIds,
		optionsHash: stableHashValue(options),
	};
}

function uniqueLayerId(document: TextDocument, base: string): string {
	if (document.layers[base] === undefined) return base;
	let index = 1;
	while (document.layers[`${base}.${index}`] !== undefined) index += 1;
	return `${base}.${index}`;
}

export function classifyDocument(
	document: TextDocument,
	classifier: ClassicalClassifier,
	options: ClassifyDocOptions = {},
): TextDocument {
	const view = resolveView(document, options.viewId);
	const specs = options.featureSpecs ?? [
		textFeatureSpec(),
		charNgramFeatureSpec(2, 3),
		shapeFeatureSpec(),
	];
	const records = collectFeatureRecords(document, specs, {
		...options,
		vectorizer: classifier.vectorizer,
		viewId: view.id,
	});
	const matrix = transformVectorizer(classifier.vectorizer, records);
	const result = classify(
		classifier,
		aggregateVectors(matrixRows(matrix), classifier.featureSpaceId),
	);
	const layerId =
		options.layerId ?? uniqueLayerId(document, "classification.textclassical");
	const annotationId = options.annotationId ?? `${layerId}.annotation`;
	const annotation: Annotation<JsonValue> = {
		id: annotationId,
		layer: layerId,
		type: "classification.document",
		spans: [
			{
				viewId: view.id,
				span: { start: 0, end: view.text.length, unit: "utf16-code-unit" },
			},
		],
		value: {
			label: result.label,
			rankings: result.rankings.map((ranking) => ({
				label: ranking.label,
				score: scoreJson(ranking.score),
				...(ranking.probability !== undefined
					? { probability: ranking.probability }
					: {}),
			})),
			modelId: classifier.id,
		},
		evidence: statisticalEvidence(
			classifier.id,
			[view.id],
			options.exactness ?? "E2",
			{
				layerId,
				annotationId,
			},
		),
	};
	const layer: AnnotationLayer<JsonValue> = {
		id: layerId,
		type: "classification.document",
		viewId: view.id,
		annotations: { [annotation.id]: annotation },
	};
	return addLayer(document, layer);
}

function tokenFeatureMap(
	tokens: readonly string[],
	index: number,
	previousLabel?: string,
): FeatureMap {
	const token = tokens[index] ?? "";
	const lower = token.toLocaleLowerCase("und");
	const features: Record<string, number> = {
		bias: 1,
		[`token=${token}`]: 1,
		[`lower=${lower}`]: 1,
		[`shape=${tokenShape(token)}`]: 1,
	};
	if (index === 0) features["position=start"] = 1;
	if (index === tokens.length - 1) features["position=end"] = 1;
	if (lower.length >= 2) {
		features[`prefix=${lower.slice(0, 2)}`] = 1;
		features[`suffix=${lower.slice(-2)}`] = 1;
	}
	if (tokens[index - 1] !== undefined)
		features[`prev=${tokens[index - 1]?.toLocaleLowerCase("und")}`] = 1;
	if (tokens[index + 1] !== undefined)
		features[`next=${tokens[index + 1]?.toLocaleLowerCase("und")}`] = 1;
	if (previousLabel !== undefined) features[`prevLabel=${previousLabel}`] = 1;
	return normalizeFeatureMap(features);
}

function sequenceFeatureSpace(
	samples: readonly SequenceSample[],
	kind: SequenceModelKind,
): FeatureSpace {
	const keys = new Set<string>();
	for (const sample of samples) {
		for (let index = 0; index < sample.tokens.length; index += 1) {
			const previousLabel =
				kind === "memm"
					? index === 0
						? "<s>"
						: sample.labels[index - 1]
					: undefined;
			for (const key of Object.keys(
				tokenFeatureMap(sample.tokens, index, previousLabel),
			)) {
				keys.add(key);
			}
		}
	}
	const sorted = [...keys].sort(compareText);
	const id = `sequence-feature-space:${stableHashValue(sorted)}`;
	return {
		id,
		ids: orderedRecord(sorted.map((key, index) => [key, index] as const)),
		keys: Object.freeze(sorted),
		size: sorted.length,
	};
}

function vectorizeToken(
	featureSpace: FeatureSpace,
	features: FeatureMap,
): FeatureVector {
	const entries = Object.entries(features)
		.flatMap(([key, value]) => {
			const id = featureSpace.ids[key];
			return id === undefined ? [] : [[id, value] as const];
		})
		.sort(([left], [right]) => left - right);
	return {
		ids: Object.freeze(entries.map(([id]) => id)),
		values: Object.freeze(entries.map(([, value]) => value)),
		featureSpaceId: featureSpace.id,
	};
}

export function trainSequenceTagger(
	samples: Iterable<SequenceSample>,
	options: TrainSequenceOptions,
): SequenceTagger {
	assertJsonValue(options.metadata ?? null);
	const materialized = [...samples];
	if (materialized.length === 0)
		throw new Error("trainSequenceTagger requires at least one sample.");
	for (const sample of materialized) {
		if (sample.tokens.length !== sample.labels.length) {
			throw new Error("sequence tokens and labels must have the same length.");
		}
	}
	const labels = validateLabels(
		options.labels ??
			sortedUnique(materialized.flatMap((sample) => sample.labels)),
	);
	return options.kind === "hmm"
		? trainHmm(materialized, labels, options)
		: trainLinearChain(materialized, labels, options);
}

function trainHmm(
	samples: readonly SequenceSample[],
	labels: readonly string[],
	options: TrainSequenceOptions,
): SequenceTagger {
	const smoothing = options.smoothing ?? 1;
	const labelIds = labelIndexMap(labels);
	const vocabulary = sortedUnique(samples.flatMap((sample) => sample.tokens));
	const tokenIds = labelIndexMap(vocabulary);
	const initial = labels.map(() => smoothing);
	const transitions = labels.map(() => labels.map(() => smoothing));
	const emissions = labels.map(() => vocabulary.map(() => smoothing));
	const totals = labels.map(() => smoothing * Math.max(1, vocabulary.length));
	for (const sample of samples) {
		for (let index = 0; index < sample.tokens.length; index += 1) {
			const labelId = labelIds[sample.labels[index] ?? ""];
			const tokenId = tokenIds[sample.tokens[index] ?? ""];
			if (labelId === undefined || tokenId === undefined) continue;
			if (index === 0) initial[labelId] = (initial[labelId] ?? 0) + 1;
			const previous =
				index > 0 ? labelIds[sample.labels[index - 1] ?? ""] : undefined;
			if (previous !== undefined) {
				const transitionRow = transitions[previous];
				if (transitionRow !== undefined) {
					transitionRow[labelId] = (transitionRow[labelId] ?? 0) + 1;
				}
			}
			const emissionRow = emissions[labelId];
			if (emissionRow !== undefined) {
				emissionRow[tokenId] = (emissionRow[tokenId] ?? 0) + 1;
			}
			totals[labelId] = (totals[labelId] ?? 0) + 1;
		}
	}
	const initialTotal = initial.reduce((sum, value) => sum + value, 0);
	const logInitial = initial.map((value) => Math.log(value / initialTotal));
	const logTransitions = transitions.map((row) => {
		const total = row.reduce((sum, value) => sum + value, 0);
		return Object.freeze(row.map((value) => Math.log(value / total)));
	});
	const byToken = orderedRecord(
		vocabulary.map(
			(token, tokenId) =>
				[
					token,
					Object.freeze(
						emissions.map((row, labelId) =>
							Math.log((row[tokenId] ?? smoothing) / (totals[labelId] ?? 1)),
						),
					),
				] as const,
		),
	);
	const unknownEmission = Object.freeze(
		labels.map((_, labelId) => Math.log(smoothing / (totals[labelId] ?? 1))),
	);
	const metadata = metadataFor(
		"hmm",
		{ kind: options.kind, labels, smoothing },
		modelMetadataExtra(undefined, options.seed),
	);
	return {
		id: metadata.id,
		kind: "hmm",
		labels,
		metadata,
		parameters: {
			family: "hmm",
			vocabulary,
			logInitial,
			logTransitions,
			logEmissions: byToken,
			unknownEmission,
		},
	};
}

function trainLinearChain(
	samples: readonly SequenceSample[],
	labels: readonly string[],
	options: TrainSequenceOptions,
): SequenceTagger {
	const featureSpace = sequenceFeatureSpace(samples, options.kind);
	const labelIds = labelIndexMap(labels);
	const weights = labels.map(() =>
		Array.from({ length: featureSpace.size }, () => 0),
	);
	const transitions = labels.map(() => labels.map(() => 0));
	const iterations = options.iterations ?? 8;
	const learningRate = options.learningRate ?? 0.2;
	const regularization = options.regularization ?? 0;
	for (let iteration = 0; iteration < iterations; iteration += 1) {
		for (const sample of samples) {
			if (options.kind === "crf") {
				updateCrf(
					weights,
					transitions,
					featureSpace,
					labels,
					sample,
					learningRate,
					regularization,
				);
			} else {
				const predicted = decodeLinearChain(
					{ labels, featureSpace, weights, transitions },
					sample.tokens,
					options.kind,
				);
				for (let index = 0; index < sample.tokens.length; index += 1) {
					const gold = labelIds[sample.labels[index] ?? ""];
					const guess = labelIds[predicted.labels[index] ?? ""];
					if (gold === undefined || guess === undefined || gold === guess)
						continue;
					const previousGold = index === 0 ? "<s>" : sample.labels[index - 1];
					const previousGuess =
						index === 0 ? "<s>" : predicted.labels[index - 1];
					const goldVector = vectorizeToken(
						featureSpace,
						tokenFeatureMap(
							sample.tokens,
							index,
							options.kind === "memm" ? previousGold : undefined,
						),
					);
					const guessVector = vectorizeToken(
						featureSpace,
						tokenFeatureMap(
							sample.tokens,
							index,
							options.kind === "memm" ? previousGuess : undefined,
						),
					);
					updateLinear(
						weights,
						labels.map(() => 0),
						goldVector,
						gold,
						learningRate,
					);
					updateLinear(
						weights,
						labels.map(() => 0),
						guessVector,
						guess,
						-learningRate,
					);
					if (index > 0) {
						const previousGoldId = labelIds[previousGold ?? ""];
						const previousGuessId = labelIds[previousGuess ?? ""];
						const goldTransitionRow =
							previousGoldId === undefined
								? undefined
								: transitions[previousGoldId];
						if (goldTransitionRow !== undefined) {
							goldTransitionRow[gold] =
								(goldTransitionRow[gold] ?? 0) + learningRate;
						}
						const guessTransitionRow =
							previousGuessId === undefined
								? undefined
								: transitions[previousGuessId];
						if (guessTransitionRow !== undefined) {
							guessTransitionRow[guess] =
								(guessTransitionRow[guess] ?? 0) - learningRate;
						}
					}
				}
			}
		}
	}
	const metadata = metadataFor(
		options.kind,
		{ kind: options.kind, labels, iterations, learningRate, regularization },
		modelMetadataExtra(featureSpace.id, options.seed),
	);
	return {
		id: metadata.id,
		kind: options.kind,
		labels,
		featureSpaceId: featureSpace.id,
		metadata,
		parameters: {
			family: "linear-chain",
			featureSpace,
			weights: weights.map((row) => Object.freeze([...row])),
			transitions: transitions.map((row) => Object.freeze([...row])),
		},
	};
}

function updateCrf(
	weights: number[][],
	transitions: number[][],
	featureSpace: FeatureSpace,
	labels: readonly string[],
	sample: SequenceSample,
	learningRate: number,
	regularization: number,
): void {
	const labelIds = labelIndexMap(labels);
	const emission = sample.tokens.map((_, index) => {
		const vector = vectorizeToken(
			featureSpace,
			tokenFeatureMap(sample.tokens, index),
		);
		return labels.map((__, labelId) => dot(weights[labelId] ?? [], vector));
	});
	const forward = forwardScores(emission, transitions);
	const backward = backwardScores(emission, transitions);
	const logZ = logSumExp(forward[forward.length - 1] ?? [0]);
	for (let index = 0; index < sample.tokens.length; index += 1) {
		const vector = vectorizeToken(
			featureSpace,
			tokenFeatureMap(sample.tokens, index),
		);
		for (let labelId = 0; labelId < labels.length; labelId += 1) {
			const expected = Math.exp(
				(forward[index]?.[labelId] ?? 0) +
					(backward[index]?.[labelId] ?? 0) -
					logZ,
			);
			const gold = labelIds[sample.labels[index] ?? ""] === labelId ? 1 : 0;
			updateLinear(
				weights,
				labels.map(() => 0),
				vector,
				labelId,
				learningRate * (gold - expected),
			);
		}
	}
	for (let index = 1; index < sample.tokens.length; index += 1) {
		const goldPrev = labelIds[sample.labels[index - 1] ?? ""];
		const goldNow = labelIds[sample.labels[index] ?? ""];
		for (let prev = 0; prev < labels.length; prev += 1) {
			for (let now = 0; now < labels.length; now += 1) {
				const expected = Math.exp(
					(forward[index - 1]?.[prev] ?? 0) +
						(transitions[prev]?.[now] ?? 0) +
						(emission[index]?.[now] ?? 0) +
						(backward[index]?.[now] ?? 0) -
						logZ,
				);
				const observed = goldPrev === prev && goldNow === now ? 1 : 0;
				const transitionRow = transitions[prev];
				if (transitionRow !== undefined) {
					transitionRow[now] =
						(transitionRow[now] ?? 0) + learningRate * (observed - expected);
				}
			}
		}
	}
	if (regularization > 0) {
		for (const row of weights) {
			for (let index = 0; index < row.length; index += 1) {
				row[index] = (row[index] ?? 0) * (1 - learningRate * regularization);
			}
		}
	}
}

function forwardScores(
	emission: readonly (readonly number[])[],
	transitions: readonly (readonly number[])[],
): readonly (readonly number[])[] {
	const forward: number[][] = [];
	for (let index = 0; index < emission.length; index += 1) {
		const row: number[] = [];
		for (
			let labelId = 0;
			labelId < (emission[index]?.length ?? 0);
			labelId += 1
		) {
			row[labelId] =
				index === 0
					? (emission[index]?.[labelId] ?? 0)
					: (emission[index]?.[labelId] ?? 0) +
						logSumExp(
							(forward[index - 1] ?? []).map(
								(score, prev) => score + (transitions[prev]?.[labelId] ?? 0),
							),
						);
		}
		forward.push(row);
	}
	return forward;
}

function backwardScores(
	emission: readonly (readonly number[])[],
	transitions: readonly (readonly number[])[],
): readonly (readonly number[])[] {
	const backward = emission.map((row) => row.map(() => 0));
	for (let index = emission.length - 2; index >= 0; index -= 1) {
		for (
			let labelId = 0;
			labelId < (emission[index]?.length ?? 0);
			labelId += 1
		) {
			const backwardRow = backward[index];
			if (backwardRow === undefined) continue;
			backwardRow[labelId] = logSumExp(
				(emission[index + 1] ?? []).map(
					(score, next) =>
						(transitions[labelId]?.[next] ?? 0) +
						score +
						(backward[index + 1]?.[next] ?? 0),
				),
			);
		}
	}
	return backward;
}

function logSumExp(values: readonly number[]): number {
	const max = Math.max(...values);
	if (!Number.isFinite(max)) return max;
	const sum = values.reduce((total, value) => total + Math.exp(value - max), 0);
	return max + Math.log(sum);
}

function decodeLinearChain(
	model: {
		readonly labels: readonly string[];
		readonly featureSpace: FeatureSpace;
		readonly weights: readonly (readonly number[])[];
		readonly transitions: readonly (readonly number[])[];
	},
	tokens: readonly string[],
	kind: SequenceModelKind,
): SequenceTagResult {
	const labelCount = model.labels.length;
	const scores: number[][] = [];
	const back: number[][] = [];
	for (let index = 0; index < tokens.length; index += 1) {
		scores[index] = [];
		back[index] = [];
		for (let labelId = 0; labelId < labelCount; labelId += 1) {
			let selectedPrev = 0;
			let selectedScore = Number.NEGATIVE_INFINITY;
			if (index === 0) {
				const vector = vectorizeToken(
					model.featureSpace,
					tokenFeatureMap(tokens, index, kind === "memm" ? "<s>" : undefined),
				);
				const emission = dot(model.weights[labelId] ?? [], vector);
				selectedScore = emission;
			} else {
				for (let prev = 0; prev < labelCount; prev += 1) {
					const vector = vectorizeToken(
						model.featureSpace,
						tokenFeatureMap(
							tokens,
							index,
							kind === "memm" ? model.labels[prev] : undefined,
						),
					);
					const emission = dot(model.weights[labelId] ?? [], vector);
					const score =
						(scores[index - 1]?.[prev] ?? 0) +
						(model.transitions[prev]?.[labelId] ?? 0) +
						emission;
					if (score > selectedScore) {
						selectedScore = score;
						selectedPrev = prev;
					}
				}
			}
			const scoreRow = scores[index];
			const backRow = back[index];
			if (scoreRow !== undefined) scoreRow[labelId] = selectedScore;
			if (backRow !== undefined) backRow[labelId] = selectedPrev;
		}
	}
	const labels: string[] = [];
	let current = argmax(scores[scores.length - 1] ?? [], model.labels);
	for (let index = tokens.length - 1; index >= 0; index -= 1) {
		labels[index] = model.labels[current] ?? "";
		current = back[index]?.[current] ?? 0;
	}
	const finalScore = Math.max(...(scores[scores.length - 1] ?? [0]));
	return {
		labels: Object.freeze(labels),
		score: {
			kind: "logprob",
			value: finite(finalScore, "sequence score"),
			scale: "textclassical",
		},
		alternatives: Object.freeze(
			scores.map((row) =>
				Object.freeze(
					row
						.map((score, index) => ({
							label: model.labels[index] ?? "",
							score: {
								kind: "logprob",
								value: finite(score, "sequence alternative"),
								scale: "textclassical",
							} satisfies Score,
						}))
						.sort(
							(left, right) =>
								right.score.value - left.score.value ||
								compareText(left.label, right.label),
						),
				),
			),
		),
		diagnostics: [],
	};
}

export function tagSequence(
	tagger: SequenceTagger,
	sequence: SequenceInput,
	_options: TagOptions = {},
): SequenceTagResult {
	if (tagger.parameters.family === "hmm") {
		const hmmParameters = tagger.parameters;
		const tokenScores = sequence.tokens.map(
			(token) =>
				hmmParameters.logEmissions[token] ?? hmmParameters.unknownEmission,
		);
		const scores: number[][] = [];
		const back: number[][] = [];
		for (let index = 0; index < sequence.tokens.length; index += 1) {
			scores[index] = [];
			back[index] = [];
			for (let labelId = 0; labelId < tagger.labels.length; labelId += 1) {
				const emission = tokenScores[index]?.[labelId] ?? 0;
				if (index === 0) {
					const scoreRow = scores[index];
					const backRow = back[index];
					if (scoreRow !== undefined)
						scoreRow[labelId] =
							(hmmParameters.logInitial[labelId] ?? 0) + emission;
					if (backRow !== undefined) backRow[labelId] = 0;
				} else {
					let selectedPrev = 0;
					let selectedScore = Number.NEGATIVE_INFINITY;
					for (let prev = 0; prev < tagger.labels.length; prev += 1) {
						const score =
							(scores[index - 1]?.[prev] ?? 0) +
							(hmmParameters.logTransitions[prev]?.[labelId] ?? 0) +
							emission;
						if (score > selectedScore) {
							selectedScore = score;
							selectedPrev = prev;
						}
					}
					const scoreRow = scores[index];
					const backRow = back[index];
					if (scoreRow !== undefined) scoreRow[labelId] = selectedScore;
					if (backRow !== undefined) backRow[labelId] = selectedPrev;
				}
			}
		}
		const labels: string[] = [];
		let current = argmax(scores[scores.length - 1] ?? [], tagger.labels);
		for (let index = sequence.tokens.length - 1; index >= 0; index -= 1) {
			labels[index] = tagger.labels[current] ?? "";
			current = back[index]?.[current] ?? 0;
		}
		const finalScore = Math.max(...(scores[scores.length - 1] ?? [0]));
		return {
			labels,
			score: {
				kind: "logprob",
				value: finite(finalScore, "sequence score"),
				scale: "textclassical",
			},
			alternatives: [],
			diagnostics: [],
		};
	}
	return decodeLinearChain(
		{
			labels: tagger.labels,
			featureSpace: tagger.parameters.featureSpace,
			weights: tagger.parameters.weights,
			transitions: tagger.parameters.transitions,
		},
		sequence.tokens,
		tagger.kind,
	);
}

function layerTypeForTask(task: AnnotateSequenceOptions["task"]): string {
	if (task === "pos") return "morph.pos";
	if (task === "chunk") return "chunk.phrase";
	if (task === "ner") return "entity.mention";
	if (task === "slot") return "custom.slot";
	return "custom.sequence";
}

export function annotateSequence(
	document: TextDocument,
	tagger: SequenceTagger,
	options: AnnotateSequenceOptions = {},
): TextDocument {
	const view = resolveView(document, options.viewId);
	const tokens = tokenizeWithSpans(view.text);
	const result = tagSequence(tagger, {
		tokens: tokens.map((token) => token.text),
	});
	const layerId =
		options.layerId ?? uniqueLayerId(document, layerTypeForTask(options.task));
	const layerType = options.annotationType ?? layerTypeForTask(options.task);
	const annotations: Record<string, Annotation<JsonValue>> = {};
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token === undefined) continue;
		const label = result.labels[index] ?? "";
		const annotation: Annotation<JsonValue> = {
			id: `${layerId}.${index}`,
			layer: layerId,
			type: layerType,
			spans: [
				{
					viewId: view.id,
					span: { start: token.start, end: token.end, unit: "utf16-code-unit" },
				},
			],
			value: { label, token: token.text, index, modelId: tagger.id },
			evidence: statisticalEvidence(
				tagger.id,
				[view.id],
				options.exactness ?? "E2",
				{
					layerId,
					index,
				},
			),
		};
		annotations[annotation.id] = annotation;
	}
	return addLayer(document, {
		id: layerId,
		type: layerType,
		viewId: view.id,
		annotations,
	});
}

function sequenceTokens(
	sequence: TokenSequence,
	includeBoundaryTokens: boolean,
): readonly string[] {
	return includeBoundaryTokens
		? ["<s>", ...sequence.tokens, "</s>"]
		: sequence.tokens;
}

function ngramKey(tokens: readonly string[]): string {
	return tokens.join("\u0001");
}

export function trainNgramLanguageModel(
	corpus: Iterable<TokenSequence>,
	options: TrainNgramLmOptions,
): NgramLanguageModel {
	assertJsonValue(options.metadata ?? null);
	if (!Number.isInteger(options.order) || options.order <= 0) {
		throw new RangeError("language model order must be a positive integer.");
	}
	const includeBoundaryTokens = options.includeBoundaryTokens ?? true;
	const counts = new Map<string, number>();
	const contextCounts = new Map<string, number>();
	const vocabulary = new Set<string>();
	let totalTokens = 0;
	for (const sequence of corpus) {
		const tokens = sequenceTokens(sequence, includeBoundaryTokens);
		for (const token of tokens) vocabulary.add(token);
		totalTokens += tokens.length;
		for (let index = 0; index < tokens.length; index += 1) {
			for (let order = 1; order <= options.order; order += 1) {
				const start = index - order + 1;
				if (start < 0) continue;
				const ngram = tokens.slice(start, index + 1);
				counts.set(ngramKey(ngram), (counts.get(ngramKey(ngram)) ?? 0) + 1);
				if (ngram.length > 1) {
					const context = ngram.slice(0, -1);
					contextCounts.set(
						ngramKey(context),
						(contextCounts.get(ngramKey(context)) ?? 0) + 1,
					);
				}
			}
		}
	}
	const sortedVocabulary = sortedUnique(vocabulary);
	const alpha = options.alpha ?? (options.smoothing === "lidstone" ? 0.1 : 1);
	const discount = options.discount ?? 0.75;
	const backoffWeight = options.backoffWeight ?? 0.4;
	const metadata = metadataFor("ngram-language-model", {
		order: options.order,
		smoothing: options.smoothing,
		alpha,
		discount,
		backoffWeight,
		includeBoundaryTokens,
		vocabulary: sortedVocabulary,
	});
	return {
		id: metadata.id,
		order: options.order,
		smoothing: options.smoothing,
		vocabulary: sortedVocabulary,
		counts: orderedRecord(counts.entries()),
		contextCounts: orderedRecord(contextCounts.entries()),
		totalTokens,
		alpha,
		discount,
		backoffWeight,
		includeBoundaryTokens,
		metadata,
	};
}

function ngramProbability(
	model: NgramLanguageModel,
	ngram: readonly string[],
): number {
	const key = ngramKey(ngram);
	const count = model.counts[key] ?? 0;
	if (ngram.length === 1) {
		const vocabularySize = Math.max(1, model.vocabulary.length);
		if (model.smoothing === "mle")
			return count === 0 ? 1e-12 : count / Math.max(1, model.totalTokens);
		return (
			(count + model.alpha) / (model.totalTokens + model.alpha * vocabularySize)
		);
	}
	const context = ngram.slice(0, -1);
	const contextCount = model.contextCounts[ngramKey(context)] ?? 0;
	const vocabularySize = Math.max(1, model.vocabulary.length);
	if (model.smoothing === "mle")
		return count === 0 || contextCount === 0 ? 1e-12 : count / contextCount;
	if (model.smoothing === "laplace" || model.smoothing === "lidstone") {
		return (
			(count + model.alpha) / (contextCount + model.alpha * vocabularySize)
		);
	}
	if (model.smoothing === "stupid-backoff") {
		return count > 0 && contextCount > 0
			? count / contextCount
			: model.backoffWeight * ngramProbability(model, ngram.slice(1));
	}
	if (
		model.smoothing === "absolute-discount" ||
		model.smoothing === "kneser-ney"
	) {
		const discounted =
			Math.max(count - model.discount, 0) / Math.max(1, contextCount);
		return (
			discounted +
			(model.discount / Math.max(1, contextCount)) *
				ngramProbability(model, ngram.slice(1))
		);
	}
	if (model.smoothing === "witten-bell") {
		const continuations = Object.keys(model.counts).filter((entry) =>
			entry.startsWith(`${ngramKey(context)}\u0001`),
		).length;
		const lambda = contextCount / Math.max(1, contextCount + continuations);
		return (
			lambda * (count / Math.max(1, contextCount)) +
			(1 - lambda) * ngramProbability(model, ngram.slice(1))
		);
	}
	const adjusted = count <= 1 ? 0.5 : count;
	return (
		(adjusted + model.alpha) / (contextCount + model.alpha * vocabularySize)
	);
}

export function scoreSequence(
	model: NgramLanguageModel,
	tokens: readonly string[],
): Score {
	const sequence = sequenceTokens({ tokens }, model.includeBoundaryTokens);
	let score = 0;
	for (let index = 0; index < sequence.length; index += 1) {
		const start = Math.max(0, index - model.order + 1);
		const probability = Math.max(
			ngramProbability(model, sequence.slice(start, index + 1)),
			1e-12,
		);
		score += Math.log(probability);
	}
	return {
		kind: "logprob",
		value: finite(score, "language-model score"),
		scale: "natural-log",
	};
}

export function perplexity(
	model: NgramLanguageModel,
	corpus: Iterable<TokenSequence>,
): number {
	let score = 0;
	let count = 0;
	for (const sequence of corpus) {
		score += scoreSequence(model, sequence.tokens).value;
		count += sequence.tokens.length + (model.includeBoundaryTokens ? 2 : 0);
	}
	if (count === 0) throw new Error("perplexity requires at least one token.");
	return Math.exp(-score / count);
}

function denseVector(
	vector: DocumentTermVector | FeatureVector,
	size: number,
): number[] {
	const dense = Array.from({ length: size }, () => 0);
	for (let index = 0; index < vector.ids.length; index += 1) {
		const id = vector.ids[index] ?? 0;
		if (id >= 0 && id < size)
			dense[id] = (dense[id] ?? 0) + (vector.values[index] ?? 0);
	}
	return dense;
}

function makePrng(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 0x100000000;
	};
}

export function trainLda(
	corpus: Iterable<DocumentTermVector>,
	options: LdaOptions,
): TopicModel {
	assertJsonValue(options.metadata ?? null);
	const docs = [...corpus];
	if (docs.length === 0)
		throw new Error("trainLda requires at least one document vector.");
	const topicCount = options.topicCount;
	if (!Number.isInteger(topicCount) || topicCount <= 0)
		throw new RangeError("topicCount must be a positive integer.");
	const vocabularySize = Math.max(
		1,
		...docs.flatMap((doc) => doc.ids.map((id) => id + 1)),
	);
	const iterations = options.iterations ?? 25;
	const alpha = options.alpha ?? 0.1;
	const beta = options.beta ?? 0.01;
	const random = makePrng(options.seed ?? 13);
	const topicTermCounts = Array.from({ length: topicCount }, () =>
		Array.from({ length: vocabularySize }, () => 0),
	);
	const topicTotals = Array.from({ length: topicCount }, () => 0);
	const documentTopicCounts = docs.map(() =>
		Array.from({ length: topicCount }, () => 0),
	);
	const assignments = docs.map((doc, docId) => {
		const expanded: { term: number; topic: number }[] = [];
		for (let index = 0; index < doc.ids.length; index += 1) {
			const term = doc.ids[index] ?? 0;
			const count = Math.max(1, Math.round(doc.values[index] ?? 0));
			for (let item = 0; item < count; item += 1) {
				const topic = Math.floor(random() * topicCount);
				expanded.push({ term, topic });
				const topicRow = topicTermCounts[topic];
				const docRow = documentTopicCounts[docId];
				if (topicRow !== undefined && docRow !== undefined) {
					topicRow[term] = (topicRow[term] ?? 0) + 1;
					topicTotals[topic] = (topicTotals[topic] ?? 0) + 1;
					docRow[topic] = (docRow[topic] ?? 0) + 1;
				}
			}
		}
		return expanded;
	});
	for (let iteration = 0; iteration < iterations; iteration += 1) {
		for (let docId = 0; docId < assignments.length; docId += 1) {
			for (const item of assignments[docId] ?? []) {
				const oldTopicRow = topicTermCounts[item.topic];
				const docRow = documentTopicCounts[docId];
				if (oldTopicRow === undefined || docRow === undefined) continue;
				oldTopicRow[item.term] = (oldTopicRow[item.term] ?? 0) - 1;
				topicTotals[item.topic] = (topicTotals[item.topic] ?? 0) - 1;
				docRow[item.topic] = (docRow[item.topic] ?? 0) - 1;
				const weights = topicTermCounts.map(
					(row, topic) =>
						(((row[item.term] ?? 0) + beta) /
							((topicTotals[topic] ?? 0) + beta * vocabularySize)) *
						((docRow[topic] ?? 0) + alpha),
				);
				item.topic = sampleWeighted(weights, random);
				const newTopicRow = topicTermCounts[item.topic];
				if (newTopicRow !== undefined) {
					newTopicRow[item.term] = (newTopicRow[item.term] ?? 0) + 1;
					topicTotals[item.topic] = (topicTotals[item.topic] ?? 0) + 1;
					docRow[item.topic] = (docRow[item.topic] ?? 0) + 1;
				}
			}
		}
	}
	const topicTermProbabilities = topicTermCounts.map((row, topic) => {
		const denominator = (topicTotals[topic] ?? 0) + beta * vocabularySize;
		return Object.freeze(row.map((count) => (count + beta) / denominator));
	});
	const docTopics = orderedRecord(
		docs.map((doc, docId) => {
			const total = (assignments[docId] ?? []).length + alpha * topicCount;
			return [
				doc.id,
				Object.freeze(
					(documentTopicCounts[docId] ?? []).map(
						(count) => (count + alpha) / total,
					),
				),
			] as const;
		}),
	);
	const metadata = metadataFor(
		"lda",
		{
			topicCount,
			iterations,
			alpha,
			beta,
			seed: options.seed ?? 13,
			vocabularySize,
		},
		{ seed: options.seed ?? 13 },
	);
	return {
		id: metadata.id,
		topicCount,
		vocabularySize,
		topicTermProbabilities,
		documentTopicProbabilities: docTopics,
		metadata,
	};
}

function sampleWeighted(
	weights: readonly number[],
	random: () => number,
): number {
	const total = weights.reduce((sum, value) => sum + value, 0);
	let threshold = random() * total;
	for (let index = 0; index < weights.length; index += 1) {
		threshold -= weights[index] ?? 0;
		if (threshold <= 0) return index;
	}
	return weights.length - 1;
}

export function inferTopics(
	model: TopicModel,
	doc: DocumentTermVector,
): TopicDistribution {
	const dense = denseVector(doc, model.vocabularySize);
	const scores = model.topicTermProbabilities.map((topic) =>
		topic.reduce(
			(sum, probability, term) =>
				sum + (dense[term] ?? 0) * Math.log(Math.max(probability, 1e-12)),
			0,
		),
	);
	const probabilities = softmax(scores);
	const topics = probabilities
		.map((probability, index) => ({
			label: `topic-${index}`,
			probability,
			score: {
				kind: "probability",
				value: probability,
				scale: "unit",
			} satisfies Score,
		}))
		.sort(
			(left, right) =>
				right.probability - left.probability ||
				compareText(left.label, right.label),
		);
	return { topics, probabilities, diagnostics: [] };
}

export function clusterDocuments(
	vectors: SparseMatrix,
	options: ClusterOptions,
): ClusterResult {
	assertJsonValue(options.metadata ?? null);
	if (vectors.rowCount <= 0) {
		throw new Error("clusterDocuments requires at least one row.");
	}
	if (!Number.isInteger(options.k) || options.k <= 0) {
		throw new RangeError("k must be a positive integer.");
	}
	if (options.seed !== undefined && !Number.isInteger(options.seed)) {
		throw new RangeError("seed must be an integer.");
	}
	const k = Math.min(options.k, vectors.rowCount);
	const rows = matrixRows(vectors);
	const denseRows = rows.map((row) => denseVector(row, vectors.columnCount));
	if (options.algorithm === "agglomerative") {
		return agglomerativeCluster(denseRows, vectors.rowIds, k);
	}
	return kmeansCluster(
		denseRows,
		vectors.rowIds,
		k,
		options.maxIterations ?? 25,
		options.seed ?? 13,
	);
}

function kmeansCluster(
	rows: readonly (readonly number[])[],
	rowIds: readonly string[],
	k: number,
	maxIterations: number,
	seed: number,
): ClusterResult {
	if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
		throw new RangeError("maxIterations must be a positive integer.");
	}
	let centroids = initializeKmeansCentroids(rows, k, seed);
	let assignments = rows.map(() => -1);
	for (let iteration = 0; iteration < maxIterations; iteration += 1) {
		const next = rows.map((row) => nearestCentroid(row, centroids));
		const converged = next.every(
			(value, index) => value === assignments[index],
		);
		assignments = next;
		centroids = recomputeCentroids(rows, assignments, k, centroids);
		if (converged) break;
	}
	return clusterResult("kmeans", assignments, centroids, rowIds);
}

function initializeKmeansCentroids(
	rows: readonly (readonly number[])[],
	k: number,
	seed: number,
): number[][] {
	const random = makePrng(seed);
	const selected = new Set<number>();
	const first = Math.min(rows.length - 1, Math.floor(random() * rows.length));
	selected.add(first);
	const centroids: number[][] = [[...(rows[first] ?? [])]];
	while (centroids.length < k) {
		const distances = rows.map((row, index) =>
			selected.has(index)
				? 0
				: Math.min(
						...centroids.map((centroid) => squaredDistance(row, centroid)),
					),
		);
		const total = distances.reduce((sum, distance) => sum + distance, 0);
		let next = -1;
		if (total > 0) {
			let threshold = random() * total;
			for (let index = 0; index < distances.length; index += 1) {
				threshold -= distances[index] ?? 0;
				if (threshold <= 0 && !selected.has(index)) {
					next = index;
					break;
				}
			}
		}
		if (next < 0) {
			next = rows.findIndex((_row, index) => !selected.has(index));
		}
		selected.add(next);
		centroids.push([...(rows[next] ?? [])]);
	}
	return centroids;
}

function agglomerativeCluster(
	rows: readonly (readonly number[])[],
	rowIds: readonly string[],
	k: number,
): ClusterResult {
	let clusters = rows.map((_, index) => [index]);
	while (clusters.length > k) {
		let selected: readonly [number, number] = [0, 1];
		let selectedDistance = Number.POSITIVE_INFINITY;
		for (let left = 0; left < clusters.length; left += 1) {
			for (let right = left + 1; right < clusters.length; right += 1) {
				const distance = centroidDistance(
					clusters[left] ?? [],
					clusters[right] ?? [],
					rows,
				);
				if (distance < selectedDistance) {
					selectedDistance = distance;
					selected = [left, right];
				}
			}
		}
		const [left, right] = selected;
		clusters = clusters
			.map((cluster, index) =>
				index === left ? [...cluster, ...(clusters[right] ?? [])] : cluster,
			)
			.filter((_, index) => index !== right);
	}
	const assignments = rows.map(() => 0);
	clusters.forEach((cluster, clusterId) => {
		for (const row of cluster) assignments[row] = clusterId;
	});
	const centroids = recomputeCentroids(rows, assignments, k);
	return clusterResult("agglomerative", assignments, centroids, rowIds);
}

function nearestCentroid(
	row: readonly number[],
	centroids: readonly (readonly number[])[],
): number {
	let selected = 0;
	let selectedDistance = Number.POSITIVE_INFINITY;
	for (let index = 0; index < centroids.length; index += 1) {
		const distance = squaredDistance(row, centroids[index] ?? []);
		if (distance < selectedDistance) {
			selected = index;
			selectedDistance = distance;
		}
	}
	return selected;
}

function squaredDistance(
	left: readonly number[],
	right: readonly number[],
): number {
	let distance = 0;
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const delta = (left[index] ?? 0) - (right[index] ?? 0);
		distance += delta * delta;
	}
	return distance;
}

function centroidDistance(
	leftCluster: readonly number[],
	rightCluster: readonly number[],
	rows: readonly (readonly number[])[],
): number {
	const assignments = rows.map(() => -1);
	for (const row of leftCluster) assignments[row] = 0;
	for (const row of rightCluster) assignments[row] = 1;
	const centroids = recomputeCentroids(rows, assignments, 2);
	return squaredDistance(centroids[0] ?? [], centroids[1] ?? []);
}

function recomputeCentroids(
	rows: readonly (readonly number[])[],
	assignments: readonly number[],
	k: number,
	previous?: readonly (readonly number[])[],
): number[][] {
	const width = rows[0]?.length ?? 0;
	const centroids = Array.from({ length: k }, () =>
		Array.from({ length: width }, () => 0),
	);
	const counts = Array.from({ length: k }, () => 0);
	for (let rowId = 0; rowId < rows.length; rowId += 1) {
		const cluster = assignments[rowId] ?? 0;
		counts[cluster] = (counts[cluster] ?? 0) + 1;
		const centroid = centroids[cluster];
		if (centroid === undefined) continue;
		for (let column = 0; column < width; column += 1) {
			centroid[column] = (centroid[column] ?? 0) + (rows[rowId]?.[column] ?? 0);
		}
	}
	for (let cluster = 0; cluster < k; cluster += 1) {
		const count = counts[cluster] ?? 0;
		const centroid = centroids[cluster];
		if (centroid === undefined) continue;
		if (count === 0) {
			centroids[cluster] = [...(previous?.[cluster] ?? centroid)];
			continue;
		}
		for (let column = 0; column < width; column += 1) {
			centroid[column] = (centroid[column] ?? 0) / count;
		}
	}
	return centroids;
}

function clusterResult(
	algorithm: ClusterResult["algorithm"],
	assignments: readonly number[],
	centroids: readonly (readonly number[])[],
	rowIds: readonly string[],
): ClusterResult {
	return {
		algorithm,
		assignments: Object.freeze([...assignments]),
		clusters: Object.freeze(
			centroids.map((centroid, clusterId) => ({
				id: `cluster-${clusterId}`,
				rowIds: Object.freeze(
					rowIds.filter((_, rowId) => assignments[rowId] === clusterId),
				),
				centroid: Object.freeze([...centroid]),
			})),
		),
		diagnostics: [],
	};
}

export function trainLanguageIdentifier(
	samples: Iterable<LabeledFeatureRecord>,
): LanguageIdentifier {
	return {
		classifier: trainClassifier(samples, {
			kind: "naive-bayes",
			vectorizerOptions: { mode: "dictionary" },
		}),
	};
}

export function identifyLanguage(
	identifier: LanguageIdentifier,
	features: FeatureVector,
): ClassificationResult {
	return classify(identifier.classifier, features);
}

export function trainSentimentClassifier(
	samples: Iterable<LabeledFeatureRecord>,
): SentimentClassifier {
	return {
		classifier: trainClassifier(samples, {
			kind: "logistic-regression",
			iterations: 10,
		}),
		positiveLexicon: [],
		negativeLexicon: [],
	};
}

export function classifySentiment(
	classifier: SentimentClassifier,
	features: FeatureVector,
): ClassificationResult {
	return classify(classifier.classifier, features);
}

function sentenceSpans(
	text: string,
	viewId: string,
): readonly SummarySentence[] {
	const sentences: SummarySentence[] = [];
	const pattern = /[^.!?]+[.!?]?/g;
	for (const match of text.matchAll(pattern)) {
		const sentence = match[0].trim();
		if (sentence.length === 0) continue;
		const rawStart = match.index ?? 0;
		const leading = match[0].length - match[0].trimStart().length;
		const start = rawStart + leading;
		const end = start + sentence.length;
		sentences.push({
			index: sentences.length,
			text: sentence,
			span: { viewId, span: { start, end, unit: "utf16-code-unit" } },
			score: { kind: "rank", value: 0, scale: "textclassical" },
		});
	}
	return sentences;
}

export function summarizeDocument(
	document: TextDocument,
	options: SummaryOptions = {},
): SummaryResult {
	const view = resolveView(document, options.viewId);
	const sentences = sentenceSpans(view.text, view.id);
	const frequencies = new Map<string, number>();
	for (const token of tokenizeWithSpans(view.text)) {
		const lower = token.text.toLocaleLowerCase("und");
		frequencies.set(lower, (frequencies.get(lower) ?? 0) + 1);
	}
	const method = options.method ?? "frequency";
	const scored = sentences.map((sentence) => {
		const tokens = tokenizeWithSpans(sentence.text).map((token) =>
			token.text.toLocaleLowerCase("und"),
		);
		const frequencyScore =
			tokens.reduce((sum, token) => sum + (frequencies.get(token) ?? 0), 0) /
			Math.max(1, tokens.length);
		const graphBoost =
			method === "graph"
				? sentences.reduce(
						(sum, other) =>
							sum +
							overlap(
								tokens,
								tokenizeWithSpans(other.text).map((token) =>
									token.text.toLocaleLowerCase("und"),
								),
							),
						0,
					)
				: 0;
		const cohesionBoost =
			method === "lexical-cohesion"
				? new Set(tokens).size / Math.max(1, tokens.length)
				: 0;
		const centroidBoost =
			method === "centroid"
				? tokens.filter((token) => (frequencies.get(token) ?? 0) > 1).length
				: 0;
		return {
			...sentence,
			score: {
				kind: "rank",
				value: frequencyScore + graphBoost + cohesionBoost + centroidBoost,
				scale: method,
			} satisfies Score,
		};
	});
	return {
		sentences: Object.freeze(
			scored
				.sort(
					(left, right) =>
						right.score.value - left.score.value || left.index - right.index,
				)
				.slice(0, options.sentenceCount ?? 3)
				.sort((left, right) => left.index - right.index),
		),
		diagnostics: [],
	};
}

function overlap(left: readonly string[], right: readonly string[]): number {
	const rightSet = new Set(right);
	return (
		left.filter((token) => rightSet.has(token)).length /
		Math.max(1, left.length + right.length)
	);
}

export function annotateSummary(
	document: TextDocument,
	result: SummaryResult,
	viewId?: string,
): TextDocument {
	const resolvedViewId = viewId ?? result.sentences[0]?.span.viewId ?? "raw";
	const layerId = uniqueLayerId(document, "summary.extractive");
	const annotations = Object.fromEntries(
		result.sentences.map((sentence) => [
			`${layerId}.${sentence.index}`,
			{
				id: `${layerId}.${sentence.index}`,
				layer: layerId,
				type: "summary.extractive",
				spans: [sentence.span],
				value: {
					index: sentence.index,
					text: sentence.text,
					score: scoreJson(sentence.score),
				},
				evidence: statisticalEvidence(
					"summary.extractive",
					[sentence.span.viewId],
					"E2",
					{
						index: sentence.index,
					},
				),
			} satisfies Annotation<JsonValue>,
		]),
	);
	return addLayer(document, {
		id: layerId,
		type: "summary.extractive",
		viewId: resolvedViewId,
		annotations,
	});
}

const parserRoot = -1;

interface ParserState {
	readonly stack: number[];
	buffer: number;
	readonly heads: (number | undefined)[];
	readonly relations: (string | undefined)[];
	readonly margins: (number | undefined)[];
}

interface GoldParse {
	readonly heads: readonly number[];
	readonly relations: readonly string[];
}

type MutableParserWeights = Record<string, Record<string, number>>;

function validateParserTokens(
	tokens: readonly ParserToken[],
): Map<string, number> {
	const ids = new Map<string, number>();
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index] as ParserToken;
		assertJsonString(token.id, `tokens[${index}].id`);
		assertJsonString(token.text, `tokens[${index}].text`);
		if (token.id.length === 0)
			throw new Error("parser token ids must be non-empty.");
		if (ids.has(token.id)) {
			throw new Error(`parser token ids must be unique: ${token.id}`);
		}
		if (token.lemma !== undefined) {
			assertJsonString(token.lemma, `tokens[${index}].lemma`);
		}
		if (token.pos !== undefined) {
			assertJsonString(token.pos, `tokens[${index}].pos`);
		}
		ids.set(token.id, index);
	}
	return ids;
}

function goldParseFor(sample: ParserTrainingSample): GoldParse {
	if (sample.tokens.length === 0) {
		throw new Error("parser training samples must contain at least one token.");
	}
	assertJsonValue(sample.metadata ?? null);
	const tokenIds = validateParserTokens(sample.tokens);
	if (sample.edges.length !== sample.tokens.length) {
		throw new Error(
			"parser training samples require exactly one edge per token.",
		);
	}
	const heads = Array.from({ length: sample.tokens.length }, () => -2);
	const relations = Array.from({ length: sample.tokens.length }, () => "");
	for (const edge of sample.edges) {
		assertJsonString(edge.head, "parser edge head");
		assertJsonString(edge.dependent, "parser edge dependent");
		assertJsonString(edge.relation, "parser edge relation");
		if (edge.relation.length === 0) {
			throw new Error("parser edge relations must be non-empty.");
		}
		const dependent = tokenIds.get(edge.dependent);
		if (dependent === undefined) {
			throw new Error(`parser edge has unknown dependent: ${edge.dependent}`);
		}
		if ((heads[dependent] ?? -2) !== -2) {
			throw new Error(`parser token has multiple heads: ${edge.dependent}`);
		}
		const head = edge.head === "ROOT" ? parserRoot : tokenIds.get(edge.head);
		if (head === undefined) {
			throw new Error(`parser edge has unknown head: ${edge.head}`);
		}
		if (head === dependent) {
			throw new Error(`parser token cannot head itself: ${edge.dependent}`);
		}
		heads[dependent] = head;
		relations[dependent] = edge.relation;
	}
	if (heads.filter((head) => head === parserRoot).length !== 1) {
		throw new Error("parser training trees require exactly one ROOT edge.");
	}
	for (let dependent = 0; dependent < heads.length; dependent += 1) {
		const seen = new Set<number>([dependent]);
		let head = heads[dependent] as number;
		while (head !== parserRoot) {
			if (head < 0 || head >= heads.length) {
				throw new Error("parser training tree contains an invalid head.");
			}
			if (seen.has(head)) {
				throw new Error("parser training tree must be acyclic.");
			}
			seen.add(head);
			head = heads[head] as number;
		}
	}
	return { heads, relations };
}

function parserActions(labels: readonly string[]): readonly ParserAction[] {
	return Object.freeze([
		"SHIFT",
		...labels.map((label) => `LEFT_ARC:${label}` as const),
		...labels.map((label) => `RIGHT_ARC:${label}` as const),
	]);
}

function initialParserState(tokenCount: number): ParserState {
	return {
		stack: [parserRoot],
		buffer: 0,
		heads: Array.from({ length: tokenCount }),
		relations: Array.from({ length: tokenCount }),
		margins: Array.from({ length: tokenCount }),
	};
}

function relationForAction(action: ParserAction): string {
	return action.slice(action.indexOf(":") + 1);
}

function validParserActions(
	state: ParserState,
	tokenCount: number,
	labels: readonly string[],
): readonly ParserAction[] {
	const actions: ParserAction[] = [];
	if (state.buffer < tokenCount) actions.push("SHIFT");
	if (state.stack.length < 2) return actions;
	const second = state.stack[state.stack.length - 2] as number;
	const top = state.stack[state.stack.length - 1] as number;
	if (second !== parserRoot && state.heads[second] === undefined) {
		for (const label of labels) actions.push(`LEFT_ARC:${label}`);
	}
	if (
		top !== parserRoot &&
		state.heads[top] === undefined &&
		(second !== parserRoot ||
			(state.buffer === tokenCount && state.stack.length === 2))
	) {
		for (const label of labels) actions.push(`RIGHT_ARC:${label}`);
	}
	return actions;
}

function applyParserAction(
	state: ParserState,
	action: ParserAction,
	margin = 0,
): void {
	if (action === "SHIFT") {
		state.stack.push(state.buffer);
		state.buffer += 1;
		return;
	}
	const topIndex = state.stack.length - 1;
	const secondIndex = topIndex - 1;
	if (action.startsWith("LEFT_ARC:")) {
		const dependent = state.stack[secondIndex] as number;
		state.heads[dependent] = state.stack[topIndex] as number;
		state.relations[dependent] = relationForAction(action);
		state.margins[dependent] = margin;
		state.stack.splice(secondIndex, 1);
		return;
	}
	const dependent = state.stack[topIndex] as number;
	state.heads[dependent] = state.stack[secondIndex] as number;
	state.relations[dependent] = relationForAction(action);
	state.margins[dependent] = margin;
	state.stack.pop();
}

function parserFeatureValues(
	tokens: readonly ParserToken[],
	state: ParserState,
): readonly string[] {
	const stackToken = (offset: number): number | undefined =>
		state.stack[state.stack.length - 1 - offset];
	const bufferToken = (offset: number): number | undefined =>
		state.buffer + offset < tokens.length ? state.buffer + offset : undefined;
	const features = new Set<string>([
		"bias",
		`stack-size=${Math.min(3, state.stack.length)}`,
		`buffer-empty=${state.buffer === tokens.length}`,
	]);
	const addToken = (prefix: string, index: number | undefined): void => {
		if (index === parserRoot) {
			features.add(`${prefix}:ROOT`);
			return;
		}
		if (index === undefined) {
			features.add(`${prefix}:NONE`);
			return;
		}
		const token = tokens[index];
		if (token === undefined) return;
		const word = token.text.normalize("NFKC").toLocaleLowerCase("und");
		features.add(`${prefix}:word=${word}`);
		features.add(`${prefix}:shape=${tokenShape(token.text)}`);
		if (token.lemma !== undefined)
			features.add(`${prefix}:lemma=${token.lemma}`);
		if (token.pos !== undefined) features.add(`${prefix}:pos=${token.pos}`);
	};
	const s0 = stackToken(0);
	const s1 = stackToken(1);
	const b0 = bufferToken(0);
	addToken("s0", s0);
	addToken("s1", s1);
	addToken("b0", b0);
	const tokenKey = (index: number | undefined): string => {
		if (index === parserRoot) return "ROOT";
		if (index === undefined) return "NONE";
		return (
			tokens[index]?.text.normalize("NFKC").toLocaleLowerCase("und") ?? "NONE"
		);
	};
	features.add(`s1+s0=${tokenKey(s1)}|${tokenKey(s0)}`);
	features.add(`s0+b0=${tokenKey(s0)}|${tokenKey(b0)}`);
	return Object.freeze([...features].sort(compareText));
}

function parserActionScore(
	weights: Readonly<Record<string, Readonly<Record<string, number>>>>,
	action: ParserAction,
	features: readonly string[],
): number {
	const row = weights[action] ?? {};
	return features.reduce((sum, feature) => sum + (row[feature] ?? 0), 0);
}

function highestScoreParserAction(
	weights: Readonly<Record<string, Readonly<Record<string, number>>>>,
	actions: readonly ParserAction[],
	features: readonly string[],
): { readonly action: ParserAction; readonly margin: number } {
	const scored = actions.map((action, index) => ({
		action,
		index,
		score: parserActionScore(weights, action, features),
	}));
	scored.sort(
		(left, right) => right.score - left.score || left.index - right.index,
	);
	const selected = scored[0];
	if (selected === undefined)
		throw new Error("parser reached a state with no valid action.");
	return {
		action: selected.action,
		margin: Math.max(0, selected.score - (scored[1]?.score ?? selected.score)),
	};
}

function goldParserAction(state: ParserState, gold: GoldParse): ParserAction {
	const top = state.stack[state.stack.length - 1];
	const second = state.stack[state.stack.length - 2];
	const dependentsComplete = (head: number): boolean =>
		gold.heads.every(
			(goldHead, dependent) =>
				goldHead !== head || state.heads[dependent] !== undefined,
		);
	if (
		second !== undefined &&
		top !== undefined &&
		second !== parserRoot &&
		gold.heads[second] === top &&
		dependentsComplete(second)
	) {
		return `LEFT_ARC:${gold.relations[second] as string}`;
	}
	if (
		second !== undefined &&
		top !== undefined &&
		top !== parserRoot &&
		gold.heads[top] === second &&
		dependentsComplete(top)
	) {
		return `RIGHT_ARC:${gold.relations[top] as string}`;
	}
	if (state.buffer < gold.heads.length) return "SHIFT";
	throw new Error(
		"parser training tree is non-projective or cannot be represented by arc-standard transitions.",
	);
}

function updateParserWeights(
	weights: MutableParserWeights,
	action: ParserAction,
	features: readonly string[],
	delta: number,
): void {
	let row = weights[action];
	if (row === undefined) {
		row = {};
		weights[action] = row;
	}
	for (const feature of features) {
		const value = (row[feature] ?? 0) + delta;
		if (value === 0) delete row[feature];
		else row[feature] = finite(value, "parser weight");
	}
}

export function trainClassicalParser(
	samples: Iterable<ParserTrainingSample>,
	options: TrainParserOptions = {},
): ClassicalParser {
	assertJsonValue(options.metadata ?? null);
	const materialized = [...samples];
	if (materialized.length === 0) {
		throw new Error(
			"trainClassicalParser requires at least one training sample.",
		);
	}
	const gold = materialized.map((sample) => goldParseFor(sample));
	const labels = validateLabels(
		options.labels ??
			sortedUnique(
				materialized.flatMap((sample) =>
					sample.edges.map((edge) => edge.relation),
				),
			),
	);
	const labelSet = new Set(labels);
	for (const sample of materialized) {
		if (
			sample.weight !== undefined &&
			(!Number.isFinite(sample.weight) || sample.weight <= 0)
		) {
			throw new RangeError(
				"parser sample weights must be finite positive numbers.",
			);
		}
		for (const edge of sample.edges) {
			if (!labelSet.has(edge.relation)) {
				throw new Error(
					`parser edge relation is not declared: ${edge.relation}`,
				);
			}
		}
	}
	const iterations = options.iterations ?? 12;
	if (!Number.isInteger(iterations) || iterations <= 0) {
		throw new RangeError("parser iterations must be a positive integer.");
	}
	const learningRate = options.learningRate ?? 1;
	if (!Number.isFinite(learningRate) || learningRate <= 0) {
		throw new RangeError("parser learningRate must be finite and positive.");
	}
	const actions = parserActions(labels);
	const weights: MutableParserWeights = Object.fromEntries(
		actions.map((action) => [action, {}]),
	);
	for (let iteration = 0; iteration < iterations; iteration += 1) {
		for (
			let sampleIndex = 0;
			sampleIndex < materialized.length;
			sampleIndex += 1
		) {
			const sample = materialized[sampleIndex] as ParserTrainingSample;
			const sampleGold = gold[sampleIndex] as GoldParse;
			const state = initialParserState(sample.tokens.length);
			while (state.buffer < sample.tokens.length || state.stack.length > 1) {
				const features = parserFeatureValues(sample.tokens, state);
				const valid = validParserActions(state, sample.tokens.length, labels);
				const predicted = highestScoreParserAction(
					weights,
					valid,
					features,
				).action;
				const expected = goldParserAction(state, sampleGold);
				if (!valid.includes(expected)) {
					throw new Error(
						"gold parser action is invalid for the current state.",
					);
				}
				if (predicted !== expected) {
					const delta = learningRate * (sample.weight ?? 1);
					updateParserWeights(weights, expected, features, delta);
					updateParserWeights(weights, predicted, features, -delta);
				}
				applyParserAction(state, expected);
			}
			if (
				state.heads.some((head, index) => head !== sampleGold.heads[index]) ||
				state.relations.some(
					(relation, index) => relation !== sampleGold.relations[index],
				)
			) {
				throw new Error(
					"parser training tree is non-projective or cannot be represented by arc-standard transitions.",
				);
			}
		}
	}
	const frozenWeights = orderedRecord(
		actions.map(
			(action) =>
				[action, orderedRecord(Object.entries(weights[action] ?? {}))] as const,
		),
	) as Readonly<Record<ParserAction, Readonly<Record<string, number>>>>;
	const trainingSignature: JsonValue[] = materialized.map((sample) => ({
		...(sample.id !== undefined ? { id: sample.id } : {}),
		tokens: sample.tokens.map((token) => ({
			id: token.id,
			text: token.text,
			...(token.lemma !== undefined ? { lemma: token.lemma } : {}),
			...(token.pos !== undefined ? { pos: token.pos } : {}),
		})),
		edges: sample.edges.map((edge) => ({ ...edge })),
		weight: sample.weight ?? 1,
	}));
	const metadata = metadataFor("transition-perceptron-parser", {
		labels,
		iterations,
		learningRate,
		samples: trainingSignature,
		metadata: options.metadata ?? null,
	});
	return {
		id: metadata.id,
		kind: "transition-perceptron",
		labels,
		actions,
		weights: frozenWeights,
		metadata,
	};
}

export function parseDependencies(
	parser: ClassicalParser,
	tokens: readonly ParserToken[],
): readonly DependencyParseEdge[] {
	validateParserTokens(tokens);
	if (tokens.length === 0) return Object.freeze([]);
	const state = initialParserState(tokens.length);
	while (state.buffer < tokens.length || state.stack.length > 1) {
		const features = parserFeatureValues(tokens, state);
		const valid = validParserActions(state, tokens.length, parser.labels);
		const decision = highestScoreParserAction(parser.weights, valid, features);
		applyParserAction(state, decision.action, decision.margin);
	}
	return Object.freeze(
		tokens.map((token, dependent) => {
			const head = state.heads[dependent];
			const relation = state.relations[dependent];
			if (head === undefined || relation === undefined) {
				throw new Error(`parser failed to attach token: ${token.id}`);
			}
			return Object.freeze({
				head: head === parserRoot ? "ROOT" : (tokens[head]?.id ?? "ROOT"),
				dependent: token.id,
				relation,
				score: {
					kind: "margin",
					value: state.margins[dependent] ?? 0,
					scale: parser.kind,
				} satisfies Score,
			});
		}),
	);
}

export function tokenSequenceFromText(text: string): TokenSequence {
	return { tokens: tokenizeWithSpans(text).map((token) => token.text) };
}

export const defaultFeatureSpecs = Object.freeze([
	textFeatureSpec(),
	charNgramFeatureSpec(2, 3),
	wordNgramFeatureSpec(1, 2),
	shapeFeatureSpec(),
	affixFeatureSpec(),
]);
