import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";
import { runFileBackedMaterializationSmoke } from "./file-backed-smoke.ts";

const manifest: TextPackManifest = {
	schemaVersion: "1",
	id: "pack:runtime-workers",
	name: "Runtime Workers Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-runtime-workers",
	targets: { languages: ["en"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [{ id: "dataset-workers", kind: "dataset" }],
	capabilitySlots: [
		{
			slot: "corpus",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["dataset-workers"],
		},
	],
};

const pack = createPack(manifest, { "dataset-workers": "workers runtime" });
if (getResource(pack, "dataset-workers") !== "workers runtime") {
	throw new Error("workers runtime smoke failed");
}

await runFileBackedMaterializationSmoke("workers");
