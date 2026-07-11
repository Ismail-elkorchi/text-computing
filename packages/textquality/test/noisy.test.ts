import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/textdoc";
import { buildWordlist } from "@ismail-elkorchi/textlex";
import { noisyTextQualityFindings } from "../dist/noisy/mod.js";
import { noisyDocument } from "./fixtures/documents.ts";

test("noisy checks report OOV and repeated character findings", () => {
	const wordlist = buildWordlist(["Acme"], { id: "tiny", casefold: true });
	const findings = noisyTextQualityFindings(noisyDocument(), {
		wordlists: [wordlist],
		profile: { thresholds: { "lexical.oov_rate": 0.1 } },
	});
	const kinds = new Set(findings.map((finding) => finding.kind));
	assert.ok(kinds.has("lexical.oov-profile"));
	assert.ok(kinds.has("noisy.repeated-character"));
});

test("noisy alphanumeric detection supports non-Latin scripts", () => {
	const findings = noisyTextQualityFindings(
		createDocument("اختبار2", { id: "arabic-alphanumeric" }),
	);
	assert.equal(
		findings.some((finding) => finding.kind === "noisy.alphanumeric-token"),
		true,
	);
});
