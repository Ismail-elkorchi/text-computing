import assert from "node:assert/strict";
import {
	getLanguageSupport,
	hasLanguageSupport,
	languageSupport,
	listLanguagesBySupportLevel,
	loadFoundation,
	manifest,
} from "../dist/index.js";

const resolved = await loadFoundation();

assert.equal(resolved.manifest.packageName, manifest.packageName);
assert.ok(Object.keys(resolved.resources).length > 0);
assert.ok(
	resolved.manifest.components?.some(
		(component) => component.role === "required",
	),
);

const english = getLanguageSupport("en");

assert.ok(english);
assert.ok(hasLanguageSupport("en", "registered"));
assert.ok(hasLanguageSupport("en", "unicode-covered"));
assert.ok(hasLanguageSupport("en", "profiled"));
assert.equal(hasLanguageSupport("en", "task-supported"), true);
assert.ok(listLanguagesBySupportLevel("registered").length > 1000);
assert.ok(listLanguagesBySupportLevel("task-supported").length >= 2);
assert.ok(languageSupport.length > 1000);
