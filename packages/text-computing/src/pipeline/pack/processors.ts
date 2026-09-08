import type { TextPack } from "../../packs/index.ts";
import type { TextProcessor } from "../processor/types.ts";
import {
	createPipelineResourceRegistry,
	type PipelineResourceRegistry,
} from "./registry.ts";

export interface PackProcessorBundle {
	readonly processors: readonly TextProcessor[];
	readonly resources: PipelineResourceRegistry;
}

export interface ComposePackProcessorsOptions {
	readonly packs?: readonly TextPack[];
	readonly processors: readonly TextProcessor[];
	readonly capabilities?: readonly string[];
}

export function composePackProcessors(
	options: ComposePackProcessorsOptions,
): PackProcessorBundle {
	return Object.freeze({
		processors: Object.freeze([...options.processors]),
		resources: createPipelineResourceRegistry({
			packs: options.packs ?? [],
			capabilities: options.capabilities ?? [],
		}),
	});
}
