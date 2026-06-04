import assert from "node:assert/strict";
import { createDocument } from "@ismail-elkorchi/textdoc";
import { buildSpellingMap, normalizeDocument } from "../../dist/index.js";

const doc = createDocument("shoppe");
const map = buildSpellingMap([{ source: "shoppe", candidates: ["shop"] }]);
const result = normalizeDocument(doc, {
	modes: ["spelling"],
	resources: { spellingMaps: [map] },
});

assert.equal(result.view.text, "shop");
