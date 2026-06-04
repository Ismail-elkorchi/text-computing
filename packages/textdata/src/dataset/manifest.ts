import { stableJsonClone } from "../internal/json.js";
import type { DatasetManifest } from "./types.js";
import { assertDatasetManifest } from "./validate.js";

export function normalizeDatasetManifest(
	manifest: DatasetManifest,
): DatasetManifest {
	assertDatasetManifest(manifest);
	return stableJsonClone(
		manifest as unknown as import("../internal/json.js").JsonObject,
	) as unknown as DatasetManifest;
}
