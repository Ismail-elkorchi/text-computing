import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "morph-ar-root-demo").includes("ك-ت-ب")) {
	throw new Error("Arabic root-pattern resource missing");
}
