import assert from "node:assert/strict";
import { manifest, resources } from "../dist/index.js";

const packageName = "@ismail-elkorchi/textpack-cldr-core";

assert.equal(manifest.packageName, packageName);
assert.equal(Object.keys(resources).length, manifest.resources.length);
assert.ok(manifest.resources.length > 0);

for (const resource of manifest.resources) {
	assert.equal(typeof resources[resource.id], "string");
	assert.ok(resources[resource.id].length > 0);
}
