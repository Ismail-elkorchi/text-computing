import assert from "node:assert/strict";
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	buildSpellingMap,
	normalizeDocument,
} from "@ismail-elkorchi/text-computing/normalization";

const doc = createDocument("shoppe");
const map = buildSpellingMap([{ source: "shoppe", candidates: ["shop"] }]);
const result = normalizeDocument(doc, {
	modes: ["spelling"],
	resources: { spellingMaps: [map] },
});

assert.equal(result.view.text, "shop");
