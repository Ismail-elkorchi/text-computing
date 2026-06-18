import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
	capabilities,
	getResource,
	loadPack,
	validateManifest,
} from "@ismail-elkorchi/textpack";
import * as moduleExports from "@ismail-elkorchi/textpack-en-core";

const pack = await loadPack(moduleExports);
assert.equal(pack.manifest.id, "pack:en-core");
assert.equal(pack.manifest.name, "English Core Reference Pack");
assert.equal(moduleExports.default.manifest, moduleExports.manifest);
assert.equal(moduleExports.default.resources, moduleExports.resources);
assert.equal(capabilities(pack).segmentation, "rules");
assert.match(getResource(pack, "stoplist-en-core"), /\bthe\b/);

const jsonManifest = JSON.parse(await readFile("pack.manifest.json", "utf8"));
assert.equal(validateManifest(jsonManifest).id, moduleExports.manifest.id);
assert.equal(
	jsonManifest.resources.length,
	moduleExports.manifest.resources.length,
);
