import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadEnglish, manifest } from "../dist/index.js";

const reader = {
	async readText({ descriptor }) {
		return readFile(new URL(descriptor.path, descriptor.packageRoot), "utf8");
	},
};

const runtime = await loadEnglish({ reader });
const resolved = runtime.pack;

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
	resolved.manifest.components?.some(
		(component) => component.role === "required",
	),
);

const requiredSlots = [
	"foundation",
	"core",
	"normalization",
	"segmentation",
	"lexicon",
	"morphology",
	"syntax",
	"kb",
	"search",
	"corpus",
	"parallel",
	"quality",
];
const slotStatuses = new Map(
	resolved.manifest.capabilitySlots?.map((slot) => [slot.slot, slot.status]) ??
		[],
);

assert.equal(
	resolved.manifest.components?.filter(
		(component) => component.role === "required",
	).length,
	12,
);
for (const slot of requiredSlots) {
	assert.equal(slotStatuses.get(slot), "task-supported");
}
for (const resourceKey of [
	"en-tatoeba-corpus-sentences",
	"en-tatoeba-parallel-fra",
	"wikidata-en-entities",
	"wikidata-en-aliases",
	"wikidata-en-relations",
]) {
	assert.ok(
		Object.hasOwn(resolved.resources, resourceKey),
		`Expected generated resource ${resourceKey} to be loaded.`,
	);
}

const sampleText = "Paris is a city.";

assert.equal(runtime.languageTag, "en");
assert.equal(runtime.pack, resolved);

assert.ok((await runtime.segmentation.lexicalUnits(sampleText)).length > 0);
assert.equal(
	typeof (await runtime.normalization.normalizeText(sampleText)),
	"string",
);
assert.equal(typeof runtime.lexicon.lookup, "function");
assert.equal(typeof runtime.morphology.analyze, "function");
assert.equal(typeof runtime.morphology.generate, "function");
assert.ok((await runtime.syntax.resources()).annotations.length > 0);
assert.ok((await runtime.syntax.annotations()).length > 0);
assert.equal(typeof runtime.kb.candidates, "function");
assert.ok(
	[...(await runtime.search.analyzer()).analyze(sampleText)].length > 0,
);
assert.equal(typeof runtime.corpus.rows, "function");
assert.equal(typeof runtime.parallel.rows, "function");
assert.equal(typeof runtime.parallel.links, "function");
assert.ok((await runtime.quality.resources()).length > 0);
assert.ok((await runtime.quality.profiles()).length > 0);
