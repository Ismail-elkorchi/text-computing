import {
	isTextDocument,
	type TextDocument,
	validateTextDocument,
} from "../document/mod.ts";
import { fail } from "../internal/error.ts";
import {
	assertJsonValue,
	type JsonValue,
	stableJsonClone,
} from "../internal/json.ts";

export type DocumentJson = TextDocument & JsonValue;

export interface SerializeOptions {
	readonly stable?: boolean;
}

export function toDocumentJson(
	doc: TextDocument,
	options: SerializeOptions = {},
): DocumentJson {
	if (!isTextDocument(doc)) {
		fail(
			"TEXTDOC_INVALID_DOCUMENT",
			"document must satisfy the final TextDocument contract",
		);
	}
	assertJsonValue(doc);
	return (
		options.stable === false
			? (doc as DocumentJson)
			: stableJsonClone(doc as DocumentJson)
	) as DocumentJson;
}

export function fromDocumentJson(json: DocumentJson): TextDocument {
	assertJsonValue(json);
	const stable = stableJsonClone(json) as DocumentJson;
	if (!isTextDocument(stable)) {
		fail(
			"TEXTDOC_INVALID_JSON",
			"json must satisfy the final DocumentJson contract",
		);
	}
	const validation = validateTextDocument(stable);
	if (!validation.ok) {
		fail(
			"TEXTDOC_INVALID_JSON",
			`json must satisfy final TextDocument references: ${validation.diagnostics.join(", ")}`,
		);
	}
	return stable;
}
