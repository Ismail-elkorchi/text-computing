import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "lexicon-fr-historical").includes("estoit")) {
	throw new Error("historical spelling resource missing");
}
