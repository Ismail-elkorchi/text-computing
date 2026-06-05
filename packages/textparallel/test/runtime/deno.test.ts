import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "../../dist/index.js";

Deno.test("deno runtime imports final textparallel entrypoint", () => {
	const links = alignSentences(
		createDocument("Hello.", { id: "deno-en" }),
		createDocument("Bonjour.", { id: "deno-fr" }),
	);
	if (links.length !== 1) {
		throw new Error("deno smoke failed");
	}
});
