import type { TextDocument } from "@ismail-elkorchi/textdoc";
import type { JsonValue } from "../internal/json.js";

export interface PipelineCache {
	get(
		key: string,
	): TextDocument | undefined | Promise<TextDocument | undefined>;
	set?(key: string, document: TextDocument): void | Promise<void>;
}

export interface PipelineCacheSnapshotEntry {
	readonly key: string;
	readonly document: TextDocument;
}

export interface PipelineCacheSnapshot {
	readonly schemaVersion: 1;
	readonly artifactType: "textpipeline-cache-snapshot-v1";
	readonly namespace: string;
	readonly entryCount: number;
	readonly entries: readonly PipelineCacheSnapshotEntry[];
	readonly metadata?: JsonValue;
}

export interface SnapshotBackedPipelineCache extends PipelineCache {
	readonly namespace: string;
	snapshot(): PipelineCacheSnapshot;
}
