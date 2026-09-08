import type { TextDocument } from "../../document/mod.ts";
import { normalizeDocument } from "../normalize/normalize-document.ts";
import type {
	NormalizationViewResult,
	TextNormOptions,
} from "../normalize/types.ts";
import {
	type HistoricalViewMode,
	historicalTargetViewKind,
} from "./editorial.ts";

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
