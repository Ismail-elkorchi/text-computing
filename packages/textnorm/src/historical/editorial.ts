import type { TextViewKind } from "@ismail-elkorchi/textdoc";

export type HistoricalViewMode =
	| "diplomatic"
	| "editorial-normalized"
	| "search-normalized"
	| "lemma-oriented"
	| "orthographic-modernized";

export function historicalTargetViewKind(
	mode: HistoricalViewMode,
): TextViewKind {
	if (mode === "diplomatic") return "raw";
	if (mode === "search-normalized") return "search";
	if (mode === "lemma-oriented") return "morphological";
	return "historical-normalized";
}
