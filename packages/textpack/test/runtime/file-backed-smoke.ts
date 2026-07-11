import {
	createFetchResourceReader,
	createPack,
	openResourceTable,
	openResourceText,
} from "../../dist/index.js";

const fixturePackageRoot = "https://textpack.invalid/runtime-smoke/";
const fixturePath = "resources/fetch-table.tsv.gz.b64";
const fixtureUrl = new URL(fixturePath, fixturePackageRoot).href;
const encodedFixtureText =
	"H4sIAAAAAAAAA8tM4SxJrSjhKjLk9EjNyclXSEstSc5QKEpNTEkt4ioy4nTKz8vKLy1SSK/KLOACAKdG/7ouAAAA\n";

const fixtureFetch: typeof fetch = async (input) => {
	const url =
		input instanceof URL
			? input.href
			: typeof input === "string"
				? new URL(input).href
				: input.url;
	if (url !== fixtureUrl) return new Response("missing", { status: 404 });
	return new Response(encodedFixtureText, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
};

function manifest(runtimeName: string) {
	return {
		schemaVersion: "1",
		id: `pack:runtime-${runtimeName}-file-backed`,
		name: `Runtime ${runtimeName} File Backed Pack`,
		version: "1.0.0",
		packageName: `@ismail-elkorchi/textpack-runtime-${runtimeName}`,
		targets: { languages: ["en"] },
		engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
		resources: [
			{
				id: `dataset-${runtimeName}-file-backed`,
				kind: "dataset",
				format: "tsv+gzip+base64",
			},
		],
		capabilitySlots: [
			{
				slot: "corpus",
				status: "sampled",
				tier: "resource-only",
				resourceIds: [`dataset-${runtimeName}-file-backed`],
			},
		],
	} as const;
}

export async function runFileBackedMaterializationSmoke(
	runtimeName: string,
): Promise<void> {
	const resourceId = `dataset-${runtimeName}-file-backed`;
	const pack = createPack(manifest(runtimeName), {
		[resourceId]: {
			kind: "file-backed-resource",
			packageName: `@ismail-elkorchi/textpack-runtime-${runtimeName}`,
			packageRoot: fixturePackageRoot,
			path: fixturePath,
			encoding: "gzip-base64",
			checksum:
				"sha256:65c949b1b5cccd2ed2a5e8c96653370b9d77f7209393edaa9cc1fbee225158ff",
			byteLength: 89,
			resourceTextByteLength: 46,
			lineCount: 4,
			nonEmptyLineCount: 3,
		},
	});
	const reader = createFetchResourceReader({ fetch: fixtureFetch });
	const text = await openResourceText(pack, resourceId, reader);
	if (text !== "id\ttext\nr1\tHello fetch reader\nr2\tBonjour gzip\n") {
		throw new Error(`${runtimeName} gzip materialization returned wrong text.`);
	}
	const table = await openResourceTable(pack, resourceId, reader);
	const rows = table.rows as readonly Readonly<Record<string, string>>[];
	if (rows[0]?.text !== "Hello fetch reader") {
		throw new Error(`${runtimeName} materialized table row 1 is wrong.`);
	}
	if (rows[1]?.text !== "Bonjour gzip") {
		throw new Error(`${runtimeName} materialized table row 2 is wrong.`);
	}
}
