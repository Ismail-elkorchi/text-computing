import {
	createFetchResourceReader as createTextPackFetchResourceReader,
	type TextPackFetchResourceReaderOptions,
	type TextPackResourceReader,
} from "@ismail-elkorchi/textpack";

export type { TextPackFetchResourceReaderOptions, TextPackResourceReader };

export const createFetchResourceReader: (
	options?: TextPackFetchResourceReaderOptions,
) => TextPackResourceReader = createTextPackFetchResourceReader;
