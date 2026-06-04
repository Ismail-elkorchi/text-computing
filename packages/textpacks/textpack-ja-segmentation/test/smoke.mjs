import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "lexicon-ja-segmentation").includes("東京")) {
	throw new Error("Japanese segmentation lexicon missing");
}
