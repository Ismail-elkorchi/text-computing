import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import {
	capabilities,
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
	requireSingleTaskResourceBinding,
	requireTaskResourceBindings,
	resolvePackComponents,
	resourceKinds,
	type TextPackManifest,
	taskResourceIdsFromBindings,
	textPackModalities,
	validateManifest,
} from "../dist/index.js";

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
			resourceIds: ["stoplist-en-test"],
			capabilities: {
				segmentation: "rules",
			},
		},
		{
			slot: "lexicon",
			status: "sampled",
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
			resourceIds: ["rules-en-test"],
		},
		{
			slot: "quality",
			status: "sampled",
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
		},
		{
			slot: "parallel",
			status: "planned",
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
const runnableLexiconManifest: TextPackManifest = {
	...manifest,
	capabilitySlots: manifest.capabilitySlots.map((slot) =>
		slot.slot === "lexicon" ? { ...slot, status: "task-supported" } : slot,
	),
};
const runnableLexiconPack = createPack(runnableLexiconManifest, resources);
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
	listResources(pack, {
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
assert.deepEqual(capabilities(pack), {
	segmentation: "rules",
	extraction: "gazetteer",
	terminology: "lexicon",
});
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
			status: "task-supported",
			resourceIds: ["table-materialized", "table-materialized-gzip"],
		},
		{
			slot: "quality",
			status: "task-supported",
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
const escapedResource = materializedManifest.resources[0];
if (escapedResource === undefined) throw new Error("missing escaped resource");
const escapedText = "escaped";
const escapedChecksum = `sha256:${await sha256(escapedText)}`;
await assert.rejects(
	() =>
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

const frCoreManifest: TextPackManifest = {
	...manifest,
	id: "pack:fr-core",
	name: "French Core",
	version: "0.1.0",
	packageName: "@ismail-elkorchi/textpack-fr-core",
	targets: {
		languages: ["fr"],
		scripts: ["Latn"],
		modalities: ["typed"],
	},
	resources: [
		{
			id: "lexicon-fr-core",
			kind: "lexicon",
		},
	],
	capabilitySlots: [
		{
			slot: "lexicon",
			status: "sampled",
			resourceIds: ["lexicon-fr-core"],
			capabilities: {
				terminology: "lexicon",
			},
		},
	],
};
const frHistoricalManifest: TextPackManifest = {
	...manifest,
	id: "pack:fr-historical",
	name: "French Historical",
	version: "0.1.0",
	packageName: "@ismail-elkorchi/textpack-fr-historical",
	targets: {
		languages: ["fr"],
		scripts: ["Latn"],
		periods: ["19c"],
		modalities: ["historical"],
	},
	resources: [
		{
			id: "normalization-fr-historical",
			kind: "normalization-profile",
			schemaId: "textnorm.rules.v1",
		},
	],
	capabilitySlots: [
		{
			slot: "normalization",
			status: "sampled",
			resourceIds: ["normalization-fr-historical"],
			capabilities: {
				normalization: "rules",
				historical: true,
			},
		},
	],
};
const frComposite = createPack(
	{
		...recipeManifest,
		id: "pack:fr",
		name: "French Composite",
		packageName: "@ismail-elkorchi/textpack-fr",
		components: [
			{
				packageName: "@ismail-elkorchi/textpack-fr-core",
				versionRange: "0.1.0",
				role: "required",
				licensePolicy: "default",
				capabilityPolicy: "contributes-default",
				artifactPolicy: "none",
			},
			{
				packageName: "@ismail-elkorchi/textpack-fr-historical",
				versionRange: "0.1.0",
				role: "optional",
				licensePolicy: "default",
				capabilityPolicy: "available-optional",
				artifactPolicy: "none",
			},
		],
		artifacts: [],
		capabilitySlots: [
			{
				slot: "lexicon",
				status: "planned",
			},
			{
				slot: "normalization",
				status: "planned",
			},
			{
				slot: "parallel",
				status: "planned",
			},
		],
	},
	{},
);
const componentResolver = async (component: {
	readonly packageName: string;
}): Promise<unknown> => {
	if (component.packageName === "@ismail-elkorchi/textpack-fr-core") {
		return {
			manifest: frCoreManifest,
			resources: {
				"lexicon-fr-core": "texte\tlemma=texte\tpos=NOUN\n",
			},
		};
	}
	if (component.packageName === "@ismail-elkorchi/textpack-fr-historical") {
		return {
			manifest: frHistoricalManifest,
			resources: {
				"normalization-fr-historical": "estoit=>etait\n",
			},
		};
	}
	throw new Error(`missing ${component.packageName}`);
};
const resolvedFrench = await resolvePackComponents(frComposite, {
	resolveComponent: componentResolver,
});
assert.equal(
	resolvedFrench.manifest.packageName,
	"@ismail-elkorchi/textpack-fr",
);
assert.equal(
	getResource<string>(resolvedFrench, "lexicon-fr-core"),
	"texte\tlemma=texte\tpos=NOUN\n",
);
assert.equal(
	resolvedFrench.resources["normalization-fr-historical"],
	undefined,
);
const resolvedFrenchFull = await resolvePackComponents(frComposite, {
	profile: "full",
	resolveComponent: componentResolver,
});
assert.equal(
	getResource<string>(resolvedFrenchFull, "normalization-fr-historical"),
	"estoit=>etait\n",
);
assert.deepEqual(
	listResources(resolvedFrenchFull, { schemaId: "textnorm.rules.v1" }).map(
		(resource) => resource.id,
	),
	["normalization-fr-historical"],
);
await assert.rejects(
	() =>
		resolvePackComponents(frComposite, {
			resolveComponent: async () => {
				throw new Error("missing fixture");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-core could not be resolved: missing fixture/,
);
await assert.rejects(
	() =>
		resolvePackComponents(frComposite, {
			resolveComponent: async () => ({
				manifest: { ...frCoreManifest, version: "0.2.0" },
				resources: {
					"lexicon-fr-core": "texte\tlemma=texte\tpos=NOUN\n",
				},
			}),
		}),
	/does not satisfy declared range 0\.1\.0/,
);
await assert.rejects(
	() =>
		resolvePackComponents(frComposite, {
			resolveComponent: async () => ({
				manifest: { ...frCoreManifest, version: "0.1.0-beta.1" },
				resources: {
					"lexicon-fr-core": "texte\tlemma=texte\tpos=NOUN\n",
				},
			}),
		}),
	/does not satisfy declared range 0\.1\.0/,
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
			resourceIds: ["stoplist-en-test"],
			capabilities: {
				segmentation: "dictionary",
			},
		},
		{
			slot: "quality",
			status: "sampled",
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
assert.equal(capabilities(composed).segmentation, "rules");
assert.equal(capabilities(composed).noisyText, true);
