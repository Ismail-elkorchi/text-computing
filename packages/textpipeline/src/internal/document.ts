import {
	isTextDocument,
	type TextDocument,
	type TextView,
	validateTextDocument,
} from "@ismail-elkorchi/textdoc";
import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import { fail } from "./errors.js";
import { assertJsonValue, stableJsonStringify } from "./json.js";

export function assertFinalTextDocument(
	value: unknown,
	path = "document",
): asserts value is TextDocument {
	if (!isTextDocument(value)) {
		fail(
			"TEXTPIPELINE_INVALID_DOCUMENT",
			`${path} must be a final TextDocument.`,
		);
	}
	const validation = validateTextDocument(value);
	if (!validation.ok) {
		fail(
			"TEXTPIPELINE_INVALID_DOCUMENT",
			`${path} violates final TextDocument invariants.`,
			validation.diagnostics.map((message) => ({
				code: "TEXTPIPELINE_TEXTDOC_VALIDATION",
				severity: "error",
				message,
			})),
		);
	}
}

export function documentFingerprint(document: TextDocument): string {
	assertJsonValue(document, "document");
	return stableHash64(stableJsonStringify(document));
}

export function documentHasLayer(
	document: TextDocument | undefined,
	layerId: string | undefined,
): boolean {
	return layerId === undefined || document?.layers[layerId] !== undefined;
}

export function documentHasViewKind(
	document: TextDocument | undefined,
	viewKind: TextView["kind"] | undefined,
): boolean {
	return (
		viewKind === undefined ||
		Object.values(document?.views ?? {}).some((view) => view.kind === viewKind)
	);
}
