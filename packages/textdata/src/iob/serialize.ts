import type { DatasetRecord } from "../dataset/mod.js";

export function serializeIob(records: readonly DatasetRecord[]): string {
	return records
		.map((record) => {
			const annotations = Object.values(
				record.document?.layers.tokens?.annotations ?? {},
			);
			if (annotations.length === 0 && record.text !== undefined) {
				return record.text
					.split(/\s+/)
					.filter(Boolean)
					.map((token) => `${token} O`)
					.join("\n");
			}
			return annotations
				.map((annotation) => {
					const value = annotation.value as Record<string, unknown> | undefined;
					return `${String(value?.text ?? "")} ${String(value?.label ?? "O")}`;
				})
				.join("\n");
		})
		.join("\n\n");
}
