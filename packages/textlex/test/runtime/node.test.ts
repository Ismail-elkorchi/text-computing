import assert from "node:assert/strict";
import { buildLexicon, lookup } from "../../dist/index.js";

const lexicon = buildLexicon([{ id: "node", forms: ["node"] }]);
assert.equal(lookup(lexicon, "node")[0]?.entryId, "node");
