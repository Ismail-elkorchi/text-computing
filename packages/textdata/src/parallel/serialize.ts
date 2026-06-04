import type { ParallelRecord } from "../dataset/mod.js";

export function serializeParallel(records: readonly ParallelRecord[]): string {
	return records
		.map((record) =>
			[
				record.id,
				record.sourceText ?? record.sourceDocument?.views.raw?.text ?? "",
				record.targetText ?? record.targetDocument?.views.raw?.text ?? "",
			]
				.map((value) => JSON.stringify(value))
				.join("\t"),
		)
		.join("\n");
}
