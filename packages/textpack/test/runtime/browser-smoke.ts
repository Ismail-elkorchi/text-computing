import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";

const manifest: TextPackManifest = {
	id: "pack:runtime-browser",
	name: "Runtime Browser Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-runtime-browser",
	kind: ["dataset"],
	targets: { languages: ["en"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [{ id: "dataset-browser", kind: "dataset" }],
	capabilities: {},
};

const pack = createPack(manifest, { "dataset-browser": "browser runtime" });
if (getResource(pack, "dataset-browser") !== "browser runtime") {
	throw new Error("browser runtime smoke failed");
}
