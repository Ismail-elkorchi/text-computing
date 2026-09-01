import { segmentationAdapterFromPack } from "@ismail-elkorchi/textdata";
import type { SpanRef, TextDocument } from "@ismail-elkorchi/textdoc";
import {
	candidateEntities,
	candidateEntitiesFromPack,
	type EntityLinkOptions,
	knowledgeBaseMentionKeyLengthsFromPack,
	knowledgeBaseSliceFromPack,
	linkEntities,
	normalizeKnowledgeBaseMention,
} from "@ismail-elkorchi/textkb";
import {
	type LookupOptions,
	lookupFromPackAsync,
	type MorphologyGeneration,
	type MorphologyIndex,
	morphologyAnalysesManyFromPackAsync,
	morphologyGenerationsFromPackAsync,
	morphologyIndexFromPackAsync,
	morphologyParadigmsFromPackAsync,
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
} from "./types.js";

function readerOptions(reader: TextPackResourceReader | undefined) {
	return reader === undefined ? {} : { reader };
}

function entityLinkingView(doc: TextDocument, viewId: string | undefined) {
	if (viewId !== undefined) {
		const view = doc.views[viewId];
		if (view === undefined) {
			throw new TypeError(`Document ${doc.id} has no view ${viewId}.`);
		}
		return view;
	}
	const raw = doc.views.raw;
	if (raw !== undefined) return raw;
	const roots = Object.values(doc.views).filter(
		(view) => view.sourceViewId === undefined,
	);
	if (roots.length !== 1) {
		throw new TypeError(
			`Document ${doc.id} requires an explicit entity-linking view.`,
		);
	}
	return roots[0] as (typeof roots)[number];
}

function spanMention(
	doc: TextDocument,
	ref: {
		readonly viewId: string;
		readonly span: {
			readonly start: number;
			readonly end: number;
			readonly unit: string;
		};
	},
	strict = false,
): string | undefined {
	const view = doc.views[ref.viewId];
	if (
		view === undefined ||
		ref.span.unit !== "utf16-code-unit" ||
		!Number.isInteger(ref.span.start) ||
		!Number.isInteger(ref.span.end) ||
		ref.span.start < 0 ||
		ref.span.end <= ref.span.start ||
		ref.span.end > view.text.length
	) {
		if (strict) {
			throw new TypeError(
				`Entity mention span for view ${ref.viewId} must be a valid non-empty utf16-code-unit range.`,
			);
		}
		return undefined;
	}
	return view.text.slice(ref.span.start, ref.span.end).trim();
}

function annotationValueMention(value: unknown): string | undefined {
	if (typeof value === "string" && value.length > 0) return value;
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	const record = value as Readonly<Record<string, unknown>>;
	for (const key of ["text", "term", "label", "canonical", "lemma"]) {
		const candidate = record[key];
		if (typeof candidate === "string" && candidate.length > 0) {
			return candidate;
		}
	}
	return undefined;
}

interface DocumentMentionCandidate {
	readonly text: string;
	readonly ref: SpanRef;
}

function nextCodePointBoundary(text: string, offset: number): number {
	const codePoint = text.codePointAt(offset);
	return offset + (codePoint !== undefined && codePoint > 0xffff ? 2 : 1);
}

function codePointAtOffset(text: string, offset: number): string | undefined {
	if (offset < 0 || offset >= text.length) return undefined;
	const codePoint = text.codePointAt(offset);
	return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

function codePointBeforeOffset(
	text: string,
	offset: number,
): string | undefined {
	if (offset <= 0 || offset > text.length) return undefined;
	const low = text.charCodeAt(offset - 1);
	return codePointAtOffset(
		text,
		low >= 0xdc00 && low <= 0xdfff ? offset - 2 : offset - 1,
	);
}

function isEntityWordCharacter(value: string | undefined): boolean {
	return value !== undefined && /^[\p{L}\p{N}_]$/u.test(value);
}

function documentMentionCandidates(
	text: string,
	viewId: string,
	codePointLengths: readonly number[],
	maxEditDistance: number,
): readonly DocumentMentionCandidate[] {
	if (codePointLengths.length === 0) return Object.freeze([]);
	const maximumLength = (codePointLengths.at(-1) ?? 0) + maxEditDistance;
	const candidates: DocumentMentionCandidate[] = [];
	for (
		let start = 0;
		start < text.length;
		start = nextCodePointBoundary(text, start)
	) {
		if (/^\p{White_Space}$/u.test(codePointAtOffset(text, start) ?? "")) {
			continue;
		}
		if (isEntityWordCharacter(codePointBeforeOffset(text, start))) continue;
		for (
			let end = nextCodePointBoundary(text, start);
			end <= text.length;
			end = nextCodePointBoundary(text, end)
		) {
			if (/^\p{White_Space}$/u.test(codePointBeforeOffset(text, end) ?? "")) {
				continue;
			}
			const mention = text.slice(start, end);
			const normalizedLength = Array.from(
				normalizeKnowledgeBaseMention(mention),
			).length;
			if (normalizedLength > maximumLength) break;
			if (
				normalizedLength > 0 &&
				!isEntityWordCharacter(codePointAtOffset(text, end)) &&
				codePointLengths.some(
					(length) => Math.abs(length - normalizedLength) <= maxEditDistance,
				)
			) {
				candidates.push(
					Object.freeze({
						text: mention,
						ref: Object.freeze({
							viewId,
							span: Object.freeze({
								start,
								end,
								unit: "utf16-code-unit" as const,
							}),
						}),
					}),
				);
			}
			if (end === text.length) break;
		}
	}
	return Object.freeze(candidates);
}

function nonOverlappingFuzzyMentionSpans(
	candidates: readonly DocumentMentionCandidate[],
	kb: Parameters<typeof candidateEntities>[0],
	options: EntityLinkOptions,
): readonly SpanRef[] {
	const fuzzy = candidates.filter((candidate) => {
		const matches = candidateEntities(kb, candidate.text, options);
		return (
			matches.length > 0 &&
			matches.every((match) => match.matchKind === "fuzzy")
		);
	});
	const selected: DocumentMentionCandidate[] = [];
	for (const candidate of [...fuzzy].sort(
		(left, right) =>
			right.ref.span.end -
				right.ref.span.start -
				(left.ref.span.end - left.ref.span.start) ||
			left.ref.span.start - right.ref.span.start,
	)) {
		if (
			selected.some(
				(existing) =>
					existing.ref.span.start < candidate.ref.span.end &&
					candidate.ref.span.start < existing.ref.span.end,
			)
		) {
			continue;
		}
		selected.push(candidate);
	}
	return Object.freeze(
		selected
			.sort((left, right) => left.ref.span.start - right.ref.span.start)
			.map((candidate) => candidate.ref),
	);
}

function annotatedEntityMentions(
	doc: TextDocument,
	options: EntityLinkOptions,
): readonly string[] {
	const layerIds = new Set(options.sourceLayerIds ?? []);
	const mentions = new Set<string>();
	if (options.mentionSource !== "aliases") {
		for (const layer of Object.values(doc.layers)) {
			if (
				layerIds.size > 0
					? !layerIds.has(layer.id)
					: !layer.id.startsWith("entity.") && !layer.type.startsWith("entity.")
			) {
				continue;
			}
			for (const annotation of Object.values(layer.annotations)) {
				const mention =
					annotationValueMention(annotation.value) ??
					annotation.spans
						.map((ref) => spanMention(doc, ref))
						.find((value) => value !== undefined && value.length > 0);
				if (mention !== undefined) mentions.add(mention);
			}
		}
	}
	for (const ref of options.mentionSpans ?? []) {
		const mention = spanMention(doc, ref, true);
		if (mention !== undefined && mention.length > 0) mentions.add(mention);
	}
	return Object.freeze([...mentions]);
}

async function createMergedMorphologyIndex(
	pack: TextPack,
	reader: TextPackResourceReader | undefined,
	languageTag: string,
	scriptTag: string,
): Promise<MorphologyIndex> {
	const resourceIds = taskResourceIdsFromBindings(pack, {
		slot: "morphology",
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
	const kbMentionLengthsPromises = new Map<
		string,
		ReturnType<typeof knowledgeBaseMentionKeyLengthsFromPack>
	>();
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
	const openKbMentionLengths = (language: string) => {
		const cached = kbMentionLengthsPromises.get(language);
		if (cached !== undefined) return cached;
		const pending = knowledgeBaseMentionKeyLengthsFromPack(pack, {
			...readerOptions(reader),
			language,
		});
		if (kbMentionLengthsPromises.size >= 8) {
			const oldest = kbMentionLengthsPromises.keys().next().value;
			if (oldest !== undefined) kbMentionLengthsPromises.delete(oldest);
		}
		kbMentionLengthsPromises.set(language, pending);
		void pending.catch(() => {
			if (kbMentionLengthsPromises.get(language) === pending) {
				kbMentionLengthsPromises.delete(language);
			}
		});
		return pending;
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
				graphemes: (text: string) =>
					openSegmentation().then((adapter) => adapter.graphemes(text)),
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
				) => {
					assertRunnableTask(pack, "morphology");
					return morphologyGenerationsFromPackAsync(pack, lemma, features, {
						...readerOptions(reader),
						...(options.maxResults === undefined
							? {}
							: { maxResults: options.maxResults }),
					});
				},
				paradigms: (lemma?: string) => {
					assertRunnableTask(pack, "morphology");
					return lemma === undefined
						? openMorphology().then((index) => index.paradigms())
						: morphologyParadigmsFromPackAsync(pack, lemma, {
								...readerOptions(reader),
							});
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
				linkEntities: async (
					doc: TextDocument,
					options: EntityLinkOptions = {},
				) => {
					assertRunnableTask(pack, "kb");
					const maxEditDistance = options.maxEditDistance ?? 0;
					if (!Number.isSafeInteger(maxEditDistance) || maxEditDistance < 0) {
						throw new TypeError(
							"maxEditDistance must be a non-negative safe integer.",
						);
					}
					const mentions = new Set(annotatedEntityMentions(doc, options));
					let documentCandidates: readonly DocumentMentionCandidate[] = [];
					if ((options.mentionSource ?? "annotations") !== "annotations") {
						const view = entityLinkingView(doc, options.viewId);
						const mentionLengths = await openKbMentionLengths(
							options.language ?? languageTag,
						);
						documentCandidates = documentMentionCandidates(
							view.text,
							view.id,
							mentionLengths.codePointLengths,
							maxEditDistance,
						);
						for (const candidate of documentCandidates) {
							mentions.add(candidate.text);
						}
					}
					const kb = await knowledgeBaseSliceFromPack(pack, {
						...readerOptions(reader),
						mentions: [...mentions],
						language: options.language ?? languageTag,
						...(options.maxEditDistance === undefined
							? {}
							: { maxEditDistance: options.maxEditDistance }),
					});
					const fuzzyMentionSpans = nonOverlappingFuzzyMentionSpans(
						documentCandidates,
						kb,
						options,
					);
					return linkEntities(doc, kb, {
						...options,
						mentionSource: options.mentionSource ?? "annotations",
						mentionSpans: [
							...(options.mentionSpans ?? []),
							...fuzzyMentionSpans,
						],
					});
				},
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
		},
	);
	return Object.freeze(nlp) as TextComputingNlp;
}
