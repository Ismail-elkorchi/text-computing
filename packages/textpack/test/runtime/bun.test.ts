import { expect, test } from "bun:test";
import {
	createPack,
	getResource,
	type TextPackManifest,
} from "../../dist/index.js";

test("textpack final API works in Bun", () => {
	const manifest: TextPackManifest = {
		id: "pack:runtime-bun",
		name: "Runtime Bun Pack",
		version: "1.0.0",
		packageName: "@ismail-elkorchi/textpack-runtime-bun",
		kind: ["dataset"],
		targets: { languages: ["en"] },
		engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
		resources: [{ id: "dataset-bun", kind: "dataset" }],
		capabilities: {},
	};
	const pack = createPack(manifest, { "dataset-bun": "bun runtime" });
	expect(getResource(pack, "dataset-bun")).toBe("bun runtime");
});
