export type {
	AssociationMeasure,
	CollocationOptions,
	CollocationResult,
} from "./collocation/mod.js";
export { collocations } from "./collocation/mod.js";
export type { ConcordanceOptions, KwicLine } from "./concordance/mod.js";
export { concordance } from "./concordance/mod.js";
export type { DiachronicOptions, DiachronicTrend } from "./diachronic/mod.js";
export { diachronicTrends } from "./diachronic/mod.js";
export type { DispersionItem, DispersionOptions } from "./dispersion/mod.js";
export { dispersion, distribution } from "./dispersion/mod.js";
export type {
	FrequencyItem,
	FrequencyOptions,
	FrequencyUnit,
} from "./frequency/mod.js";
export { documentTermMatrix, frequency, wordList } from "./frequency/mod.js";
export { TextCorpusError } from "./internal/errors.js";
export type {
	KeynessItem,
	KeynessMeasure,
	KeynessOptions,
} from "./keyness/mod.js";
export { keyness } from "./keyness/mod.js";
export type {
	DictionaryExample,
	GdexOptions,
	WordSketch,
	WordSketchOptions,
	WordSketchRelation,
} from "./lexicography/mod.js";
export { goodDictionaryExamples, wordSketch } from "./lexicography/mod.js";
export type { NgramItem, NgramOptions, NgramUnit } from "./ngram/mod.js";
export { ngramFrequencies, ngrams } from "./ngram/mod.js";
export type {
	CorpusHit,
	CorpusQuery,
	CorpusQueryOptions,
	CorpusResult,
} from "./query/mod.js";
export { corpusQuery } from "./query/mod.js";
export type { ReuseMatch, ReuseOptions } from "./reuse/mod.js";
export { detectReuse, reuse } from "./reuse/mod.js";
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
} from "./store/mod.js";
export {
	addDocuments,
	corpusAsJson,
	corpusFingerprint,
	corpusMetadataKey,
	createCorpus,
	createCorpusFromDataset,
} from "./store/mod.js";
export type {
	DocumentSimilarity,
	StylometricDocumentProfile,
	StylometricProfile,
	StylometryOptions,
} from "./stylometry/mod.js";
export {
	documentSimilarityMatrix,
	lexicalDiversity,
	stylometricProfile,
} from "./stylometry/mod.js";
export type { TermCandidate, TermExtractionOptions } from "./terms/mod.js";
export { extractTerms } from "./terms/mod.js";
export type {
	CorpusDocumentsFromPackOptions,
	TextCorpusFromPackOptions,
} from "./textpack.js";
export {
	corpusDatasetFromPack,
	corpusDocumentsFromPack,
	textCorpusFromPack,
} from "./textpack.js";
