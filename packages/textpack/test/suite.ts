import assert from "node:assert/strict";
import {
	capabilities,
	composePacks,
	createPack,
	getResource,
	listResources,
	loadPack,
	type PackResourceMap,
	resolvePackComponents,
	resourceKinds,
	type TextPackManifest,
	textPackModalities,
	validateManifest,
} from "../dist/index.js";

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
			metadata: {
				role: "function-words",
			},
		},
		{
			id: "lexicon-en-test",
			kind: "lexicon",
			path: "resources/lexicon.tsv",
			format: "tsv",
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
	],
	license: "MIT",
	citations: ["test citation"],
};

const resources: PackResourceMap = {
	"gazetteer-en-test": "Acme Corp\tORG\n",
	"lexicon-en-test": "analyses\tlemma=analysis\tpos=NOUN\n",
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

const pack = createPack(manifest, resources);
assert.equal(getResource<string>(pack, "stoplist-en-test"), "a\nan\nthe\n");
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
assert.deepEqual(capabilities(pack), {
	segmentation: "rules",
	extraction: "gazetteer",
	terminology: "lexicon",
});

const loadedFromNamed = await loadPack({ manifest, resources });
assert.equal(
	getResource<string>(loadedFromNamed, "rules-en-test"),
	"abbrev:Dr.\n",
);
const loadedFromDefault = await loadPack({
	default: {
		manifest,
		resources: async () => resources,
	},
});
assert.equal(
	getResource<string>(loadedFromDefault, "lexicon-en-test"),
	resources["lexicon-en-test"],
);
await assert.rejects(() => loadPack({}), /manifest and resources/);

const frCoreManifest: TextPackManifest = {
	...manifest,
	id: "pack:fr-core",
	name: "French Core",
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
await assert.rejects(
	() =>
		resolvePackComponents(frComposite, {
			resolveComponent: async () => {
				throw new Error("missing fixture");
			},
		}),
	/Required textpack component @ismail-elkorchi\/textpack-fr-core could not be resolved: missing fixture/,
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
