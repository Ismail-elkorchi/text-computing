import assert from "node:assert/strict";
import { manifest, resources } from "../dist/index.js";

const packageName = "@ismail-elkorchi/textpack-wikidata-ar";

assert.equal(manifest.packageName, packageName);
assert.equal(typeof resources, "object");
assert.equal(Object.keys(resources).length, manifest.resources.length);
assert.ok(manifest.resources.length > 0);

for (const resource of manifest.resources) {
	const value = resources[resource.id];
	assert.equal(typeof value, "object");
	assert.equal(value?.kind, "file-backed-resource");
	assert.equal(value?.path, resource.path);
	assert.equal(typeof value?.checksum, "string");
	assert.equal(typeof value?.byteLength, "number");
	assert.equal(typeof value?.encoding, "string");
	assert.equal(typeof value?.lineCount, "number");
}
