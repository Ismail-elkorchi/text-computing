import type { SpanRef } from "@ismail-elkorchi/textdoc";
import type {
	CorpusDiagnostic,
	CorpusDocumentRef,
	CorpusToken,
} from "../store/types.js";

export type CorpusQuery =
	| { kind: "all" }
	| { kind: "token"; term: string; caseSensitive?: boolean }
	| { kind: "lemma"; lemma: string; caseSensitive?: boolean }
	| {
			kind: "annotation";
			layer?: string;
			type?: string;
			value?: unknown;
	  }
	| { kind: "metadata"; key: string; value?: unknown; values?: unknown[] }
	| { kind: "partition"; key: string; value: string }
	| { kind: "document"; id: string | string[] }
	| { kind: "and"; queries: CorpusQuery[] }
	| { kind: "or"; queries: CorpusQuery[] }
	| { kind: "not"; query: CorpusQuery };

export interface CorpusQueryOptions {
	limit?: number;
	includeHits?: boolean;
}

export interface CorpusHit {
	docId: string;
	span?: SpanRef;
	tokenIndex?: number;
	token?: string;
	lemma?: string;
	layerId?: string;
	annotationId?: string;
	metadataKey?: string;
	value?: unknown;
}

export interface CorpusResult {
	corpusId: string;
	documents: CorpusDocumentRef[];
	hits: CorpusHit[];
	count: number;
	diagnostics: CorpusDiagnostic[];
}

export interface QueryRecordMatch {
	matched: boolean;
	hits: CorpusHit[];
	tokens: CorpusToken[];
}
