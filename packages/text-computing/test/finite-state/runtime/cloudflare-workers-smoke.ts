import {
	applyDown,
	compileLexicon,
} from "@ismail-elkorchi/text-computing/finite-state";

const fst = compileLexicon({
	entries: [{ surface: "workers", analysis: "worker+N+PL" }],
});
if (applyDown(fst, "worker+N+PL")[0]?.output !== "workers") {
	throw new Error("workers morphology smoke failed");
}
