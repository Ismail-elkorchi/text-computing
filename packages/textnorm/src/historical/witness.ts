import { deepFreeze } from "../internal/freeze.js";
import { assertJsonValue } from "../internal/json.js";

export interface WitnessReference {
	readonly id: string;
	readonly editionId?: string;
	readonly label?: string;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export function witnessReference(input: WitnessReference): WitnessReference {
	assertJsonValue(input.metadata ?? {});
	return deepFreeze(input) as WitnessReference;
}
