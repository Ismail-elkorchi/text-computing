import { open, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
	createFetchArtifactReader,
	type TextPackArtifactReadContext,
	type TextPackArtifactReader,
	type TextPackFetchArtifactReaderOptions,
} from "./artifacts.ts";

import {
	createFetchResourceReader,
	type TextPackFetchResourceReaderOptions,
	type TextPackResourceReader,
} from "./materialize.ts";

export type TextPackNodeResourceReaderOptions =
	TextPackFetchResourceReaderOptions;

export interface TextPackNodeArtifactReaderOptions
	extends TextPackFetchArtifactReaderOptions {
	readonly paths?: Readonly<Record<string, string | URL>>;
}

function packageRootUrl(packageRoot: string | undefined): URL {
	if (packageRoot === undefined || packageRoot.length === 0) {
		throw new TypeError(
			"Node textpack resource reading requires descriptor.packageRoot.",
		);
	}
	return new URL(packageRoot.endsWith("/") ? packageRoot : `${packageRoot}/`);
}

export function createNodeResourceReader(
	options: TextPackNodeResourceReaderOptions = {},
): TextPackResourceReader {
	const fetchReader = createFetchResourceReader(options);
	const packageRootOverride = options.packageRoot;
	return {
		async readText(context, range) {
			const rootUrl = packageRootUrl(
				packageRootOverride ?? context.descriptor.packageRoot,
			);
			const resourceUrl = new URL(context.descriptor.path, rootUrl);
			if (!resourceUrl.href.startsWith(rootUrl.href)) {
				throw new TypeError(
					`Textpack resource path ${context.descriptor.path} escapes package root ${rootUrl.href}.`,
				);
			}
			if (resourceUrl.protocol === "file:") {
				if (range !== undefined) {
					const length = range.endByte - range.startByte;
					const bytes = new Uint8Array(length);
					const handle = await open(fileURLToPath(resourceUrl), "r");
					try {
						const { bytesRead } = await handle.read(
							bytes,
							0,
							length,
							range.startByte,
						);
						if (bytesRead !== length) {
							throw new TypeError(
								`Textpack resource ${context.descriptor.path} ended inside the requested byte range.`,
							);
						}
						return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
					} finally {
						await handle.close();
					}
				}
				return readFile(fileURLToPath(resourceUrl), "utf8");
			}
			return fetchReader.readText(context, range);
		},
	};
}

function artifactFileUrl(
	path: string | URL,
	context: TextPackArtifactReadContext,
): URL {
	const url =
		path instanceof URL
			? path
			: /^[a-z][a-z\d+.-]*:/iu.test(path)
				? new URL(path)
				: pathToFileURL(resolve(path));
	if (context.artifact.expectedFiles.length === 1) return url;
	const root = new URL(url.href.endsWith("/") ? url.href : `${url.href}/`);
	const fileUrl = new URL(context.file.path, root);
	if (!fileUrl.href.startsWith(root.href)) {
		throw new TypeError(
			`Textpack artifact path ${context.file.path} escapes artifact root ${root.href}.`,
		);
	}
	return fileUrl;
}

export function createNodeArtifactReader(
	options: TextPackNodeArtifactReaderOptions = {},
): TextPackArtifactReader {
	const fetchReader = createFetchArtifactReader({
		...options,
		resolveUrl(context) {
			const configuredPath = options.paths?.[context.artifact.artifactId];
			return configuredPath === undefined
				? (options.resolveUrl?.(context) ??
						context.artifact.retrieval.uri ??
						"")
				: artifactFileUrl(configuredPath, context);
		},
	});
	return {
		async readBytes(context) {
			const configuredPath = options.paths?.[context.artifact.artifactId];
			const resolved =
				configuredPath === undefined
					? options.resolveUrl?.(context)
					: artifactFileUrl(configuredPath, context);
			if (resolved !== undefined) {
				const url = resolved instanceof URL ? resolved : new URL(resolved);
				if (url.protocol === "file:") {
					return new Uint8Array(await readFile(fileURLToPath(url)));
				}
			}
			if (configuredPath !== undefined || options.resolveUrl !== undefined) {
				return fetchReader.readBytes(context);
			}
			const retrievalUri = context.artifact.retrieval.uri;
			if (
				retrievalUri !== undefined &&
				new URL(retrievalUri).protocol === "file:"
			) {
				return new Uint8Array(
					await readFile(fileURLToPath(artifactFileUrl(retrievalUri, context))),
				);
			}
			return fetchReader.readBytes(context);
		},
	};
}
