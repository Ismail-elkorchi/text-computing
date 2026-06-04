import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "fst-ocr-latin19c").includes("rn->m")) {
	throw new Error("OCR confusion FST missing");
}
