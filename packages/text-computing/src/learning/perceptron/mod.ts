export type {
	ClassicalClassifier,
	ClassificationResult,
	LabeledFeatureRecord,
	SequenceSample,
	SequenceTagger,
	SequenceTagResult,
	TrainClassifierOptions,
	TrainSequenceOptions,
} from "../internal/core.ts";
export {
	classify,
	tagSequence,
	trainClassifier,
	trainSequenceTagger,
} from "../internal/core.ts";
