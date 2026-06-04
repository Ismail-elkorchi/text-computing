import { createDocument } from "@ismail-elkorchi/textdoc";
import { buildSpellingMap, normalizeDocument } from "../../dist/index.js";

const map = buildSpellingMap([{ source: "olde", candidates: ["old"] }]);
const result = normalizeDocument(createDocument("olde"), {
	modes: ["spelling"],
	resources: { spellingMaps: [map] },
});
if (result.view.text !== "old") throw new Error("browser smoke failed");
