export { packageName, packageVersion } from "../../internal/constants.ts";

import { stableHash64 } from "../../unicode/hash/mod.ts";
import type { JsonValue } from "./json.ts";
import { stableJsonStringify } from "./json.ts";

export const pipelinePlanSchemaVersion = 1 as const;
export const pipelineCacheSnapshotSchemaVersion = 1 as const;

export function hashJson(value: JsonValue): string {
	return stableHash64(stableJsonStringify(value));
}

export function stableId(prefix: string, value: JsonValue): string {
	return `${prefix}:${hashJson(value)}`;
}
