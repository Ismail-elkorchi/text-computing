import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	buildSpellingMap,
	normalizeDocument,
} from "@ismail-elkorchi/text-computing/normalization";

const map = buildSpellingMap([{ source: "shoppe", candidates: ["shop"] }]);
const result = normalizeDocument(createDocument("shoppe"), {
	modes: ["spelling"],
	resources: { spellingMaps: [map] },
});
if (result.view.text !== "shop") throw new Error("workers smoke failed");
