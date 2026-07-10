import assert from "node:assert/strict";
import pack, { manifest, resources } from "../dist/index.js";

const packageName = "@ismail-elkorchi/textpack-en";

assert.equal(manifest.packageName, packageName);
assert.equal(typeof resources, "object");
assert.equal(Object.keys(resources).length, manifest.resources.length);
assert.ok(manifest.resources.length > 0);
assert.deepEqual(pack.manifest, manifest);
assert.deepEqual(pack.resources, resources);

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
