import assert from "node:assert/strict";
import { manifest, resources } from "../dist/index.js";

const packageName = "@ismail-elkorchi/textpack-en-wordlist-esdb";
const loadedResources =
	typeof resources === "function" ? await resources() : resources;

assert.equal(manifest.packageName, packageName);
assert.equal(Object.keys(loadedResources).length, manifest.resources.length);
assert.ok(manifest.resources.length > 0);

for (const resource of manifest.resources) {
	assert.equal(typeof loadedResources[resource.id], "string");
	assert.ok(loadedResources[resource.id].length > 0);
}
