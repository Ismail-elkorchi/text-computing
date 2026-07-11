import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
	analyze,
	createFetchResourceReader,
	inspect,
	load,
	support,
} from "@ismail-elkorchi/text-computing";
import {
	segmentationAdapterFromPack,
	type TextDataSegment,
} from "@ismail-elkorchi/textdata";
import {
	addViewWithSpanMap,
	createDocument,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { candidateEntitiesFromPack } from "@ismail-elkorchi/textkb";
import {
	lookupManyFromPackAsync,
	morphologyAnalysesManyFromPackAsync,
} from "@ismail-elkorchi/textlex";
import { normalizationProfileFromPack } from "@ismail-elkorchi/textnorm";
import type {
	TextPack,
	TextPackResourceReader,
} from "@ismail-elkorchi/textpack";
import { createPack } from "@ismail-elkorchi/textpack";
import ar from "@ismail-elkorchi/textpack-ar";
import en from "@ismail-elkorchi/textpack-en";
import fr from "@ismail-elkorchi/textpack-fr";

function localGeneratedResourceReader(): TextPackResourceReader {
	return {
		readText({ descriptor }) {
			if (descriptor.packageRoot === undefined) {
				throw new TypeError(
					`Generated textpack resource ${descriptor.path} has no packageRoot.`,
				);
			}
			const root = new URL(
				descriptor.packageRoot.endsWith("/")
					? descriptor.packageRoot
					: `${descriptor.packageRoot}/`,
			);
			const resourceUrl = new URL(descriptor.path, root);
			if (!resourceUrl.href.startsWith(root.href)) {
				throw new TypeError(
					`Generated textpack resource path ${descriptor.path} escapes ${root.href}.`,
				);
			}
			return readFile(resourceUrl, "utf8");
		},
	};
}

const generatedReader = localGeneratedResourceReader();

const languageCases = [
	{
		languageTag: "en",
		pack: en,
		text: "The French Republic recognizes Paris.",
		expectedPackageName: "@ismail-elkorchi/textpack-en",
	},
	{
		languageTag: "fr",
		pack: fr,
		text: "L'Etat francais reconnait Paris.",
		expectedPackageName: "@ismail-elkorchi/textpack-fr",
	},
	{
		languageTag: "ar",
		pack: ar,
		text: "تعترف الجمهورية العربية بباريس.",
		expectedPackageName: "@ismail-elkorchi/textpack-ar",
	},
] as const;

function segmentTexts(segments: readonly TextDataSegment[]): readonly string[] {
	return Object.freeze(segments.map((segment) => segment.text));
}

test("loads generated language textpacks as data for English, French, and Arabic", async () => {
	for (const { expectedPackageName, languageTag, pack } of languageCases) {
		const report = await support(pack);

		assert.equal(report.packageName, expectedPackageName);
		assert.equal(report.languages.includes(languageTag), true);
		assert.equal(report.componentCount, 0);
		const normalizationSlot = report.slots.find(
			(slot) => slot.slot === "normalization",
		);
		assert.equal(normalizationSlot?.readerRequired, true);
		assert.deepEqual(
			normalizationSlot?.capabilities,
			pack.manifest.capabilitySlots.find(
				(slot) => slot.slot === "normalization",
			)?.capabilities,
		);
		assert.equal(Object.isFrozen(normalizationSlot?.capabilities), true);
		const corpusSlot = report.slots.find((slot) => slot.slot === "corpus");
		assert.equal(corpusSlot?.readerRequired, false);
		assert.deepEqual(corpusSlot?.capabilities, {});
		assert.equal(
			report.slots.some(
				(slot) =>
					slot.slot === "normalization" &&
					(slot.status === "task-supported" ||
						slot.status === "feature-complete"),
			),
			true,
		);

		const nlp = await load(pack, { reader: generatedReader });
		assert.equal(nlp.languageTag, languageTag);
		assert.equal(nlp.pack.manifest.packageName, expectedPackageName);
		assert.equal(nlp.support().packageName, expectedPackageName);
		assert.equal(nlp.inspect().componentCount, report.componentCount);
	}
});

test("loads imported textpack data and runs the top-level analyze convenience API", async () => {
	const nlp = await load(fr, { reader: generatedReader });
	const tokens = await nlp.tokenize("L'Etat francais reconnait Paris.");
	const doc = await analyze("L'Etat francais reconnait Paris.", {
		pack: fr,
		reader: generatedReader,
		tasks: ["search", "quality"],
		quality: { maxFindings: 2 },
	});

	assert.equal(nlp.pack.manifest.packageName, "@ismail-elkorchi/textpack-fr");
	assert.equal(tokens.length > 0, true);
	assert.equal(doc.languageTag, "fr");
	assert.equal(doc.searchTokens.length > 0, true);
	assert.equal(doc.quality.findingCount <= 2, true);
	assert.equal(doc.evidence.length > 0, true);
	for (const evidence of doc.evidence.filter(
		(entry) => entry.kind === "task-slot",
	)) {
		const slot = fr.manifest.capabilitySlots.find(
			(candidate) => candidate.slot === evidence.task,
		);
		assert.equal(evidence.status, slot?.status);
		assert.equal(evidence.tier, slot?.tier);
	}
});

test("runs lightweight task APIs over generated English, French, and Arabic packs", async () => {
	for (const { languageTag, pack, text } of languageCases) {
		const nlp = await load(pack, { reader: generatedReader });
		const tokens = await nlp.tokenize(text);
		const sentences = await nlp.segmentation.sentences(text);
		const normalized = await nlp.normalize(text);
		const searchTokens = await nlp.search.analyze(text);
		const qualityProfiles = await nlp.quality.profiles();

		assert.equal(tokens.length > 0, true, `${languageTag} tokens`);
		assert.equal(sentences.length > 0, true, `${languageTag} sentences`);
		assert.equal(
			typeof normalized === "string" && normalized.length > 0,
			true,
			`${languageTag} normalization`,
		);
		assert.equal(searchTokens.length > 0, true, `${languageTag} search`);
		assert.equal(
			qualityProfiles.length > 0,
			true,
			`${languageTag} quality profiles`,
		);
		assert.equal(
			nlp.kb.resources().length > 0,
			true,
			`${languageTag} KB descriptors`,
		);
		assert.equal(nlp.corpus.resources().length, 0, `${languageTag} corpus`);
		assert.equal(nlp.parallel.resources().length, 0, `${languageTag} parallel`);
	}
});

test("keeps default document analysis lightweight and token-aligned", async () => {
	for (const { languageTag, pack, text } of languageCases) {
		const nlp = await load(pack, { reader: generatedReader });
		const startedAt = performance.now();
		const doc = await nlp(text, {
			entityMaxCandidates: 2,
			lexiconMaxResults: 2,
			morphologyMaxResults: 2,
			quality: { maxFindings: 3 },
		});
		const elapsedMs = performance.now() - startedAt;

		assert.equal(doc.languageTag, languageTag);
		assert.equal(doc.tokens.length > 0, true, `${languageTag} tokens`);
		assert.equal(doc.sentences.length > 0, true, `${languageTag} sentences`);
		assert.equal(doc.searchTokens.length > 0, true, `${languageTag} search`);
		assert.equal(
			doc.searchTokens.every((token) => {
				const view = doc.toTextDoc().views[token.viewId];
				return view !== undefined && token.endCU <= view.text.length;
			}),
			true,
			`${languageTag} search token view provenance`,
		);
		assert.equal(doc.quality.skipped, true, `${languageTag} quality is opt-in`);
		assert.equal(doc.lemmas.length, 0, `${languageTag} lookup is opt-in`);
		assert.equal(
			doc.morphology.length,
			0,
			`${languageTag} morphology is opt-in`,
		);
		assert.equal(doc.entities.length, 0, `${languageTag} KB linking is opt-in`);
		assert.equal(
			doc.tokens.every(
				(token, index) =>
					token.index === index &&
					token.id.length > 0 &&
					token.normalizedText.length > 0 &&
					token.lemmas.length === 0 &&
					token.morphology.length === 0 &&
					token.entities.length === 0,
			),
			true,
			`${languageTag} token alignment`,
		);
		assert.ok(doc.toTextDoc().layers["token.text-computing"]);
		assert.equal(doc.evidence.length > 0, true, `${languageTag} evidence`);
		assert.equal(
			"entityLinkedDocument" in (doc as unknown as Record<string, unknown>),
			false,
			`${languageTag} raw linked document is not public DTO`,
		);
		assert.equal(
			"sourceDocument" in (doc as unknown as Record<string, unknown>),
			false,
			`${languageTag} raw source document is not public DTO`,
		);
		assert.equal(
			doc.toJSON().languageTag,
			languageTag,
			`${languageTag} JSON language`,
		);
		assert.equal(doc.toJSON().evidence.length, doc.evidence.length);
		assert.equal(typeof doc.toTextDoc().id, "string");
		assert.equal(
			elapsedMs < 2_000,
			true,
			`${languageTag} default document analysis took ${elapsedMs}ms`,
		);
	}
});

test("fails clearly instead of reusing stale SDK analysis layers", async () => {
	const nlp = await load(en, { reader: generatedReader });
	const analysis = await nlp("Paris");
	await assert.rejects(
		() => nlp.document.analyzeDocument(analysis.toTextDoc()),
		/cannot replace existing analysis layer token\.text-computing/u,
	);
});

test("keeps direct runtime packages usable as expert mode over the same textpack", async () => {
	const text = "L'Etat francais reconnait Paris.";
	const nlp = await load(fr, { reader: generatedReader });
	const sdkTokens = await nlp.tokenize(text);
	const sdkNormalized = await nlp.normalize(text);

	const segmentation = await segmentationAdapterFromPack(fr as TextPack, {
		reader: generatedReader,
	});
	const normalization = await normalizationProfileFromPack(fr as TextPack, {
		reader: generatedReader,
		resourceIds: ["fr-normalization-profile"],
	});
	const lexiconMatches = await lookupManyFromPackAsync(
		fr as TextPack,
		["a", "reconnait"],
		{ reader: generatedReader, language: "fr", script: "Latn", maxResults: 2 },
	);
	const morphologyAnalyses = await morphologyAnalysesManyFromPackAsync(
		fr as TextPack,
		["reconnait"],
		{ reader: generatedReader, maxRowsPerResource: 2 },
	);
	const entityCandidates = await candidateEntitiesFromPack(
		fr as TextPack,
		"Paris",
		{ reader: generatedReader, language: "fr", maxCandidates: 2 },
	);

	assert.deepEqual(
		segmentTexts(sdkTokens),
		segmentTexts(segmentation.lexicalUnits(text)),
	);
	assert.equal(sdkNormalized, normalization.normalizeText(text));
	assert.equal((lexiconMatches.get("a") ?? []).length > 0, true);
	assert.equal((morphologyAnalyses.get("reconnait") ?? []).length > 0, true);
	assert.equal(Array.isArray(entityCandidates), true);
});

test("reports generated pack resources without treating textpack as SDK", async () => {
	const report = await inspect(fr);

	assert.equal(report.packageName, "@ismail-elkorchi/textpack-fr");
	assert.equal(report.componentCount, 0);
	assert.equal(Array.isArray(report.resources), true);
	assert.equal(
		"loadFrench" in (fr as unknown as Record<string, unknown>),
		false,
	);
});

test("tasks fail clearly when file-backed resources need a reader", async () => {
	const nlp = await load(fr);

	await assert.rejects(
		nlp.tokenize("L'Etat francais reconnait Paris."),
		/requires a resource reader/u,
	);
});

test("unsupported task errors include slot and policy context", async () => {
	const nlp = await load({
		manifest: {
			schemaVersion: "1",
			id: "unsupported-search-pack",
			name: "Unsupported Search Pack",
			version: "0.1.0",
			packageName: "@example/textpack-fr-unsupported-search",
			targets: { languages: ["fr"], scripts: ["Latn"] },
			engines: {},
			resources: [],
			components: [
				{
					packageName: "@example/textpack-fr-search-gpl",
					versionRange: "0.1.0",
					role: "excluded",
					reason: "Copyleft search source excluded from this policy surface.",
					licensePolicy: "allow-copyleft",
					capabilityPolicy: "documentation-only",
				},
			],
			capabilitySlots: [
				{
					slot: "search",
					status: "unsupported",
					tier: "none",
					notes: ["Search source excluded by package policy."],
				},
			],
			gapNotes: [
				{
					id: "search-policy-gap",
					slot: "search",
					status: "unsupported",
					message: "Search source requires an isolated copyleft package.",
				},
			],
			license: "MIT",
		},
		resources: {},
	});

	assert.throws(
		() => nlp.search.analyze("Paris"),
		/search.*status=unsupported.*copyleft/iu,
	);
});

test("artifact-backed tasks fail before execution until locally materialized", async () => {
	const nlp = await load({
		manifest: {
			schemaVersion: "1",
			id: "artifact-backed-search-pack",
			name: "Artifact Backed Search Pack",
			version: "0.1.0",
			packageName: "@example/textpack-fr-artifact-backed-search",
			targets: { languages: ["fr"], scripts: ["Latn"] },
			engines: {},
			resources: [],
			capabilitySlots: [
				{
					slot: "search",
					status: "artifact-backed",
					tier: "resource-only",
					notes: [
						"Search index descriptor exists but no local index is present.",
					],
				},
			],
			license: "MIT",
		},
		resources: {},
	});

	assert.throws(() => nlp.search.analyze("Paris"), /artifact-backed-only/u);
});

test("exports the portable fetch-style reader through the entrypoint package", async () => {
	const text = '{"profileId":"fetch-normalization","languageTag":"en"}\n';
	const url = "https://text-computing.invalid/resources/profile.json";
	const reader = createFetchResourceReader({
		fetch: async (input) => {
			const href =
				input instanceof URL
					? input.href
					: typeof input === "string"
						? new URL(input).href
						: input.url;
			return new Response(href === url ? text : "missing", {
				status: href === url ? 200 : 404,
			});
		},
	});
	const result = await reader.readText({
		pack: fr as TextPack,
		resource: {
			id: "profile",
			kind: "quality-profile",
			format: "json",
		},
		descriptor: {
			kind: "file-backed-resource",
			packageRoot: "https://text-computing.invalid/",
			path: "resources/profile.json",
			encoding: "utf8",
			checksum:
				"sha256:8b8d6cef21ff17e01bc5f52e8c88476953175a9454f8b2a5ca02b65feb90eb45",
			byteLength: new TextEncoder().encode(text).byteLength,
		},
	});

	assert.equal(result, text);
});

test("analyzes an existing TextDocument through the SDK document namespace", async () => {
	const nlp = await load(fr, { reader: generatedReader });
	const source = createDocument("L'Etat francais reconnait Paris.", {
		id: "text-computing-doc-test",
	});
	const doc = await nlp.document.analyzeDocument(source, {
		entityMaxCandidates: 1,
		lexiconMaxResults: 1,
		morphologyMaxResults: 1,
		tasks: ["search", "quality"],
		quality: { maxFindings: 3 },
	});

	assert.equal(doc.toTextDoc().id, "text-computing-doc-test");
	assert.equal(doc.tokens.length > 0, true);
	const searchPipeline = nlp.pipeline.createDocumentAnalysisPipeline({
		tasks: ["search"],
	});
	assert.deepEqual(searchPipeline.processors[0]?.provides, [
		{ viewKind: "search" },
		{ layer: "token.text-computing" },
	]);

	const expectedSearchView = await nlp.normalization.searchView(source);
	const conflictingSearchDocument = addViewWithSpanMap(
		source,
		{ ...expectedSearchView.view, text: "conflicting normalized text" },
		expectedSearchView.spanMap,
	);
	await assert.rejects(
		() =>
			nlp.document.analyzeDocument(conflictingSearchDocument, {
				tasks: ["search"],
			}),
		/conflicting normalization view or span map/u,
	);
});

test("document analysis links hyphenated multi-token KB entities with link metadata", async () => {
	const pack = createPack(
		{
			schemaVersion: "1",
			id: "pack:text-computing:kb-phrase-test",
			name: "Text Computing KB Phrase Test",
			version: "0.1.0",
			packageName: "@example/textpack-en-kb-phrase-test",
			targets: { languages: ["en"], scripts: ["Latn"] },
			engines: {},
			resources: [
				{
					id: "en-segmentation-profile",
					kind: "segmentation-profile",
					format: "json",
					schemaId: "textdata.segmentation-profile.v1",
				},
				{
					id: "en-normalization-profile",
					kind: "normalization-profile",
					format: "json",
					schemaId: "textnorm.profile.v1",
				},
				{
					id: "en-kb",
					kind: "knowledge-base",
					format: "json",
					schemaId: "textkb.knowledge-base.v1",
				},
			],
			capabilitySlots: [
				{
					slot: "segmentation",
					status: "task-supported",
					tier: "baseline",
					resourceIds: ["en-segmentation-profile"],
					bindings: [
						{
							role: "profile",
							resourceId: "en-segmentation-profile",
							schemaId: "textdata.segmentation-profile.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textdata",
						},
					],
				},
				{
					slot: "normalization",
					status: "task-supported",
					tier: "rule-based",
					resourceIds: ["en-normalization-profile"],
					bindings: [
						{
							role: "profile",
							resourceId: "en-normalization-profile",
							schemaId: "textnorm.profile.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textnorm",
						},
					],
				},
				{
					slot: "kb",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["en-kb"],
					bindings: [
						{
							role: "primary",
							resourceId: "en-kb",
							schemaId: "textkb.knowledge-base.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textkb",
						},
					],
				},
			],
			license: "MIT",
		},
		{
			"en-segmentation-profile": {
				schemaVersion: "1",
				kind: "segmentation-profile",
				profileId: "en-segmentation-test",
				languageTag: "en",
				granularity: "token",
			},
			"en-normalization-profile": {
				schemaVersion: "1",
				kind: "normalization-profile",
				profileId: "en-normalization-test",
				languageTag: "en",
				script: "Latn",
				unicodeNormalization: "NFC",
				rules: [],
			},
			"en-kb": {
				schemaVersion: "1",
				kind: "knowledge-base",
				kbId: "kb:phrase-test",
				languageTags: ["en"],
				entities: [
					{
						entityId: "Q-phrase",
						typeIds: ["Q6256"],
						labels: [
							{
								languageTag: "en",
								value: "Republic of Guinea-Bissau",
							},
						],
						aliases: [
							{
								languageTag: "en",
								value: "Guinea-Bissau",
							},
						],
					},
				],
			},
		},
	);
	const nlp = await load(pack);
	const doc = await nlp("Guinea-Bissau joined the meeting.", {
		tasks: ["kb"],
		entityMaxCandidates: 1,
	});

	assert.equal(doc.entities.length, 1);
	assert.equal(doc.entities[0]?.entityId, "Q-phrase");
	assert.equal(doc.entities[0]?.matchedAlias, "Guinea-Bissau");
	assert.equal(doc.entities[0]?.matchKind, "exact");
	assert.deepEqual(doc.entities[0]?.types, ["Q6256"]);
	assert.equal(doc.entities[0]?.mention, "Guinea-Bissau");
	assert.equal(doc.entities[0]?.startCU, 0);
	assert.equal(doc.entities[0]?.endCU, 13);
	assert.deepEqual(doc.entities[0]?.tokenIds, [
		doc.tokens[0]?.id,
		doc.tokens[1]?.id,
	]);
	assert.equal(doc.quality.skipped, true);
	assert.equal(
		doc.evidence.some((entry) => entry.kind === "quality-report"),
		false,
	);

	const customSource = createDocument("Guinea-Bissau joined the meeting.", {
		id: "text-computing-custom-source-view",
		rawViewId: "source-text",
	});
	const customViewDoc = await nlp.document.analyzeDocument(customSource, {
		tasks: ["kb"],
		entityMaxCandidates: 1,
	});
	assert.equal(customViewDoc.sourceViewId, "source-text");
	assert.equal(customViewDoc.toJSON().sourceViewId, "source-text");
	assert.equal(
		customViewDoc.tokens.every((token) => token.viewId === "source-text"),
		true,
	);
	assert.equal(customViewDoc.entities[0]?.viewId, "source-text");
	assert.equal(
		customViewDoc.toTextDoc().layers["token.text-computing"]?.viewId,
		"source-text",
	);
	assert.deepEqual(
		Object.values(
			customViewDoc.toTextDoc().layers["token.text-computing"]?.annotations ??
				{},
		).map((annotation) => annotation.evidence.inputViewIds),
		customViewDoc.tokens.map(() => ["source-text"]),
	);
	assert.deepEqual(validateTextDocument(customViewDoc.toTextDoc()), {
		ok: true,
		diagnostics: [],
	});
});

test("document morphology deduplicates and limits analyses independently per form", async () => {
	const pack = createPack(
		{
			schemaVersion: "1",
			id: "pack:text-computing:morphology-per-form-test",
			name: "Text Computing Morphology Per Form Test",
			version: "0.1.0",
			packageName: "@example/textpack-morphology-per-form-test",
			targets: { languages: ["en"], scripts: ["Latn"] },
			engines: {},
			resources: [
				{
					id: "en-segmentation-profile",
					kind: "segmentation-profile",
					format: "json",
					schemaId: "textdata.segmentation-profile.v1",
				},
				{
					id: "en-normalization-profile",
					kind: "normalization-profile",
					format: "json",
					schemaId: "textnorm.profile.v1",
				},
				{
					id: "en-morphology",
					kind: "morphology",
					format: "json",
					schemaId: "textlex.morphology.v1",
				},
				{
					id: "en-morphology-paradigms",
					kind: "morphology",
					format: "tsv",
					schemaId: "textlex.morphology.rows.v1",
				},
				{
					id: "en-morphology-analyzer",
					kind: "morphology",
					format: "tsv",
					schemaId: "textlex.morphology.rows.v1",
				},
				{
					id: "en-morphology-generator",
					kind: "morphology",
					format: "tsv",
					schemaId: "textlex.morphology.rows.v1",
				},
			],
			capabilitySlots: [
				{
					slot: "segmentation",
					status: "task-supported",
					tier: "baseline",
					resourceIds: ["en-segmentation-profile"],
					bindings: [
						{
							role: "profile",
							resourceId: "en-segmentation-profile",
							schemaId: "textdata.segmentation-profile.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textdata",
						},
					],
				},
				{
					slot: "normalization",
					status: "task-supported",
					tier: "rule-based",
					resourceIds: ["en-normalization-profile"],
					bindings: [
						{
							role: "profile",
							resourceId: "en-normalization-profile",
							schemaId: "textnorm.profile.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textnorm",
						},
					],
				},
				{
					slot: "morphology",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["en-morphology"],
					bindings: [
						{
							role: "primary",
							resourceId: "en-morphology",
							schemaId: "textlex.morphology.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textlex",
						},
					],
				},
			],
		},
		{
			"en-segmentation-profile": {
				schemaVersion: "1",
				kind: "segmentation-profile",
				profileId: "en-segmentation-test",
				languageTag: "en",
				granularity: "token",
			},
			"en-normalization-profile": {
				schemaVersion: "1",
				kind: "normalization-profile",
				profileId: "en-normalization-test",
				languageTag: "en",
				script: "Latn",
				unicodeNormalization: "NFC",
				rules: [],
			},
			"en-morphology": {
				schemaVersion: "1",
				kind: "morphology",
				morphologyId: "en-morphology-test",
				languageTag: "en",
				resourceRefs: [
					{ resourceId: "en-morphology-paradigms", role: "paradigm-table" },
					{ resourceId: "en-morphology-analyzer", role: "analyzer" },
					{ resourceId: "en-morphology-generator", role: "generator" },
				],
			},
			"en-morphology-paradigms":
				"lemma\tform\tpartOfSpeech\tfeatureBundle\tentryId\nlemma-alpha\talpha\tNOUN\tN;SG\ta1\nlemma-beta\tbeta\tNOUN\tN;SG\tb1\nlemma-accent\tá\tNOUN\tN;SG\tc1\n",
			"en-morphology-analyzer":
				"form\tlemma\tpartOfSpeech\tfeatureBundle\tentryId\nalpha\tlemma-alpha\tNOUN\tN;SG\ta1\nbeta\tlemma-beta\tNOUN\tN;SG\tb1\ná\tlemma-accent\tNOUN\tN;SG\tc1\n",
			"en-morphology-generator":
				"lemma\tform\tpartOfSpeech\tfeatureBundle\tentryId\nlemma-alpha\talpha\tNOUN\tN;SG\ta1\nlemma-beta\tbeta\tNOUN\tN;SG\tb1\nlemma-accent\tá\tNOUN\tN;SG\tc1\n",
		},
	);
	const nlp = await load(pack);
	const doc = await nlp("alpha beta a\u0301", {
		tasks: ["morphology"],
		morphologyMaxResults: 1,
	});

	assert.deepEqual(
		doc.morphology.map((analysis) => [analysis.form, analysis.lemma]),
		[
			["alpha", "lemma-alpha"],
			["beta", "lemma-beta"],
			["á", "lemma-accent"],
		],
	);
	assert.deepEqual(
		doc.lemmas.map((lemma) => [lemma.tokenId, lemma.value]),
		[
			[doc.tokens[0]?.id, "lemma-alpha"],
			[doc.tokens[1]?.id, "lemma-beta"],
			[doc.tokens[2]?.id, "lemma-accent"],
		],
	);
	assert.equal(doc.tokens[2]?.text, "a\u0301");
	assert.equal(doc.tokens[2]?.viewId, "raw");
	assert.equal(doc.tokens[2]?.normalizedText, "á");
	assert.equal(doc.tokens[2]?.morphology[0]?.queryForm, "á");
	assert.equal(doc.tokens[2]?.morphology[0]?.viewId, "raw");
	assert.equal(doc.tokens[2]?.lemmas[0]?.viewId, "raw");
	assert.equal(
		doc.toTextDoc().layers["morph.text-computing"] !== undefined,
		true,
	);
	assert.equal(
		doc.toTextDoc().layers["lemma.text-computing"] !== undefined,
		true,
	);
	const noMorphology = await nlp("alpha beta a\u0301", {
		tasks: ["morphology"],
		morphologyMaxResults: 0,
	});
	assert.deepEqual(noMorphology.morphology, []);
});
