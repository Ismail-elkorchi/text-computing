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

export type TextDocJson = TextDocument & JsonValue;

export interface SerializeOptions {
	readonly stable?: boolean;
}

export function toTextDocJson(
	doc: TextDocument,
	options: SerializeOptions = {},
): TextDocJson {
	if (!isTextDocument(doc)) {
		fail(
			"TEXTDOC_INVALID_DOCUMENT",
			"document must satisfy the final TextDocument contract",
		);
	}
	assertJsonValue(doc);
	return (
		options.stable === false
			? (doc as TextDocJson)
			: stableJsonClone(doc as TextDocJson)
	) as TextDocJson;
}

export function fromTextDocJson(json: TextDocJson): TextDocument {
	assertJsonValue(json);
	const stable = stableJsonClone(json) as TextDocJson;
	if (!isTextDocument(stable)) {
		fail(
			"TEXTDOC_INVALID_JSON",
			"json must satisfy the final TextDocJson contract",
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
