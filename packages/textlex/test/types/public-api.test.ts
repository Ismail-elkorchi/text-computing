import assert from "node:assert/strict";
import type {
	AffixEntry,
	GazetteerEntry,
	LexicalEntry,
	PronunciationEntry,
	TextPackLike,
	TokenValue,
} from "../../dist/index.js";
import { buildLexicon } from "../../dist/index.js";

const entry: LexicalEntry = {
	id: "typed",
	forms: ["typed"],
	aliases: ["typed alias"],
};
const gazetteer: GazetteerEntry = {
	id: "entity",
	forms: ["Entity"],
	entityType: "THING",
};
const token: TokenValue = { text: "typed" };
const affix: AffixEntry = { id: "s", form: "s", kind: "suffix" };
const pronunciation: PronunciationEntry = {
	id: "typed-pron",
	form: "typed",
	pronunciations: ["taɪpt"],
	notation: "ipa",
};
const packLikeWithLanguageRegistry: TextPackLike = {
	manifest: {
		resources: [{ id: "bcp47-language-registry", kind: "language-registry" }],
	},
	resources: {},
};

assert.equal(buildLexicon([entry, gazetteer]).entries.length, 2);
assert.equal(typeof token, "object");
assert.equal(affix.kind, "suffix");
assert.equal(pronunciation.notation, "ipa");
assert.equal(
	packLikeWithLanguageRegistry.manifest.resources[0]?.kind,
	"language-registry",
);
