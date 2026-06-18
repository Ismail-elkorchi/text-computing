import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "corpus-demo-en-lines").includes("Acme Corp")) {
	throw new Error("corpus resource missing");
}
