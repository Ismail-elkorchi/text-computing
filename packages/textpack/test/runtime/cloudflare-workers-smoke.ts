import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";

const manifest: TextPackManifest = {
	id: "pack:runtime-workers",
	name: "Runtime Workers Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-runtime-workers",
	kind: ["dataset"],
	targets: { languages: ["en"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [{ id: "dataset-workers", kind: "dataset" }],
	capabilities: {},
};

const pack = createPack(manifest, { "dataset-workers": "workers runtime" });
if (getResource(pack, "dataset-workers") !== "workers runtime") {
	throw new Error("workers runtime smoke failed");
}
