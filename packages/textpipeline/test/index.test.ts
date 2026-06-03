import { createDocument } from "@ismail-elkorchi/textdoc";
import {
	createTextPipelineCacheKey,
	type TextPipelineProcessor,
} from "../src/index.ts";

const processor: TextPipelineProcessor = {
	descriptor: {
		id: "identity",
		version: "1.0.0",
		purity: "pure",
		parallelSafe: true,
	},
	run(document) {
		return { document };
	},
};

const first = createDocument("first text", { id: "doc:same" });
const second = createDocument("second text", { id: "doc:same" });
const firstKey = createTextPipelineCacheKey(processor, first);
const secondKey = createTextPipelineCacheKey(processor, second);

if (firstKey === secondKey) {
	throw new Error(
		"pipeline cache keys must include final document content identity",
	);
}

const renamed = createDocument("first text", { id: "doc:other" });
const renamedKey = createTextPipelineCacheKey(processor, renamed);

if (firstKey === renamedKey) {
	throw new Error("pipeline cache keys must still include document id");
}
