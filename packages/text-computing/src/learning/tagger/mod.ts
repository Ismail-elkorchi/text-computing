export type {
	LanguageIdentifier,
	SentimentClassifier,
	SequenceInput,
	SequenceSample,
	SequenceTagger,
	TrainSequenceOptions,
} from "../internal/core.ts";
export {
	annotateSequence,
	classifySentiment,
	identifyLanguage,
	tagSequence,
	trainLanguageIdentifier,
	trainSentimentClassifier,
	trainSequenceTagger,
} from "../internal/core.ts";
