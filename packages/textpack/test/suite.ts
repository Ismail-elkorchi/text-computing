import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import {
	capabilities,
	capabilityResourceIdsFromBindings,
	composePacks,
	createFetchResourceReader,
	createPack,
	getResource,
	listResources,
	loadPack,
	openResourceJson,
	openResourceTable,
	openResourceText,
	type PackResourceMap,
	parseResourceTable,
	requireCapabilityResourceBindings,
	requireSingleCapabilityResourceBinding,
	requireSingleTaskResourceBinding,
	requireTaskResourceBindings,
	resourceKinds,
	type TextPackManifest,
	taskResourceIdsFromBindings,
	textPackCapabilityTiers,
	textPackModalities,
	validateManifest,
} from "@ismail-elkorchi/textpack";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function utf8ByteLength(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

const manifest: TextPackManifest = {
	schemaVersion: "1",
	id: "pack:test",
	name: "Test Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-test",
	targets: {
		languages: ["en"],
		scripts: ["Latn"],
		domains: ["test"],
		modalities: ["typed"],
	},
	engines: {
		"@ismail-elkorchi/textpack": "^0.1.0",
	},
	resources: [
		{
			id: "stoplist-en-test",
			kind: "stoplist",
			path: "resources/stopwords.txt",
			format: "lines",
			schemaId: "textlex.stoplist.v1",
			metadata: {
				role: "function-words",
			},
		},
		{
			id: "lexicon-en-test",
			kind: "lexicon",
			path: "resources/lexicon.tsv",
			format: "tsv",
			schemaId: "textlex.lexicon.rows.v1",
		},
		{
			id: "gazetteer-en-test",
			kind: "gazetteer",
			targets: {
				languages: ["en"],
				domains: ["entities"],
			},
		},
		{
			id: "rules-en-test",
			kind: "rule-set",
		},
		{
			id: "quality-en-test",
			kind: "quality-profile",
			format: "json",
			schemaId: "textquality.profile.v1",
		},
	],
	capabilitySlots: [
		{
			slot: "core",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["stoplist-en-test"],
			capabilities: {
				segmentation: "rules",
			},
		},
		{
			slot: "lexicon",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["gazetteer-en-test", "lexicon-en-test"],
			bindings: [
				{
					role: "table",
					resourceId: "lexicon-en-test",
					schemaId: "textlex.lexicon.rows.v1",
					required: true,
					ownerPackage: "@ismail-elkorchi/textlex",
				},
			],
			prerequisites: ["core"],
			readerRequired: true,
			capabilities: {
				extraction: "gazetteer",
				terminology: "lexicon",
			},
		},
		{
			slot: "syntax",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["rules-en-test"],
		},
		{
			slot: "quality",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["quality-en-test"],
		},
	],
	license: "MIT",
	citations: ["test citation"],
};

const resources: PackResourceMap = {
	"gazetteer-en-test": "Acme Corp\tORG\n",
	"lexicon-en-test": "surface\tlemma\tpos\nanalyses\tanalysis\tNOUN\n",
	"quality-en-test": JSON.stringify({ recordCount: 1 }),
	"rules-en-test": "abbrev:Dr.\n",
	"stoplist-en-test": "a\nan\nthe\n",
};

assert.deepEqual(resourceKinds, [
	"unicode-profile",
	"language-registry",
	"locale-profile",
	"segmentation-profile",
	"normalization-profile",
	"search-profile",
	"lexicon",
	"gazetteer",
	"termbase",
	"abbreviation-table",
	"stoplist",
	"phrase-list",
	"fst",
	"morphology",
	"grammar",
	"rule-set",
	"statistical-model",
	"corpus",
	"dataset",
	"knowledge-base",
	"ontology",
	"translation-memory",
	"alignment-table",
	"quality-profile",
	"composite",
]);
assert.deepEqual(textPackModalities, [
	"typed",
	"ocr",
	"atr",
	"asr",
	"social",
	"transliterated",
	"historical",
]);
assert.deepEqual(textPackCapabilityTiers, [
	"none",
	"resource-only",
	"baseline",
	"lookup",
	"rule-based",
	"contextual",
	"model-backed",
]);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [{ slot: "search", status: "task-supported" }],
		}),
	/tier must be one of/u,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{ slot: "search", status: "task-supported", tier: "resource-only" },
			],
		}),
	/resource-only cannot claim runnable status/u,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{ slot: "syntax", status: "profiled", tier: "baseline" },
			],
		}),
	/tier must be resource-only/u,
);

const normalized = validateManifest(manifest);
assert.equal(normalized.name, "Test Pack");
const normalizedLexiconSlot = normalized.capabilitySlots.find(
	(slot) => slot.slot === "lexicon",
);
assert.deepEqual(normalizedLexiconSlot?.bindings, [
	{
		role: "table",
		resourceId: "lexicon-en-test",
		schemaId: "textlex.lexicon.rows.v1",
		required: true,
		ownerPackage: "@ismail-elkorchi/textlex",
	},
]);
assert.deepEqual(normalizedLexiconSlot?.prerequisites, ["core"]);
assert.equal(normalizedLexiconSlot?.readerRequired, true);
const recipeManifest = validateManifest({
	schemaVersion: "1",
	id: "pack:fr",
	name: "French Composite Pack",
	version: "0.1.0",
	packageName: "@ismail-elkorchi/textpack-fr",
	targets: {
		languages: ["fr"],
		scripts: ["Latn"],
	},
	engines: {
		"@ismail-elkorchi/textpack": "^0.1.0",
	},
	resources: [],
	components: [
		{
			packageName: "@ismail-elkorchi/textpack-fr-core",
			versionRange: "^0.1.0",
			role: "required",
			licensePolicy: "default",
			capabilityPolicy: "contributes-default",
			artifactPolicy: "none",
		},
	],
	artifacts: [
		{
			artifactId: "artifact:textpack-fr:research:corpus-sample:0.1.0",
			sourceIds: ["source:repo:fixtures"],
			version: "0.1.0",
			profile: "research",
			sizeBytes: 0,
			mediaType: "application/json",
			checksum: {
				algorithm: "sha256",
				value: "0".repeat(64),
			},
			licenseExpression: "MIT",
			redistributionPolicy: "redistributable",
			retrieval: {
				kind: "local",
				instructions: "Fixture-backed scaffold artifact.",
			},
			cacheKey: "textpack-fr/research/corpus-sample/0.1.0",
			expectedFiles: [],
		},
	],
	capabilitySlots: [
		{
			slot: "core",
			status: "task-supported",
			tier: "baseline",
		},
		{
			slot: "parallel",
			status: "planned",
			tier: "none",
			notes: ["No parallel component is installed by the default composite."],
		},
	],
	gapNotes: [
		{
			id: "gap:fr:parallel",
			slot: "parallel",
			runtimeSurface: "textparallel",
			status: "planned",
			message: "Parallel resources are outside the default scaffold.",
		},
	],
	license: "MIT",
	generated: {
		forgeVersion: "0.1.0",
		lockfileChecksum: `sha256:${"0".repeat(64)}`,
		generatedAt: "2026-06-07T00:00:00.000Z",
		generatorCommand: "node tools/textpack-forge/cli.mjs build",
	},
});
assert.equal(recipeManifest.schemaVersion, "1");
assert.equal(recipeManifest.resources.length, 0);
assert.equal(recipeManifest.components?.[0]?.role, "required");
assert.throws(
	() =>
		validateManifest({
			...recipeManifest,
			components: [
				{
					packageName: "@ismail-elkorchi/textpack-fr-core",
					versionRange: "^0.1.0",
					role: "required",
					licensePolicy: "silent",
					capabilityPolicy: "contributes-default",
				},
			],
		}),
	/licensePolicy must be one of/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			unexpectedField: true,
		}),
	/manifest\.unexpectedField is not a final textpack field/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			targets: {
				languages: [],
			},
		}),
	/manifest\.targets\.languages must contain at least one item/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			targets: {
				languages: ["en", "en"],
			},
		}),
	/manifest\.targets\.languages\[1\] duplicates value en/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			resources: [
				{
					id: "bad",
					kind: "dataset",
					metadata: new Date(),
				},
			],
		}),
	/I-JSON/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			resources: [
				{
					id: "bad",
					kind: "dataset",
					metadata: { canonicalSchema: "textpack-corpus-resource.schema.json" },
				},
			],
		}),
	/metadata\.canonicalSchema is not supported/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon-en-test"],
					bindings: [
						{
							role: "runtime",
							resourceId: "lexicon-en-test",
							schemaId: "textlex.lexicon.rows.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textlex",
						},
					],
				},
			],
		}),
	/role must be one of/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon-en-test"],
					bindings: [
						{
							role: "table",
							resourceId: "lexicon-en-test",
							schemaId: "textlex.lexicon.rows.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textfacts",
						},
					],
				},
			],
		}),
	/ownerPackage must be one of/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon-en-test"],
					bindings: [
						{
							role: "table",
							resourceId: "missing",
							schemaId: "textlex.lexicon.rows.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textlex",
						},
					],
				},
			],
		}),
	/bindings references unknown resource missing/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon-en-test"],
					bindings: [
						{
							role: "table",
							resourceId: "lexicon-en-test",
							schemaId: "textlex.lexicon.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textlex",
						},
					],
				},
			],
		}),
	/schemaId textlex\.lexicon\.v1 does not match resource schemaId textlex\.lexicon\.rows\.v1/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon-en-test"],
					bindings: [
						{
							role: "table",
							resourceId: "gazetteer-en-test",
							schemaId: "textlex.lexicon.rows.v1",
							required: true,
							ownerPackage: "@ismail-elkorchi/textlex",
						},
					],
				},
			],
		}),
	/must also be listed in resourceIds/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon-en-test"],
					prerequisites: ["normalization"],
				},
			],
		}),
	/prerequisites references unknown slot normalization/,
);

const pack = createPack(manifest, resources);
assert.equal(pack.manifest.resources[0]?.schemaId, "textlex.stoplist.v1");
assert.equal(getResource<string>(pack, "stoplist-en-test"), "a\nan\nthe\n");
assert.deepEqual(
	capabilityResourceIdsFromBindings(pack, {
		slot: "lexicon",
		ownerPackage: "@ismail-elkorchi/textlex",
		schemaId: "textlex.lexicon.rows.v1",
		role: "table",
	}),
	["lexicon-en-test"],
);
assert.equal(
	requireSingleCapabilityResourceBinding(pack, {
		slot: "lexicon",
		ownerPackage: "@ismail-elkorchi/textlex",
	}).resourceId,
	"lexicon-en-test",
);
assert.equal(
	requireCapabilityResourceBindings(pack, {
		slot: "lexicon",
		ownerPackage: "@ismail-elkorchi/textlex",
	}).length,
	1,
);
const runnableLexiconManifest: TextPackManifest = {
	...manifest,
	capabilitySlots: manifest.capabilitySlots.map((slot) =>
		slot.slot === "lexicon"
			? { ...slot, status: "task-supported", tier: "lookup" }
			: slot,
	),
};
const runnableLexiconPack = createPack(runnableLexiconManifest, resources);
assert.deepEqual(capabilities(runnableLexiconPack), {
	extraction: "gazetteer",
	terminology: "lexicon",
});
assert.deepEqual(
	taskResourceIdsFromBindings(runnableLexiconPack, {
		slot: "lexicon",
		ownerPackage: "@ismail-elkorchi/textlex",
		schemaId: "textlex.lexicon.rows.v1",
		role: "table",
	}),
	["lexicon-en-test"],
);
assert.deepEqual(
	requireTaskResourceBindings(runnableLexiconPack, {
		slot: "lexicon",
		ownerPackage: "@ismail-elkorchi/textlex",
		resourceId: "lexicon-en-test",
	}).map((binding) => binding.resourceId),
	["lexicon-en-test"],
);
assert.throws(
	() =>
		requireTaskResourceBindings(pack, {
			slot: "lexicon",
			ownerPackage: "@ismail-elkorchi/textlex",
		}),
	/slot lexicon is sampled, not task-runnable/,
);
assert.throws(
	() =>
		requireTaskResourceBindings(runnableLexiconPack, {
			slot: "lexicon",
			ownerPackage: "@ismail-elkorchi/textlex",
			resourceId: "stoplist-en-test",
		}),
	/not bound for slot lexicon/,
);
const ambiguousPack = createPack(
	{
		...runnableLexiconManifest,
		capabilitySlots: runnableLexiconManifest.capabilitySlots.map((slot) =>
			slot.slot === "lexicon"
				? {
						...slot,
						resourceIds: [...(slot.resourceIds ?? []), "stoplist-en-test"],
						bindings: [
							...(slot.bindings ?? []),
							{
								role: "table",
								resourceId: "stoplist-en-test",
								schemaId: "textlex.stoplist.v1",
								required: true,
								ownerPackage: "@ismail-elkorchi/textlex",
							},
						],
					}
				: slot,
		),
	},
	resources,
);
assert.throws(
	() =>
		requireSingleTaskResourceBinding(ambiguousPack, {
			slot: "lexicon",
			ownerPackage: "@ismail-elkorchi/textlex",
			role: "table",
		}),
	/ambiguous task resource bindings/,
);
assert.throws(() => getResource(pack, "missing"), /not present/);
assert.throws(
	() => createPack(manifest, { ...resources, extra: "bad" }),
	/undeclared resource extra/,
);
assert.throws(() => {
	const { "rules-en-test": _removed, ...missing } = resources;
	return createPack(manifest, missing);
}, /missing declared resource rules-en-test/);

assert.deepEqual(
	listResources(pack, { kind: "stoplist", languages: "en" }).map(
		(resource) => resource.id,
	),
	["stoplist-en-test"],
);
assert.deepEqual(
	listResources(pack, { domains: "entities" }).map((resource) => resource.id),
	["gazetteer-en-test"],
);
assert.deepEqual(
	listResources(runnableLexiconPack, {
		capability: "extraction",
		metadata: { role: "function-words" },
	}).map((resource) => resource.id),
	["stoplist-en-test"],
);
assert.deepEqual(
	listResources(pack, { schemaId: "textlex.stoplist.v1" }).map(
		(resource) => resource.id,
	),
	["stoplist-en-test"],
);
assert.deepEqual(capabilities(pack), {});
const lexiconResources = listResources(pack, {
	schemaId: ["textlex.stoplist.v1", "textlex.lexicon.rows.v1"],
});
assert.deepEqual(
	lexiconResources.map((resource) => resource.id),
	["stoplist-en-test", "lexicon-en-test"],
);
const lexiconTable = await openResourceTable(pack, "lexicon-en-test");
assert.deepEqual(lexiconTable.columns, ["surface", "lemma", "pos"]);
assert.deepEqual(lexiconTable.rows[0], {
	surface: "analyses",
	lemma: "analysis",
	pos: "NOUN",
});
assert.deepEqual(await openResourceJson(pack, "quality-en-test"), {
	recordCount: 1,
});

const loadedFromNamed = await loadPack({ manifest, resources });
assert.equal(
	getResource<string>(loadedFromNamed, "rules-en-test"),
	"abbrev:Dr.\n",
);
const loadedFromDefault = await loadPack({
	default: {
		manifest,
		resources,
	},
});
assert.equal(
	getResource<string>(loadedFromDefault, "lexicon-en-test"),
	resources["lexicon-en-test"],
);
await assert.rejects(
	() =>
		loadPack({
			default: {
				manifest,
				resources: async () => resources,
			},
		}),
	/resources must be a plain object/,
);
await assert.rejects(() => loadPack({}), /manifest and resources/);

const materializedTableText = "name\tvalue\nhello\tworld\n";
const materializedJsonText = '{"ok":true}';
const compressedTableText = "name\tvalue\nbonjour\tmonde\n";
const compressedTableEncoded = `${gzipSync(
	Buffer.from(compressedTableText, "utf8"),
).toString("base64")}\n`;
const materializedManifest: TextPackManifest = {
	...manifest,
	id: "pack:materialized",
	name: "Materialized Pack",
	packageName: "@ismail-elkorchi/textpack-materialized",
	resources: [
		{ id: "table-materialized", kind: "dataset", format: "tsv" },
		{ id: "json-materialized", kind: "quality-profile", format: "json" },
		{
			id: "table-materialized-gzip",
			kind: "dataset",
			format: "tsv+gzip+base64",
		},
	],
	capabilitySlots: [
		{
			slot: "corpus",
			status: "profiled",
			tier: "resource-only",
			resourceIds: ["table-materialized", "table-materialized-gzip"],
		},
		{
			slot: "quality",
			status: "profiled",
			tier: "resource-only",
			resourceIds: ["json-materialized"],
		},
	],
};
const materializedPack = createPack(materializedManifest, {
	"json-materialized": {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-materialized",
		packageRoot: "file:///fixture/",
		path: "resources/quality.json",
		encoding: "utf8",
		checksum: `sha256:${await sha256(materializedJsonText)}`,
		byteLength: utf8ByteLength(materializedJsonText),
	},
	"table-materialized": {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-materialized",
		packageRoot: "file:///fixture/",
		path: "resources/table.tsv",
		encoding: "utf8",
		checksum: `sha256:${await sha256(materializedTableText)}`,
		byteLength: utf8ByteLength(materializedTableText),
		lineCount: 3,
		nonEmptyLineCount: 2,
	},
	"table-materialized-gzip": {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-materialized",
		packageRoot: "file:///fixture/",
		path: "resources/table.tsv.gz.b64",
		encoding: "gzip-base64",
		checksum: `sha256:${await sha256(compressedTableEncoded)}`,
		byteLength: utf8ByteLength(compressedTableEncoded),
		resourceTextByteLength: utf8ByteLength(compressedTableText),
	},
});
const materializedReader = {
	readText({
		descriptor,
	}: {
		readonly descriptor: { readonly path: string };
	}): string {
		if (descriptor.path === "resources/table.tsv") return materializedTableText;
		if (descriptor.path === "resources/quality.json")
			return materializedJsonText;
		if (descriptor.path === "resources/table.tsv.gz.b64") {
			return compressedTableEncoded;
		}
		throw new Error(`unexpected resource path ${descriptor.path}`);
	},
};
assert.equal(
	await openResourceText(
		materializedPack,
		"table-materialized",
		materializedReader,
	),
	materializedTableText,
);
assert.deepEqual(
	await openResourceJson(
		materializedPack,
		"json-materialized",
		materializedReader,
	),
	{ ok: true },
);
assert.deepEqual(
	(
		await openResourceTable(
			materializedPack,
			"table-materialized-gzip",
			materializedReader,
		)
	).rows[0],
	{ name: "bonjour", value: "monde" },
);
assert.throws(
	() => parseResourceTable("name\t\nvalue\trow\n"),
	/header columns must be non-empty/,
);
const reservedColumnTable = parseResourceTable(
	"__proto__\tconstructor\nvalue-a\tvalue-b\n",
);
assert.equal(reservedColumnTable.rows[0]?.__proto__, "value-a");
assert.equal(reservedColumnTable.rows[0]?.constructor, "value-b");
assert.equal(
	Object.getPrototypeOf(reservedColumnTable.rows[0]),
	Object.prototype,
);
const fetchReader = createFetchResourceReader({
	fetch: async (input) => {
		assert.equal(
			input instanceof URL ? input.href : String(input),
			"file:///fixture/resources/table.tsv",
		);
		return new Response(materializedTableText);
	},
});
assert.equal(
	await openResourceText(materializedPack, "table-materialized", fetchReader),
	materializedTableText,
);
const rebasedFetchReader = createFetchResourceReader({
	packageRoot: "https://assets.textpack.invalid/textpack-en",
	fetch: async (input) => {
		assert.equal(
			input instanceof URL ? input.href : String(input),
			"https://assets.textpack.invalid/textpack-en/resources/table.tsv",
		);
		return new Response(materializedTableText);
	},
});
assert.equal(
	await openResourceText(
		materializedPack,
		"table-materialized",
		rebasedFetchReader,
	),
	materializedTableText,
);
assert.equal(
	getResource<Record<string, unknown>>(materializedPack, "table-materialized")
		.packageRoot,
	"file:///fixture/",
);
const escapedResource = materializedManifest.resources[0];
if (escapedResource === undefined) throw new Error("missing escaped resource");
const escapedText = "escaped";
const escapedChecksum = `sha256:${await sha256(escapedText)}`;
await assert.rejects(
	async () =>
		createFetchResourceReader({
			fetch: async () => new Response(escapedText),
		}).readText({
			pack: materializedPack,
			resource: escapedResource,
			descriptor: {
				kind: "file-backed-resource",
				packageRoot: "https://textpack.invalid/package/",
				path: "../outside.tsv",
				encoding: "utf8",
				checksum: escapedChecksum,
				byteLength: utf8ByteLength(escapedText),
			},
		}),
	/escapes package root/,
);
await assert.rejects(
	() =>
		openResourceText(materializedPack, "table-materialized", {
			readText: () => "name\tvalue\ncorrupt\trow\n",
		}),
	/byte length mismatch|checksum mismatch/,
);

const overlayManifest: TextPackManifest = {
	...manifest,
	id: "pack:test-overlay",
	name: "Test Overlay",
	packageName: "@ismail-elkorchi/textpack-test-overlay",
	resources: [
		{
			id: "stoplist-en-test",
			kind: "stoplist",
		},
	],
	capabilitySlots: [
		{
			slot: "core",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["stoplist-en-test"],
			capabilities: {
				segmentation: "dictionary",
			},
		},
		{
			slot: "quality",
			status: "sampled",
			tier: "resource-only",
			capabilities: {
				noisyText: true,
			},
		},
	],
};
const overlay = createPack(overlayManifest, {
	"stoplist-en-test": "thereof\n",
});
assert.throws(() => composePacks([pack, overlay]), /duplicate resource id/);
const composed = composePacks([pack, overlay], {
	id: "pack:composed",
	name: "Composed",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-composed",
	conflictPolicy: "last",
});
assert.equal(getResource<string>(composed, "stoplist-en-test"), "thereof\n");
assert.deepEqual(capabilities(composed), {});

const fileHandleManifest: TextPackManifest = {
	...manifest,
	id: "pack:file-handle",
	name: "File Handle Pack",
	packageName: "@ismail-elkorchi/textpack-file-handle",
	resources: [
		{
			id: "file-handle-resource",
			kind: "dataset",
			path: "resources/file.tsv",
		},
	],
	capabilitySlots: [],
};
const mutableFileHandle: Record<string, unknown> = {
	kind: "file-backed-resource",
	packageName: fileHandleManifest.packageName,
	packageRoot: "file:///fixture/",
	path: "resources/file.tsv",
	encoding: "utf8",
	checksum: `sha256:${"0".repeat(64)}`,
	byteLength: 0,
};
const fileHandlePack = createPack(fileHandleManifest, {
	"file-handle-resource": mutableFileHandle,
});
const normalizedFileHandle = getResource<Record<string, unknown>>(
	fileHandlePack,
	"file-handle-resource",
);
mutableFileHandle.path = "resources/mutated.tsv";
assert.equal(normalizedFileHandle.path, "resources/file.tsv");
assert.equal(Object.isFrozen(normalizedFileHandle), true);
assert.throws(
	() =>
		createPack(fileHandleManifest, {
			"file-handle-resource": {
				...mutableFileHandle,
				packageName: fileHandleManifest.packageName,
				path: "resources/other.tsv",
			},
		}),
	/path must match its manifest descriptor path/,
);
assert.throws(
	() =>
		createPack(fileHandleManifest, {
			"file-handle-resource": {
				...mutableFileHandle,
				packageName: "@ismail-elkorchi/textpack-unrelated",
				path: "resources/file.tsv",
			},
		}),
	/packageName must identify the manifest package or a declared component package/,
);
const composedFileHandlePack = composePacks([fileHandlePack], {
	id: "pack:file-handle-composite",
	name: "File Handle Composite",
	packageName: "@ismail-elkorchi/textpack-file-handle-composite",
});
assert.equal(
	getResource<Record<string, unknown>>(
		composedFileHandlePack,
		"file-handle-resource",
	).packageName,
	fileHandleManifest.packageName,
);

const componentShared = {
	packageName: "@ismail-elkorchi/textpack-shared",
	versionRange: "^1.0.0",
	role: "optional",
	licensePolicy: "default",
	capabilityPolicy: "available-optional",
} as const;
const componentPackA = createPack(
	{
		...manifest,
		id: "pack:component-a",
		name: "Component A",
		packageName: "@ismail-elkorchi/textpack-component-a",
		resources: [],
		components: [
			{
				packageName: "@ismail-elkorchi/textpack-component-b",
				versionRange: "^1.0.0",
				role: "optional",
				licensePolicy: "default",
				capabilityPolicy: "available-optional",
			},
			{ ...componentShared, reason: "from a" },
		],
		capabilitySlots: [],
	},
	{},
);
const componentPackB = createPack(
	{
		...manifest,
		id: "pack:component-b",
		name: "Component B",
		packageName: "@ismail-elkorchi/textpack-component-b",
		resources: [],
		components: [
			{ ...componentShared, artifactPolicy: "none", reason: "from b" },
		],
		capabilitySlots: [],
	},
	{},
);
const componentForward = composePacks([componentPackA, componentPackB]);
const componentReverse = composePacks([componentPackB, componentPackA]);
assert.deepEqual(
	componentForward.manifest.components,
	componentReverse.manifest.components,
);
assert.deepEqual(
	componentForward.manifest.components?.find(
		(component) =>
			component.packageName === "@ismail-elkorchi/textpack-component-b",
	),
	{
		packageName: "@ismail-elkorchi/textpack-component-b",
		versionRange: "1.0.0",
		role: "required",
		licensePolicy: "default",
		capabilityPolicy: "contributes-default",
		artifactPolicy: "none",
	},
);
assert.equal(
	componentForward.manifest.components?.find(
		(component) => component.packageName === "@ismail-elkorchi/textpack-shared",
	)?.reason,
	"from a; from b",
);
const componentExcludingPack = createPack(
	{
		...manifest,
		id: "pack:component-excluding",
		name: "Component Excluding",
		packageName: "@ismail-elkorchi/textpack-component-excluding",
		resources: [],
		components: [
			{
				packageName: "@ismail-elkorchi/textpack-component-b",
				versionRange: "^1.0.0",
				role: "excluded",
				licensePolicy: "local-only",
				capabilityPolicy: "documentation-only",
				reason: "The package is explicitly excluded from this composition.",
			},
		],
		capabilitySlots: [],
	},
	{},
);
for (const packs of [
	[componentExcludingPack, componentPackB],
	[componentPackB, componentExcludingPack],
]) {
	assert.throws(() => composePacks(packs), /explicitly excludes it/);
}

function bindingPack(
	id: string,
	packageName: string,
	schemaId: string,
	required: boolean,
) {
	return createPack(
		{
			...manifest,
			id,
			name: id,
			packageName,
			resources: [
				{
					id: "shared-binding-resource",
					kind: "morphology",
					schemaId,
				},
			],
			capabilitySlots: [
				{
					slot: "morphology",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["shared-binding-resource"],
					bindings: [
						{
							role: "primary",
							resourceId: "shared-binding-resource",
							schemaId,
							required,
							ownerPackage: "@ismail-elkorchi/textlex",
						},
					],
				},
			],
		},
		{ "shared-binding-resource": packageName },
	);
}

const optionalBindingPack = bindingPack(
	"pack:binding-optional",
	"@ismail-elkorchi/textpack-binding-optional",
	"textlex.morphology.v1",
	false,
);
const requiredBindingPack = bindingPack(
	"pack:binding-required",
	"@ismail-elkorchi/textpack-binding-required",
	"textlex.morphology.v1",
	true,
);
assert.throws(
	() =>
		requireTaskResourceBindings(optionalBindingPack, {
			slot: "morphology",
			ownerPackage: "@ismail-elkorchi/textlex",
		}),
	/no task resource bindings/u,
);
assert.equal(
	requireSingleTaskResourceBinding(optionalBindingPack, {
		slot: "morphology",
		ownerPackage: "@ismail-elkorchi/textlex",
		resourceId: "shared-binding-resource",
	}).resourceId,
	"shared-binding-resource",
);
for (const packs of [
	[optionalBindingPack, requiredBindingPack],
	[requiredBindingPack, optionalBindingPack],
]) {
	const bindingComposite = composePacks(packs, { conflictPolicy: "first" });
	assert.deepEqual(
		bindingComposite.manifest.capabilitySlots[0]?.bindings?.map((binding) => ({
			resourceId: binding.resourceId,
			required: binding.required,
		})),
		[{ resourceId: "shared-binding-resource", required: true }],
	);
}
const conflictingSchemaPack = bindingPack(
	"pack:binding-schema-conflict",
	"@ismail-elkorchi/textpack-binding-schema-conflict",
	"textlex.morphology.v2",
	true,
);
assert.throws(
	() =>
		composePacks([requiredBindingPack, conflictingSchemaPack], {
			conflictPolicy: "first",
		}),
	/conflicting binding schemas/,
);

const profiledOptionalBindingPack = createPack(
	{
		...manifest,
		id: "pack:binding-profiled-optional",
		name: "Profiled Optional Binding",
		packageName: "@ismail-elkorchi/textpack-binding-profiled-optional",
		resources: [
			{
				id: "profiled-morphology-resource",
				kind: "morphology",
				schemaId: "textlex.morphology.v1",
			},
		],
		capabilitySlots: [
			{
				slot: "morphology",
				status: "profiled",
				tier: "resource-only",
				readerRequired: true,
				resourceIds: ["profiled-morphology-resource"],
				bindings: [
					{
						role: "primary",
						resourceId: "profiled-morphology-resource",
						schemaId: "textlex.morphology.v1",
						required: false,
						ownerPackage: "@ismail-elkorchi/textlex",
					},
				],
			},
		],
	},
	{ "profiled-morphology-resource": "profiled morphology" },
);
assert.deepEqual(
	capabilityResourceIdsFromBindings(profiledOptionalBindingPack, {
		slot: "morphology",
		ownerPackage: "@ismail-elkorchi/textlex",
	}),
	["profiled-morphology-resource"],
);
assert.throws(
	() =>
		requireCapabilityResourceBindings(profiledOptionalBindingPack, {
			slot: "morphology",
			ownerPackage: "@ismail-elkorchi/textlex",
			required: true,
		}),
	/no task resource bindings/u,
);

for (const packs of [
	[requiredBindingPack, profiledOptionalBindingPack],
	[profiledOptionalBindingPack, requiredBindingPack],
]) {
	const mixedCapabilityComposite = composePacks(packs);
	const morphologySlot = mixedCapabilityComposite.manifest.capabilitySlots.find(
		(slot) => slot.slot === "morphology",
	);
	assert.equal(morphologySlot?.status, "task-supported");
	assert.equal(morphologySlot?.tier, "lookup");
	assert.deepEqual(morphologySlot?.resourceIds, ["shared-binding-resource"]);
	assert.deepEqual(
		morphologySlot?.bindings?.map((binding) => binding.resourceId),
		["shared-binding-resource"],
	);
	assert.equal(morphologySlot?.readerRequired, undefined);
	assert.deepEqual(
		taskResourceIdsFromBindings(mixedCapabilityComposite, {
			slot: "morphology",
			ownerPackage: "@ismail-elkorchi/textlex",
		}),
		["shared-binding-resource"],
	);
	assert.equal(
		listResources(mixedCapabilityComposite, {
			id: "profiled-morphology-resource",
		}).length,
		1,
	);
}

const prototypeResources: Record<string, unknown> = Object.create(null);
prototypeResources.__proto__ = "prototype-safe";
const prototypePack = createPack(
	{
		...manifest,
		id: "pack:prototype-resource",
		name: "Prototype Resource",
		packageName: "@ismail-elkorchi/textpack-prototype-resource",
		resources: [{ id: "__proto__", kind: "dataset" }],
		capabilitySlots: [],
	},
	prototypeResources,
);
const prototypeComposite = composePacks([prototypePack]);
assert.equal(getResource(prototypeComposite, "__proto__"), "prototype-safe");

let repeatedReadCount = 0;
const repeatedReader = {
	readText(): string {
		repeatedReadCount += 1;
		return materializedTableText;
	},
};
await openResourceText(materializedPack, "table-materialized", repeatedReader);
await openResourceText(materializedPack, "table-materialized", repeatedReader);
assert.equal(repeatedReadCount, 1);
