export type {
	AssociationMeasure,
	CollocationOptions,
	CollocationResult,
} from "./collocation/mod.ts";
export { collocations } from "./collocation/mod.ts";
export type { ConcordanceOptions, KwicLine } from "./concordance/mod.ts";
export { concordance } from "./concordance/mod.ts";
export type { DiachronicOptions, DiachronicTrend } from "./diachronic/mod.ts";
export { diachronicTrends } from "./diachronic/mod.ts";
export type { DispersionItem, DispersionOptions } from "./dispersion/mod.ts";
export { dispersion, distribution } from "./dispersion/mod.ts";
export type {
	FrequencyItem,
	FrequencyOptions,
	FrequencyUnit,
} from "./frequency/mod.ts";
export { documentTermMatrix, frequency, wordList } from "./frequency/mod.ts";
export { TextCorpusError } from "./internal/errors.ts";
export type {
	KeynessItem,
	KeynessMeasure,
	KeynessOptions,
} from "./keyness/mod.ts";
export { keyness } from "./keyness/mod.ts";
export type {
	DictionaryExample,
	GdexOptions,
	WordSketch,
	WordSketchOptions,
	WordSketchRelation,
} from "./lexicography/mod.ts";
export { goodDictionaryExamples, wordSketch } from "./lexicography/mod.ts";
export type { NgramItem, NgramOptions, NgramUnit } from "./ngram/mod.ts";
export { ngramFrequencies, ngrams } from "./ngram/mod.ts";
export type {
	CorpusHit,
	CorpusQuery,
	CorpusQueryOptions,
	CorpusResult,
} from "./query/mod.ts";
export { corpusQuery } from "./query/mod.ts";
export type { ReuseMatch, ReuseOptions } from "./reuse/mod.ts";
export { detectReuse, reuse } from "./reuse/mod.ts";
export type {
	CorpusDataset,
	CorpusDiagnostic,
	CorpusDiagnosticSeverity,
	CorpusDocumentRef,
	CorpusIndexManifest,
	CorpusInput,
	CorpusOptions,
	CorpusTokenSource,
	TextCorpus,
} from "./store/mod.ts";
export {
	addDocuments,
	corpusAsJson,
	corpusFingerprint,
	corpusMetadataKey,
	createCorpus,
	createCorpusFromDataset,
} from "./store/mod.ts";
export type {
	DocumentSimilarity,
	StylometricDocumentProfile,
	StylometricProfile,
	StylometryOptions,
} from "./stylometry/mod.ts";
export {
	documentSimilarityMatrix,
	lexicalDiversity,
	stylometricProfile,
} from "./stylometry/mod.ts";
export type { TermCandidate, TermExtractionOptions } from "./terms/mod.ts";
export { extractTerms } from "./terms/mod.ts";
export type {
	CorpusDocumentsFromPackOptions,
	TextCorpusFromPackOptions,
} from "./textpack.ts";
export {
	corpusDatasetFromPack,
	corpusDocumentsFromPack,
	textCorpusFromPack,
} from "./textpack.ts";
