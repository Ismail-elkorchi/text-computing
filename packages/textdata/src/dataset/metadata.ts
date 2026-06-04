import { orderedRecord } from "../internal/compare.js";
import type { JsonObject } from "../internal/json.js";
import { optionalJsonObject, stableJsonClone } from "../internal/json.js";

export function mergeMetadata(
	...metadata: readonly (Readonly<Record<string, unknown>> | undefined)[]
): JsonObject {
	const merged: Record<string, unknown> = {};
	for (const entry of metadata) {
		Object.assign(merged, optionalJsonObject(entry));
	}
	return stableJsonClone(orderedRecord(merged) as JsonObject);
}
