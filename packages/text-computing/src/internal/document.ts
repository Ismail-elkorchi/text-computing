import { withAnalysis } from "../analysis.ts";
import type {
	TextDataSegment,
	TextDataSegmentationAdapter,
} from "../data/index.ts";
import {
	type Annotation,
	addLayer,
	addViewWithSpanMap,
	createDocument,
	type Evidence,
	type TextDocument,
} from "../document/mod.ts";
import {
	type EntityLinkOptions,
	knowledgeBaseSliceFromPack,
	linkEntities,
} from "../knowledge/index.ts";
import {
	type LexicalMatch,
	lookupManyFromPackAsync,
	type MorphologyAnalysis,
	morphologyAnalysesManyFromPackAsync,
} from "../lexicon/index.ts";
import type {
	CompiledTextNormProfile,
	NormalizationViewResult,
} from "../normalization/index.ts";
import type {
	TextPack,
	TextPackArtifactReader,
	TextPackResourceReader,
} from "../packs/index.ts";
import {
	analyzeDocumentQuality,
	type QualityProfile,
	type QualityReport,
} from "../quality/index.ts";
import type { Analyzer, SearchToken } from "../search/index.ts";
import { packageName, packageVersion } from "./constants.ts";
import {
	entityTokenIds,
	recognizeEntities,
	type TextComputingEntityRuntimeResult,
} from "./entities.ts";
import {
	assertRunnableTask,
	planDocumentTasks,
	uniqueSorted,
} from "./tasks.ts";
import type {
	AnalyzedDocument,
	TextComputingDocumentAnalysisOptions,
	TextComputingDocumentTask,
	TextComputingEntityExecutor,
	TextComputingEvidence,
	TextComputingLemmaSummary,
	TextComputingMorphologySummary,
	TextComputingQualitySummary,
	TextComputingSearchTokenSummary,
	TextComputingToken,
} from "./types.ts";

export interface TextComputingDocumentRuntime {
	readonly pack: TextPack;
	readonly reader: TextPackResourceReader | undefined;
	readonly artifactReader: TextPackArtifactReader | undefined;
	readonly entityExecutor: TextComputingEntityExecutor | undefined;
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
	) => Promise<AnalyzedDocument>;
	readonly analyzeDocument: (
		doc: TextDocument,
		options?: TextComputingDocumentAnalysisOptions,
	) => Promise<AnalyzedDocument>;
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

function entityMentionTexts(
	doc: TextDocument,
	options: Omit<EntityLinkOptions, "mentionSource" | "viewId">,
): readonly string[] {
	const mentions = new Set<string>();
	const addSpan = (ref: Annotation["spans"][number]) => {
		const view = doc.views[ref.viewId];
		if (
			view === undefined ||
			ref.span.unit !== "utf16-code-unit" ||
			ref.span.start < 0 ||
			ref.span.end > view.text.length ||
			ref.span.start >= ref.span.end
		) {
			throw new TypeError("Entity mention spans must be valid UTF-16 ranges.");
		}
		mentions.add(view.text.slice(ref.span.start, ref.span.end));
	};
	const sourceLayerIds = new Set(options.sourceLayerIds ?? []);
	for (const layer of Object.values(doc.layers)) {
		if (
			sourceLayerIds.size > 0
				? !sourceLayerIds.has(layer.id)
				: !layer.id.startsWith("entity.") && !layer.type.startsWith("entity.")
		) {
			continue;
		}
		for (const annotation of Object.values(layer.annotations)) {
			const ref = annotation.spans[0];
			if (ref !== undefined) addSpan(ref);
		}
	}
	for (const ref of options.mentionSpans ?? []) addSpan(ref);
	return Object.freeze(
		[...mentions].sort((left, right) => left.localeCompare(right)),
	);
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
		producer: packageName,
		packageName,
		packageVersion,
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
		metadata: { producer: packageName },
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
		analyses.map((analysis, index) => ({
			id: analysis.tokenId,
			layer: "token.text-computing",
			type: "token.word",
			spans: [annotationSpan(analysis.segment, sourceViewId)],
			value: {
				index,
				text: analysis.segment.text,
				granularity: analysis.segment.granularity,
				...(analysis.segment.source === undefined
					? {}
					: { source: analysis.segment.source }),
				normalized: analysis.normalizedText,
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

function addEntityLayer(
	doc: TextDocument,
	result: TextComputingEntityRuntimeResult | undefined,
	sourceViewId: string,
): TextDocument {
	if (result === undefined) return doc;
	return addAnalysisLayer(
		doc,
		"entity.text-computing",
		"entity.named",
		sourceViewId,
		result.entities.map((entity) => ({
			id: entity.id,
			layer: "entity.text-computing",
			type: "entity.named",
			spans: [
				Object.freeze({
					viewId: sourceViewId,
					span: Object.freeze({
						start: entity.startCU,
						end: entity.endCU,
						unit: "utf16-code-unit" as const,
					}),
				}),
			],
			value: {
				type: entity.type,
				text: entity.text,
				modelLabel: entity.modelLabel,
			},
			features: { entityType: entity.type },
			evidence: Object.freeze({
				mode: "statistical" as const,
				exactness: "E1" as const,
				producer: "@ismail-elkorchi/text-computing",
				packageName: "@ismail-elkorchi/text-computing",
				packageVersion,
				resourceIds: Object.freeze([result.modelResourceId]),
				statisticalModelIds: Object.freeze([result.artifactId]),
				inputViewIds: Object.freeze([sourceViewId]),
			}),
			score: Object.freeze({
				kind: "weight" as const,
				scale: "mean-token-probability",
				value: entity.score,
			}),
		})),
	);
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
	entityExecution: TextComputingEntityRuntimeResult | undefined,
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
				artifactIds: uniqueSorted(slot.artifactIds ?? []),
				componentPackageNames,
			});
		});
	return Object.freeze([
		...slotEvidence,
		...(entityExecution === undefined
			? []
			: [
					Object.freeze({
						id: `${pack.manifest.id}:entities:${entityExecution.artifactId}`,
						kind: "model-execution" as const,
						task: "entities" as const,
						packageName: pack.manifest.packageName,
						packId: pack.manifest.id,
						resourceIds: Object.freeze([entityExecution.modelResourceId]),
						artifactIds: Object.freeze([entityExecution.artifactId]),
						componentPackageNames,
						modelResourceId: entityExecution.modelResourceId,
						executorId: entityExecution.executorId,
						executorVersion: entityExecution.executorVersion,
						artifact: entityExecution.artifact,
						modelChecksum: entityExecution.modelChecksum,
						vocabularyChecksum: entityExecution.vocabularyChecksum,
						executionProvider: entityExecution.executionProvider,
					}),
				]),
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
						artifactIds: Object.freeze([]),
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
		artifactReader,
		entityExecutor,
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
	): Promise<AnalyzedDocument> => {
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
		const mentions = tasks.has("lexicon")
			? mentionCandidates(text, lexicalUnits)
			: Object.freeze([]);
		const entityLinking = options.entityLinking ?? {};
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
		const [lexiconMatchesByText, morphologyAnalysesByText] = await Promise.all([
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
					entityLinks: Object.freeze([]),
				}),
		);
		const entityExecution = tasks.has("entities")
			? await recognizeEntities(
					{
						pack,
						reader,
						artifactReader,
						executor: entityExecutor,
						languageTag,
					},
					text,
					sourceViewId,
					(startCU, endCU) => entityTokenIds(tokenDrafts, startCU, endCU),
				)
			: undefined;
		const annotatedDocument = addEntityLayer(
			addAnalysisLayers(
				normalizedDocument,
				lexicalUnitAnalyses,
				tasks,
				sourceViewId,
			),
			entityExecution,
			sourceViewId,
		);
		const entityMentions = tasks.has("kb")
			? entityMentionTexts(annotatedDocument, entityLinking)
			: Object.freeze([]);
		const documentKb =
			tasks.has("kb") && entityMentions.length > 0
				? await knowledgeBaseSliceFromPack(pack, {
						...readerOption(reader),
						mentions: entityMentions,
						language: entityLinking.language ?? languageTag,
						...(entityLinking.maxEditDistance === undefined
							? {}
							: { maxEditDistance: entityLinking.maxEditDistance }),
					})
				: undefined;
		let entityLinkedDocument =
			documentKb === undefined
				? annotatedDocument
				: linkEntities(annotatedDocument, documentKb, {
						...entityLinking,
						viewId: sourceViewId,
						mentionSource: "annotations",
						language: entityLinking.language ?? languageTag,
					});
		const linkLayerId = entityLinking.layerId ?? "link.entity";
		if (
			tasks.has("kb") &&
			entityLinkedDocument.layers[linkLayerId] === undefined
		) {
			entityLinkedDocument = addAnalysisLayer(
				entityLinkedDocument,
				linkLayerId,
				"link.entity",
				sourceViewId,
				[],
			);
		}
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

		const qualityResult = qualitySummary(
			quality ?? emptyQualityReport(entityLinkedDocument),
		);
		const evidence = evidenceForTasks(pack, tasks, quality, entityExecution);
		let result = entityLinkedDocument;
		const segments = [
			["sentence.text-computing", "sentence", sentences],
			["lexical.text-computing", "lexical-unit", lexicalUnits],
		] as const;
		for (const [id, type, values] of segments) {
			result = addAnalysisLayer(
				result,
				id,
				type,
				sourceViewId,
				values.map((segment, index) => ({
					id: `${id}:${index}`,
					layer: id,
					type,
					spans: [annotationSpan(segment, sourceViewId)],
					value: {
						granularity: segment.granularity,
						...(segment.source === undefined ? {} : { source: segment.source }),
						...(segment.isWordLike === undefined
							? {}
							: { isWordLike: segment.isWordLike }),
					},
					evidence: analysisEvidence("algorithm", [], sourceViewId),
				})),
			);
		}
		if (analyzer !== undefined) {
			result = addAnalysisLayer(
				result,
				"search.text-computing",
				"search.token",
				searchView.view.id,
				[...analyzer.analyze(searchView.view.text)].map((token, index) => ({
					id: `search.text-computing:${index}`,
					layer: "search.text-computing",
					type: "search.token",
					spans: [
						{
							viewId: searchView.view.id,
							span: {
								start: token.startCU,
								end: token.endCU,
								unit: "utf16-code-unit" as const,
							},
						},
					],
					value: searchTokenSummary(token, searchView.view.id),
					evidence: analysisEvidence("algorithm", [], searchView.view.id),
				})),
			);
		}
		return withAnalysis({
			...result,
			metadata: {
				...result.metadata,
				analysis: {
					sourceViewId,
					languageTag,
					quality: qualityResult,
					evidence,
				},
			},
		});
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

	return Object.freeze({
		analyzeText,
		analyzeDocument,
	});
}
