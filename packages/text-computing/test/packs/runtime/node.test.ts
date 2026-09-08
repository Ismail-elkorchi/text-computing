import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	createPack,
	getResource,
	openArtifactBytes,
	openResourceTable,
	type TextPackManifest,
} from "@ismail-elkorchi/text-computing/packs";
import {
	createNodeArtifactReader,
	createNodeResourceReader,
} from "@ismail-elkorchi/text-computing/packs/node";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

const manifest: TextPackManifest = {
	schemaVersion: "1",
	id: "pack:runtime-node",
	name: "Runtime Node Pack",
	version: "1.0.0",
	packageName: "@ismail-elkorchi/textpack-runtime-node",
	targets: { languages: ["en"] },
	resources: [{ id: "dataset-node", kind: "dataset" }],
	capabilitySlots: [
		{
			slot: "corpus",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["dataset-node"],
		},
	],
};

const pack = createPack(manifest, { "dataset-node": "node runtime" });
assert.equal(getResource(pack, "dataset-node"), "node runtime");

const packageRoot = await mkdtemp(join(tmpdir(), "textpack-node-reader-"));
await mkdir(join(packageRoot, "resources"));
const tableText = "id\ttext\nr1\tNode reader\n";
await writeFile(join(packageRoot, "resources", "table.tsv"), tableText, "utf8");
const fileBackedManifest: TextPackManifest = {
	...manifest,
	id: "pack:runtime-node-file-backed",
	name: "Runtime Node File Backed Pack",
	resources: [
		{
			id: "dataset-file-backed",
			kind: "dataset",
			path: "resources/table.tsv",
			format: "tsv",
		},
	],
	capabilitySlots: [
		{
			slot: "corpus",
			status: "sampled",
			tier: "resource-only",
			resourceIds: ["dataset-file-backed"],
		},
	],
};
const fileBackedPack = createPack(fileBackedManifest, {
	"dataset-file-backed": {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-runtime-node",
		packageRoot: pathToFileURL(`${packageRoot}/`).href,
		path: "resources/table.tsv",
		encoding: "utf8",
		checksum: `sha256:${await sha256(tableText)}`,
		byteLength: new TextEncoder().encode(tableText).byteLength,
	},
});
const table = await openResourceTable(
	fileBackedPack,
	"dataset-file-backed",
	createNodeResourceReader(),
);
assert.deepEqual(table.rows[0], { id: "r1", text: "Node reader" });

const artifactText = "node model bytes";
const artifactPath = join(packageRoot, "model.onnx");
await writeFile(artifactPath, artifactText, "utf8");
const artifactChecksum = await sha256(artifactText);
const artifactPack = createPack(
	{
		...manifest,
		id: "pack:runtime-node-artifact",
		name: "Runtime Node Artifact Pack",
		artifacts: [
			{
				artifactId: "model-node",
				sourceIds: ["source:model-node"],
				version: "1.0.0",
				profile: "local",
				sizeBytes: new TextEncoder().encode(artifactText).byteLength,
				mediaType: "application/octet-stream",
				checksum: { algorithm: "sha256", value: artifactChecksum },
				licenseExpression: "MIT",
				redistributionPolicy: "redistributable",
				retrieval: { kind: "manual" },
				cacheKey: `sha256:${artifactChecksum}`,
				expectedFiles: [
					{
						path: "model.onnx",
						sizeBytes: new TextEncoder().encode(artifactText).byteLength,
						checksum: `sha256:${artifactChecksum}`,
					},
				],
			},
		],
	},
	{ "dataset-node": "node runtime" },
);
assert.equal(
	new TextDecoder().decode(
		await openArtifactBytes(
			artifactPack,
			"model-node",
			createNodeArtifactReader({ paths: { "model-node": artifactPath } }),
		),
	),
	artifactText,
);
