import assert from "node:assert/strict";
import test from "node:test";

import {
	assertGenerationChronology,
	assertLicenseClosure,
	assertWikidataExtractLineage,
	licenseExpressionCovers,
} from "../lib/policy-integrity.mjs";

test("aggregate license closure retains every source obligation", () => {
	assert.equal(
		licenseExpressionCovers(
			"MIT AND LicenseRef-Princeton-WordNet AND CC-BY-4.0",
			"LicenseRef-Princeton-WordNet AND CC-BY-4.0",
		),
		true,
	);
	assert.throws(
		() =>
			assertLicenseClosure(
				"MIT AND LicenseRef-Princeton-WordNet",
				[
					{
						sourceId: "source:wordnet:open-english-2025",
						licenseExpression: "LicenseRef-Princeton-WordNet AND CC-BY-4.0",
					},
				],
				"English distribution",
			),
		/CC-BY-4\.0/u,
	);
});

test("license closure handles OR alternatives without permitting an uncovered path", () => {
	assert.equal(licenseExpressionCovers("A AND X", "A OR B"), true);
	assert.equal(licenseExpressionCovers("A OR X", "A OR B"), false);
});

test("generation chronology rejects snapshots acquired after generation", () => {
	assert.doesNotThrow(() =>
		assertGenerationChronology("2026-06-12T00:00:00.000Z", [
			{
				snapshotId: "snapshot:test",
				retrievedAt: "2026-06-12T00:00:00.000Z",
			},
		]),
	);
	assert.throws(
		() =>
			assertGenerationChronology("2026-06-08T00:00:00.000Z", [
				{
					snapshotId: "snapshot:test",
					retrievedAt: "2026-06-09T00:00:00.000Z",
				},
			]),
		/precedes snapshot acquisition/u,
	);
});

test("Wikidata live-query extracts declare independent lineage", () => {
	const snapshot = {
		snapshotId: "snapshot:wikidata",
		sourceId: "source:wikidata:main",
		retrievedAt: "2026-06-12T00:00:00.000Z",
	};
	const metadata = {
		sourceId: "source:wikidata:main",
		acquisitionMethod: "wikidata-query-service",
		derivedFromDumpArtifact: false,
		endpoint: "https://query.wikidata.org/sparql",
		retrievedAt: "2026-06-12T00:00:00.000Z",
	};
	assert.doesNotThrow(() =>
		assertWikidataExtractLineage({
			metadata,
			snapshot,
			generatedAt: "2026-06-12T00:00:00.000Z",
		}),
	);
	assert.throws(
		() =>
			assertWikidataExtractLineage({
				metadata: { ...metadata, version: "20260608" },
				snapshot,
				generatedAt: "2026-06-12T00:00:00.000Z",
			}),
		/live-query extract/u,
	);
});
