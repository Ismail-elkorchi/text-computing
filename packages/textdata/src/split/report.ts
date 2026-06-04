import type { DatasetDiagnostic, SplitReport } from "../dataset/mod.js";
import { stableId } from "../internal/ids.js";

export function createSplitReport(
	seed: string,
	counts: Readonly<Record<string, number>>,
	options: unknown,
	diagnostics: readonly DatasetDiagnostic[] = [],
): SplitReport {
	return {
		seed,
		counts,
		optionsHash: stableId("split-options", options),
		diagnostics,
	};
}
