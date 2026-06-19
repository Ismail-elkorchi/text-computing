import assert from "node:assert/strict";
import pack, { manifest, resources } from "../dist/index.js";

const packageName = "@ismail-elkorchi/textpack-fr-syntax-sa";

assert.equal(manifest.packageName, packageName);
assert.equal(pack.manifest.packageName, packageName);
assert.equal(pack, (await import("../dist/index.js")).pack);
assert.equal(typeof resources, "object");
assert.equal(Object.keys(resources).length, manifest.resources.length);
assert.ok(pack.manifest.resources.length >= manifest.resources.length);
assert.ok(Object.keys(pack.resources).length >= Object.keys(resources).length);

for (const resource of manifest.resources) {
	assert.ok(resource.id in resources);
	assert.ok(resource.id in pack.resources);
}

const requiredComponents =
	manifest.components?.filter((component) => component.role === "required") ??
	[];
assert.equal(requiredComponents.length, 1);
