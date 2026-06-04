import assert from "node:assert/strict";
import { createPack, validateManifest } from "@ismail-elkorchi/textpack";
import { manifest, resources } from "@ismail-elkorchi/textpack-en-core";

assert.throws(
	() =>
		validateManifest({
			manifestVersion: "1.0.0",
			id: "pack:old",
			packageName: "@ismail-elkorchi/textpack-old",
			version: "1.0.0",
			kind: ["language"],
			targets: { languages: ["en"] },
			engines: {},
			resources: { stopwords: ["resources/stopwords.txt"] },
			provides: { stopwords: ["old"] },
			capabilities: {},
		}),
	/manifest\.manifestVersion is not a final textpack field/,
);

assert.throws(
	() => createPack(manifest, { ...resources, "undeclared-resource": "bad" }),
	/undeclared resource/,
);

const { "corpus-en-smoke": _removed, ...missing } = resources;
assert.throws(() => createPack(manifest, missing), /missing declared resource/);
