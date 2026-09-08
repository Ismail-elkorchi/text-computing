import { expect, test } from "bun:test";

import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { alignSentences } from "@ismail-elkorchi/text-computing/parallel";

test("bun runtime imports final textparallel entrypoint", () => {
	const links = alignSentences(
		createDocument("Hello.", { id: "bun-en" }),
		createDocument("Bonjour.", { id: "bun-fr" }),
	);
	expect(links.length).toBe(1);
});
