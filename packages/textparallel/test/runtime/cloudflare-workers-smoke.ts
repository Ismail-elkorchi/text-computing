import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "../../dist/index.js";

const links = alignSentences(
	createDocument("Hello.", { id: "workers-en" }),
	createDocument("Bonjour.", { id: "workers-fr" }),
);

if (links.length !== 1) {
	throw new Error("workers smoke failed");
}
