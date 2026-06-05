import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("package metadata keeps final section 19 boundaries", () => {
	const pkg = JSON.parse(readFileSync("package.json", "utf8"));
	assert.deepEqual(
		Object.keys(pkg.exports).sort(),
		[
			".",
			"./annotation",
			"./corpus",
			"./document",
			"./noisy",
			"./ocr",
			"./readability",
			"./report",
			"./style",
		].sort(),
	);
	assert.deepEqual(Object.keys(pkg.dependencies).sort(), [
		"@ismail-elkorchi/textdoc",
		"@ismail-elkorchi/textfacts",
		"@ismail-elkorchi/textlex",
		"@ismail-elkorchi/textnorm",
	]);
	assert.equal(pkg.optionalDependencies, undefined);
	assert.equal(pkg.peerDependencies, undefined);
});
