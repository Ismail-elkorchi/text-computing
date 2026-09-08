import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { alignSentences } from "@ismail-elkorchi/text-computing/parallel";

const links = alignSentences(
	createDocument("Hello.", { id: "workers-en" }),
	createDocument("Bonjour.", { id: "workers-fr" }),
);

if (links.length !== 1) {
	throw new Error("workers smoke failed");
}
