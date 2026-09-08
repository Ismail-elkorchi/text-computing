import { orderedRecord } from "../internal/compare.ts";
import type { JsonObject } from "../internal/json.ts";
import { optionalJsonObject, stableJsonClone } from "../internal/json.ts";

export function mergeMetadata(
	...metadata: readonly (Readonly<Record<string, unknown>> | undefined)[]
): JsonObject {
	const merged: Record<string, unknown> = {};
	for (const entry of metadata) {
		Object.assign(merged, optionalJsonObject(entry));
	}
	return stableJsonClone(orderedRecord(merged) as JsonObject);
}
