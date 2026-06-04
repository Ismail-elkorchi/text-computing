export type {
	LanguageIdentifier,
	SentimentClassifier,
	SequenceInput,
	SequenceSample,
	SequenceTagger,
	TrainSequenceOptions,
} from "../internal/core.js";
export {
	annotateSequence,
	classifySentiment,
	identifyLanguage,
	tagSequence,
	trainLanguageIdentifier,
	trainSentimentClassifier,
	trainSequenceTagger,
} from "../internal/core.js";
