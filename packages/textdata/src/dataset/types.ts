import type { SpanRef, TextDocument, TextUnit } from "@ismail-elkorchi/textdoc";
import type { JsonObject, JsonValue } from "../internal/json.js";
import type { TextPayload } from "../internal/text.js";

export interface TextDataset<T = TextDocument> {
	readonly id: string;
	readonly metadata: Readonly<Record<string, unknown>>;
	readonly records: AsyncIterable<T> | Iterable<T>;
}

export interface DatasetSourceDescriptor {
	readonly id: string;
	readonly format?: DatasetFormat;
	readonly language?: string;
	readonly script?: string;
	readonly citation?: string;
	readonly metadata?: JsonObject;
}

export interface DatasetManifest {
	readonly id: string;
	readonly format?: DatasetFormat;
	readonly sources?: readonly DatasetSourceDescriptor[];
	readonly citations?: readonly string[];
	readonly splits?: Readonly<Record<string, readonly string[]>>;
	readonly schema?: JsonObject;
	readonly metadata?: JsonObject;
}

export interface DatasetRecord {
	readonly id: string;
	readonly text?: string;
	readonly document?: TextDocument;
	readonly labels?: readonly string[];
	readonly fields?: JsonObject;
	readonly metadata?: JsonObject;
	readonly split?: string;
	readonly source?: DatasetSourceDescriptor;
}

export interface LabeledSample extends DatasetRecord {
	readonly labels: readonly string[];
}

export interface AlignmentLink {
	readonly id: string;
	readonly source: SpanRef;
	readonly target: SpanRef;
	readonly relation?: string;
	readonly confidence?: number;
	readonly metadata?: JsonObject;
}

export interface ParallelRecord {
	readonly id: string;
	readonly sourceText?: string;
	readonly targetText?: string;
	readonly sourceDocument?: TextDocument;
	readonly targetDocument?: TextDocument;
	readonly sourceLanguage?: string;
	readonly targetLanguage?: string;
	readonly alignments?: readonly AlignmentLink[];
	readonly metadata?: JsonObject;
}

export type DatasetFormat =
	| "plain-text"
	| "jsonl"
	| "csv"
	| "tsv"
	| "conll"
	| "conllu"
	| "iob"
	| "tei"
	| "html"
	| "xml"
	| "parallel";

export type DatasetWriteFormat =
	| "jsonl"
	| "textdoc-jsonl"
	| "csv"
	| "tsv"
	| "conllu"
	| "iob"
	| "parallel";

export type DatasetInputRecord =
	| string
	| TextDocument
	| DatasetRecord
	| ParallelRecord;

export type DatasetInput =
	| TextPayload
	| readonly DatasetInputRecord[]
	| Iterable<DatasetInputRecord>
	| AsyncIterable<DatasetInputRecord>
	| {
			readonly kind: "records";
			readonly records:
				| readonly DatasetInputRecord[]
				| Iterable<DatasetInputRecord>
				| AsyncIterable<DatasetInputRecord>;
			readonly id?: string;
			readonly metadata?: JsonObject;
			readonly manifest?: DatasetManifest;
	  }
	| {
			readonly kind: "plain-text";
			readonly text?: TextPayload;
			readonly texts?:
				| readonly TextPayload[]
				| Iterable<TextPayload>
				| AsyncIterable<TextPayload>;
			readonly id?: string;
			readonly metadata?: JsonObject;
			readonly manifest?: DatasetManifest;
	  }
	| {
			readonly kind:
				| "jsonl"
				| "csv"
				| "tsv"
				| "conll"
				| "conllu"
				| "iob"
				| "tei"
				| "html"
				| "xml";
			readonly text: TextPayload;
			readonly id?: string;
			readonly metadata?: JsonObject;
			readonly manifest?: DatasetManifest;
	  }
	| {
			readonly kind: "parallel";
			readonly sourceText?: TextPayload;
			readonly targetText?: TextPayload;
			readonly alignments?: TextPayload;
			readonly records?: readonly ParallelRecord[];
			readonly id?: string;
			readonly metadata?: JsonObject;
			readonly manifest?: DatasetManifest;
	  };

export interface DatasetReadOptions {
	readonly id?: string;
	readonly format?: DatasetFormat;
	readonly metadata?: Readonly<Record<string, unknown>>;
	readonly manifest?: DatasetManifest;
	readonly strict?: boolean;
	readonly errors?: "fail-fast" | "continue";
	readonly sourceId?: string;
	readonly language?: string;
	readonly script?: string;
	readonly textColumn?: string;
	readonly idColumn?: string;
	readonly labelColumn?: string;
	readonly labelColumns?: readonly string[];
	readonly metadataColumns?: readonly string[];
	readonly tagColumn?: number | string;
	readonly scheme?: "IOB" | "BIO" | "BILOU";
	readonly sourceLanguage?: string;
	readonly targetLanguage?: string;
	readonly spanUnit?: TextUnit;
}

export interface DatasetWriteOptions {
	readonly format?: DatasetWriteFormat;
	readonly fields?: readonly string[];
	readonly textViewId?: string;
	readonly layerId?: string;
	readonly labelField?: string;
	readonly includeMetadata?: boolean;
	readonly missingValue?: string;
	readonly newline?: "\n" | "\r\n";
	readonly strict?: boolean;
}

export type DatasetOutput =
	| {
			readonly kind: "chunks";
			readonly chunks: string[];
	  }
	| {
			readonly kind: "bytes";
			readonly chunks: Uint8Array[];
	  }
	| {
			readonly kind: "records";
			readonly records: JsonValue[];
	  }
	| {
			readonly kind: "writer";
			readonly write: (chunk: string) => void | Promise<void>;
	  }
	| {
			readonly kind: "stream";
			readonly stream: WritableStream<Uint8Array>;
	  };

export interface SplitSpec {
	readonly name: string;
	readonly ratio?: number;
	readonly count?: number;
}

export interface SplitOptions {
	readonly splits?: readonly SplitSpec[];
	readonly seed?: string;
	readonly stratifyBy?: string | ((record: unknown) => string | undefined);
	readonly groupBy?: string | ((record: unknown) => string | undefined);
	readonly idKey?: string | ((record: unknown, index: number) => string);
}

export interface SplitReport {
	readonly seed: string;
	readonly counts: Readonly<Record<string, number>>;
	readonly optionsHash: string;
	readonly diagnostics: readonly DatasetDiagnostic[];
}

export type DatasetSplits<T> = Readonly<Record<string, TextDataset<T>>> & {
	readonly report: SplitReport;
	readonly train: TextDataset<T>;
	readonly dev: TextDataset<T>;
	readonly test: TextDataset<T>;
};

export type DatasetDiagnosticSeverity = "error" | "warning" | "info";

export interface DatasetDiagnostic {
	readonly code: string;
	readonly severity: DatasetDiagnosticSeverity;
	readonly message: string;
	readonly recordId?: string;
	readonly format?: DatasetFormat | DatasetWriteFormat;
	readonly line?: number;
	readonly column?: number;
	readonly path?: string;
	readonly metadata?: JsonObject;
}
