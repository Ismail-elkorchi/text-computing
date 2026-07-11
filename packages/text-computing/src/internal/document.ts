import type {
	TextDataSegment,
	TextDataSegmentationAdapter,
} from "@ismail-elkorchi/textdata";
import {
	type Annotation,
	addLayer,
	addViewWithSpanMap,
	createDocument,
	type Evidence,
	type TextDocument,
} from "@ismail-elkorchi/textdoc";
import {
	knowledgeBaseSliceFromPack,
	linkEntities,
} from "@ismail-elkorchi/textkb";
import {
	type LexicalMatch,
	lookupManyFromPackAsync,
	type MorphologyAnalysis,
	morphologyAnalysesManyFromPackAsync,
} from "@ismail-elkorchi/textlex";
import type {
	CompiledTextNormProfile,
	NormalizationViewResult,
} from "@ismail-elkorchi/textnorm";
import type {
	TextPack,
	TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import {
	createPipeline,
	createPipelineResourceRegistry,
	type PipelineDiagnostic,
	type PipelineTraceEvent,
	runPipeline,
	type TextPipeline,
	type TextProcessor,
} from "@ismail-elkorchi/textpipeline";
import {
	analyzeDocumentQuality,
	type QualityProfile,
	type QualityReport,
} from "@ismail-elkorchi/textquality";
import type { Analyzer, SearchToken } from "@ismail-elkorchi/textsearch";
import {
	assertRunnableTask,
	planDocumentTasks,
	uniqueSorted,
} from "./tasks.js";
import type {
	TextComputingDocument,
	TextComputingDocumentAnalysisOptions,
	TextComputingDocumentJson,
	TextComputingDocumentTask,
	TextComputingEntitySummary,
	TextComputingEvidence,
	TextComputingLemmaSummary,
	TextComputingMorphologySummary,
	TextComputingPipelineRun,
	TextComputingPipelineRunOptions,
	TextComputingQualitySummary,
	TextComputingSearchTokenSummary,
	TextComputingToken,
} from "./types.js";

export interface TextComputingDocumentRuntime {
	readonly pack: TextPack;
	readonly reader: TextPackResourceReader | undefined;
	readonly languageTag: string;
	readonly openSegmentation: () => Promise<TextDataSegmentationAdapter>;
	readonly openNormalization: () => Promise<CompiledTextNormProfile>;
	readonly openAnalyzer: () => Promise<Analyzer>;
	readonly openQualityProfiles: () => Promise<readonly QualityProfile[]>;
	readonly mergeQualityProfiles: (
		profiles: readonly QualityProfile[],
	) => QualityProfile | undefined;
}

export interface TextComputingDocumentRuntimeApi {
	readonly analyzeText: (
		text: string,
		options?: TextComputingDocumentAnalysisOptions,
	) => Promise<TextComputingDocument>;
	readonly analyzeDocument: (
		doc: TextDocument,
		options?: TextComputingDocumentAnalysisOptions,
	) => Promise<TextComputingDocument>;
	readonly createDocumentAnalysisPipeline: (
		options?: TextComputingDocumentAnalysisOptions,
	) => TextPipeline;
	readonly runText: (
		text: string,
		options?: TextComputingPipelineRunOptions,
	) => Promise<TextComputingPipelineRun>;
	readonly runDocument: (
		doc: TextDocument,
		options?: TextComputingPipelineRunOptions,
	) => Promise<TextComputingPipelineRun>;
}

function sourceView(doc: TextDocument): TextDocument["views"][string] {
	const raw = doc.views.raw;
	if (raw !== undefined) return raw;
	const roots = Object.values(doc.views).filter(
		(view) => view.sourceViewId === undefined,
	);
	const rawRoots = roots.filter(
		(view) => view.kind === "raw" || view.kind === "decoded",
	);
	if (rawRoots.length === 1) return rawRoots[0] as (typeof rawRoots)[number];
	if (rawRoots.length > 1) {
		throw new TypeError(
			`Document ${doc.id} has ambiguous raw text views: ${rawRoots
				.map((view) => view.id)
				.sort((left, right) => left.localeCompare(right))
				.join(", ")}.`,
		);
	}
	if (roots.length === 1) return roots[0] as (typeof roots)[number];
	throw new TypeError(
		roots.length === 0
			? `Document ${doc.id} has no source text view.`
			: `Document ${doc.id} has ambiguous source text views: ${roots
					.map((view) => view.id)
					.sort((left, right) => left.localeCompare(right))
					.join(", ")}.`,
	);
}

function ensureSearchView(
	doc: TextDocument,
	searchView: NormalizationViewResult,
): TextDocument {
	const existingView = doc.views[searchView.view.id];
	const existingSpanMap = doc.spanMaps[searchView.spanMap.id];
	if (existingView !== undefined || existingSpanMap !== undefined) {
		if (
			existingView === undefined ||
			existingSpanMap === undefined ||
			JSON.stringify(existingView) !== JSON.stringify(searchView.view) ||
			JSON.stringify(existingSpanMap) !== JSON.stringify(searchView.spanMap)
		) {
			throw new TypeError(
				`Document ${doc.id} has a conflicting normalization view or span map for ${searchView.view.id}.`,
			);
		}
		return doc;
	}
	return addViewWithSpanMap(doc, searchView.view, searchView.spanMap);
}

function entityCandidatesFromDocument(
	doc: TextDocument,
	tokens: readonly Pick<
		TextComputingToken,
		"endCU" | "id" | "startCU" | "viewId"
	>[],
): readonly TextComputingEntitySummary[] {
	const annotations = Object.values(
		doc.layers["link.entity"]?.annotations ?? {},
	);
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

export function mentionCandidates(
	text: string,
	lexicalUnits: readonly {
		readonly startCU: number;
		readonly endCU: number;
		readonly text: string;
		readonly isWordLike?: boolean;
	}[],
): readonly string[] {
	const wordLike = lexicalUnits.filter((segment) => segment.isWordLike);
	const mentions = new Set<string>();
	for (const segment of wordLike) {
		mentions.add(segment.text);
	}
	for (let start = 0; start < wordLike.length; start += 1) {
		for (
			let end = start + 1;
			end < wordLike.length && end - start < 5;
			end += 1
		) {
			const previous = wordLike[end - 1];
			const current = wordLike[end];
			if (previous === undefined || current === undefined) continue;
			const separator = text.slice(previous.endCU, current.startCU);
			if (!isMentionJoiner(separator)) break;
			mentions.add(text.slice(wordLike[start]?.startCU ?? 0, current.endCU));
		}
	}
	return Object.freeze(
		[...mentions]
			.map((mention) => mention.trim())
			.filter((mention) => mention.length > 0)
			.sort((left, right) => left.localeCompare(right)),
	);
}

function isMentionJoiner(value: string): boolean {
	if (value.length === 0) return true;
	return /^[\p{White_Space}\u00ad\u058a\u05be\u2010-\u2015-]+$/u.test(value);
}

function documentJson(doc: TextComputingDocument): TextComputingDocumentJson {
	return Object.freeze({
		text: doc.text,
		sourceViewId: doc.sourceViewId,
		languageTag: doc.languageTag,
		sentences: doc.sentences,
		tokens: doc.tokens,
		lexicalUnits: doc.lexicalUnits,
		lemmas: doc.lemmas,
		morphology: doc.morphology,
		entities: doc.entities,
		searchTokens: doc.searchTokens,
		quality: doc.quality,
		evidence: doc.evidence,
	});
}

function emptyQualityReport(doc: TextDocument): QualityReport {
	return Object.freeze({
		id: `${doc.id}:text-computing-quality-skipped`,
		target: "document" as const,
		findings: Object.freeze([]),
		metrics: Object.freeze({}),
		summaries: Object.freeze({ skipped: true }),
	});
}

interface LexicalUnitAnalysis {
	readonly tokenId: string;
	readonly sourceViewId: string;
	readonly segment: TextDataSegment;
	readonly normalizedText: string;
	readonly morphologyQueryForm: string;
	readonly lexiconMatches: readonly LexicalMatch[];
	readonly morphologyAnalyses: readonly MorphologyAnalysis[];
}

function morphologySummary(
	analysis: MorphologyAnalysis,
	tokenId: string,
	viewId: string,
	segment: TextDataSegment,
	queryForm: string,
): TextComputingMorphologySummary {
	return Object.freeze({
		tokenId,
		viewId,
		startCU: segment.startCU,
		endCU: segment.endCU,
		queryForm,
		form: analysis.form,
		...(analysis.lemma === undefined ? {} : { lemma: analysis.lemma }),
		...(analysis.partOfSpeech === undefined
			? {}
			: { partOfSpeech: analysis.partOfSpeech }),
		features: Object.freeze({ ...analysis.features }),
		...(analysis.entryId === undefined ? {} : { entryId: analysis.entryId }),
		sourceResourceId: analysis.sourceResourceId,
	});
}

function lemmaSummaries(
	analysis: LexicalUnitAnalysis,
): readonly TextComputingLemmaSummary[] {
	const summaries = new Map<string, TextComputingLemmaSummary>();
	for (const morphology of analysis.morphologyAnalyses) {
		if (morphology.lemma === undefined || morphology.lemma.length === 0)
			continue;
		const summary = Object.freeze({
			tokenId: analysis.tokenId,
			viewId: analysis.sourceViewId,
			startCU: analysis.segment.startCU,
			endCU: analysis.segment.endCU,
			value: morphology.lemma,
			queryForm: analysis.morphologyQueryForm,
			source: "morphology" as const,
			sourceResourceId: morphology.sourceResourceId,
		});
		summaries.set(
			`${summary.source}\u0000${summary.value}\u0000${summary.sourceResourceId}`,
			summary,
		);
	}
	for (const match of analysis.lexiconMatches) {
		if (match.canonical === undefined || match.canonical.length === 0) continue;
		const summary = Object.freeze({
			tokenId: analysis.tokenId,
			viewId: analysis.sourceViewId,
			startCU: analysis.segment.startCU,
			endCU: analysis.segment.endCU,
			value: match.canonical,
			queryForm: match.matchedText,
			source: "lexicon" as const,
			...(match.source === undefined ? {} : { sourceResourceId: match.source }),
		});
		summaries.set(
			`${summary.source}\u0000${summary.value}\u0000${summary.sourceResourceId ?? ""}`,
			summary,
		);
	}
	return Object.freeze([...summaries.values()]);
}

function analysisEvidence(
	mode: Evidence["mode"],
	resourceIds: readonly string[],
	inputViewId: string,
): Evidence {
	return Object.freeze({
		mode,
		exactness: "E1" as const,
		producer: "@ismail-elkorchi/text-computing",
		packageName: "@ismail-elkorchi/text-computing",
		packageVersion: "0.1.0",
		resourceIds: uniqueSorted(resourceIds),
		inputViewIds: Object.freeze([inputViewId]),
	});
}

function annotationSpan(segment: TextDataSegment, viewId: string) {
	return Object.freeze({
		viewId,
		span: Object.freeze({
			start: segment.startCU,
			end: segment.endCU,
			unit: "utf16-code-unit" as const,
		}),
	});
}

function addAnalysisLayer(
	doc: TextDocument,
	id: string,
	type: string,
	viewId: string,
	annotations: readonly Annotation[],
): TextDocument {
	if (doc.layers[id] !== undefined) {
		throw new TypeError(
			`Text computing cannot replace existing analysis layer ${id}; remove or rename the layer before re-analysis.`,
		);
	}
	return addLayer(doc, {
		id,
		type,
		viewId,
		annotations: Object.fromEntries(
			annotations.map((annotation) => [annotation.id, annotation]),
		),
		metadata: { producer: "@ismail-elkorchi/text-computing" },
	});
}

function addAnalysisLayers(
	doc: TextDocument,
	analyses: readonly LexicalUnitAnalysis[],
	tasks: ReadonlySet<TextComputingDocumentTask>,
	sourceViewId: string,
): TextDocument {
	let output = addAnalysisLayer(
		doc,
		"token.text-computing",
		"token.word",
		sourceViewId,
		analyses.map((analysis) => ({
			id: analysis.tokenId,
			layer: "token.text-computing",
			type: "token.word",
			spans: [annotationSpan(analysis.segment, sourceViewId)],
			value: {
				text: analysis.segment.text,
				normalizedText: analysis.normalizedText,
				isWordLike: analysis.segment.isWordLike ?? true,
			},
			evidence: analysisEvidence("algorithm", [], sourceViewId),
		})),
	);
	if (tasks.has("lexicon") || tasks.has("morphology")) {
		output = addAnalysisLayer(
			output,
			"lemma.text-computing",
			"lemma.candidate",
			sourceViewId,
			analyses.flatMap((analysis, tokenIndex) =>
				lemmaSummaries(analysis).map((lemma, lemmaIndex) => ({
					id: `text-computing-lemma-${tokenIndex}-${lemmaIndex}`,
					layer: "lemma.text-computing",
					type: "lemma.candidate",
					spans: [annotationSpan(analysis.segment, sourceViewId)],
					value: lemma,
					evidence: analysisEvidence(
						lemma.source === "morphology" ? "algorithm" : "lexicon",
						lemma.sourceResourceId === undefined
							? []
							: [lemma.sourceResourceId],
						sourceViewId,
					),
				})),
			),
		);
	}
	if (tasks.has("morphology")) {
		output = addAnalysisLayer(
			output,
			"morph.text-computing",
			"morph.analysis",
			sourceViewId,
			analyses.flatMap((analysis, tokenIndex) =>
				analysis.morphologyAnalyses.map((morphology, morphologyIndex) => ({
					id: `text-computing-morph-${tokenIndex}-${morphologyIndex}`,
					layer: "morph.text-computing",
					type: "morph.analysis",
					spans: [annotationSpan(analysis.segment, sourceViewId)],
					value: morphologySummary(
						morphology,
						analysis.tokenId,
						sourceViewId,
						analysis.segment,
						analysis.morphologyQueryForm,
					),
					features: morphology.features,
					evidence: analysisEvidence(
						"algorithm",
						[morphology.sourceResourceId],
						sourceViewId,
					),
				})),
			),
		);
	}
	return output;
}

function searchTokenSummary(
	token: SearchToken,
	viewId: string,
): TextComputingSearchTokenSummary {
	return Object.freeze({
		term: token.term,
		position: token.position,
		startCU: token.startCU,
		endCU: token.endCU,
		viewId,
		...(token.type === undefined ? {} : { type: token.type }),
	});
}

function qualitySummary(report: QualityReport): TextComputingQualitySummary {
	return Object.freeze({
		id: report.id,
		target: report.target,
		findingCount: report.findings.length,
		findings: Object.freeze(
			report.findings.map((finding) =>
				Object.freeze({
					id: finding.id,
					kind: finding.kind,
					severity: finding.severity,
					message: finding.message,
				}),
			),
		),
		metricCount: Object.keys(report.metrics).length,
		metrics: Object.freeze({ ...report.metrics }),
		...(report.summaries.skipped === true ? { skipped: true } : {}),
	});
}

function evidenceForTasks(
	pack: TextPack,
	tasks: ReadonlySet<
		NonNullable<TextComputingDocumentAnalysisOptions["tasks"]>[number]
	>,
	quality: QualityReport | undefined,
): readonly TextComputingEvidence[] {
	const componentPackageNames = Object.freeze(
		[...(pack.manifest.components ?? [])]
			.filter((component) => component.role === "required")
			.map((component) => component.packageName)
			.sort((left, right) => left.localeCompare(right)),
	);
	const slotEvidence = [...tasks]
		.sort((left, right) => left.localeCompare(right))
		.map((task) => {
			const slot = pack.manifest.capabilitySlots.find(
				(candidate) => candidate.slot === task,
			);
			if (slot === undefined) {
				throw new TypeError(
					`Textpack ${pack.manifest.packageName} is missing analyzed task slot ${task}.`,
				);
			}
			return Object.freeze({
				id: `${pack.manifest.id}:${task}:slot`,
				kind: "task-slot" as const,
				task,
				packageName: pack.manifest.packageName,
				packId: pack.manifest.id,
				status: slot.status,
				tier: slot.tier,
				resourceIds: uniqueSorted([
					...(slot.resourceIds ?? []),
					...(slot.bindings ?? []).map((binding) => binding.resourceId),
				]),
				componentPackageNames,
			});
		});
	return Object.freeze([
		...slotEvidence,
		...(quality === undefined
			? []
			: [
					Object.freeze({
						id: `${pack.manifest.id}:quality:${quality.id}`,
						kind: "quality-report" as const,
						task: "quality" as const,
						packageName: pack.manifest.packageName,
						packId: pack.manifest.id,
						resourceIds: Object.freeze([]),
						componentPackageNames,
						reportId: quality.id,
					}),
				]),
	]);
}

function readerOption(reader: TextPackResourceReader | undefined) {
	return reader === undefined ? {} : { reader };
}

function preferredQueryResults<T>(
	results: ReadonlyMap<string, readonly T[]>,
	rawForm: string,
	normalizedForm: string,
	isExactRawResult?: (value: T) => boolean,
): { readonly queryForm: string; readonly results: readonly T[] } {
	const rawResults = results.get(rawForm) ?? [];
	if (
		rawForm !== normalizedForm &&
		isExactRawResult !== undefined &&
		rawResults.some(isExactRawResult)
	) {
		return { queryForm: rawForm, results: rawResults };
	}
	if (normalizedForm.length > 0) {
		const normalizedResults = results.get(normalizedForm) ?? [];
		if (normalizedResults.length > 0 || normalizedForm === rawForm) {
			return { queryForm: normalizedForm, results: normalizedResults };
		}
	}
	return {
		queryForm: rawForm,
		results: rawResults,
	};
}

function queryForms(
	rawForms: readonly string[],
	normalizedByRaw: ReadonlyMap<string, string>,
): readonly string[] {
	const forms = new Set<string>();
	for (const rawForm of rawForms) {
		const normalizedForm = normalizedByRaw.get(rawForm) ?? rawForm;
		if (normalizedForm.length > 0) forms.add(normalizedForm);
		forms.add(rawForm);
	}
	return Object.freeze([...forms]);
}

function morphologyFeatureKey(
	features: Readonly<Record<string, string>>,
): string {
	const featureBundle = features.featureBundle;
	if (featureBundle !== undefined) return featureBundle;
	return JSON.stringify(
		Object.entries(features)
			.filter(
				([name]) =>
					name !== "featureCount" &&
					name !== "source" &&
					name !== "sourceLineNumber",
			)
			.sort(([left], [right]) => left.localeCompare(right)),
	);
}

function morphologySemanticKey(analysis: MorphologyAnalysis): string {
	return JSON.stringify([
		analysis.form,
		analysis.lemma ?? "",
		analysis.partOfSpeech ?? "",
		analysis.entryId ?? "",
		morphologyFeatureKey(analysis.features),
	]);
}

function limitMorphologyAnalyses(
	analyses: readonly MorphologyAnalysis[],
	maxResults: number,
): readonly MorphologyAnalysis[] {
	const uniqueAnalyses = new Map<string, MorphologyAnalysis>();
	for (const analysis of analyses) {
		const key = morphologySemanticKey(analysis);
		if (!uniqueAnalyses.has(key)) uniqueAnalyses.set(key, analysis);
	}
	return Object.freeze([...uniqueAnalyses.values()].slice(0, maxResults));
}

async function documentMorphologyAnalyses(
	pack: TextPack,
	forms: readonly string[],
	reader: TextPackResourceReader | undefined,
	maxResults: number | undefined,
): Promise<ReadonlyMap<string, readonly MorphologyAnalysis[]>> {
	const limit = maxResults ?? 5;
	if (!Number.isSafeInteger(limit) || limit < 0) {
		throw new TypeError(
			"morphologyMaxResults must be a non-negative safe integer.",
		);
	}
	const analysesByForm = await morphologyAnalysesManyFromPackAsync(
		pack,
		forms,
		{
			...readerOption(reader),
			maxResultsPerForm: limit,
		},
	);
	return new Map(
		[...analysesByForm.entries()].map(([form, analyses]) => [
			form,
			limitMorphologyAnalyses(analyses, limit),
		]),
	);
}

export function createDocumentRuntime(
	context: TextComputingDocumentRuntime,
): TextComputingDocumentRuntimeApi {
	const {
		pack,
		reader,
		languageTag,
		openSegmentation,
		openNormalization,
		openAnalyzer,
		openQualityProfiles,
		mergeQualityProfiles,
	} = context;

	const analyzeDocument = async (
		sourceDocument: TextDocument,
		options: TextComputingDocumentAnalysisOptions = {},
	): Promise<TextComputingDocument> => {
		const source = sourceView(sourceDocument);
		const text = source.text;
		const sourceViewId = source.id;
		const tasks = planDocumentTasks(options.tasks, options.preset);
		for (const slot of tasks) assertRunnableTask(pack, slot);
		const [segmentation, normalization, analyzer] = await Promise.all([
			openSegmentation(),
			openNormalization(),
			tasks.has("search") ? openAnalyzer() : undefined,
		]);
		const sentences = segmentation.sentences(text);
		const words = segmentation.words(text);
		const lexicalUnits = segmentation.lexicalUnits(text);
		const searchView = normalization.searchView(sourceDocument);
		const normalizedDocument = ensureSearchView(sourceDocument, searchView);
		const mentions =
			tasks.has("lexicon") || tasks.has("kb")
				? mentionCandidates(text, lexicalUnits)
				: Object.freeze([]);
		const rawMorphologyForms = words
			.filter((segment) => segment.isWordLike !== false)
			.map((segment) => segment.text);
		const normalizedByRaw = new Map(
			[...new Set([...mentions, ...rawMorphologyForms])].map((value) => [
				value,
				normalization.normalizeText(value, "search"),
			]),
		);
		const lexiconQueryForms = queryForms(mentions, normalizedByRaw);
		const morphologyQueryForms = queryForms(
			rawMorphologyForms,
			normalizedByRaw,
		);
		const [lexiconMatchesByText, morphologyAnalysesByText, documentKb] =
			await Promise.all([
				tasks.has("lexicon")
					? lookupManyFromPackAsync(pack, lexiconQueryForms, {
							...readerOption(reader),
							language: languageTag,
							script: pack.manifest.targets.scripts?.[0] ?? "Zyyy",
							maxResults: options.lexiconMaxResults ?? 5,
						})
					: new Map<string, readonly LexicalMatch[]>(),
				tasks.has("morphology")
					? documentMorphologyAnalyses(
							pack,
							morphologyQueryForms,
							reader,
							options.morphologyMaxResults,
						)
					: new Map<string, readonly MorphologyAnalysis[]>(),
				tasks.has("kb") && mentions.length > 0
					? knowledgeBaseSliceFromPack(pack, {
							...readerOption(reader),
							mentions,
							language: options.entityLanguage ?? languageTag,
						})
					: undefined,
			]);
		const lexicalUnitAnalyses: readonly LexicalUnitAnalysis[] = Object.freeze(
			words.map((segment, index) => {
				const normalizedText =
					normalizedByRaw.get(segment.text) ?? segment.text;
				const lexicon = preferredQueryResults(
					lexiconMatchesByText,
					segment.text,
					normalizedText,
				);
				const morphology = preferredQueryResults(
					morphologyAnalysesByText,
					segment.text,
					normalizedText,
					(candidate) => candidate.form === segment.text,
				);
				return Object.freeze({
					tokenId: `text-computing-token-${String(index).padStart(6, "0")}`,
					sourceViewId,
					segment,
					normalizedText,
					morphologyQueryForm: morphology.queryForm,
					lexiconMatches: lexicon.results,
					morphologyAnalyses: morphology.results,
				});
			}),
		);
		const annotatedDocument = addAnalysisLayers(
			normalizedDocument,
			lexicalUnitAnalyses,
			tasks,
			sourceViewId,
		);
		const entityLinkedDocument =
			documentKb === undefined
				? annotatedDocument
				: linkEntities(annotatedDocument, documentKb, {
						viewId: sourceViewId,
						language: options.entityLanguage ?? languageTag,
						maxCandidates: options.entityMaxCandidates ?? 5,
					});
		const quality = tasks.has("quality")
			? await (async () => {
					const profile =
						options.quality?.profile ??
						mergeQualityProfiles(await openQualityProfiles());
					return analyzeDocumentQuality(entityLinkedDocument, {
						...options.quality,
						...(profile === undefined ? {} : { profile }),
						producer: options.quality?.producer ?? pack.manifest.packageName,
					});
				})()
			: undefined;
		const tokenDrafts = lexicalUnitAnalyses.map(
			(analysis, index): TextComputingToken =>
				Object.freeze({
					...analysis.segment,
					id: analysis.tokenId,
					index,
					viewId: sourceViewId,
					normalizedText: analysis.normalizedText,
					lemmas: lemmaSummaries(analysis),
					morphology: Object.freeze(
						analysis.morphologyAnalyses.map((morphology) =>
							morphologySummary(
								morphology,
								analysis.tokenId,
								sourceViewId,
								analysis.segment,
								analysis.morphologyQueryForm,
							),
						),
					),
					entities: Object.freeze([]),
				}),
		);
		const entities = entityCandidatesFromDocument(
			entityLinkedDocument,
			tokenDrafts,
		);
		const entitiesByTokenId = new Map<string, TextComputingEntitySummary[]>();
		for (const entity of entities) {
			for (const tokenId of entity.tokenIds) {
				entitiesByTokenId.set(tokenId, [
					...(entitiesByTokenId.get(tokenId) ?? []),
					entity,
				]);
			}
		}
		const tokens = Object.freeze(
			tokenDrafts.map((token) =>
				Object.freeze({
					...token,
					entities: Object.freeze(entitiesByTokenId.get(token.id) ?? []),
				}),
			),
		);
		const qualityResult = qualitySummary(
			quality ?? emptyQualityReport(entityLinkedDocument),
		);
		const evidence = evidenceForTasks(pack, tasks, quality);
		let result: TextComputingDocument;
		result = {
			text,
			sourceViewId,
			languageTag,
			sentences,
			tokens,
			lexicalUnits,
			lemmas: Object.freeze(tokens.flatMap((token) => token.lemmas)),
			morphology: Object.freeze(tokens.flatMap((token) => token.morphology)),
			entities,
			searchTokens: Object.freeze(
				analyzer === undefined
					? []
					: [...analyzer.analyze(searchView.view.text)].map((token) =>
							searchTokenSummary(token, searchView.view.id),
						),
			),
			quality: qualityResult,
			evidence,
			toTextDoc: () => entityLinkedDocument,
			toJSON: () => documentJson(result),
		} satisfies TextComputingDocument;
		return Object.freeze(result);
	};

	const analyzeText = (
		text: string,
		options: TextComputingDocumentAnalysisOptions = {},
	) =>
		analyzeDocument(
			createDocument(text, {
				...(options.id === undefined ? {} : { id: options.id }),
				...(options.metadata === undefined
					? {}
					: { metadata: options.metadata }),
			}),
			options,
		);

	const documentAnalysisProcessor = (
		options: TextComputingDocumentAnalysisOptions = {},
		onAnalysis?: (analysis: TextComputingDocument) => void,
	): TextProcessor => {
		const tasks = planDocumentTasks(options.tasks, options.preset);
		return Object.freeze({
			id: `${pack.manifest.id}:document-analysis`,
			version: pack.manifest.version,
			provides: Object.freeze([
				Object.freeze({ viewKind: "search" as const }),
				Object.freeze({ layer: "token.text-computing" }),
				...(tasks.has("lexicon") || tasks.has("morphology")
					? [Object.freeze({ layer: "lemma.text-computing" })]
					: []),
				...(tasks.has("morphology")
					? [Object.freeze({ layer: "morph.text-computing" })]
					: []),
				...(tasks.has("kb") ? [Object.freeze({ layer: "link.entity" })] : []),
			]),
			async process(doc: TextDocument) {
				const analysis = await analyzeDocument(doc, options);
				onAnalysis?.(analysis);
				return analysis.toTextDoc();
			},
		});
	};

	const createDocumentAnalysisPipeline = (
		options: TextComputingDocumentAnalysisOptions = {},
	) =>
		createPipeline([documentAnalysisProcessor(options)], {
			id: `${pack.manifest.id}:document-analysis`,
			resources: createPipelineResourceRegistry({ packs: [pack] }),
		});

	const runDocument = async (
		doc: TextDocument,
		options: TextComputingPipelineRunOptions = {},
	): Promise<TextComputingPipelineRun> => {
		let analysis: TextComputingDocument | undefined;
		const pipeline = createPipeline(
			[
				documentAnalysisProcessor(options, (result) => {
					analysis = result;
				}),
			],
			{
				id: `${pack.manifest.id}:document-analysis`,
				resources: createPipelineResourceRegistry({ packs: [pack] }),
			},
		);
		const diagnostics: PipelineDiagnostic[] = [];
		const trace: PipelineTraceEvent[] = [];
		const document = await runPipeline(pipeline, doc, {
			...(options.run ?? {}),
			diagnostics,
			trace,
		});
		if (analysis === undefined) {
			throw new TypeError(
				`Text Computing document analysis pipeline did not produce analysis for ${doc.id}.`,
			);
		}
		return Object.freeze({
			pipeline,
			document,
			analysis,
			diagnostics: Object.freeze([...diagnostics]),
			trace: Object.freeze([...trace]),
		});
	};

	const runText = (
		text: string,
		options: TextComputingPipelineRunOptions = {},
	) =>
		runDocument(
			createDocument(text, {
				...(options.id === undefined ? {} : { id: options.id }),
				...(options.metadata === undefined
					? {}
					: { metadata: options.metadata }),
			}),
			options,
		);

	return Object.freeze({
		analyzeText,
		analyzeDocument,
		createDocumentAnalysisPipeline,
		runText,
		runDocument,
	});
}
