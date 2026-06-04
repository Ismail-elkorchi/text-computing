import type { DatasetRecord } from "../dataset/mod.js";
import {
	assertFinalDocument,
	createTextDocument,
	textDataEvidence,
	withAnnotation,
	withGraph,
	withLayer,
} from "../internal/document.js";
import { fail } from "../internal/errors.js";
import { inputOrderId } from "../internal/ids.js";
import { splitLines, textOffsetsForTokens } from "../internal/text.js";

export interface ConlluToken {
	readonly id: string;
	readonly form: string;
	readonly lemma: string;
	readonly upos: string;
	readonly xpos: string;
	readonly feats: string;
	readonly head: string;
	readonly deprel: string;
	readonly deps: string;
	readonly misc: string;
}

export interface ConlluSentence {
	readonly id: string;
	readonly comments: Readonly<Record<string, string>>;
	readonly tokens: readonly ConlluToken[];
}

function parseComment(line: string): readonly [string, string] | undefined {
	const match = /^#\s*([^=]+?)\s*=\s*(.*)$/.exec(line);
	if (match?.[1] === undefined || match[2] === undefined) return undefined;
	return [match[1].trim(), match[2].trim()];
}

export function parseConllu(text: string): readonly ConlluSentence[] {
	const sentences: ConlluSentence[] = [];
	let comments: Record<string, string> = {};
	let tokens: ConlluToken[] = [];
	let ordinal = 0;
	function flush(): void {
		if (tokens.length === 0 && Object.keys(comments).length === 0) return;
		ordinal += 1;
		sentences.push({
			id: comments.sent_id ?? inputOrderId("sentence", ordinal - 1),
			comments,
			tokens,
		});
		comments = {};
		tokens = [];
	}
	for (const line of splitLines(text)) {
		if (line.trim() === "") {
			flush();
			continue;
		}
		if (line.startsWith("#")) {
			const parsed = parseComment(line);
			if (parsed !== undefined) comments[parsed[0]] = parsed[1];
			continue;
		}
		const cols = line.split("\t");
		if (cols.length !== 10) {
			fail("TEXTDATA_CONLLU_COLUMNS", "CoNLL-U rows must have ten columns", {
				line,
			});
		}
		const [id, form, lemma, upos, xpos, feats, head, deprel, deps, misc] =
			cols as [
				string,
				string,
				string,
				string,
				string,
				string,
				string,
				string,
				string,
				string,
			];
		if (id.includes("-") || id.includes(".")) {
			continue;
		}
		tokens.push({
			id,
			form,
			lemma,
			upos,
			xpos,
			feats,
			head,
			deprel,
			deps,
			misc,
		});
	}
	flush();
	return sentences;
}

export function conlluSentenceToRecord(
	sentence: ConlluSentence,
	index: number,
): DatasetRecord {
	const forms = sentence.tokens.map((token) => token.form);
	const text = sentence.comments.text ?? forms.join(" ");
	const offsets = textOffsetsForTokens(forms);
	let document = createTextDocument(text, `doc:${sentence.id}`, {
		metadata: {
			format: "conllu",
			sentenceId: sentence.id,
			...sentence.comments,
		},
	});
	document = withLayer(document, {
		id: "tokens",
		type: "token.word",
		viewId: "raw",
		annotations: {},
	});
	for (
		let tokenIndex = 0;
		tokenIndex < sentence.tokens.length;
		tokenIndex += 1
	) {
		const token = sentence.tokens[tokenIndex];
		if (token === undefined) continue;
		const start = offsets[tokenIndex] ?? 0;
		const end = start + token.form.length;
		document = withAnnotation(document, {
			id: `token:${sentence.id}:${token.id}`,
			layer: "tokens",
			type: "token.word",
			spans: [
				{
					viewId: "raw",
					span: { start, end, unit: "utf16-code-unit" },
				},
			],
			value: {
				index: tokenIndex,
				text: token.form,
				lemma: token.lemma === "_" ? null : token.lemma,
				upos: token.upos === "_" ? null : token.upos,
				xpos: token.xpos === "_" ? null : token.xpos,
				feats: token.feats === "_" ? null : token.feats,
				head: token.head === "_" ? null : token.head,
				deprel: token.deprel === "_" ? null : token.deprel,
			},
			evidence: textDataEvidence(),
		});
	}
	const nodes = Object.fromEntries(
		sentence.tokens.map((token) => {
			const node = {
				id: `node:${sentence.id}:${token.id}`,
				annotationId: `token:${sentence.id}:${token.id}`,
				layerId: "tokens",
				...(token.deprel === "_" ? {} : { label: token.deprel }),
			};
			return [`node:${sentence.id}:${token.id}`, node];
		}),
	);
	const edgeEntries = sentence.tokens
		.filter((token) => token.head !== "_" && token.head !== "0")
		.map((token) => {
			const edge = {
				id: `edge:${sentence.id}:${token.head}:${token.id}`,
				source: `node:${sentence.id}:${token.head}`,
				target: `node:${sentence.id}:${token.id}`,
				relation: token.deprel === "_" ? "dep" : token.deprel,
			};
			return [`edge:${sentence.id}:${token.head}:${token.id}`, edge] as const;
		})
		.filter(([, edge]) => nodes[edge.source] !== undefined);
	const edges = Object.fromEntries(edgeEntries);
	document = withGraph(document, {
		id: "dependency",
		kind: "dependency",
		nodes,
		edges,
		metadata: { format: "conllu" },
	});
	return {
		id: sentence.id || inputOrderId("record", index),
		text,
		document: assertFinalDocument(document),
		fields: { format: "conllu" },
		metadata: sentence.comments,
	};
}
