import type { TextComputingNerModel } from "./types.ts";

interface CharacterUnit {
	readonly value: string;
	readonly startCU: number;
	readonly endCU: number;
}

interface BasicToken {
	readonly units: readonly CharacterUnit[];
}

export interface WordPieceToken {
	readonly id: number;
	readonly value: string;
	readonly startCU: number;
	readonly endCU: number;
}

export interface WordPieceChunk {
	readonly tokens: readonly (WordPieceToken | undefined)[];
	readonly inputIds: BigInt64Array;
	readonly attentionMask: BigInt64Array;
}

function isWhitespace(value: string): boolean {
	return /^\p{White_Space}$/u.test(value);
}

function isControl(value: string): boolean {
	return /^[\p{Cc}\p{Cf}]$/u.test(value);
}

function isPunctuation(value: string): boolean {
	const codePoint = value.codePointAt(0) ?? 0;
	return (
		(codePoint >= 33 && codePoint <= 47) ||
		(codePoint >= 58 && codePoint <= 64) ||
		(codePoint >= 91 && codePoint <= 96) ||
		(codePoint >= 123 && codePoint <= 126) ||
		/^\p{P}$/u.test(value)
	);
}

function isChineseCharacter(value: string): boolean {
	const codePoint = value.codePointAt(0) ?? 0;
	return (
		(codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
		(codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
		(codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
		(codePoint >= 0x2a700 && codePoint <= 0x2b73f) ||
		(codePoint >= 0x2b740 && codePoint <= 0x2b81f) ||
		(codePoint >= 0x2b820 && codePoint <= 0x2ceaf) ||
		(codePoint >= 0xf900 && codePoint <= 0xfaff) ||
		(codePoint >= 0x2f800 && codePoint <= 0x2fa1f)
	);
}

function transformedUnits(
	value: string,
	startCU: number,
	endCU: number,
	doLowerCase: boolean,
	stripAccents: boolean,
): readonly CharacterUnit[] {
	let transformed = doLowerCase ? value.toLocaleLowerCase("und") : value;
	if (stripAccents) {
		transformed = [...transformed.normalize("NFD")]
			.filter((character) => !/^\p{M}$/u.test(character))
			.join("");
	}
	return Object.freeze(
		[...transformed].map((character) =>
			Object.freeze({ value: character, startCU, endCU }),
		),
	);
}

function basicTokens(
	text: string,
	options: TextComputingNerModel["tokenizer"],
): readonly BasicToken[] {
	const tokens: BasicToken[] = [];
	let current: CharacterUnit[] = [];
	const flush = () => {
		if (current.length > 0) {
			tokens.push(Object.freeze({ units: Object.freeze(current) }));
			current = [];
		}
	};
	for (let startCU = 0; startCU < text.length; ) {
		const codePoint = text.codePointAt(startCU);
		if (codePoint === undefined) break;
		const character = String.fromCodePoint(codePoint);
		const endCU = startCU + character.length;
		if (isWhitespace(character) || isControl(character)) {
			flush();
		} else if (
			isPunctuation(character) ||
			(options.tokenizeChineseCharacters && isChineseCharacter(character))
		) {
			flush();
			const units = transformedUnits(
				character,
				startCU,
				endCU,
				options.doLowerCase,
				options.stripAccents,
			);
			if (units.length > 0) tokens.push(Object.freeze({ units }));
		} else {
			current.push(
				...transformedUnits(
					character,
					startCU,
					endCU,
					options.doLowerCase,
					options.stripAccents,
				),
			);
		}
		startCU = endCU;
	}
	flush();
	return Object.freeze(tokens);
}

function vocabularyIndex(vocabulary: string): ReadonlyMap<string, number> {
	const entries = vocabulary.replace(/\r\n?/gu, "\n").split("\n");
	if (entries.at(-1) === "") entries.pop();
	const index = new Map<string, number>();
	for (let id = 0; id < entries.length; id += 1) {
		const token = entries[id];
		if (token === undefined || token.length === 0 || index.has(token)) {
			throw new TypeError(
				`WordPiece vocabulary entry ${id} must be non-empty and unique.`,
			);
		}
		index.set(token, id);
	}
	return index;
}

function requiredTokenId(
	vocabulary: ReadonlyMap<string, number>,
	token: string,
): number {
	const id = vocabulary.get(token);
	if (id === undefined) {
		throw new TypeError(
			`WordPiece vocabulary does not contain required token ${token}.`,
		);
	}
	return id;
}

function unknownPiece(
	token: BasicToken,
	unknown: string,
	unknownId: number,
): readonly WordPieceToken[] {
	const first = token.units[0];
	const last = token.units.at(-1);
	if (first === undefined || last === undefined) return Object.freeze([]);
	return Object.freeze([
		Object.freeze({
			id: unknownId,
			value: unknown,
			startCU: first.startCU,
			endCU: last.endCU,
		}),
	]);
}

function tokenizeBasicToken(
	token: BasicToken,
	vocabulary: ReadonlyMap<string, number>,
	unknown: string,
	unknownId: number,
): readonly WordPieceToken[] {
	if (token.units.length > 100) {
		return unknownPiece(token, unknown, unknownId);
	}
	const pieces: WordPieceToken[] = [];
	let start = 0;
	while (start < token.units.length) {
		let end = token.units.length;
		let matched:
			| { readonly end: number; readonly id: number; readonly value: string }
			| undefined;
		while (start < end) {
			const value = `${start === 0 ? "" : "##"}${token.units
				.slice(start, end)
				.map((unit) => unit.value)
				.join("")}`;
			const id = vocabulary.get(value);
			if (id !== undefined) {
				matched = { end, id, value };
				break;
			}
			end -= 1;
		}
		if (matched === undefined) return unknownPiece(token, unknown, unknownId);
		const first = token.units[start];
		const last = token.units[matched.end - 1];
		if (first === undefined || last === undefined) {
			throw new TypeError("WordPiece tokenizer lost source alignment.");
		}
		pieces.push(
			Object.freeze({
				id: matched.id,
				value: matched.value,
				startCU: first.startCU,
				endCU: last.endCU,
			}),
		);
		start = matched.end;
	}
	return Object.freeze(pieces);
}

export function tokenizeWordPieceChunks(
	text: string,
	model: TextComputingNerModel,
	vocabularyText: string,
): readonly WordPieceChunk[] {
	const vocabulary = vocabularyIndex(vocabularyText);
	const unknownId = requiredTokenId(
		vocabulary,
		model.tokenizer.specialTokens.unknown,
	);
	const clsId = requiredTokenId(vocabulary, model.tokenizer.specialTokens.cls);
	const sepId = requiredTokenId(vocabulary, model.tokenizer.specialTokens.sep);
	requiredTokenId(vocabulary, model.tokenizer.specialTokens.pad);
	const maximumPieces = model.maxSequenceLength - 2;
	const tokenGroups = basicTokens(text, model.tokenizer).map((token) =>
		tokenizeBasicToken(
			token,
			vocabulary,
			model.tokenizer.specialTokens.unknown,
			unknownId,
		),
	);
	const chunks: WordPieceToken[][] = [];
	let current: WordPieceToken[] = [];
	for (const group of tokenGroups) {
		if (group.length > maximumPieces) {
			throw new TypeError(
				"A WordPiece token exceeds the model sequence length after tokenization.",
			);
		}
		if (current.length > 0 && current.length + group.length > maximumPieces) {
			chunks.push(current);
			current = [];
		}
		current.push(...group);
	}
	if (current.length > 0 || chunks.length === 0) chunks.push(current);
	return Object.freeze(
		chunks.map((pieces) => {
			const ids = [clsId, ...pieces.map((piece) => piece.id), sepId];
			return Object.freeze({
				tokens: Object.freeze([undefined, ...pieces, undefined]),
				inputIds: BigInt64Array.from(ids, BigInt),
				attentionMask: BigInt64Array.from(ids, () => 1n),
			});
		}),
	);
}
