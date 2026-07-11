import { corpusDocumentsFromPack } from "@ismail-elkorchi/textcorpus";
import {
	corpusRowsFromPack,
	readUdAnnotationDatasetFromPackAsync,
	segmentationAdapterFromPack,
	type UdAnnotationRecord,
	type UdSyntaxPackResources,
	udAnnotationRecordsFromPackAsync,
	udSyntaxResourcesFromPackAsync,
} from "@ismail-elkorchi/textdata";
import type { TextDocument } from "@ismail-elkorchi/textdoc";
import {
	candidateEntitiesFromPack,
	createKnowledgeBase,
	type EntityLinkOptions,
	type KnowledgeBase,
	knowledgeBaseFromPack,
	linkEntities,
} from "@ismail-elkorchi/textkb";
import {
	type LookupOptions,
	lookupFromPackAsync,
	type MorphologyGeneration,
	type MorphologyIndex,
	morphologyAnalysesManyFromPackAsync,
	morphologyIndexFromPackAsync,
} from "@ismail-elkorchi/textlex";
import {
	type CompiledTextNormProfile,
	normalizationProfileFromPack,
	type TextNormProfileMode,
} from "@ismail-elkorchi/textnorm";
import {
	type TextPack,
	type TextPackResourceReader,
	taskResourceIdsFromBindings,
} from "@ismail-elkorchi/textpack";
import {
	type ParallelRowsFromPackOptions,
	parallelCorpusFromPack,
	parallelLinkRowsFromPack,
	parallelTablesFromPack,
} from "@ismail-elkorchi/textparallel";
import {
	analyzeDocumentQuality,
	type DocumentQualityOptions,
	type QualityProfile,
	qualityProfileFromPack,
	qualityResourcesFromPack,
	type TextQualityPackResource,
} from "@ismail-elkorchi/textquality";
import {
	type AddOptions,
	type Analyzer,
	addToIndex,
	analyzerFromPack,
	type IndexOptions,
	search as querySearchIndex,
	type SearchIndex,
	type SearchOptions,
	type SearchQuery,
	searchIndexFromPack,
	termQuery,
} from "@ismail-elkorchi/textsearch";
import { createDocumentRuntime } from "./document.js";
import {
	inspectionReport,
	inspectSchemaResources,
	supportReport,
} from "./support.js";
import { assertRunnableTask, uniqueSorted } from "./tasks.js";
import type {
	TextComputingDocument,
	TextComputingDocumentAnalysisOptions,
	TextComputingNlp,
	TextComputingPipelineRunOptions,
} from "./types.js";

type UdAnnotationDataset = Awaited<
	ReturnType<typeof readUdAnnotationDatasetFromPackAsync>
>;

function readerOptions(reader: TextPackResourceReader | undefined) {
	return reader === undefined ? {} : { reader };
}

async function createMergedMorphologyIndex(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
	languageTag: string,
	scriptTag: string,
): Promise<MorphologyIndex> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: "morphology",
		ownerPackage: "@ismail-elkorchi/textlex",
		schemaId: "textlex.morphology.v1",
		role: "primary",
	});
	const indexes = await Promise.all(
		resourceIds.map((resourceId) =>
			morphologyIndexFromPackAsync(pack, {
				...readerOptions(reader),
				resourceId,
			}),
		),
	);
	if (indexes.length === 1 && indexes[0] !== undefined) return indexes[0];
	const analyses = Object.freeze(indexes.flatMap((index) => index.analyses));
	const generations = Object.freeze(
		indexes.flatMap((index) => index.generations),
	);
	return Object.freeze({
		id: `${pack.manifest.id}:morphology`,
		language: languageTag,
		script: scriptTag,
		analyses,
		generations,
		analyze(form: string, options: { readonly maxResults?: number } = {}) {
			return Object.freeze(
				indexes
					.flatMap((index) => index.analyze(form, options))
					.slice(0, options.maxResults),
			);
		},
		generate(
			lemma: string,
			features?: Readonly<Record<string, string>>,
			options: { readonly maxResults?: number } = {},
		) {
			return Object.freeze(
				indexes
					.flatMap((index) => index.generate(lemma, features, options))
					.slice(0, options.maxResults),
			);
		},
		paradigms(lemma?: string) {
			const byLemma = new Map<string, MorphologyGeneration[]>();
			for (const index of indexes) {
				for (const paradigm of index.paradigms(lemma)) {
					byLemma.set(paradigm.lemma, [
						...(byLemma.get(paradigm.lemma) ?? []),
						...paradigm.entries,
					]);
				}
			}
			return Object.freeze(
				[...byLemma.entries()]
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([lemma, entries]) =>
						Object.freeze({
							lemma,
							entries: Object.freeze(entries),
						}),
					),
			);
		},
	});
}

async function createMergedKnowledgeBase(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
): Promise<KnowledgeBase> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: "kb",
		ownerPackage: "@ismail-elkorchi/textkb",
		schemaId: "textkb.knowledge-base.v1",
		role: "primary",
	});
	const bases = await Promise.all(
		resourceIds.map((resourceId) =>
			knowledgeBaseFromPack(pack, {
				...readerOptions(reader),
				resourceId,
			}),
		),
	);
	if (bases.length === 1 && bases[0] !== undefined) return bases[0];
	return createKnowledgeBase({
		id: `${pack.manifest.id}:kb`,
		entities: bases.flatMap((base) => Object.values(base.entities.records)),
		concepts: bases.flatMap((base) => Object.values(base.concepts.records)),
		senses: bases.flatMap((base) => Object.values(base.senses.records)),
		relations: bases.flatMap((base) => Object.values(base.relations.records)),
		aliases: bases.flatMap((base) =>
			Object.values(base.aliases.entries).flat(),
		),
		metadata: {
			packageName: pack.manifest.packageName,
			resourceIds,
			schemaId: "textkb.knowledge-base.v1",
		},
		allowExternalRelationEndpoints: true,
	});
}

function mergedQualityProfile(
	pack: TextPack,
	profiles: readonly QualityProfile[],
): QualityProfile | undefined {
	if (profiles.length === 0) return undefined;
	if (profiles.length === 1) return profiles[0];
	const thresholds = Object.freeze(
		Object.assign({}, ...profiles.map((profile) => profile.thresholds ?? {})),
	);
	const severity = Object.freeze(
		Object.assign({}, ...profiles.map((profile) => profile.severity ?? {})),
	);
	const dimensions = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.dimensions ?? [])]),
	) as NonNullable<QualityProfile["dimensions"]>;
	const expectedLanguages = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.expectedLanguages ?? [])]),
	);
	const expectedScripts = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.expectedScripts ?? [])]),
	);
	const requiredMetadataKeys = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.requiredMetadataKeys ?? [])]),
	);
	const balanceKeys = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.balanceKeys ?? [])]),
	);
	const resourceIds = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.resourceIds ?? [])]),
	);
	const ruleIds = uniqueSorted(
		profiles.flatMap((profile) => [...(profile.ruleIds ?? [])]),
	);
	const profileIds = profiles.flatMap((profile) =>
		profile.id === undefined ? [] : [profile.id],
	);
	return Object.freeze({
		id: `${pack.manifest.id}:quality`,
		...(dimensions.length === 0 ? {} : { dimensions }),
		...(expectedLanguages.length === 0 ? {} : { expectedLanguages }),
		...(expectedScripts.length === 0 ? {} : { expectedScripts }),
		...(requiredMetadataKeys.length === 0 ? {} : { requiredMetadataKeys }),
		...(balanceKeys.length === 0 ? {} : { balanceKeys }),
		...(Object.keys(thresholds).length === 0 ? {} : { thresholds }),
		...(Object.keys(severity).length === 0 ? {} : { severity }),
		...(resourceIds.length === 0 ? {} : { resourceIds }),
		...(ruleIds.length === 0 ? {} : { ruleIds }),
		metadata: {
			packageName: pack.manifest.packageName,
			profileIds,
		},
	});
}

export function createTextComputingNlp(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
): TextComputingNlp {
	const languageTag = pack.manifest.targets.languages?.[0] ?? "und";
	const scriptTag = pack.manifest.targets.scripts?.[0] ?? "Zyyy";
	let segmentationPromise:
		| ReturnType<typeof segmentationAdapterFromPack>
		| undefined;
	let normalizationPromise: Promise<CompiledTextNormProfile> | undefined;
	let morphologyPromise: Promise<MorphologyIndex> | undefined;
	let syntaxResourcesPromise: Promise<UdSyntaxPackResources> | undefined;
	let syntaxAnnotationsPromise:
		| Promise<readonly UdAnnotationRecord[]>
		| undefined;
	let syntaxDatasetPromise: Promise<UdAnnotationDataset> | undefined;
	let kbPromise: Promise<KnowledgeBase> | undefined;
	let analyzerPromise: Promise<Analyzer> | undefined;
	let qualityResourcesPromise:
		| Promise<readonly TextQualityPackResource[]>
		| undefined;
	let qualityProfilesPromise: Promise<readonly QualityProfile[]> | undefined;

	const openSegmentation = () => {
		assertRunnableTask(pack, "segmentation");
		segmentationPromise ??= segmentationAdapterFromPack(pack, {
			...readerOptions(reader),
		});
		return segmentationPromise;
	};
	const openNormalization = () => {
		assertRunnableTask(pack, "normalization");
		normalizationPromise ??= normalizationProfileFromPack(pack, {
			...readerOptions(reader),
		});
		return normalizationPromise;
	};
	const openMorphology = () => {
		assertRunnableTask(pack, "morphology");
		morphologyPromise ??= createMergedMorphologyIndex(
			pack,
			reader,
			languageTag,
			scriptTag,
		);
		return morphologyPromise;
	};
	const openKb = () => {
		assertRunnableTask(pack, "kb");
		kbPromise ??= createMergedKnowledgeBase(pack, reader);
		return kbPromise;
	};
	const openAnalyzer = () => {
		assertRunnableTask(pack, "search");
		analyzerPromise ??= analyzerFromPack(pack, {
			...readerOptions(reader),
		});
		return analyzerPromise;
	};
	const createSearchIndex = (options?: IndexOptions) => {
		assertRunnableTask(pack, "search");
		return searchIndexFromPack(pack, {
			...readerOptions(reader),
			...(options === undefined ? {} : { index: options }),
		});
	};
	const openQualityResources = () => {
		assertRunnableTask(pack, "quality");
		qualityResourcesPromise ??= qualityResourcesFromPack(pack, {
			...readerOptions(reader),
		});
		return qualityResourcesPromise;
	};
	const openQualityProfiles = () => {
		assertRunnableTask(pack, "quality");
		qualityProfilesPromise ??= Promise.all(
			taskResourceIdsFromBindings(pack, {
				slot: "quality",
				ownerPackage: "@ismail-elkorchi/textquality",
				schemaId: "textquality.profile.v1",
				role: "quality",
			}).map((resourceId) =>
				qualityProfileFromPack(pack, {
					...readerOptions(reader),
					resourceId,
				}),
			),
		);
		return qualityProfilesPromise;
	};
	const documentRuntime = createDocumentRuntime({
		pack,
		reader,
		languageTag,
		openSegmentation,
		openNormalization,
		openAnalyzer,
		openQualityProfiles,
		mergeQualityProfiles: (profiles) => mergedQualityProfile(pack, profiles),
	});
	const lookup = (form: string, options: LookupOptions = {}) => {
		assertRunnableTask(pack, "lexicon");
		return lookupFromPackAsync(pack, form, {
			...options,
			...readerOptions(reader),
			language: options.language ?? languageTag,
			script: options.script ?? scriptTag,
		});
	};
	const nlp = Object.assign(
		(text: string, options?: TextComputingDocumentAnalysisOptions) =>
			documentRuntime.analyzeText(text, options),
		{
			languageTag,
			pack,
			reader,
			support: () => supportReport(pack),
			inspect: () => inspectionReport(pack),
			tokenize: (text: string) =>
				openSegmentation().then((adapter) => adapter.lexicalUnits(text)),
			normalize: (text: string, mode?: TextNormProfileMode) =>
				openNormalization().then((profile) =>
					profile.normalizeText(text, mode),
				),
			lookup,
			segmentation: Object.freeze({
				lexicalUnits: (text: string) =>
					openSegmentation().then((adapter) => adapter.lexicalUnits(text)),
				words: (text: string) =>
					openSegmentation().then((adapter) => adapter.words(text)),
				sentences: (text: string) =>
					openSegmentation().then((adapter) => adapter.sentences(text)),
			}),
			normalization: Object.freeze({
				normalizeText: (text: string, mode?: TextNormProfileMode) =>
					openNormalization().then((profile) =>
						profile.normalizeText(text, mode),
					),
				normalizeDocument: (
					doc: Parameters<CompiledTextNormProfile["normalizeDocument"]>[0],
					mode?: TextNormProfileMode,
				) =>
					openNormalization().then((profile) =>
						profile.normalizeDocument(doc, mode),
					),
				searchView: (
					doc: Parameters<CompiledTextNormProfile["searchView"]>[0],
				) => openNormalization().then((profile) => profile.searchView(doc)),
			}),
			lexicon: Object.freeze({
				lookup,
			}),
			morphology: Object.freeze({
				analyze: async (
					form: string,
					options: { readonly maxResults?: number } = {},
				) => {
					assertRunnableTask(pack, "morphology");
					const analyses =
						(
							await morphologyAnalysesManyFromPackAsync(pack, [form], {
								...readerOptions(reader),
								...(options.maxResults === undefined
									? {}
									: { maxResultsPerForm: options.maxResults }),
							})
						).get(form) ?? [];
					return Object.freeze(
						options.maxResults === undefined
							? [...analyses]
							: analyses.slice(0, options.maxResults),
					);
				},
				generate: (
					lemma: string,
					features?: Readonly<Record<string, string>>,
					options: { readonly maxResults?: number } = {},
				) =>
					openMorphology().then((index) =>
						index.generate(lemma, features, options),
					),
				paradigms: (lemma?: string) =>
					openMorphology().then((index) => index.paradigms(lemma)),
			}),
			syntax: Object.freeze({
				resources() {
					syntaxResourcesPromise ??= udSyntaxResourcesFromPackAsync(pack, {
						...readerOptions(reader),
					});
					return syntaxResourcesPromise;
				},
				annotations() {
					syntaxAnnotationsPromise ??= udAnnotationRecordsFromPackAsync(pack, {
						...readerOptions(reader),
					});
					return syntaxAnnotationsPromise;
				},
				dataset() {
					syntaxDatasetPromise ??= readUdAnnotationDatasetFromPackAsync(pack, {
						...readerOptions(reader),
					});
					return syntaxDatasetPromise;
				},
			}),
			kb: Object.freeze({
				resources: () =>
					inspectSchemaResources(pack, [
						"textkb.entity-rows.v1",
						"textkb.alias-rows.v1",
						"textkb.relation-rows.v1",
						"textkb.knowledge-base.v1",
					]),
				candidates: (text: string, options: EntityLinkOptions = {}) => {
					assertRunnableTask(pack, "kb");
					return candidateEntitiesFromPack(pack, text, {
						...options,
						...readerOptions(reader),
						language: options.language ?? languageTag,
					});
				},
				linkEntities: (doc: TextDocument, options: EntityLinkOptions = {}) =>
					openKb().then((kb) => linkEntities(doc, kb, options)),
			}),
			search: Object.freeze({
				analyze: (text: string) =>
					openAnalyzer().then((analyzer) =>
						Object.freeze(
							[...analyzer.analyze(text)].map((token) =>
								Object.freeze({
									term: token.term,
									position: token.position,
									startCU: token.startCU,
									endCU: token.endCU,
									viewId: "raw",
									...(token.type === undefined ? {} : { type: token.type }),
								}),
							),
						),
					),
				createIndex: createSearchIndex,
				addDocument: (
					index: SearchIndex,
					doc: TextDocument,
					options: AddOptions = {},
				) => addToIndex(index, doc, options),
				addAnalysis: (
					index: SearchIndex,
					analysis: TextComputingDocument,
					options: AddOptions = {},
				) => addToIndex(index, analysis.toTextDoc(), options),
				query: (
					index: SearchIndex,
					query: string | SearchQuery,
					options: SearchOptions = {},
				) =>
					Object.freeze(
						querySearchIndex(
							index,
							typeof query === "string" ? termQuery(query) : query,
							options,
						),
					),
			}),
			corpus: Object.freeze({
				resources: () =>
					inspectSchemaResources(pack, ["textdata.corpus.rows.v1"]),
				rows() {
					return corpusRowsFromPack(pack, {
						...readerOptions(reader),
					});
				},
				documents(options: { readonly maxDocuments: number }) {
					return corpusDocumentsFromPack(pack, {
						...options,
						...readerOptions(reader),
					});
				},
			}),
			parallel: Object.freeze({
				resources: () =>
					inspectSchemaResources(pack, [
						"textparallel.alignment.v1",
						"textparallel.alignment.rows.v1",
					]),
				rows(options: Omit<ParallelRowsFromPackOptions, "reader"> = {}) {
					return parallelTablesFromPack(pack, {
						...options,
						...readerOptions(reader),
					});
				},
				links(options: Omit<ParallelRowsFromPackOptions, "reader"> = {}) {
					return parallelLinkRowsFromPack(pack, {
						...options,
						...readerOptions(reader),
					});
				},
				corpus(options: Omit<ParallelRowsFromPackOptions, "reader"> = {}) {
					return parallelCorpusFromPack(pack, {
						...options,
						...readerOptions(reader),
					});
				},
			}),
			quality: Object.freeze({
				resources: openQualityResources,
				profiles: openQualityProfiles,
				analyzeDocument: (
					doc: TextDocument,
					options: DocumentQualityOptions = {},
				) => {
					assertRunnableTask(pack, "quality");
					return openQualityProfiles().then((profiles) => {
						const profile =
							options.profile ?? mergedQualityProfile(pack, profiles);
						return analyzeDocumentQuality(doc, {
							...options,
							...(profile === undefined ? {} : { profile }),
							producer: options.producer ?? pack.manifest.packageName,
						});
					});
				},
			}),
			document: Object.freeze({
				analyzeText: documentRuntime.analyzeText,
				analyzeDocument: documentRuntime.analyzeDocument,
			}),
			pipeline: Object.freeze({
				createDocumentAnalysisPipeline:
					documentRuntime.createDocumentAnalysisPipeline,
				runText: (
					text: string,
					options: TextComputingPipelineRunOptions = {},
				) => documentRuntime.runText(text, options),
				runDocument: documentRuntime.runDocument,
			}),
		},
	);
	return Object.freeze(nlp) as TextComputingNlp;
}
