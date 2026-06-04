import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
	maxBuffer: 1024 * 1024 * 8,
});
const packs = JSON.parse(stdout);
const files = packs[0].files.map((entry) => entry.path).sort();

const required = [
	"dist/index.js",
	"dist/features/mod.js",
	"dist/vectorize/mod.js",
	"dist/classify/mod.js",
	"dist/sequence/mod.js",
	"dist/hmm/mod.js",
	"dist/crf/mod.js",
	"dist/maxent/mod.js",
	"dist/perceptron/mod.js",
	"dist/lm/mod.js",
	"dist/topic/mod.js",
	"dist/cluster/mod.js",
	"dist/tagger/mod.js",
	"dist/parser/mod.js",
	"dist/summary/mod.js",
];

for (const file of required) {
	if (!files.includes(file)) {
		throw new Error(`pack is missing required file: ${file}`);
	}
}

for (const forbiddenPath of [
	"dist-test/",
	"dist/smoke/",
	"src/",
	"test/",
	"scripts/",
	"schemas/",
	"coverage/",
]) {
	if (files.some((file) => file.startsWith(forbiddenPath))) {
		throw new Error(`pack includes forbidden path: ${forbiddenPath}`);
	}
}

for (const forbiddenName of [
	"legacy",
	"compat",
	"migration",
	"packages/textpack-",
	"@ismail-elkorchi/textrules",
	"@ismail-elkorchi/textnorm",
	"@ismail-elkorchi/textpipeline",
	"@ismail-elkorchi/textdata",
	"@ismail-elkorchi/textcorpus",
	"@ismail-elkorchi/textsearch",
	"@ismail-elkorchi/textkb",
	"@ismail-elkorchi/textquality",
	"@ismail-elkorchi/textparallel",
	"Math.random",
	"tensorflow",
	"transformer",
	"embedding",
]) {
	for (const file of files.filter(
		(entry) => entry.endsWith(".d.ts") || entry.endsWith(".js"),
	)) {
		const content = await readFile(file, "utf8");
		if (content.includes(forbiddenName)) {
			throw new Error(
				`pack artifact ${file} contains forbidden name ${forbiddenName}`,
			);
		}
	}
}
