export class TextDataError extends Error {
	readonly code: string;
	readonly details?: Readonly<Record<string, unknown>>;

	constructor(
		code: string,
		message: string,
		details?: Readonly<Record<string, unknown>>,
	) {
		super(message);
		this.name = "TextDataError";
		this.code = code;
		if (details !== undefined) this.details = details;
	}
}

export function fail(
	code: string,
	message: string,
	details?: Readonly<Record<string, unknown>>,
): never {
	throw new TextDataError(code, message, details);
}
