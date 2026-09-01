import { createPack } from "@ismail-elkorchi/textpack";
import { createFetchResourceReader, load } from "../../dist/index.js";

const fixturePackageRoot = "https://text-computing.invalid/runtime-smoke/";
const segmentationPath = "resources/segmentation.json.gz.b64";
const normalizationPath = "resources/normalization.json.gz.b64";
const fixtures = new Map<string, string>([
	[
		new URL(segmentationPath, fixturePackageRoot).href,
		"H4sIAAAAAAAAA6tWKijKT8vMSfVMUbJSKirNK8nMTdUtTk3PTc0rSSzJzM9T0lHKScxLL01MTw1JTFeyUkorUqrlAgCkMNFdOAAAAA==\n",
	],
	[
		new URL(normalizationPath, fixturePackageRoot).href,
		"H4sIAAAAAAAAA2WMMQvCMBSEd3/GzSlUx6yC4NLJTRweyWt5kCbhNRlq6X8XCmLV7bj77luQNfUS+OphoTUWGbmJSUcK8qQiKcIgUBwqDXyjARa9wqBGcclz90VadJczDLQGnmDvy5Y2taOJ+xQ8DFJmffO7OqsklTLDHtvV7K5TUcmNF3IqRdyP4X/9iE7t+lgPLzYzkwXkAAAA\n",
	],
]);

const fixtureFetch: typeof fetch = async (input) => {
	const url =
		input instanceof URL
			? input.href
			: typeof input === "string"
				? new URL(input).href
				: input.url;
	const text = fixtures.get(url);
	if (text === undefined) return new Response("missing", { status: 404 });
	return new Response(text, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
};

function smokePack(runtimeName: string) {
	return createPack(
		{
			schemaVersion: "1",
			id: `pack:text-computing-runtime-${runtimeName}`,
			name: `Text Computing Runtime ${runtimeName}`,
			version: "1.0.0",
			packageName: `@ismail-elkorchi/textpack-text-computing-runtime-${runtimeName}`,
			targets: { languages: ["fr"], scripts: ["Latn"] },
			resources: [
				{
					id: `segmentation-${runtimeName}`,
					kind: "segmentation-profile",
					format: "gzip+base64+json",
					schemaId: "textdata.segmentation-profile.v1",
				},
				{
					id: `normalization-${runtimeName}`,
					kind: "normalization-profile",
					format: "gzip+base64+json",
					schemaId: "textnorm.profile.v1",
				},
			],
			capabilitySlots: [
				{
					slot: "segmentation",
					status: "task-supported",
					tier: "baseline",
					resourceIds: [`segmentation-${runtimeName}`],
					bindings: [
						{
							role: "profile",
							resourceId: `segmentation-${runtimeName}`,
							schemaId: "textdata.segmentation-profile.v1",
							required: true,
						},
					],
				},
				{
					slot: "normalization",
					status: "task-supported",
					tier: "baseline",
					resourceIds: [`normalization-${runtimeName}`],
					bindings: [
						{
							role: "profile",
							resourceId: `normalization-${runtimeName}`,
							schemaId: "textnorm.profile.v1",
							required: true,
						},
					],
				},
			],
		},
		{
			[`segmentation-${runtimeName}`]: {
				kind: "file-backed-resource",
				packageName: `@ismail-elkorchi/textpack-text-computing-runtime-${runtimeName}`,
				packageRoot: fixturePackageRoot,
				path: segmentationPath,
				encoding: "gzip-base64",
				checksum:
					"sha256:f67a4c6d24bf30bbc29390cc68d36cb400e96f1c1cc9e1cac6a02239c12e2f1c",
				byteLength: 105,
				resourceTextByteLength: 56,
			},
			[`normalization-${runtimeName}`]: {
				kind: "file-backed-resource",
				packageName: `@ismail-elkorchi/textpack-text-computing-runtime-${runtimeName}`,
				packageRoot: fixturePackageRoot,
				path: normalizationPath,
				encoding: "gzip-base64",
				checksum:
					"sha256:8318d1bce96a718ba98f474f281e8f59927c6b60e2b6445fef4f6b4a5218470e",
				byteLength: 209,
				resourceTextByteLength: 228,
			},
		},
	);
}

export async function runTextComputingFileBackedSmoke(
	runtimeName: string,
): Promise<void> {
	const nlp = await load(smokePack(runtimeName), {
		reader: createFetchResourceReader({ fetch: fixtureFetch }),
	});
	const tokens = await nlp.tokenize("L'Etat français.");
	if (tokens.length === 0) {
		throw new Error(
			`${runtimeName} text-computing tokenization returned no tokens.`,
		);
	}
	const normalized = await nlp.normalize("CAFÉ");
	if (normalized !== "cafe") {
		throw new Error(
			`${runtimeName} text-computing normalization returned ${JSON.stringify(normalized)}.`,
		);
	}
}
