export class TextCorpusError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(`${code}: ${message}`);
		this.name = "TextCorpusError";
		this.code = code;
	}
}

export function fail(code: string, message: string): never {
	throw new TextCorpusError(code, message);
}
