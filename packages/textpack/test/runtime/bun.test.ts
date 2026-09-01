import { expect, test } from "bun:test";
import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";
import { runFileBackedMaterializationSmoke } from "./file-backed-smoke.ts";

test("textpack final API works in Bun", () => {
	const manifest: TextPackManifest = {
		schemaVersion: "1",
		id: "pack:runtime-bun",
		name: "Runtime Bun Pack",
		version: "1.0.0",
		packageName: "@ismail-elkorchi/textpack-runtime-bun",
		targets: { languages: ["en"] },
		resources: [{ id: "dataset-bun", kind: "dataset" }],
		capabilitySlots: [
			{
				slot: "corpus",
				status: "sampled",
				tier: "resource-only",
				resourceIds: ["dataset-bun"],
			},
		],
	};
	const pack = createPack(manifest, { "dataset-bun": "bun runtime" });
	expect(getResource(pack, "dataset-bun")).toBe("bun runtime");
});

test("file-backed gzip textpack resources materialize in Bun", async () => {
	await runFileBackedMaterializationSmoke("bun");
});
