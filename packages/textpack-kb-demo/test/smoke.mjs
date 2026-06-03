import { getResource, loadPack } from "@ismail-elkorchi/textpack";
import * as packModule from "../dist/index.js";

const pack = await loadPack(packModule);
if (!getResource(pack, "kb-demo-entities").includes("Acme Corp")) {
	throw new Error("KB entity resource missing");
}
