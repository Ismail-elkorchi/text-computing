import assert from "node:assert/strict";
import { getResource, listResources, loadPack } from "@ismail-elkorchi/textpack";
import * as moduleExports from "@ismail-elkorchi/textpack-fr-core";

const pack = await loadPack(moduleExports);

assert.deepEqual(
	listResources(pack, { languages: "fr" }).map((resource) => resource.id),
	moduleExports.manifest.resources.map((resource) => resource.id),
);
assert.deepEqual(
	listResources(pack, { kind: "morphology" }).map((resource) => resource.id),
	["morph-fr-core"],
);
assert.deepEqual(
	listResources(pack, { kind: "fst" }).map((resource) => resource.id),
	["fst-fr-core"],
);
assert.match(getResource(pack, "lexicon-fr-core"), /parlent\tlemma=parler/);
assert.match(getResource(pack, "gazetteer-fr-core"), /Paris\tLOC/);
assert.match(getResource(pack, "corpus-fr-smoke"), /maisons parlent/);
