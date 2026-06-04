import { stableHash64 } from "@ismail-elkorchi/textfacts/hash";
import type { JsonValue } from "./json.js";
import { stableJsonStringify } from "./json.js";

export const packageName = "@ismail-elkorchi/textpipeline" as const;
export const packageVersion = "0.1.0" as const;
export const pipelinePlanSchemaVersion = 1 as const;
export const pipelineCacheSnapshotSchemaVersion = 1 as const;

export function hashJson(value: JsonValue): string {
	return stableHash64(stableJsonStringify(value));
}

export function stableId(prefix: string, value: JsonValue): string {
	return `${prefix}:${hashJson(value)}`;
}
