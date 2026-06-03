import { applyDown, compileLexicon } from "../../dist/index.js";

const fst = compileLexicon({
	entries: [{ surface: "workers", analysis: "worker+N+PL" }],
});
if (applyDown(fst, "worker+N+PL")[0]?.output !== "workers") {
	throw new Error("workers morphology smoke failed");
}
