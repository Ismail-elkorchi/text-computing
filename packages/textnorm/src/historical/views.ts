import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { normalizeDocument } from "../normalize/normalize-document.js";
import type {
	NormalizationViewResult,
	TextNormOptions,
} from "../normalize/types.js";
import {
	type HistoricalViewMode,
	historicalTargetViewKind,
} from "./editorial.js";

export function createHistoricalView(
	doc: TextDocument,
	mode: HistoricalViewMode,
	options: TextNormOptions,
): NormalizationViewResult {
	return normalizeDocument(doc, {
		...options,
		modes: ["historical"],
		targetViewKind: historicalTargetViewKind(mode),
	});
}
