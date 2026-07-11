import assert from "node:assert/strict";
import {
	analyzeWord,
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
	determinize,
	epsilonRemove,
	fstFromPack,
	generateWord,
	getSemiring,
	hyphenateWord,
	intersect,
	minimize,
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
assert.deepEqual(applyDown(rewrite, "ph", { includeSpans: true })[0]?.spans, [
	{
		viewId: "input",
		span: { start: 0, end: 2, unit: "utf16-code-unit" },
	},
]);
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
assert.equal(
	analyzeWord(lexicon, "walked", { includeSpans: true })[0]?.spans?.[0]?.viewId,
	"surface",
);
assert.equal(
	generateWord(lexicon, "walk+V+PST", { includeSpans: true })[0]?.spans?.[0]
		?.viewId,
	"analysis",
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

const cyclicSource = buildFst({
	kind: "transducer",
	states: [0],
	arcs: [{ from: 0, to: 0, input: "a", output: "b" }],
	startState: 0,
	finalWeights: { 0: 0 },
});
const cyclicTarget = buildFst({
	kind: "transducer",
	states: [0],
	arcs: [{ from: 0, to: 0, input: "b", output: "c" }],
	startState: 0,
	finalWeights: { 0: 0 },
});
const longCycleInput = "a".repeat(100);
assert.equal(
	applyDown(compose(cyclicSource, cyclicTarget), longCycleInput)[0]?.output,
	"c".repeat(100),
);

const wideLabelComposition = compose(
	buildFst({
		kind: "transducer",
		states: [0, 1],
		arcs: [{ from: 0, to: 1, input: "ab", output: "xy" }],
		startState: 0,
		finalWeights: { 1: 0 },
	}),
	buildFst({
		kind: "transducer",
		states: [0, 1],
		arcs: [{ from: 0, to: 1, input: "xy", output: "12" }],
		startState: 0,
		finalWeights: { 1: 0 },
	}),
);
assert.deepEqual(
	applyDown(wideLabelComposition, "ab").map((result) => result.output),
	["12"],
);

const epsilonComposition = compose(
	buildFst({
		kind: "transducer",
		states: [0, 1, 2],
		arcs: [
			{ from: 0, to: 1, input: "a", output: "" },
			{ from: 1, to: 2, input: "b", output: "x" },
		],
		startState: 0,
		finalWeights: { 2: 0 },
	}),
	buildFst({
		kind: "transducer",
		states: [0, 1, 2],
		arcs: [
			{ from: 0, to: 1, input: "", output: "y" },
			{ from: 1, to: 2, input: "x", output: "z" },
		],
		startState: 0,
		finalWeights: { 2: 0 },
	}),
);
assert.deepEqual(
	applyDown(epsilonComposition, "ab").map((result) => result.output),
	["yz"],
);

const aStar = buildFst({
	kind: "acceptor",
	states: [0],
	arcs: [{ from: 0, to: 0, input: "a", output: "a" }],
	startState: 0,
	finalWeights: { 0: 0 },
});
assert.equal(applyDown(intersect(aStar, aStar), longCycleInput).length, 1);
const allButTwoAs = subtract(aStar, buildAcceptor(["aa"]));
assert.equal(applyDown(allButTwoAs, "aa").length, 0);
assert.equal(applyDown(allButTwoAs, longCycleInput).length, 1);

const epsilonCyclic = buildFst({
	kind: "acceptor",
	states: [0, 1],
	arcs: [
		{ from: 0, to: 1, input: "", output: "" },
		{ from: 1, to: 1, input: "a", output: "a" },
	],
	startState: 0,
	finalWeights: { 1: 0 },
});
const epsilonFree = epsilonRemove(epsilonCyclic);
assert.equal(
	epsilonFree.arcs.some((arc) => arc.input === "" && arc.output === ""),
	false,
);
assert.equal(applyDown(epsilonFree, longCycleInput).length, 1);
assert.equal(applyDown(determinize(epsilonCyclic), longCycleInput).length, 1);

const weightedNondeterministic = buildFst({
	kind: "acceptor",
	semiring: "tropical",
	states: [0, 1, 2],
	arcs: [
		{ from: 0, to: 1, input: "a", output: "a", weight: 5 },
		{ from: 0, to: 2, input: "a", output: "a", weight: 2 },
	],
	startState: 0,
	finalWeights: { 1: 0, 2: 0 },
});
assert.deepEqual(
	applyDown(determinize(weightedNondeterministic), "a").map(
		(result) => result.weight,
	),
	[2],
);

const logPlus = getSemiring("log").plus(0, 0);
assert.ok(logPlus < 0);
assert.equal(
	validateFst(
		buildFst({
			kind: "acceptor",
			semiring: "log",
			states: [0],
			arcs: [{ from: 0, to: 0, input: "a", output: "a", weight: logPlus }],
			startState: 0,
			finalWeights: { 0: 0 },
		}),
	).valid,
	true,
);

const convergingLogEpsilons = buildFst({
	kind: "acceptor",
	semiring: "log",
	states: [0, 1],
	arcs: [
		{ from: 0, to: 1, input: "", output: "", weight: 1 },
		{ from: 0, to: 1, input: "", output: "", weight: 2 },
	],
	startState: 0,
	finalWeights: { 1: 0 },
});
assert.ok(
	Math.abs(
		(epsilonRemove(convergingLogEpsilons).finalWeights[0] ?? 0) -
			getSemiring("log").plus(1, 2),
	) < 1e-12,
);
const convergentLogCycle = buildFst({
	kind: "acceptor",
	semiring: "log",
	states: [0],
	arcs: [{ from: 0, to: 0, input: "", output: "", weight: 1 }],
	startState: 0,
	finalWeights: { 0: 0 },
});
assert.ok(
	Math.abs(
		(epsilonRemove(convergentLogCycle).finalWeights[0] ?? 0) -
			Math.log(1 - Math.exp(-1)),
	) < 1e-12,
);

const duplicateLogPaths = buildFst({
	kind: "acceptor",
	semiring: "log",
	states: [0, 1, 2],
	arcs: [
		{ from: 0, to: 1, input: "a", output: "a", weight: 0 },
		{ from: 0, to: 2, input: "a", output: "a", weight: 0 },
	],
	startState: 0,
	finalWeights: { 1: 0, 2: 0 },
});
assert.ok(
	Math.abs(
		(applyDown(determinize(duplicateLogPaths), "a")[0]?.weight ?? 0) +
			Math.log(2),
	) < 1e-12,
);

const divergentLogEpsilon = buildFst({
	kind: "acceptor",
	semiring: "log",
	states: [0],
	arcs: [{ from: 0, to: 0, input: "", output: "", weight: 0 }],
	startState: 0,
	finalWeights: { 0: 0 },
});
assert.throws(
	() => epsilonRemove(divergentLogEpsilon),
	/zero- or negative-weight epsilon cycle/,
);

const redundant = buildFst({
	kind: "acceptor",
	states: [0, 1, 2],
	arcs: [
		{ from: 0, to: 1, input: "a", output: "a" },
		{ from: 0, to: 2, input: "b", output: "b" },
		{ from: 1, to: 1, input: "a", output: "a" },
		{ from: 2, to: 2, input: "a", output: "a" },
	],
	startState: 0,
	finalWeights: { 1: 0, 2: 0 },
});
const minimized = minimize(redundant);
assert.equal(minimized.states.length, 2);
assert.equal(applyDown(minimized, "aaaa").length, 1);
assert.equal(applyDown(minimized, "baaa").length, 1);

const manyWeightedPaths = buildFst({
	kind: "acceptor",
	semiring: "tropical",
	states: Array.from({ length: 602 }, (_value, index) => index),
	arcs: [
		{ from: 0, to: 1, input: "a", output: "a", weight: 0 },
		...Array.from({ length: 600 }, (_value, index) => ({
			from: 0,
			to: index + 2,
			input: `z${String(index).padStart(3, "0")}`,
			output: `z${String(index).padStart(3, "0")}`,
			weight: 10,
		})),
	],
	startState: 0,
	finalWeights: Object.fromEntries(
		Array.from({ length: 601 }, (_value, index) => [index + 1, 0]),
	),
});
assert.equal(shortestPath(manyWeightedPaths)[0]?.input, "a");
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
