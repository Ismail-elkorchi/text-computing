/// <reference lib="deno.ns" />

import { createPack, getResource } from "../../dist/index.js";

Deno.test("textpack final API works in Deno", () => {
	const manifest = {
		schemaVersion: "1",
		id: "pack:runtime-deno",
		name: "Runtime Deno Pack",
		version: "1.0.0",
		packageName: "@ismail-elkorchi/textpack-runtime-deno",
		targets: { languages: ["en"] },
		engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
		resources: [{ id: "dataset-deno", kind: "dataset" }],
		capabilitySlots: [
			{ slot: "corpus", status: "sampled", resourceIds: ["dataset-deno"] },
		],
	};
	const pack = createPack(manifest, { "dataset-deno": "deno runtime" });
	if (pack.manifest.id !== "pack:runtime-deno")
		throw new Error("missing manifest");
	if (getResource(pack, "dataset-deno") !== "deno runtime") {
		throw new Error("deno runtime smoke failed");
	}
});
