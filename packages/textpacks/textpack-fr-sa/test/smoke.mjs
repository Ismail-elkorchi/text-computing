import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFrenchShareAlike, manifest } from "../dist/index.js";

const reader = {
	async readText({ descriptor }) {
		return readFile(new URL(descriptor.path, descriptor.packageRoot), "utf8");
	},
};

const runtime = await loadFrenchShareAlike({ reader });
const resolved = runtime.pack;

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
	resolved.manifest.components?.some(
		(component) => component.role === "required",
	),
);

const sampleText = "Text.";

assert.equal(runtime.languageTag, "fr");
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
const documentPipeline = runtime.pipeline.createDocumentAnalysisPipeline();
assert.equal(documentPipeline.processors.length, 1);
assert.ok(
	documentPipeline.processors[0]?.provides.some(
		(output) => output.viewKind === "search",
	),
);
assert.ok(
	documentPipeline.processors[0]?.provides.some(
		(output) => output.layer === "link.entity",
	),
);
assert.equal(typeof runtime.pipeline.runText, "function");
assert.equal(typeof runtime.pipeline.runDocument, "function");
