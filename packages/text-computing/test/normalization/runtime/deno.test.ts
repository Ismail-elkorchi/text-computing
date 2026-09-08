/// <reference lib="deno.ns" />

import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	buildSpellingMap,
	normalizeDocument,
} from "@ismail-elkorchi/text-computing/normalization";

Deno.test("textnorm final API works in Deno", () => {
	const doc = createDocument("olde");
	const map = buildSpellingMap([{ source: "olde", candidates: ["old"] }]);
	const result = normalizeDocument(doc, {
		modes: ["spelling"],
		resources: { spellingMaps: [map] },
	});
	if (result.view.text !== "old") throw new Error("deno smoke failed");
});
