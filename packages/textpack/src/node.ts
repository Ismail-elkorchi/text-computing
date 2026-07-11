import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
	createFetchResourceReader,
	type TextPackFetchResourceReaderOptions,
	type TextPackResourceReader,
} from "./materialize.js";

export type TextPackNodeResourceReaderOptions =
	TextPackFetchResourceReaderOptions;

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
		async readText(context) {
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
				return readFile(fileURLToPath(resourceUrl), "utf8");
			}
			return fetchReader.readText(context);
		},
	};
}
