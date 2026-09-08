import {
	applyDown,
	compileRegex,
} from "@ismail-elkorchi/text-computing/finite-state";

const fst = compileRegex("web");
if (applyDown(fst, "web")[0]?.output !== "web") {
	throw new Error("browser regex smoke failed");
}
