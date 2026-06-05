import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "../../dist/index.js";

test("node runtime imports final textparallel entrypoint", () => {
	const links = alignSentences(
		createDocument("Hello.", { id: "node-en" }),
		createDocument("Bonjour.", { id: "node-fr" }),
	);
	assert.equal(links.length, 1);
});
