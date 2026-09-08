import {
	createFetchResourceReader as createTextPackFetchResourceReader,
	type TextPackFetchResourceReaderOptions,
	type TextPackResourceReader,
} from "../packs/index.ts";

export type { TextPackFetchResourceReaderOptions, TextPackResourceReader };

export const createFetchResourceReader: (
	options?: TextPackFetchResourceReaderOptions,
) => TextPackResourceReader = createTextPackFetchResourceReader;
