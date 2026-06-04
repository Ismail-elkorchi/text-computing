import type { DatasetRecord } from "../dataset/mod.js";

export function serializeConllu(records: readonly DatasetRecord[]): string {
	return records
		.map((record, index) => {
			const document = record.document;
			const tokens = document?.layers.tokens?.annotations ?? {};
			const rows = Object.values(tokens).map((annotation, tokenIndex) => {
				const value = annotation.value as Record<string, unknown> | undefined;
				return [
					String(tokenIndex + 1),
					String(value?.text ?? record.text ?? "_"),
					String(value?.lemma ?? "_"),
					String(value?.upos ?? "_"),
					String(value?.xpos ?? "_"),
					String(value?.feats ?? "_"),
					String(value?.head ?? "_"),
					String(value?.deprel ?? "_"),
					"_",
					"_",
				].join("\t");
			});
			return [
				`# sent_id = ${record.id || index + 1}`,
				`# text = ${record.text ?? ""}`,
				...rows,
			].join("\n");
		})
		.join("\n\n");
}
