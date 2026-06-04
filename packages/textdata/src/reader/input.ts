import type {
	DatasetFormat,
	DatasetInput,
	DatasetReadOptions,
} from "../dataset/mod.js";

export function resolveInputFormat(
	input: DatasetInput,
	options: DatasetReadOptions,
): DatasetFormat {
	if (options.format !== undefined) return options.format;
	if (typeof input === "object" && input !== null && "kind" in input) {
		const kind = (input as { readonly kind?: unknown }).kind;
		if (typeof kind === "string") return kind as DatasetFormat;
	}
	return "plain-text";
}
