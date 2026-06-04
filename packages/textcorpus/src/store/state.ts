import { fail } from "../internal/errors.js";
import type { CorpusState, TextCorpus } from "./types.js";

const stateSymbol: unique symbol = Symbol.for(
	"@ismail-elkorchi/textcorpus.state",
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
