import type { SpanRef } from "@ismail-elkorchi/textdoc";
import { assertJsonValue } from "../internal/json.js";
import type { TextNormDiagnostic } from "./types.js";

export function textNormDiagnostic(
	input: TextNormDiagnostic,
): TextNormDiagnostic {
	assertJsonValue(input.context ?? {});
	return Object.freeze(input);
}

export function diagnosticForMissingResource(
	mode: string,
	source?: SpanRef,
): TextNormDiagnostic {
	return textNormDiagnostic({
		code: "TEXTNORM_RESOURCE_MISSING",
		severity: "info",
		message: `no explicit normalization resource was provided for ${mode}`,
		...(source !== undefined ? { source } : {}),
		context: { mode },
	});
}
