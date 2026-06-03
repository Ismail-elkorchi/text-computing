export class TextdocError extends TypeError {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "TextdocError";
		this.code = code;
	}
}

export function fail(code: string, message: string): never {
	throw new TextdocError(code, message);
}
