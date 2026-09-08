export type DiagnosticSeverity = "info" | "warning" | "error";

/** Shared diagnostic envelope; domains may add source-specific coordinates. */
export interface Diagnostic<Details = unknown> {
	readonly code: string;
	readonly severity: DiagnosticSeverity;
	readonly message: string;
	readonly path?: string;
	readonly details?: Details;
}
