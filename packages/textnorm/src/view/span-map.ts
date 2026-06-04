import type {
	SpanMap,
	SpanMapEntry,
	SpanMapRelation,
} from "@ismail-elkorchi/textdoc";
import { spanMapId as defaultSpanMapId } from "../internal/ids.js";
import { utf16Span } from "../internal/spans.js";
import type { EditOperation, EditScript } from "../normalize/types.js";

function relationFor(operation: EditOperation): SpanMapRelation {
	if (operation.relation !== undefined) return operation.relation;
	if (operation.kind === "equal") return "identity";
	if (operation.kind === "insert") return "inserted";
	if (operation.kind === "delete") return "deleted";
	if (operation.targetText.length > operation.sourceText.length)
		return "expanded";
	if (operation.targetText.length < operation.sourceText.length)
		return "contracted";
	return "normalized";
}

export function spanMapFromEditScript(
	script: EditScript,
	options: {
		readonly id?: string;
		readonly sourceViewId: string;
		readonly targetViewId: string;
	},
): SpanMap {
	if (
		script.sourceUnit !== "utf16-code-unit" ||
		script.targetUnit !== "utf16-code-unit"
	) {
		throw new TypeError(
			"textnorm span maps require utf16-code-unit edit scripts.",
		);
	}
	const entries: SpanMapEntry[] = script.operations.map((operation) =>
		Object.freeze({
			source: utf16Span(operation.sourceStart, operation.sourceEnd),
			target: utf16Span(operation.targetStart, operation.targetEnd),
			relation: relationFor(operation),
			...(operation.cost !== undefined ? { cost: operation.cost } : {}),
		}),
	);
	return Object.freeze({
		id:
			options.id ??
			defaultSpanMapId(
				options.sourceViewId,
				options.targetViewId,
				script.operations,
			),
		sourceViewId: options.sourceViewId,
		targetViewId: options.targetViewId,
		entries: Object.freeze(entries),
	});
}
