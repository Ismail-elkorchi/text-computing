import assert from "node:assert/strict";
import test from "node:test";

import {
	annotateAlignment,
	buildAlignmentLink,
	compareAlignmentLinks,
	parallelEvidence,
} from "../dist/alignment/mod.js";
import { fixtureParallelDocument } from "./fixtures/documents.ts";

test("builds sortable alignment links with final evidence", () => {
	const evidence = parallelEvidence(["raw"], { producer: "alignment-test" });
	const later = buildAlignmentLink({
		source: {
			viewId: "raw",
			span: { start: 6, end: 11, unit: "utf16-code-unit" },
		},
		target: {
			viewId: "raw",
			span: { start: 8, end: 13, unit: "utf16-code-unit" },
		},
		relation: "equivalent",
		evidence,
	});
	const earlier = buildAlignmentLink({
		source: {
			viewId: "raw",
			span: { start: 0, end: 5, unit: "utf16-code-unit" },
		},
		target: {
			viewId: "raw",
			span: { start: 0, end: 7, unit: "utf16-code-unit" },
		},
		relation: "equivalent",
		evidence,
	});
	assert.ok(compareAlignmentLinks(earlier, later) < 0);
	assert.equal(later.evidence.packageName, "@ismail-elkorchi/textparallel");
});

test("adds alignment annotations with JSON target span payloads", () => {
	const annotated = annotateAlignment(fixtureParallelDocument());
	const layer = annotated.sourceDoc.layers["alignment.links"];
	const annotation = Object.values(layer?.annotations ?? {})[0];
	assert.ok(annotation);
	assert.equal(annotation?.type, "alignment.link");
	assert.equal(
		typeof (annotation?.value as { target?: { viewId?: unknown } }).target
			?.viewId,
		"string",
	);
});
