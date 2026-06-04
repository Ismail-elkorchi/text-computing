import { fail } from "../internal/errors.js";
import type {
	PipelineDiagnostic,
	PipelineFailurePolicy,
} from "../processor/types.js";

export function handleFailure(
	policy: PipelineFailurePolicy,
	code: string,
	message: string,
	diagnostics: readonly PipelineDiagnostic[],
): "continue" {
	if (policy === "continue") return "continue";
	fail(code, message, diagnostics);
}

export function abortIfSignaled(signal: AbortSignal | undefined): void {
	if (signal?.aborted) {
		const reason =
			signal.reason instanceof Error
				? signal.reason.message
				: signal.reason === undefined
					? "pipeline run was aborted"
					: String(signal.reason);
		fail("TEXTPIPELINE_ABORTED", reason);
	}
}
