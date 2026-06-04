import { assertFinalTextDocument } from "../internal/document.js";
import { assertJsonValue } from "../internal/json.js";
import type { PipelineCacheSnapshot } from "./types.js";

export function validatePipelineCacheSnapshot(
	value: unknown,
): PipelineCacheSnapshot {
	assertJsonValue(value, "snapshot");
	if (
		value === null ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		(value as { readonly schemaVersion?: unknown }).schemaVersion !== 1 ||
		(value as { readonly artifactType?: unknown }).artifactType !==
			"textpipeline-cache-snapshot-v1" ||
		typeof (value as { readonly namespace?: unknown }).namespace !== "string" ||
		!Array.isArray((value as { readonly entries?: unknown }).entries)
	) {
		throw new TypeError(
			"snapshot must satisfy the final textpipeline cache snapshot contract.",
		);
	}
	const snapshot = value as unknown as PipelineCacheSnapshot;
	if (snapshot.entryCount !== snapshot.entries.length) {
		throw new TypeError("snapshot entryCount must match entries length.");
	}
	for (const entry of snapshot.entries) {
		if (typeof entry.key !== "string" || entry.key.length === 0) {
			throw new TypeError("snapshot entry keys must be non-empty strings.");
		}
		assertFinalTextDocument(
			entry.document,
			`snapshot.entries.${entry.key}.document`,
		);
	}
	return snapshot;
}
