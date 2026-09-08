import { stableJsonClone } from "../internal/json.ts";
import type { DatasetManifest } from "./types.ts";
import { assertDatasetManifest } from "./validate.ts";

export function normalizeDatasetManifest(
	manifest: DatasetManifest,
): DatasetManifest {
	assertDatasetManifest(manifest);
	return stableJsonClone(
		manifest as unknown as import("../internal/json.ts").JsonObject,
	) as unknown as DatasetManifest;
}
