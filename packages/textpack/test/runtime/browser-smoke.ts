import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";
import { runFileBackedMaterializationSmoke } from "./file-backed-smoke.ts";

const manifest: TextPackManifest = {
	schemaVersion: "1",
	id: "pack:runtime-browser",
	name: "Runtime Browser Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-runtime-browser",
	targets: { languages: ["en"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [{ id: "dataset-browser", kind: "dataset" }],
	capabilitySlots: [
		{ slot: "corpus", status: "sampled", resourceIds: ["dataset-browser"] },
	],
};

const pack = createPack(manifest, { "dataset-browser": "browser runtime" });
if (getResource(pack, "dataset-browser") !== "browser runtime") {
	throw new Error("browser runtime smoke failed");
}

await runFileBackedMaterializationSmoke("browser");
