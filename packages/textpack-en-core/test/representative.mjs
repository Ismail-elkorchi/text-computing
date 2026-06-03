import assert from "node:assert/strict";
import { getResource, listResources, loadPack } from "@ismail-elkorchi/textpack";
import * as moduleExports from "@ismail-elkorchi/textpack-en-core";

const pack = await loadPack(moduleExports);

assert.deepEqual(
	listResources(pack, { languages: "en" }).map((resource) => resource.id),
	moduleExports.manifest.resources.map((resource) => resource.id),
);
assert.deepEqual(
	listResources(pack, { kind: "stoplist" }).map((resource) => resource.id),
	["stoplist-en-core"],
);
assert.deepEqual(
	listResources(pack, { kind: "morphology" }).map((resource) => resource.id),
	["morph-en-core"],
);
assert.match(getResource(pack, "lexicon-en-core"), /analyses\tlemma=analysis/);
assert.match(getResource(pack, "gazetteer-en-core"), /Acme Corp\tORG/);
assert.match(getResource(pack, "corpus-en-smoke"), /Acme Corp in Paris/);
