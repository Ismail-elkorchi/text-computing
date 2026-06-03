export type TextPackResourceKindLike =
	| "unicode-profile"
	| "locale-profile"
	| "segmentation-profile"
	| "normalization-profile"
	| "lexicon"
	| "gazetteer"
	| "termbase"
	| "abbreviation-table"
	| "stoplist"
	| "phrase-list"
	| "fst"
	| "morphology"
	| "grammar"
	| "rule-set"
	| "statistical-model"
	| "corpus"
	| "dataset"
	| "knowledge-base"
	| "ontology"
	| "translation-memory"
	| "alignment-table"
	| "quality-profile"
	| "composite";

export interface TextPackResourceLike {
	readonly id: string;
	readonly kind: TextPackResourceKindLike;
	readonly name?: string;
	readonly format?: string;
	readonly metadata?: unknown;
}

export interface TextPackLike {
	readonly manifest: {
		readonly resources: readonly TextPackResourceLike[];
	};
	readonly resources: Readonly<Record<string, unknown>>;
}

export interface PackResourceQueryLike {
	readonly id?: string;
	readonly kind?:
		| TextPackResourceKindLike
		| readonly TextPackResourceKindLike[];
}

export interface ResourceParseOptions {
	readonly idPrefix?: string;
	readonly language?: string;
	readonly script?: string;
	readonly source?: string;
}
