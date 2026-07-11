#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
	createNodeResourceReader,
	load,
} from "@ismail-elkorchi/text-computing/node";
import ar from "@ismail-elkorchi/textpack-ar";
import en from "@ismail-elkorchi/textpack-en";
import fr from "@ismail-elkorchi/textpack-fr";

const fixture = JSON.parse(
	await readFile(
		new URL("../fixtures/nlp-benchmarks/held-out-v1.json", import.meta.url),
		"utf8",
	),
);

const packs = new Map([
	["ar", ar],
	["en", en],
	["fr", fr],
]);

const latencyBudgetsMs = Object.freeze({ core: 250, lookup: 1_500 });
const latencyMeasurementCount = 5;
const latencyWarmupCount = 2;
const minimumPerformanceTextLength = 512;

function expectedBoundaryKeys(text, lexicalUnits) {
	const keys = new Set();
	let cursor = 0;
	for (const unit of lexicalUnits) {
		const start = text.indexOf(unit, cursor);
		if (start < 0) {
			throw new Error(`benchmark lexical unit ${JSON.stringify(unit)} is absent`);
		}
		const end = start + unit.length;
		keys.add(`${start}:${end}`);
		cursor = end;
	}
	return keys;
}

function f1(truePositive, predicted, expected) {
	const precision = predicted === 0 ? (expected === 0 ? 1 : 0) : truePositive / predicted;
	const recall = expected === 0 ? 1 : truePositive / expected;
	return {
		precision,
		recall,
		f1:
			precision + recall === 0
				? 0
				: (2 * precision * recall) / (precision + recall),
	};
}

function sameValues(left, right) {
	return left.length === right.length && left.every((value, index) => {
		const other = right[index];
		return JSON.stringify(value) === JSON.stringify(other);
	});
}

function round(value) {
	return Math.round(value * 1_000_000) / 1_000_000;
}

function spanKey(span) {
	return `${span.startCU}:${span.endCU}`;
}

function taskEvidencePresent(analysis, task) {
	return analysis.evidence.some(
		(evidence) =>
			evidence.kind === "task-slot" &&
			evidence.task === task &&
			(evidence.status === "task-supported" ||
				evidence.status === "feature-complete"),
	);
}

function assertCaseSpan(text, span, path) {
	if (
		!Number.isSafeInteger(span.startCU) ||
		!Number.isSafeInteger(span.endCU) ||
		span.startCU < 0 ||
		span.endCU <= span.startCU ||
		span.endCU > text.length
	) {
		throw new Error(`${path} is not a valid non-empty UTF-16 span`);
	}
}

function validateFixtureIntegrity(suite) {
	const languageTags = new Set();
	const caseIds = new Set();
	for (const language of suite.languages) {
		if (languageTags.has(language.languageTag)) {
			throw new Error(`duplicate benchmark language ${language.languageTag}`);
		}
		languageTags.add(language.languageTag);
		for (const task of [
			"segmentation",
			"normalization",
			"morphology",
			"entities",
			"search",
		]) {
			for (const item of language[task]) {
				if (caseIds.has(item.id)) {
					throw new Error(`duplicate benchmark case id ${item.id}`);
				}
				caseIds.add(item.id);
				if (task === "morphology" || task === "entities") {
					const spans = task === "morphology" ? item.tokens : item.mentions;
					const keys = new Set();
					for (const [index, span] of spans.entries()) {
						assertCaseSpan(item.text, span, `${item.id}[${index}]`);
						const key = spanKey(span);
						if (keys.has(key)) {
							throw new Error(`${item.id} contains duplicate span ${key}`);
						}
						keys.add(key);
					}
				}
			}
		}
	}
}

function performanceText(language) {
	const seed = language.segmentation.map((item) => item.text).join(" ");
	const repetitions = Math.ceil(minimumPerformanceTextLength / (seed.length + 1));
	return Array.from({ length: repetitions }, () => seed).join(" ");
}

function percentile(sortedValues, fraction) {
	const index = Math.min(
		sortedValues.length - 1,
		Math.max(0, Math.ceil(sortedValues.length * fraction) - 1),
	);
	return sortedValues[index];
}

async function measureWarmLatency(nlp, text, preset) {
	for (let index = 0; index < latencyWarmupCount; index += 1) {
		await nlp(text, { preset });
	}
	const samples = [];
	for (let index = 0; index < latencyMeasurementCount; index += 1) {
		const startedAt = performance.now();
		await nlp(text, { preset });
		samples.push(performance.now() - startedAt);
	}
	const sorted = [...samples].sort((left, right) => left - right);
	return Object.freeze({
		medianMs: percentile(sorted, 0.5),
		p95Ms: percentile(sorted, 0.95),
		samples: Object.freeze(samples),
	});
}

async function evaluateLanguage(language) {
	const pack = packs.get(language.languageTag);
	if (pack === undefined) throw new Error(`missing pack ${language.languageTag}`);
	const nlp = await load(pack, { reader: createNodeResourceReader() });
	let boundaryTruePositive = 0;
	let boundaryPredicted = 0;
	let boundaryExpected = 0;
	const failures = [];

	for (const item of language.segmentation) {
		const predicted = await nlp.segmentation.lexicalUnits(item.text);
		const predictedKeys = new Set(
			predicted.map((segment) => `${segment.startCU}:${segment.endCU}`),
		);
		const expectedKeys = expectedBoundaryKeys(item.text, item.lexicalUnits);
		boundaryPredicted += predictedKeys.size;
		boundaryExpected += expectedKeys.size;
		boundaryTruePositive += [...predictedKeys].filter((key) =>
			expectedKeys.has(key),
		).length;
		if (
			!sameValues(
				predicted.map((segment) => segment.text),
				item.lexicalUnits,
			)
		) {
			failures.push(`${item.id}: lexical-unit sequence mismatch`);
		}
	}

	let normalizationCorrect = 0;
	for (const item of language.normalization) {
		const predicted = await nlp.normalize(item.text);
		if (predicted === item.expected) normalizationCorrect += 1;
		else failures.push(`${item.id}: expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(predicted)}`);
	}

	let morphologyTop1Correct = 0;
	let morphologyTokenCount = 0;
	for (const item of language.morphology) {
		const analysis = await nlp(item.text, {
			tasks: ["morphology"],
			morphologyMaxResults: 5,
		});
		if (!taskEvidencePresent(analysis, "morphology")) {
			failures.push(`${item.id}: missing morphology task evidence`);
		}
		const expectedSpans = item.tokens.map(spanKey);
		const actualSpans = analysis.tokens.map(spanKey);
		if (!sameValues(actualSpans, expectedSpans)) {
			failures.push(
				`${item.id}: expected token spans ${expectedSpans.join(",")}, got ${actualSpans.join(",")}`,
			);
		}
		for (const expectedToken of item.tokens) {
			morphologyTokenCount += 1;
			const token = analysis.tokens.find(
				(candidate) => spanKey(candidate) === spanKey(expectedToken),
			);
			const predictedLemma = token?.morphology[0]?.lemma;
			if (
				predictedLemma !== undefined &&
				expectedToken.lemmas.includes(predictedLemma)
			) {
				morphologyTop1Correct += 1;
			} else {
				failures.push(
					`${item.id}@${spanKey(expectedToken)}: expected top-1 lemma ${expectedToken.lemmas.join("|")}, got ${predictedLemma ?? "NONE"}`,
				);
			}
		}
	}

	let entityCaseCorrect = 0;
	let entityTop1Correct = 0;
	let entityExpectedMentions = 0;
	let entitySpanTruePositive = 0;
	let entitySpanPredicted = 0;
	let entitySpanExpected = 0;
	let nilCorrect = 0;
	let nilCases = 0;
	for (const item of language.entities) {
		const analysis = await nlp(item.text, {
			tasks: ["kb"],
			entityMaxCandidates: 5,
		});
		if (!taskEvidencePresent(analysis, "kb")) {
			failures.push(`${item.id}: missing kb task evidence`);
		}
		const expectedSpanKeys = new Set(item.mentions.map(spanKey));
		const actualSpanKeys = new Set(analysis.entities.map(spanKey));
		entitySpanPredicted += actualSpanKeys.size;
		entitySpanExpected += expectedSpanKeys.size;
		entitySpanTruePositive += [...actualSpanKeys].filter((key) =>
			expectedSpanKeys.has(key),
		).length;
		entityExpectedMentions += item.mentions.length;
		let caseCorrect = analysis.entities.length === item.mentions.length;
		for (const expectedMention of item.mentions) {
			const actualAtSpan = analysis.entities.filter(
				(entity) => spanKey(entity) === spanKey(expectedMention),
			);
			const actual = actualAtSpan[0];
			const correct =
				actualAtSpan.length === 1 &&
				actual?.rank === 1 &&
				expectedMention.entityIds.includes(actual.entityId) &&
				actual.mention ===
					item.text.slice(expectedMention.startCU, expectedMention.endCU);
			if (correct) entityTop1Correct += 1;
			else {
				caseCorrect = false;
				failures.push(
					`${item.id}@${spanKey(expectedMention)}: expected rank-1 ${expectedMention.entityIds.join("|")}, got ${actual === undefined ? "NONE" : `${actual.entityId}#${actual.rank}`}`,
				);
			}
		}
		const unexpected = analysis.entities.filter(
			(entity) => !expectedSpanKeys.has(spanKey(entity)),
		);
		if (unexpected.length > 0) {
			caseCorrect = false;
			failures.push(
				`${item.id}: unexpected links ${unexpected.map((entity) => `${spanKey(entity)}=${entity.entityId}`).join(",")}`,
			);
		}
		if (item.mentions.length === 0) {
			nilCases += 1;
			if (analysis.entities.length === 0) nilCorrect += 1;
			else caseCorrect = false;
		}
		if (caseCorrect) entityCaseCorrect += 1;
	}

	let searchCorrect = 0;
	for (const item of language.search) {
		const analysis = await nlp(item.text, { tasks: ["search"] });
		if (!taskEvidencePresent(analysis, "search")) {
			failures.push(`${item.id}: missing search task evidence`);
		}
		const actual = analysis.searchTokens.map((token) => ({
			term: token.term,
			startCU: token.startCU,
			endCU: token.endCU,
		}));
		if (sameValues(actual, item.tokens)) searchCorrect += 1;
		else {
			failures.push(
				`${item.id}: expected ${JSON.stringify(item.tokens)}, got ${JSON.stringify(actual)}`,
			);
		}
		const textDocument = analysis.toTextDoc();
		for (const token of analysis.searchTokens) {
			const view = textDocument.views[token.viewId];
			if (
				view === undefined ||
				token.startCU < 0 ||
				token.endCU <= token.startCU ||
				token.endCU > view.text.length
			) {
				failures.push(
					`${item.id}: search token ${token.term} has an invalid ${token.viewId} span`,
				);
			}
		}
	}

	const latencyText = performanceText(language);
	const warmCore = await measureWarmLatency(nlp, latencyText, "core");
	const warmLookup = await measureWarmLatency(nlp, latencyText, "lookup");
	if (warmCore.medianMs > latencyBudgetsMs.core) {
		failures.push(
			`median warm core latency ${Math.round(warmCore.medianMs)}ms exceeds ${latencyBudgetsMs.core}ms`,
		);
	}
	if (warmLookup.medianMs > latencyBudgetsMs.lookup) {
		failures.push(
			`median warm lookup latency ${Math.round(warmLookup.medianMs)}ms exceeds ${latencyBudgetsMs.lookup}ms`,
		);
	}

	const boundary = f1(
		boundaryTruePositive,
		boundaryPredicted,
		boundaryExpected,
	);
	const entityBoundary = f1(
		entitySpanTruePositive,
		entitySpanPredicted,
		entitySpanExpected,
	);
	return {
		languageTag: language.languageTag,
		metrics: {
			segmentationSpanPrecision: round(boundary.precision),
			segmentationSpanRecall: round(boundary.recall),
			segmentationSpanF1: round(boundary.f1),
			normalizationExactMatch: round(normalizationCorrect / language.normalization.length),
			morphologyTop1LemmaAccuracy: round(
				morphologyTop1Correct / morphologyTokenCount,
			),
			entitySpanPrecision: round(entityBoundary.precision),
			entitySpanRecall: round(entityBoundary.recall),
			entitySpanF1: round(entityBoundary.f1),
			entityTop1Accuracy: round(
				entityExpectedMentions === 0
					? 1
					: entityTop1Correct / entityExpectedMentions,
			),
			entityNilAccuracy: round(nilCases === 0 ? 1 : nilCorrect / nilCases),
			entityCaseExactMatch: round(entityCaseCorrect / language.entities.length),
			searchSequenceAccuracy: round(searchCorrect / language.search.length),
			performanceTextCodeUnits: latencyText.length,
			warmLatencySamples: latencyMeasurementCount,
			warmCoreMedianMs: round(warmCore.medianMs),
			warmCoreP95Ms: round(warmCore.p95Ms),
			warmLookupMedianMs: round(warmLookup.medianMs),
			warmLookupP95Ms: round(warmLookup.p95Ms),
		},
		failures,
	};
}

validateFixtureIntegrity(fixture);
const startedAt = performance.now();
const languages = [];
for (const language of fixture.languages) {
	languages.push(await evaluateLanguage(language));
}
const report = {
	schemaVersion: "1",
	fixture: "fixtures/nlp-benchmarks/held-out-v1.json",
	durationMs: round(performance.now() - startedAt),
	languages,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
const failures = languages.flatMap((language) =>
	language.failures.map((failure) => `${language.languageTag}: ${failure}`),
);
if (failures.length > 0) {
	for (const failure of failures) process.stderr.write(`NLP benchmark failure: ${failure}\n`);
	process.exitCode = 1;
}
