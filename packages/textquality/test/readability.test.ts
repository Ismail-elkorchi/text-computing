import assert from "node:assert/strict";
import test from "node:test";

import {
	lexicalDiversityMetrics,
	readabilityMetrics,
} from "../dist/readability/mod.js";
import { noisyDocument } from "./fixtures/documents.ts";

test("readability metrics are finite and source-addressable", () => {
	const metrics = {
		...readabilityMetrics(noisyDocument()),
		...lexicalDiversityMetrics(noisyDocument()),
	};
	assert.ok(metrics["readability.word_count"] > 0);
	for (const value of Object.values(metrics)) {
		assert.equal(Number.isFinite(value), true);
	}
});
