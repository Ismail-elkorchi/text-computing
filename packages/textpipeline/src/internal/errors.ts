import type { PipelineDiagnostic } from "../processor/types.js";

export class PipelineError extends Error {
	readonly code: string;
	readonly diagnostics: readonly PipelineDiagnostic[];

	constructor(
		code: string,
		message: string,
		diagnostics: readonly PipelineDiagnostic[] = [],
	) {
		super(message);
		this.name = "PipelineError";
		this.code = code;
		this.diagnostics = Object.freeze([...diagnostics]);
	}
}

export function fail(
	code: string,
	message: string,
	diagnostics: readonly PipelineDiagnostic[] = [],
): never {
	throw new PipelineError(code, message, diagnostics);
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
