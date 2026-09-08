import { expect, test } from "bun:test";
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	buildSpellingMap,
	normalizeDocument,
} from "@ismail-elkorchi/text-computing/normalization";

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
