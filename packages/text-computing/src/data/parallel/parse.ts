import type { ParallelRecord } from "../dataset/mod.ts";
import { splitLines } from "../internal/text.ts";

export function parseParallelTable(text: string): readonly ParallelRecord[] {
	return splitLines(text)
		.filter((line) => line.trim() !== "")
		.map((line, index) => {
			const [idRaw, sourceRaw, targetRaw] = line.split("\t");
			const id =
				idRaw === undefined || idRaw === "" ? `parallel:${index + 1}` : idRaw;
			return {
				id,
				sourceText: sourceRaw ?? "",
				targetText: targetRaw ?? "",
			};
		});
}
