import { expect, test } from "bun:test";

import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "../../dist/index.js";

test("bun runtime imports final textparallel entrypoint", () => {
	const links = alignSentences(
		createDocument("Hello.", { id: "bun-en" }),
		createDocument("Bonjour.", { id: "bun-fr" }),
	);
	expect(links.length).toBe(1);
});
