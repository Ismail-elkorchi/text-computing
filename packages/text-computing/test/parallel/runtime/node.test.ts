import assert from "node:assert/strict";
import test from "node:test";

import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { alignSentences } from "@ismail-elkorchi/text-computing/parallel";

test("node runtime imports final textparallel entrypoint", () => {
	const links = alignSentences(
		createDocument("Hello.", { id: "node-en" }),
		createDocument("Bonjour.", { id: "node-fr" }),
	);
	assert.equal(links.length, 1);
});
