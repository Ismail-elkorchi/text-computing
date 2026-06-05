import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { compareStrings, uniqueSorted } from "../internal/compare.js";
import { fail } from "../internal/errors.js";
import { stableJsonHash } from "../internal/hash.js";
import {
	type JsonValue,
	metadataClone,
	stableStringify,
} from "../internal/json.js";
import {
	assertDocumentShape,
	collectAnnotations,
	collectLayers,
	extractDocumentTokens,
} from "../internal/tokens.js";
import { attachCorpusState, getCorpusState } from "./state.js";
import type {
	CorpusDataset,
	CorpusDiagnostic,
	CorpusDocumentRef,
	CorpusIndexManifest,
	CorpusOptions,
	CorpusRecord,
	CorpusState,
	NormalizedCorpusOptions,
	TextCorpus,
} from "./types.js";

function normalizeOptions(
	options: CorpusOptions = {},
): NormalizedCorpusOptions {
	return {
		...(options.id !== undefined ? { id: options.id } : {}),
		metadata: metadataClone(options.metadata, "$.metadata"),
		...(options.viewId !== undefined ? { viewId: options.viewId } : {}),
		...(options.tokenLayerId !== undefined
			? { tokenLayerId: options.tokenLayerId }
			: {}),
		...(options.lemmaLayerId !== undefined
			? { lemmaLayerId: options.lemmaLayerId }
			: {}),
		partitionKeys: [...(options.partitionKeys ?? [])].sort(compareStrings),
		tokenSource: options.tokenSource ?? "annotation-layer",
		strict: options.strict ?? true,
	};
}

function corpusId(
	options: NormalizedCorpusOptions,
	refs: readonly CorpusDocumentRef[],
): string {
	if (options.id !== undefined && options.id.length > 0) return options.id;
	const payload = {
		metadata: options.metadata as JsonValue,
		documents: refs.map((ref) => ref.id),
	};
	return `corpus-${stableJsonHash(payload)}`;
}

function partitionValues(
	metadata: Readonly<Record<string, unknown>>,
	keys: readonly string[],
): Record<string, string> {
	const partitions: Record<string, string> = {};
	for (const key of keys) {
		const value = metadata[key];
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			partitions[key] = String(value);
		}
	}
	return Object.fromEntries(
		Object.entries(partitions).sort(([left], [right]) =>
			compareStrings(left, right),
		),
	);
}

function recordForDocument(
	doc: TextDocument,
	options: NormalizedCorpusOptions,
): CorpusRecord {
	assertDocumentShape(doc);
	const diagnostics: CorpusDiagnostic[] = [];
	const metadata = metadataClone(
		doc.metadata,
		`$.documents.${doc.id}.metadata`,
	);
	const ref: CorpusDocumentRef = { id: doc.id, metadata };
	const tokens = extractDocumentTokens(doc, options, diagnostics);
	if (
		options.strict &&
		diagnostics.some((entry) => entry.severity === "error")
	) {
		fail(
			"TEXTCORPUS_DOCUMENT_INDEX_ERROR",
			`document ${doc.id} cannot be indexed: ${diagnostics
				.map((entry) => entry.code)
				.join(", ")}`,
		);
	}
	const layers = collectLayers(doc);
	const annotations = collectAnnotations(doc);
	return {
		document: doc,
		ref,
		tokens,
		layers,
		annotations,
		partitions: partitionValues(metadata, options.partitionKeys),
		diagnostics,
	};
}

function buildIndexManifest(
	records: readonly CorpusRecord[],
	diagnostics: readonly CorpusDiagnostic[],
): CorpusIndexManifest {
	const tokenLayers = uniqueSorted(
		records.flatMap((record) =>
			record.tokens.flatMap((token) =>
				token.layerId === undefined ? [] : [token.layerId],
			),
		),
	);
	const annotationLayers = uniqueSorted(
		records.flatMap((record) => record.layers.map((layer) => layer.id)),
	);
	const annotationTypes = uniqueSorted(
		records.flatMap((record) =>
			record.layers.flatMap((layer) =>
				Object.values(layer.annotations).map((annotation) => annotation.type),
			),
		),
	);
	const metadataKeys = uniqueSorted(
		records.flatMap((record) => Object.keys(record.ref.metadata)),
	);
	const partitions: Record<string, string[]> = {};
	for (const record of records) {
		for (const [key, value] of Object.entries(record.partitions)) {
			partitions[key] = uniqueSorted([...(partitions[key] ?? []), value]);
		}
	}
	const relationLayers = uniqueSorted(
		records.flatMap((record) =>
			record.layers
				.filter((layer) => layer.type.startsWith("relation."))
				.map((layer) => layer.id),
		),
	);
	return {
		documents: records.length,
		tokens: records.reduce((total, record) => total + record.tokens.length, 0),
		tokenLayers,
		lemmas: uniqueSorted(
			records.flatMap((record) =>
				record.tokens.flatMap((token) =>
					token.lemma === undefined ? [] : [token.lemma],
				),
			),
		).length,
		annotationLayers,
		annotationTypes,
		metadataKeys,
		partitions: Object.fromEntries(
			Object.entries(partitions).sort(([left], [right]) =>
				compareStrings(left, right),
			),
		),
		ngrams: [],
		relations: relationLayers,
		reuse: false,
		diagnostics: diagnostics.map((entry) => ({ ...entry })),
	};
}

function freezeCorpus(corpus: TextCorpus, state: CorpusState): TextCorpus {
	for (const record of state.records) {
		Object.freeze(record.tokens);
		Object.freeze(record.annotations);
		Object.freeze(record.layers);
		Object.freeze(record.diagnostics);
		Object.freeze(record.partitions);
		Object.freeze(record);
	}
	Object.freeze(state.records);
	Object.freeze(state.diagnostics);
	Object.freeze(corpus.documents);
	Object.freeze(corpus.indexes.tokenLayers);
	Object.freeze(corpus.indexes.annotationLayers);
	Object.freeze(corpus.indexes.annotationTypes);
	Object.freeze(corpus.indexes.metadataKeys);
	Object.freeze(corpus.indexes.ngrams);
	Object.freeze(corpus.indexes.relations);
	Object.freeze(corpus.indexes.diagnostics);
	Object.freeze(corpus.indexes);
	Object.freeze(corpus.metadata);
	return Object.freeze(corpus);
}

function createCorpusFromRecords(
	records: CorpusRecord[],
	options: NormalizedCorpusOptions,
): TextCorpus {
	const sortedRecords = [...records].sort((left, right) =>
		compareStrings(left.ref.id, right.ref.id),
	);
	const seen = new Set<string>();
	for (const record of sortedRecords) {
		if (seen.has(record.ref.id)) {
			fail(
				"TEXTCORPUS_DUPLICATE_DOCUMENT",
				`duplicate document id: ${record.ref.id}`,
			);
		}
		seen.add(record.ref.id);
	}
	const diagnostics = sortedRecords.flatMap((record) => record.diagnostics);
	const documents = sortedRecords.map((record) => ({
		id: record.ref.id,
		metadata: { ...record.ref.metadata },
	}));
	const id = corpusId(options, documents);
	const corpus: TextCorpus = {
		id,
		documents,
		indexes: buildIndexManifest(sortedRecords, diagnostics),
		metadata: { ...options.metadata },
	};
	const state: CorpusState = {
		options,
		records: sortedRecords,
		diagnostics: diagnostics.map((entry) => ({ ...entry, corpusId: id })),
	};
	attachCorpusState(corpus, state);
	return freezeCorpus(corpus, state);
}

export function createCorpus(
	docs: Iterable<TextDocument>,
	options: CorpusOptions = {},
): TextCorpus {
	const normalized = normalizeOptions(options);
	const records = [...docs].map((doc) => recordForDocument(doc, normalized));
	return createCorpusFromRecords(records, normalized);
}

export function addDocuments(
	corpus: TextCorpus,
	docs: Iterable<TextDocument>,
): TextCorpus {
	const state = getCorpusState(corpus);
	const records = [
		...state.records.map((record) =>
			recordForDocument(record.document, state.options),
		),
		...[...docs].map((doc) => recordForDocument(doc, state.options)),
	];
	return createCorpusFromRecords(records, state.options);
}

export async function createCorpusFromDataset(
	dataset: CorpusDataset,
	options: CorpusOptions = {},
): Promise<TextCorpus> {
	const docs: TextDocument[] = [];
	for await (const record of dataset.records) docs.push(record);
	return createCorpus(docs, {
		...options,
		metadata: {
			...metadataClone(dataset.metadata, "$.dataset.metadata"),
			...metadataClone(options.metadata, "$.options.metadata"),
			datasetId: dataset.id,
		},
	});
}

export function corpusFingerprint(corpus: TextCorpus): string {
	return stableJsonHash({
		id: corpus.id,
		documents: corpus.documents.map((ref) => ref.id),
		indexes: corpus.indexes as unknown as JsonValue,
		metadata: corpus.metadata as JsonValue,
	});
}

export function corpusMetadataKey(corpus: TextCorpus, key: string): string[] {
	const values = new Set<string>();
	for (const ref of corpus.documents) {
		const value = ref.metadata[key];
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			values.add(String(value));
		}
	}
	return [...values].sort(compareStrings);
}

export function corpusAsJson(corpus: TextCorpus): string {
	return stableStringify(corpus as unknown as JsonValue);
}
