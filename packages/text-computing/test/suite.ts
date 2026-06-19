import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
	segmentationAdapterFromPack,
	type TextDataSegment,
} from "@ismail-elkorchi/textdata";
import { createDocument } from "@ismail-elkorchi/textdoc";
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
import ar from "@ismail-elkorchi/textpack-ar";
import en from "@ismail-elkorchi/textpack-en";
import fr from "@ismail-elkorchi/textpack-fr";
import {
	analyze,
	createFetchResourceReader,
	inspect,
	load,
	support,
} from "../dist/index.js";

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
		assert.equal(report.componentCount > 0, true);
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
		assert.equal(
			nlp.corpus.resources().length > 0,
			true,
			`${languageTag} corpus descriptors`,
		);
		assert.equal(
			nlp.parallel.resources().length > 0,
			true,
			`${languageTag} parallel descriptors`,
		);
	}
});

test("runs default document analysis over generated English, French, and Arabic packs", async () => {
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
		assert.equal(doc.quality.id.length > 0, true, `${languageTag} quality`);
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
			elapsedMs < 20_000,
			true,
			`${languageTag} default document analysis took ${elapsedMs}ms`,
		);
	}
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
	assert.equal(report.componentCount > 0, true);
	assert.equal(Array.isArray(report.resources), true);
	assert.equal(
		"loadFrench" in (fr as unknown as Record<string, unknown>),
		false,
	);
});

test("tasks fail clearly when file-backed resources need a reader", async () => {
	const nlp = await load(fr);

	assert.throws(
		() => nlp.tokenize("L'Etat francais reconnait Paris."),
		/requires options\.reader/u,
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
			kind: "profile",
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
});
