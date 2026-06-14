import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	createPack,
	getResource,
	openResourceTable,
	type TextPackManifest,
	type TextPackResourceReader,
} from "../../dist/index.js";

async function sha256(text: string): Promise<string> {
	const bytes = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function localFileResourceReader(packageRoot: string): TextPackResourceReader {
	const root = pathToFileURL(
		packageRoot.endsWith("/") ? packageRoot : `${packageRoot}/`,
	);
	return {
		readText({ descriptor }) {
			const resourceUrl = new URL(descriptor.path, root);
			if (!resourceUrl.href.startsWith(root.href)) {
				throw new TypeError(`resource path escapes test package root`);
			}
			return readFile(resourceUrl, "utf8");
		},
	};
}

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

const packageRoot = await mkdtemp(join(tmpdir(), "textpack-node-reader-"));
await mkdir(join(packageRoot, "resources"));
const tableText = "id\ttext\nr1\tNode reader\n";
await writeFile(join(packageRoot, "resources", "table.tsv"), tableText, "utf8");
const fileBackedManifest: TextPackManifest = {
	...manifest,
	id: "pack:runtime-node-file-backed",
	name: "Runtime Node File Backed Pack",
	resources: [{ id: "dataset-file-backed", kind: "dataset", format: "tsv" }],
	capabilitySlots: [
		{
			slot: "corpus",
			status: "sampled",
			resourceIds: ["dataset-file-backed"],
		},
	],
};
const fileBackedPack = createPack(fileBackedManifest, {
	"dataset-file-backed": {
		kind: "file-backed-resource",
		packageName: "@ismail-elkorchi/textpack-runtime-node",
		path: "resources/table.tsv",
		encoding: "utf8",
		checksum: `sha256:${await sha256(tableText)}`,
		byteLength: new TextEncoder().encode(tableText).byteLength,
	},
});
const table = await openResourceTable(
	fileBackedPack,
	"dataset-file-backed",
	localFileResourceReader(packageRoot),
);
assert.deepEqual(table.rows[0], { id: "r1", text: "Node reader" });
