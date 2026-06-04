import { expect, test } from "bun:test";
import { createDocument } from "@ismail-elkorchi/textdoc";
import { buildSpellingMap, normalizeDocument } from "../../dist/index.js";

test("bun smoke", () => {
	const doc = createDocument("shoppe");
	const map = buildSpellingMap([{ source: "shoppe", candidates: ["shop"] }]);
	expect(
		normalizeDocument(doc, {
			modes: ["spelling"],
			resources: { spellingMaps: [map] },
		}).view.text,
	).toBe("shop");
});
