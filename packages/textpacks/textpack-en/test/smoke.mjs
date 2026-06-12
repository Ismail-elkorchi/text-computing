import assert from "node:assert/strict";
import { loadEnglish, manifest } from "../dist/index.js";

const resolved = await loadEnglish();

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
