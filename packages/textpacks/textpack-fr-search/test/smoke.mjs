import assert from "node:assert/strict";
import { loadFrenchSearch, manifest } from "../dist/index.js";

const resolved = await loadFrenchSearch();

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
	resolved.manifest.components?.some(
		(component) => component.role === "required",
	),
);
