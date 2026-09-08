import { fail } from "../internal/errors.ts";
import type { CorpusState, TextCorpus } from "./types.ts";

const stateSymbol: unique symbol = Symbol.for(
	"@ismail-elkorchi/text-computing/corpus.state",
);

export function attachCorpusState(
	corpus: TextCorpus,
	state: CorpusState,
): TextCorpus {
	Object.defineProperty(corpus, stateSymbol, {
		value: state,
		enumerable: false,
		writable: false,
		configurable: false,
	});
	return corpus;
}

export function getCorpusState(corpus: TextCorpus): CorpusState {
	const state = (
		corpus as TextCorpus & { readonly [stateSymbol]?: CorpusState }
	)[stateSymbol];
	if (state === undefined) {
		fail(
			"TEXTCORPUS_STATE_MISSING",
			"corpus value was not created by createCorpus",
		);
	}
	return state;
}
