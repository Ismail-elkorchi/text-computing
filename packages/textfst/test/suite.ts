import assert from "node:assert/strict";
import {
	applyDown,
	applyUp,
	buildAcceptor,
	buildEditDistanceTransducer,
	buildFst,
	buildStringTransducer,
	compileLexicon,
	compileRegex,
	compileRewrite,
	compose,
	fstFromPack,
	generateWord,
	hyphenateWord,
	intersect,
	shortestPath,
	spellingCandidates,
	subtract,
	syllabifyWord,
	validateFst,
} from "../dist/index.js";

const regex = compileRegex("c(a|o)t");
assert.equal(validateFst(regex).valid, true);
assert.deepEqual(
	applyDown(regex, "cat").map((result) => result.output),
	["cat"],
);
assert.deepEqual(applyDown(regex, "cut"), []);

const rewrite = compileRewrite({ input: "ph", output: "f" });
assert.deepEqual(
	applyDown(rewrite, "ph").map((result) => result.output),
	["f"],
);
assert.deepEqual(
	applyUp(rewrite, "f").map((result) => result.input),
	["ph"],
);

const lexicon = compileLexicon({
	id: "morph",
	entries: [{ surface: "walked", analysis: "walk+V+PST" }],
});
assert.deepEqual(
	generateWord(lexicon, "walk+V+PST").map((result) => result.surface),
	["walked"],
);
assert.deepEqual(
	applyUp(lexicon, "walked").map((result) => result.input),
	["walk+V+PST"],
);

const first = buildStringTransducer("x", "y");
const second = buildStringTransducer("y", "z");
assert.deepEqual(
	applyDown(compose(first, second), "x").map((result) => result.output),
	["z"],
);

const animals = buildAcceptor(["cat", "cot"]);
const cats = buildAcceptor(["cat"]);
assert.deepEqual(
	applyDown(intersect(animals, cats), "cat").map((result) => result.output),
	["cat"],
);
assert.deepEqual(
	applyDown(subtract(animals, cats), "cot").map((result) => result.output),
	["cot"],
);
const shortest = shortestPath(buildAcceptor(["b", "a"]));
assert.deepEqual(shortest[0]?.input, "a");
assert.equal(shortest[0]?.arcs.length, 1);
assert.throws(() =>
	buildFst({
		states: [0, 0],
		arcs: [],
		startState: 0,
		finalWeights: { 0: 0 },
	}),
);
assert.equal(
	validateFst({
		id: "bad",
		kind: "acceptor",
		semiring: "boolean",
		states: [{ id: 0 }, { id: 0 }],
		arcs: [],
		startState: 0,
		finalWeights: { 0: 0 },
	}).valid,
	false,
);

const hyphenator = buildStringTransducer("testing", "test-ing");
assert.deepEqual(hyphenateWord(hyphenator, "testing")[0]?.pieces, [
	"test",
	"ing",
]);
const syllabifier = buildStringTransducer("banana", "ba.na.na");
assert.deepEqual(syllabifyWord(syllabifier, "banana")[0]?.syllables, [
	"ba",
	"na",
	"na",
]);

const editDistance = buildEditDistanceTransducer({
	alphabet: "abc",
	maxDistance: 1,
});
assert.ok(
	spellingCandidates(editDistance, "ab", { maxResults: 8 }).some(
		(candidate) => candidate.candidate === "aa",
	),
);

const packFst = fstFromPack(
	{
		manifest: { resources: [{ id: "morph", kind: "morphology" }] },
		resources: {
			morph: { entries: [{ surface: "ran", analysis: "run+V+PST" }] },
		},
	},
	{ kind: "morphology" },
);
assert.deepEqual(
	applyDown(packFst, "run+V+PST").map((result) => result.output),
	["ran"],
);
