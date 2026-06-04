import assert from "node:assert/strict";
import {
	getResource,
	listResources,
	loadPack,
} from "@ismail-elkorchi/textpack";
import * as moduleExports from "@ismail-elkorchi/textpack-en-legal";

const pack = await loadPack(moduleExports);

assert.deepEqual(
	listResources(pack, { domains: "legal" }).map((resource) => resource.id),
	moduleExports.manifest.resources.map((resource) => resource.id),
);
assert.deepEqual(
	listResources(pack, { kind: "termbase" }).map((resource) => resource.id),
	["termbase-en-legal"],
);
assert.deepEqual(
	listResources(pack, { capability: "extraction" }).map(
		(resource) => resource.id,
	),
	moduleExports.manifest.resources.map((resource) => resource.id),
);
assert.match(getResource(pack, "gazetteer-en-legal"), /Supreme Court\tORG/);
assert.match(getResource(pack, "rule-en-legal"), /^v\./m);
assert.match(getResource(pack, "corpus-en-legal-smoke"), /Section 12/);
