import type { TextDocument } from "../../document/mod.ts";
import { stableHash64 } from "../../unicode/hash/mod.ts";
import { documentFingerprint } from "../internal/document.ts";
import type { JsonValue } from "../internal/json.ts";
import {
	assertOptionalJsonValue,
	stableJsonStringify,
} from "../internal/json.ts";
import type { PipelineResourceRegistry } from "../pack/registry.ts";
import type { TextPipeline, TextProcessor } from "../processor/types.ts";

export interface PipelineCacheKeyInput {
	readonly pipeline: TextPipeline;
	readonly processor: TextProcessor;
	readonly document: TextDocument;
	readonly resources?: PipelineResourceRegistry;
	readonly options?: JsonValue;
}

export function createPipelineCacheKey(input: PipelineCacheKeyInput): string {
	assertOptionalJsonValue(input.options, "cacheKey.options");
	const payload: JsonValue = {
		schemaVersion: 1,
		pipelineId: input.pipeline.id,
		pipelineFingerprint: input.pipeline.fingerprint,
		processor: {
			id: input.processor.id,
			version: input.processor.version,
			fingerprint: input.processor.fingerprint ?? null,
			requires: (input.processor.requires ?? []) as JsonValue,
			provides: input.processor.provides as JsonValue,
		},
		document: {
			id: input.document.id,
			fingerprint: documentFingerprint(input.document),
		},
		resources: (input.resources ?? input.pipeline.resources).fingerprint(),
		options: input.options ?? null,
	};
	return `textpipeline:${stableHash64(stableJsonStringify(payload))}`;
}
