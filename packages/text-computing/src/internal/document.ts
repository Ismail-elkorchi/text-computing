import type { TextDataSegmentationAdapter } from "@ismail-elkorchi/textdata";
import {
	addViewWithSpanMap,
	createDocument,
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
	TextComputingEntitySummary,
	TextComputingEvidence,
	TextComputingMorphologySummary,
	TextComputingPipelineRun,
	TextComputingPipelineRunOptions,
	TextComputingQualitySummary,
	TextComputingSearchTokenSummary,
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

function sourceText(doc: TextDocument): string {
	const view =
		doc.views.raw ??
		doc.views[
			Object.keys(doc.views).sort((left, right) =>
				left.localeCompare(right),
			)[0] ?? ""
		];
	if (view === undefined) {
		throw new TypeError(`Document ${doc.id} has no text view.`);
	}
	return view.text;
}

function ensureSearchView(
	doc: TextDocument,
	searchView: NormalizationViewResult,
): TextDocument {
	if (
		doc.views[searchView.view.id] !== undefined &&
		doc.spanMaps[searchView.spanMap.id] !== undefined
	) {
		return doc;
	}
	return addViewWithSpanMap(doc, searchView.view, searchView.spanMap);
}

function entityCandidatesFromDocument(
	doc: TextDocument,
): readonly TextComputingEntitySummary[] {
	const annotations = Object.values(
		doc.layers["link.entity"]?.annotations ?? {},
	);
	return Object.freeze(
		annotations.flatMap((annotation) => {
			const value = annotation.value;
			if (value === undefined || value === null || typeof value !== "object") {
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

function mentionCandidates(
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
	readonly lexiconMatches: readonly LexicalMatch[];
	readonly morphologyAnalyses: readonly MorphologyAnalysis[];
}

function morphologySummary(
	analysis: MorphologyAnalysis,
): TextComputingMorphologySummary {
	return Object.freeze({
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

function searchTokenSummary(
	token: SearchToken,
): TextComputingSearchTokenSummary {
	return Object.freeze({
		term: token.term,
		position: token.position,
		startCU: token.startCU,
		endCU: token.endCU,
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
			return Object.freeze({
				id: `${pack.manifest.id}:${task}:slot`,
				kind: "task-slot" as const,
				task,
				packageName: pack.manifest.packageName,
				packId: pack.manifest.id,
				...(slot?.status === undefined ? {} : { status: slot.status }),
				resourceIds: uniqueSorted([
					...(slot?.resourceIds ?? []),
					...(slot?.bindings ?? []).map((binding) => binding.resourceId),
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
		const text = sourceText(sourceDocument);
		const tasks = planDocumentTasks(options.tasks);
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
		const mentions = mentionCandidates(text, lexicalUnits);
		const [lexiconMatchesByText, morphologyAnalysesByText] = await Promise.all([
			tasks.has("lexicon")
				? lookupManyFromPackAsync(pack, mentions, {
						...readerOption(reader),
						language: languageTag,
						script: pack.manifest.targets.scripts?.[0] ?? "Zyyy",
						maxResults: options.lexiconMaxResults ?? 5,
					})
				: new Map<string, readonly LexicalMatch[]>(),
			tasks.has("morphology")
				? documentMorphologyAnalyses(
						pack,
						mentions,
						reader,
						options.morphologyMaxResults,
					)
				: new Map<string, readonly MorphologyAnalysis[]>(),
		]);
		const documentKb =
			tasks.has("kb") && mentions.length > 0
				? await knowledgeBaseSliceFromPack(pack, {
						...readerOption(reader),
						mentions,
						language: options.entityLanguage ?? languageTag,
					})
				: undefined;
		const lexicalUnitAnalyses: readonly LexicalUnitAnalysis[] =
			await Promise.all(
				lexicalUnits
					.filter((segment) => segment.isWordLike)
					.map(async (segment) =>
						Object.freeze({
							segment,
							lexiconMatches:
								lexiconMatchesByText.get(segment.text) ?? Object.freeze([]),
							morphologyAnalyses:
								morphologyAnalysesByText.get(segment.text) ?? Object.freeze([]),
						}),
					),
			);
		const entityLinkedDocument =
			documentKb === undefined
				? normalizedDocument
				: linkEntities(normalizedDocument, documentKb, {
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
		const morphologyAnalyses = lexicalUnitAnalyses.flatMap(
			(analysis) => analysis.morphologyAnalyses,
		);
		const qualityResult = qualitySummary(
			quality ?? emptyQualityReport(entityLinkedDocument),
		);
		const evidence = evidenceForTasks(pack, tasks, quality);
		let result: TextComputingDocument;
		result = {
			text,
			languageTag,
			sentences,
			tokens: words,
			lexicalUnits,
			lemmas: uniqueSorted([
				...morphologyAnalyses.flatMap((analysis) =>
					typeof analysis.lemma === "string" && analysis.lemma.length > 0
						? [analysis.lemma]
						: [],
				),
				...lexicalUnitAnalyses.flatMap((analysis) =>
					analysis.lexiconMatches.flatMap((match) =>
						typeof match.canonical === "string" && match.canonical.length > 0
							? [match.canonical]
							: [],
					),
				),
			]),
			morphology: Object.freeze(morphologyAnalyses.map(morphologySummary)),
			entities: entityCandidatesFromDocument(entityLinkedDocument),
			searchTokens: Object.freeze(
				analyzer === undefined
					? []
					: [...analyzer.analyze(searchView.view.text)].map(searchTokenSummary),
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
		const tasks = planDocumentTasks(options.tasks);
		return Object.freeze({
			id: `${pack.manifest.id}:document-analysis`,
			version: pack.manifest.version,
			provides: Object.freeze([
				Object.freeze({ viewKind: "search" as const }),
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
