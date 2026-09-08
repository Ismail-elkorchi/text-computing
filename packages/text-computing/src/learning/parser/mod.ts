export type {
	ClassicalParser,
	DependencyParseEdge,
	ParserAction,
	ParserToken,
	ParserTrainingEdge,
	ParserTrainingSample,
	TrainParserOptions,
} from "../internal/core.ts";
export {
	parseDependencies,
	trainClassicalParser,
} from "../internal/core.ts";
