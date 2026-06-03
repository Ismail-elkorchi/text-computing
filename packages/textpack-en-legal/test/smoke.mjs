import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { capabilities, getResource, loadPack, validateManifest } from "@ismail-elkorchi/textpack";
import * as moduleExports from "@ismail-elkorchi/textpack-en-legal";

const pack = await loadPack(moduleExports);
assert.equal(pack.manifest.id, "pack:en-legal");
assert.equal(pack.manifest.name, "English Legal Reference Pack");
assert.equal(moduleExports.default.manifest, moduleExports.manifest);
assert.equal(moduleExports.default.resources, moduleExports.resources);
assert.equal(capabilities(pack).terminology, "lexicon");
assert.match(getResource(pack, "termbase-en-legal"), /contract\tlemma=contract/);

const jsonManifest = JSON.parse(await readFile("pack.manifest.json", "utf8"));
assert.equal(validateManifest(jsonManifest).id, moduleExports.manifest.id);
assert.equal(jsonManifest.resources.length, moduleExports.manifest.resources.length);
