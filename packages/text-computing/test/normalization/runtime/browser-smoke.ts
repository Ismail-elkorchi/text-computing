import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	buildSpellingMap,
	normalizeDocument,
} from "@ismail-elkorchi/text-computing/normalization";

const map = buildSpellingMap([{ source: "olde", candidates: ["old"] }]);
const result = normalizeDocument(createDocument("olde"), {
	modes: ["spelling"],
	resources: { spellingMaps: [map] },
});
if (result.view.text !== "old") throw new Error("browser smoke failed");
