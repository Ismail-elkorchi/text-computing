import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	createNodeArtifactReader,
	createNodeResourceReader,
	load,
} from "@ismail-elkorchi/text-computing/node";
import { createNodeOnnxEntityExecutor } from "@ismail-elkorchi/text-computing/onnx/node";
import ar from "@ismail-elkorchi/textpack-ar";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_ROOT = path.join(
	ROOT,
	"tools/textpack-forge/snapshots/data/model-ner-multilingual-v1",
);
const AQMAR_ROOT = path.join(
	ROOT,
	"tools/textpack-forge/snapshots/data/aqmar-arabic-ner-1.0",
);
const DEFAULT_PATHS = Object.freeze({
	model: path.join(DATA_ROOT, "model_quantized.onnx"),
	arabic: path.join(AQMAR_ROOT, "all.test.features.txt"),
	output: path.join(DATA_ROOT, "evaluation-results.json"),
});
const ARTIFACT_ID =
	"artifact:text-computing:ner:bert-multilingual-cased-hrl:quantized";
const MODEL_SHA256 =
	"5b65139844be260b624a2a13782b01d122e613d64ce16ed0ba4d82e0b816f1a9";
const MODEL_SIZE = 178_495_423;
const SAMPLE_SIZE_PER_LANGUAGE = 100;

function parseArguments() {
	const paths = { ...DEFAULT_PATHS, update: false };
	for (let index = 2; index < process.argv.length; index += 1) {
		const name = process.argv[index];
		if (name === "--update") {
			paths.update = true;
			continue;
		}
		const value = process.argv[index + 1];
		if (!name?.startsWith("--") || value === undefined) {
			throw new Error(`Expected --name path, got ${name ?? "end of input"}.`);
		}
		const key = name.slice(2);
		if (!(key in paths)) throw new Error(`Unknown option ${name}.`);
		paths[key] = path.resolve(value);
		index += 1;
	}
	return paths;
}

function sha256(bytes) {
	return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function mappedAqmarType(label) {
	const match = /^(LOC|ORG|PER)(?:\d+)?$/u.exec(label);
	return match?.[1];
}

function mappedTag(rawTag, mapType) {
	const match = /^(B|I)-(.+)$/u.exec(rawTag);
	if (match === null) return Object.freeze({ prefix: "O" });
	const type = mapType(match[2] ?? "");
	return type === undefined
		? Object.freeze({ prefix: "O" })
		: Object.freeze({ prefix: match[1], type });
}

function exampleFromRows(id, rows, mapType) {
	let text = "";
	const taggedTokens = [];
	for (const [token, rawTag] of rows) {
		if (text.length > 0) text += " ";
		const start = text.length;
		text += token;
		taggedTokens.push({
			start,
			end: text.length,
			tag: mappedTag(rawTag, mapType),
		});
	}
	const entities = [];
	let current;
	const flush = () => {
		if (current !== undefined) entities.push(Object.freeze(current));
		current = undefined;
	};
	for (const token of taggedTokens) {
		if (token.tag.prefix === "O" || token.tag.type === undefined) {
			flush();
			continue;
		}
		if (
			token.tag.prefix === "B" ||
			current === undefined ||
			current.type !== token.tag.type
		) {
			flush();
			current = {
				startCU: token.start,
				endCU: token.end,
				type: token.tag.type,
			};
		} else {
			current.endCU = token.end;
		}
	}
	flush();
	return Object.freeze({ id, text, entities: Object.freeze(entities) });
}

function parseAqmar(text) {
	const examples = [];
	let rows = [];
	const flush = () => {
		if (rows.length > 0) {
			examples.push(
				exampleFromRows(`ar:${examples.length}`, rows, mappedAqmarType),
			);
		}
		rows = [];
	};
	for (const line of text.replace(/\r\n?/gu, "\n").split("\n")) {
		if (line.length === 0) {
			flush();
			continue;
		}
		const columns = line.split("\t");
		const token = columns[0];
		const label = columns.at(-1);
		if (token === undefined || label === undefined) {
			throw new Error(`Invalid AQMAR row: ${line}`);
		}
		rows.push([token, label]);
	}
	flush();
	return examples;
}

function heldOutSample(examples) {
	if (examples.length < SAMPLE_SIZE_PER_LANGUAGE) {
		throw new Error(
			`Expected at least ${SAMPLE_SIZE_PER_LANGUAGE} examples, got ${examples.length}.`,
		);
	}
	return [...examples]
		.map((example) => ({
			example,
			key: sha256(Buffer.from(`${example.id}\n${example.text}`, "utf8")),
		}))
		.sort(
			(left, right) =>
				left.key.localeCompare(right.key) ||
				left.example.id.localeCompare(right.example.id),
		)
		.slice(0, SAMPLE_SIZE_PER_LANGUAGE)
		.map(({ example }) => example);
}

function entityKey(entity) {
	return `${entity.startCU}:${entity.endCU}:${entity.type}`;
}

function scoreCounts(gold, predicted) {
	const goldKeys = new Set(gold.map(entityKey));
	const predictedKeys = new Set(predicted.map(entityKey));
	let truePositive = 0;
	for (const key of predictedKeys) {
		if (goldKeys.has(key)) truePositive += 1;
	}
	return {
		truePositive,
		falsePositive: predictedKeys.size - truePositive,
		falseNegative: goldKeys.size - truePositive,
	};
}

function metrics(counts) {
	const precision =
		counts.truePositive /
		Math.max(1, counts.truePositive + counts.falsePositive);
	const recall =
		counts.truePositive /
		Math.max(1, counts.truePositive + counts.falseNegative);
	const f1 =
		precision + recall === 0
			? 0
			: (2 * precision * recall) / (precision + recall);
	return {
		precision: Number(precision.toFixed(6)),
		recall: Number(recall.toFixed(6)),
		f1: Number(f1.toFixed(6)),
	};
}

async function main() {
	const paths = parseArguments();
	const [modelBytes, arabicBytes] = await Promise.all([
		readFile(paths.model),
		readFile(paths.arabic),
	]);
	if (
		modelBytes.byteLength !== MODEL_SIZE ||
		sha256(modelBytes) !== `sha256:${MODEL_SHA256}`
	) {
		throw new Error(
			"The NER model artifact does not match the pinned descriptor.",
		);
	}
	const snapshot = JSON.parse(
		await readFile(
			path.join(
				ROOT,
				"tools/textpack-forge/snapshots/aqmar-arabic-ner-1.0.snapshot.json",
			),
			"utf8",
		),
	);
	const testFile = snapshot.files.find((file) =>
		file.path.endsWith("/all.test.features.txt"),
	);
	assert.ok(testFile, "AQMAR snapshot must declare its official test file.");
	assert.equal(
		arabicBytes.byteLength,
		testFile.byteLength,
		"AQMAR test bytes differ from the pinned snapshot.",
	);
	assert.equal(
		sha256(arabicBytes),
		testFile.checksum,
		"AQMAR test checksum differs from the pinned snapshot.",
	);
	const executor = createNodeOnnxEntityExecutor();
	const nlp = await load(ar, {
		reader: createNodeResourceReader(),
		artifactReader: createNodeArtifactReader({
			paths: { [ARTIFACT_ID]: paths.model },
		}),
		entityExecutor: executor,
	});
	if (process.env.TEXT_COMPUTING_NER_DEBUG === "1") {
		for (const [languageTag, text] of [
			["ar", "زار محمد القاهرة وعمل في شركة جوجل."],
		]) {
			const result = await nlp(text, { tasks: ["entities"] });
			process.stderr.write(
				`${languageTag} smoke: ${JSON.stringify(result.entities)}\n`,
			);
		}
	}
	const suites = [
		{
			languageTag: "ar",
			dataset: "AQMAR official test feature split",
			sourceId: "source:aqmar:arabic-ner-1.0",
			snapshotId: "snapshot:source:aqmar:arabic-ner-1.0:2012-04-09",
			checksum: sha256(arabicBytes),
			examples: heldOutSample(parseAqmar(arabicBytes.toString("utf8"))),
		},
	];
	const aggregate = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
	const languages = [];
	for (const suite of suites) {
		const counts = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
		for (const example of suite.examples) {
			const result = await nlp(example.text, { tasks: ["entities"] });
			const predicted = result.entities.flatMap((entity) => {
				const type = { person: "PER", organization: "ORG", location: "LOC" }[
					entity.type
				];
				return type === undefined
					? []
					: [{ startCU: entity.startCU, endCU: entity.endCU, type }];
			});
			const exampleCounts = scoreCounts(example.entities, predicted);
			for (const key of Object.keys(counts)) counts[key] += exampleCounts[key];
		}
		for (const key of Object.keys(aggregate)) aggregate[key] += counts[key];
		languages.push({
			languageTag: suite.languageTag,
			dataset: suite.dataset,
			sourceId: suite.sourceId,
			snapshotId: suite.snapshotId,
			checksum: suite.checksum,
			sampleSize: suite.examples.length,
			counts,
			metrics: metrics(counts),
		});
		process.stderr.write(
			`${suite.languageTag}: ${JSON.stringify(languages.at(-1).metrics)}\n`,
		);
	}
	const output = {
		schemaVersion: "1",
		task: "entities",
		modelId: "Davlan/bert-base-multilingual-cased-ner-hrl",
		artifactId: ARTIFACT_ID,
		artifactChecksum: `sha256:${MODEL_SHA256}`,
		executorId: executor.id,
		targetLabels: ["LOC", "ORG", "PER"],
		sampling: {
			method: "lowest-sha256",
			key: "example id, newline, reconstructed text",
			sampleSizePerLanguage: SAMPLE_SIZE_PER_LANGUAGE,
		},
		spanMatching: "exact-utf16-span-and-type",
		languages,
		aggregate: {
			sampleSize: languages.reduce(
				(sum, language) => sum + language.sampleSize,
				0,
			),
			counts: aggregate,
			metrics: metrics(aggregate),
		},
		limitations: [
			"Evaluation is scoped to exact PER, ORG, and LOC spans; DATE is not scored because AQMAR does not provide a compatible date annotation policy.",
			"AQMAR is Arabic Wikipedia; the score does not establish domain-specific or dialectal Arabic fitness.",
		],
	};
	assert.ok(
		output.aggregate.metrics.f1 >= 0.5,
		"Arabic NER failed the required 0.5 exact-span F1 gate.",
	);
	if (paths.update) {
		await writeFile(
			paths.output,
			`${JSON.stringify(output, null, "\t")}\n`,
			"utf8",
		);
	} else {
		const expected = JSON.parse(await readFile(paths.output, "utf8"));
		assert.deepEqual(
			output,
			expected,
			"NER evaluation drifted; inspect the change before explicitly updating the evidence.",
		);
	}
	process.stdout.write(
		`${paths.output}\n${JSON.stringify(output.aggregate.metrics)}\n`,
	);
}

await main();
