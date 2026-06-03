import { applyDown, compileRegex } from "../../dist/index.js";

const fst = compileRegex("web");
if (applyDown(fst, "web")[0]?.output !== "web") {
	throw new Error("browser regex smoke failed");
}
