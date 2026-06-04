import type { TextDocument } from "@ismail-elkorchi/textdoc";
import { compareText } from "../internal/compare.js";
import { assertFinalTextDocument } from "../internal/document.js";
import { assertOptionalJsonValue } from "../internal/json.js";
import type {
	PipelineCacheSnapshot,
	SnapshotBackedPipelineCache,
} from "./types.js";

export interface MemoryPipelineCacheOptions {
	readonly namespace?: string;
	readonly metadata?: PipelineCacheSnapshot["metadata"];
	readonly snapshot?: PipelineCacheSnapshot;
}

export function createMemoryPipelineCache(
	options: MemoryPipelineCacheOptions = {},
): SnapshotBackedPipelineCache {
	assertOptionalJsonValue(options.metadata, "cache.metadata");
	const namespace =
		options.namespace ?? options.snapshot?.namespace ?? "default";
	const records = new Map<
		string,
		PipelineCacheSnapshot["entries"][number]["document"]
	>();
	for (const entry of options.snapshot?.entries ?? []) {
		assertFinalTextDocument(
			entry.document,
			`snapshot.entries.${entry.key}.document`,
		);
		records.set(entry.key, entry.document);
	}
	return Object.freeze({
		namespace,
		get(key: string) {
			return records.get(key);
		},
		set(key: string, document: TextDocument) {
			assertFinalTextDocument(document);
			records.set(key, document);
		},
		snapshot() {
			const entries = [...records.entries()]
				.sort(([left], [right]) => compareText(left, right))
				.map(([key, document]) => Object.freeze({ key, document }));
			return Object.freeze({
				schemaVersion: 1 as const,
				artifactType: "textpipeline-cache-snapshot-v1" as const,
				namespace,
				entryCount: entries.length,
				entries: Object.freeze(entries),
				...(options.metadata === undefined
					? {}
					: { metadata: options.metadata }),
			});
		},
	});
}
