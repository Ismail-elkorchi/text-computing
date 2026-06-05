import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "../../dist/index.js";

const links = alignSentences(
	createDocument("Hello.", { id: "browser-en" }),
	createDocument("Bonjour.", { id: "browser-fr" }),
);

if (links.length !== 1) {
	throw new Error("browser smoke failed");
}
