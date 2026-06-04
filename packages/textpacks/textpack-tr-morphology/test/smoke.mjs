import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "morph-tr-demo").includes("evlerimizden")) {
	throw new Error("Turkish morphology resource missing");
}
