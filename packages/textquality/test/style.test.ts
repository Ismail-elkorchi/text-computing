import assert from "node:assert/strict";
import test from "node:test";

import { styleQualityFindings } from "../dist/style/mod.js";
import { noisyDocument } from "./fixtures/documents.ts";

test("style checks use caller-provided structural rules", () => {
	const findings = styleQualityFindings(noisyDocument(), {
		styleRules: [
			{
				id: "style-space",
				kind: "spacing",
				message: "Spacing review",
				pattern: "Acme\\s{2,}Corp",
				severity: "warning",
			},
		],
	});
	assert.equal(findings[0]?.kind, "style.spacing");
	assert.equal(findings[0]?.evidence.mode, "rule");
});
