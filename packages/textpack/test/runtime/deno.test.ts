/// <reference lib="deno.ns" />

import { createPack, getResource } from "../../dist/index.js";
import { runFileBackedMaterializationSmoke } from "./file-backed-smoke.ts";

Deno.test("textpack final API works in Deno", () => {
	const manifest = {
		schemaVersion: "1",
		id: "pack:runtime-deno",
		name: "Runtime Deno Pack",
		version: "1.0.0",
		packageName: "@ismail-elkorchi/textpack-runtime-deno",
		targets: { languages: ["en"] },
		resources: [{ id: "dataset-deno", kind: "dataset" }],
		capabilitySlots: [
			{
				slot: "corpus",
				status: "sampled",
				tier: "resource-only",
				resourceIds: ["dataset-deno"],
			},
		],
	};
	const pack = createPack(manifest, { "dataset-deno": "deno runtime" });
	if (pack.manifest.id !== "pack:runtime-deno")
		throw new Error("missing manifest");
	if (getResource(pack, "dataset-deno") !== "deno runtime") {
		throw new Error("deno runtime smoke failed");
	}
});

Deno.test("file-backed gzip textpack resources materialize in Deno", async () => {
	await runFileBackedMaterializationSmoke("deno");
});
