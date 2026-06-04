import { createDocument } from "@ismail-elkorchi/textdoc";
import { buildSpellingMap, normalizeDocument } from "../../dist/index.js";

const map = buildSpellingMap([{ source: "shoppe", candidates: ["shop"] }]);
const result = normalizeDocument(createDocument("shoppe"), {
	modes: ["spelling"],
	resources: { spellingMaps: [map] },
});
if (result.view.text !== "shop") throw new Error("workers smoke failed");
