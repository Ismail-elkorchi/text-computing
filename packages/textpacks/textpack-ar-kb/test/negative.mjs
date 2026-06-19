import assert from "node:assert/strict";
import * as mod from "../dist/index.js";

for (const exportName of [
	"loadArabic",
	"loadEnglish",
	"loadFrench",
	"createLanguageRuntime",
	"analyzeText",
]) {
	assert.equal(
		exportName in mod,
		false,
		`generated textpacks must not export ${exportName}`,
	);
}

assert.equal(typeof mod.resources, "object");
assert.equal(typeof mod.pack, "object");
assert.equal(mod.default, mod.pack);
