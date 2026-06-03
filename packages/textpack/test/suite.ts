import assert from "node:assert/strict";
import * as publicApi from "../dist/index.js";
import {
	capabilities,
	composePacks,
	createPack,
	getResource,
	listResources,
	loadPack,
	type PackResourceMap,
	resourceKinds,
	type TextPackManifest,
	textPackModalities,
	validateManifest,
} from "../dist/index.js";

const manifest: TextPackManifest = {
	id: "pack:test",
	name: "Test Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-test",
	kind: ["stoplist", "lexicon", "gazetteer", "rule-set"],
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
	capabilities: {
		segmentation: "rules",
		extraction: "gazetteer",
		terminology: "lexicon",
	},
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
	"locale-profile",
	"segmentation-profile",
	"normalization-profile",
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
assert.throws(
	() =>
		validateManifest({
			manifestVersion: "1.0.0",
			id: "pack:old",
			packageName: "@ismail-elkorchi/textpack-old",
			version: "1.0.0",
			kind: ["language"],
			targets: { languages: ["en"] },
			engines: {},
			capabilities: {},
			resources: { stopwords: ["resources/stopwords.txt"] },
			provides: { stopwords: ["old"] },
		}),
	/manifest\.manifestVersion is not a final textpack field/,
);
assert.throws(
	() =>
		validateManifest({
			...manifest,
			kind: ["stoplist", "lexicon", "gazetteer", "rule-set", "dataset"],
		}),
	/no resource declares that kind/,
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
			kind: ["dataset"],
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
assert.deepEqual(capabilities(pack), manifest.capabilities);

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
	kind: ["stoplist"],
	capabilities: {
		segmentation: "dictionary",
		noisyText: true,
	},
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

for (const removedName of [
	"TextPackManifestV1",
	"isTextPackManifestV1",
	"textPackResourceFamilies",
	"createTextPackResourceRegistry",
	"queryTextPackResourceRegistry",
	"TextPackCatalogV1",
	"createTextPackReviewReport",
	"loadTextPackFromFileSystem",
	"parseTextPackResourceContent",
	"textPackDemoTrimLowercaseCanonicalizer",
]) {
	assert.equal(
		removedName in publicApi,
		false,
		`${removedName} must not remain public`,
	);
}
