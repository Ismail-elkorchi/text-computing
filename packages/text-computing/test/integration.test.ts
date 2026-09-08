import assert from "node:assert/strict";
import test from "node:test";
import {
	analysisOf,
	analysisProcessor,
	load,
} from "@ismail-elkorchi/text-computing";
import {
	corpusQuery,
	createCorpus,
} from "@ismail-elkorchi/text-computing/corpus";
import {
	createDocument,
	fromDocumentJson,
	isAnnotation,
	isScore,
	toDocumentJson,
	updateAnnotation,
} from "@ismail-elkorchi/text-computing/document";
import {
	classify,
	trainClassifier,
	transformVectorizer,
} from "@ismail-elkorchi/text-computing/learning";
import { createNodeResourceReader } from "@ismail-elkorchi/text-computing/node";
import {
	createMemoryPipelineCache,
	createPipeline,
	runPipeline,
} from "@ismail-elkorchi/text-computing/pipeline";
import {
	applyRules,
	compileRuleSet,
	createRuleProcessor,
} from "@ismail-elkorchi/text-computing/rules";
import en from "@ismail-elkorchi/textpack-en";

function names(label = "person") {
	return compileRuleSet({
		id: "names",
		version: "1",
		rules: [
			{
				id: "alice",
				when: { kind: "char", text: "Alice" },
				action: [
					{
						kind: "annotate",
						layerId: "mentions",
						layerType: "entity.mention",
						value: { label },
					},
				],
			},
		],
	});
}

test("rules compose without a pack and use the same implementation directly", async () => {
	const rules = names();
	const pipeline = createPipeline([
		createRuleProcessor(rules, { provides: [{ layer: "mentions" }] }),
	]);
	for (const text of ["Alice arrived.", "Nobody arrived."]) {
		const source = createDocument(text);
		assert.deepEqual(
			await runPipeline(pipeline, source),
			applyRules(source, rules),
		);
	}
});

test("configured rule content invalidates pipeline caches without relabelling versions", async () => {
	const first = createPipeline([
		createRuleProcessor(names("person"), { provides: [{ layer: "mentions" }] }),
	]);
	const second = createPipeline([
		createRuleProcessor(names("character"), {
			provides: [{ layer: "mentions" }],
		}),
	]);
	assert.notEqual(first.fingerprint, second.fingerprint);
	const cache = createMemoryPipelineCache();
	const source = createDocument("Alice");
	await runPipeline(first, source, { cache });
	const changed = await runPipeline(second, source, { cache });
	assert.equal(
		(
			Object.values(changed.layers.mentions?.annotations ?? {})[0]?.value as {
				label: string;
			}
		).label,
		"character",
	);
});

test("one document survives analysis, pipelines, serialization, edits, corpus and search", async () => {
	const nlp = await load(en, { reader: createNodeResourceReader() });
	const source = createDocument(
		`Alice reads books. ${"Some people read several other books. ".repeat(12)}`,
		{ id: "composed", metadata: { collection: "test" } },
	);
	const direct = await nlp.document.analyzeDocument(source);
	const composed = await runPipeline(
		createPipeline([analysisProcessor(nlp)]),
		source,
	);
	assert.deepEqual(toDocumentJson(composed), toDocumentJson(direct));
	assert.deepEqual(
		direct.lexicalUnits.map((item) => item.startCU),
		[...direct.lexicalUnits.map((item) => item.startCU)].sort((a, b) => a - b),
	);
	assert.deepEqual(
		direct.sentences.map((item) => item.startCU),
		[...direct.sentences.map((item) => item.startCU)].sort((a, b) => a - b),
	);
	assert.equal("toTextDoc" in direct, false);
	assert.equal("tokens" in JSON.parse(JSON.stringify(direct)), false);
	assert.deepEqual(
		analysisOf(fromDocumentJson(toDocumentJson(direct))),
		analysisOf(direct),
	);
	assert.equal(direct.id, "composed");
	assert.equal(direct.metadata.collection, "test");
	const annotated = applyRules(direct, names());
	const restored = fromDocumentJson(toDocumentJson(annotated));
	assert.deepEqual(restored.layers.mentions, annotated.layers.mentions);
	assert.deepEqual(analysisOf(restored).evidence, direct.evidence);
	const corpus = createCorpus([restored]);
	assert.ok(
		corpusQuery(corpus, { kind: "token", term: "Alice" }).documents.length > 0,
	);
	const index = nlp.search.addDocument(await nlp.search.createIndex(), direct);
	assert.ok(nlp.search.query(index, "books").length > 0);
	const token = Object.values(
		restored.layers["token.text-computing"]?.annotations ?? {},
	)[0];
	assert.ok(token);
	const edited = updateAnnotation(restored, {
		...token,
		value: { ...(token.value as object), normalized: "changed" },
	});
	assert.equal(analysisOf(edited).tokens[0]?.normalizedText, "changed");
	assert.notEqual(direct.tokens[0]?.normalizedText, "changed");
});

test("classical learning is a direct operation over caller-owned examples", () => {
	const classifier = trainClassifier(
		[
			{ id: "a", label: "positive", features: { "word:clear": 1 } },
			{ id: "b", label: "negative", features: { "word:unclear": 1 } },
		],
		{ kind: "naive-bayes" },
	);
	assert.ok(classifier.labels.includes("positive"));
	const predictions = [
		{ id: "unseen-positive", features: { "word:clear": 1 } },
		{ id: "unseen-negative", features: { "word:unclear": 1 } },
	].map((sample) => {
		const matrix = transformVectorizer(classifier.vectorizer, [sample]);
		return classify(classifier, {
			ids: matrix.columnIds,
			values: matrix.values,
			featureSpaceId: matrix.featureSpaceId,
		}).label;
	});
	assert.deepEqual(predictions, ["positive", "negative"]);
});

test("analysis processors capture configuration and declare empty and custom link layers", async () => {
	const nlp = await load(en, { reader: createNodeResourceReader() });
	const options = {
		tasks: ["kb" as const],
		entityLinking: {
			layerId: "links",
			mentionSpans: [
				{
					viewId: "raw",
					span: { start: 0, end: 6, unit: "utf16-code-unit" as const },
				},
			],
		},
	};
	const processor = analysisProcessor(nlp, options);
	assert.ok(processor.provides.some((output) => output.layer === "links"));
	options.tasks.length = 0;
	options.entityLinking.mentionSpans.length = 0;
	options.entityLinking.layerId = "changed";
	const linked = await runPipeline(
		createPipeline([processor]),
		createDocument("France signed."),
	);
	assert.ok(linked.layers.links);
	assert.equal(analysisOf(linked).entityLinks[0]?.entityId, "Q142");
	assert.equal(analysisOf(linked).entities.length, 0);
	assert.deepEqual(
		analysisOf(fromDocumentJson(toDocumentJson(linked))).entityLinks,
		analysisOf(linked).entityLinks,
	);
	const emptyOptions = {
		tasks: ["kb" as const],
		entityLinking: { layerId: "links" },
	};
	const source = createDocument("No explicit mentions.");
	const direct = await nlp.document.analyzeDocument(source, emptyOptions);
	const piped = await runPipeline(
		createPipeline([analysisProcessor(nlp, emptyOptions)]),
		source,
	);
	assert.deepEqual(toDocumentJson(piped), toDocumentJson(direct));
	assert.deepEqual(piped.layers.links?.annotations, {});
});

test("rule processors capture application configuration", async () => {
	const options = { phases: ["main"], provides: [{ layer: "mentions" }] };
	const rules = names();
	const phase = rules.rules[0]?.phase;
	assert.ok(phase);
	options.phases[0] = phase;
	const processor = createRuleProcessor(rules, options);
	options.phases[0] = "unrelated";
	const output = options.provides[0];
	assert.ok(output);
	output.layer = "changed";
	const doc = await runPipeline(
		createPipeline([processor]),
		createDocument("Alice"),
	);
	assert.equal(Object.keys(doc.layers.mentions?.annotations ?? {}).length, 1);
});

test("primary annotation scores have explicit validated semantics", () => {
	assert.equal(isScore({ kind: "probability", value: 1.01 }), false);
	assert.equal(isScore({ kind: "logprob", value: 0.1 }), false);
	assert.equal(isScore({ kind: "weight", value: 2, scale: "bm25" }), true);
	const doc = applyRules(createDocument("Alice"), names());
	const annotation = Object.values(doc.layers.mentions?.annotations ?? {})[0];
	assert.ok(annotation);
	assert.equal(
		isAnnotation({ ...annotation, score: { kind: "probability", value: -1 } }),
		false,
	);
	assert.equal(
		isAnnotation({ ...annotation, score: { kind: "probability", value: 0.7 } }),
		true,
	);
});
