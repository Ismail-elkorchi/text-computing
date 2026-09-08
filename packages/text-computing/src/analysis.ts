import type { TextDataSegment } from "./data/index.ts";
import type { Annotation, TextDocument, TokenValue } from "./document/mod.ts";
import { selectAnnotations } from "./document/mod.ts";
import { packageVersion } from "./internal/constants.ts";
import { planDocumentTasks } from "./internal/tasks.ts";
import type {
	AnalyzedDocument,
	DocumentAnalysis,
	TextComputingDocumentAnalysisOptions,
	TextComputingEntityLinkSummary,
	TextComputingEntitySummary,
	TextComputingEvidence,
	TextComputingLemmaSummary,
	TextComputingMorphologySummary,
	TextComputingNlp,
	TextComputingQualitySummary,
	TextComputingSearchTokenSummary,
	TextComputingToken,
} from "./internal/types.ts";
import { createPipelineResourceRegistry } from "./pipeline/pack/registry.ts";
import type { TextProcessor } from "./pipeline/processor/types.ts";
import { stableHash64 } from "./unicode/hash/mod.ts";

export type { AnalyzedDocument, DocumentAnalysis } from "./internal/types.ts";

function annotations<T>(
	doc: TextDocument,
	layer: string,
): readonly Annotation<T>[] {
	return selectAnnotations(doc, { layer }) as readonly Annotation<T>[];
}

function coordinates(doc: TextDocument, annotation: Annotation) {
	const ref = annotation.spans.find(
		(candidate) => candidate.span.unit === "utf16-code-unit",
	);
	if (ref === undefined)
		throw new TypeError(
			`Analysis annotation ${annotation.id} has no UTF-16 span.`,
		);
	const view = doc.views[ref.viewId];
	if (view === undefined)
		throw new TypeError(
			`Analysis annotation ${annotation.id} references a missing view.`,
		);
	return {
		viewId: ref.viewId,
		startCU: ref.span.start,
		endCU: ref.span.end,
		text: view.text.slice(ref.span.start, ref.span.end),
	};
}

function entityLinksFromDocument(
	doc: TextDocument,
	tokens: readonly Pick<
		TextComputingToken,
		"endCU" | "id" | "startCU" | "viewId"
	>[],
): readonly TextComputingEntityLinkSummary[] {
	const annotations = selectAnnotations(doc, { type: "link.entity" });
	return Object.freeze(
		annotations.flatMap((annotation) => {
			const ref = annotation.spans.find(
				(candidate) => candidate.span.unit === "utf16-code-unit",
			);
			const view = ref === undefined ? undefined : doc.views[ref.viewId];
			const value = annotation.value;
			if (
				ref === undefined ||
				view === undefined ||
				value === undefined ||
				value === null ||
				typeof value !== "object"
			) {
				return [];
			}
			const record = value as {
				readonly entityId?: unknown;
				readonly label?: unknown;
				readonly matchedAlias?: unknown;
				readonly matchKind?: unknown;
				readonly score?: unknown;
				readonly rank?: unknown;
				readonly types?: unknown;
				readonly entityTypes?: unknown;
				readonly sourceEntityId?: unknown;
			};
			return typeof record.entityId === "string" &&
				typeof record.label === "string"
				? [
						Object.freeze({
							entityId: record.entityId,
							label: record.label,
							matchedAlias:
								typeof record.matchedAlias === "string"
									? record.matchedAlias
									: record.label,
							matchKind:
								typeof record.matchKind === "string"
									? record.matchKind
									: "link",
							score: typeof record.score === "number" ? record.score : 0,
							rank: typeof record.rank === "number" ? record.rank : 0,
							types: jsonStringArray(record.entityTypes ?? record.types),
							mention: view.text.slice(ref.span.start, ref.span.end),
							viewId: ref.viewId,
							startCU: ref.span.start,
							endCU: ref.span.end,
							tokenIds: Object.freeze(
								tokens
									.filter(
										(token) =>
											token.viewId === ref.viewId &&
											token.startCU < ref.span.end &&
											token.endCU > ref.span.start,
									)
									.map((token) => token.id),
							),
							...(typeof record.sourceEntityId === "string"
								? { sourceEntityId: record.sourceEntityId }
								: {}),
						}),
					]
				: [];
		}),
	);
}

function jsonStringArray(value: unknown): readonly string[] {
	if (!Array.isArray(value)) return Object.freeze([]);
	return Object.freeze(
		value.flatMap((entry) => (typeof entry === "string" ? [entry] : [])),
	);
}

/** A typed projection of canonical layers; it is never a second document. */
export function analysisOf(doc: TextDocument): DocumentAnalysis {
	const metadata = doc.metadata.analysis as
		| {
				readonly sourceViewId: string;
				readonly languageTag: string;
				readonly quality: TextComputingQualitySummary;
				readonly evidence: readonly TextComputingEvidence[];
		  }
		| undefined;
	if (
		metadata === undefined ||
		doc.views[metadata.sourceViewId] === undefined
	) {
		throw new TypeError(
			"Document has no Text Computing analysis. Run an analysis before requesting its projection.",
		);
	}
	const lemmas = annotations<TextComputingLemmaSummary>(
		doc,
		"lemma.text-computing",
	).map((a) => ({
		...(a.value as TextComputingLemmaSummary),
		...coordinates(doc, a),
	}));
	const morphology = annotations<TextComputingMorphologySummary>(
		doc,
		"morph.text-computing",
	).map((a) => ({
		...(a.value as TextComputingMorphologySummary),
		...coordinates(doc, a),
	}));
	const tokenAnnotations = annotations<TokenValue & Partial<TextDataSegment>>(
		doc,
		"token.text-computing",
	);
	const tokenSpans = tokenAnnotations.map((a) => ({
		id: a.id,
		...coordinates(doc, a),
	}));
	const entities = annotations<
		Pick<TextComputingEntitySummary, "type" | "modelLabel">
	>(doc, "entity.text-computing").map((a) => {
		const span = coordinates(doc, a);
		return Object.freeze({
			...(a.value as Pick<TextComputingEntitySummary, "type" | "modelLabel">),
			...span,
			id: a.id,
			score: a.score?.value ?? 0,
			tokenIds: tokenSpans
				.filter(
					(t) =>
						t.viewId === span.viewId &&
						t.startCU < span.endCU &&
						t.endCU > span.startCU,
				)
				.map((t) => t.id),
		});
	});
	const entityLinks = entityLinksFromDocument(doc, tokenSpans);
	const grouped = <T>(
		items: readonly T[],
		ids: (item: T) => readonly string[],
	) => {
		const index = new Map<string, T[]>();
		for (const item of items)
			for (const id of ids(item)) {
				const group = index.get(id);
				if (group === undefined) index.set(id, [item]);
				else group.push(item);
			}
		return (id: string): readonly T[] => Object.freeze(index.get(id) ?? []);
	};
	const lemmasFor = grouped(lemmas, (item) => [item.tokenId]);
	const morphologyFor = grouped(morphology, (item) => [item.tokenId]);
	const entitiesFor = grouped(entities, (item) => item.tokenIds);
	const linksFor = grouped(entityLinks, (item) => item.tokenIds);
	const tokens = tokenAnnotations.map((a, index) =>
		Object.freeze({
			...(a.value as TextComputingToken),
			...coordinates(doc, a),
			id: a.id,
			index,
			normalizedText: a.value?.normalized ?? coordinates(doc, a).text,
			lemmas: lemmasFor(a.id),
			morphology: morphologyFor(a.id),
			entities: entitiesFor(a.id),
			entityLinks: linksFor(a.id),
		}),
	);
	const segments = (layer: string) =>
		Object.freeze(
			annotations<TextDataSegment>(doc, layer).map((a) =>
				Object.freeze({
					...(a.value as TextDataSegment),
					...coordinates(doc, a),
				}),
			),
		);
	return Object.freeze({
		text: doc.views[metadata.sourceViewId]?.text ?? "",
		sourceViewId: metadata.sourceViewId,
		languageTag: metadata.languageTag,
		sentences: segments("sentence.text-computing"),
		lexicalUnits: segments("lexical.text-computing"),
		tokens: Object.freeze(tokens),
		lemmas: Object.freeze(lemmas),
		morphology: Object.freeze(morphology),
		entities: Object.freeze(entities),
		entityLinks,
		searchTokens: Object.freeze(
			annotations<TextComputingSearchTokenSummary>(
				doc,
				"search.text-computing",
			).map((a) =>
				Object.freeze({
					...(a.value as TextComputingSearchTokenSummary),
					...coordinates(doc, a),
				}),
			),
		),
		quality: metadata.quality,
		evidence: metadata.evidence,
	});
}

/** Non-enumerable conveniences leave serialization and downstream operations canonical. */
export function withAnalysis(doc: TextDocument): AnalyzedDocument {
	const projection = analysisOf(doc);
	const result = { ...doc };
	for (const key of Object.keys(projection) as (keyof DocumentAnalysis)[]) {
		Object.defineProperty(result, key, {
			get: () => projection[key],
			enumerable: false,
		});
	}
	return Object.freeze(result) as AnalyzedDocument;
}

/** Use the same resource-backed analysis implementation in a document pipeline. */
export function analysisProcessor(
	nlp: TextComputingNlp,
	options: TextComputingDocumentAnalysisOptions = {},
): TextProcessor {
	// Capture configuration so later caller mutations cannot invalidate cache identity.
	options = structuredClone(options);
	const tasks = planDocumentTasks(options.tasks, options.preset);
	const layers = [
		"token.text-computing",
		"sentence.text-computing",
		"lexical.text-computing",
	];
	if (tasks.has("lexicon") || tasks.has("morphology"))
		layers.push("lemma.text-computing");
	if (tasks.has("morphology")) layers.push("morph.text-computing");
	if (tasks.has("entities")) layers.push("entity.text-computing");
	if (tasks.has("search")) layers.push("search.text-computing");
	if (tasks.has("kb"))
		layers.push(options.entityLinking?.layerId ?? "link.entity");
	const resources = createPipelineResourceRegistry({ packs: [nlp.pack] });
	return Object.freeze({
		id: "text-computing.analysis",
		version: packageVersion,
		fingerprint: stableHash64(
			JSON.stringify({
				resources: resources.fingerprint(),
				manifest: nlp.pack.manifest,
				executor:
					nlp.entityExecutor === undefined
						? null
						: {
								id: nlp.entityExecutor.id,
								version: nlp.entityExecutor.version,
							},
				options,
			}),
		),
		provides: Object.freeze(layers.map((layer) => Object.freeze({ layer }))),
		async process(document, context) {
			context.signal?.throwIfAborted();
			const result = await nlp.document.analyzeDocument(document, options);
			context.signal?.throwIfAborted();
			return result;
		},
	} satisfies TextProcessor);
}
