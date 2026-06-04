import assert from "node:assert/strict";
import { createPack, validateManifest } from "@ismail-elkorchi/textpack";
import { manifest, resources } from "@ismail-elkorchi/textpack-en-legal";

assert.throws(
	() =>
		validateManifest({
			manifestVersion: "1.0.0",
			id: "pack:old",
			packageName: "@ismail-elkorchi/textpack-old",
			version: "1.0.0",
			kind: ["domain"],
			targets: { languages: ["en"], domains: ["legal"] },
			engines: {},
			resources: { lexicons: ["resources/lexicon.tsv"] },
			provides: { lexicons: ["old"] },
			capabilities: {},
		}),
	/manifest\.manifestVersion is not a final textpack field/,
);

assert.throws(
	() => createPack(manifest, { ...resources, "undeclared-resource": "bad" }),
	/undeclared resource/,
);

const { "corpus-en-legal-smoke": _removed, ...missing } = resources;
assert.throws(() => createPack(manifest, missing), /missing declared resource/);
