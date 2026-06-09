import assert from "node:assert/strict";
import { loadEnglish, manifest } from "../dist/index.js";

const resolved = await loadEnglish();

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
	resolved.manifest.components?.some(
		(component) => component.role === "required",
	),
);
