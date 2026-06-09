import assert from "node:assert/strict";
import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";

const manifest: TextPackManifest = {
	schemaVersion: "1",
	id: "pack:runtime-node",
	name: "Runtime Node Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-runtime-node",
	targets: { languages: ["en"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [{ id: "dataset-node", kind: "dataset" }],
	capabilitySlots: [
		{ slot: "corpus", status: "sampled", resourceIds: ["dataset-node"] },
	],
};

const pack = createPack(manifest, { "dataset-node": "node runtime" });
assert.equal(getResource(pack, "dataset-node"), "node runtime");
