import assert from "node:assert/strict";
import type {
	AffixEntry,
	GazetteerEntry,
	LexicalEntry,
	PronunciationEntry,
	TokenValue,
} from "@ismail-elkorchi/text-computing/lexicon";
import { buildLexicon } from "@ismail-elkorchi/text-computing/lexicon";
import type { TextPack } from "@ismail-elkorchi/text-computing/packs";

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
const packLikeWithLanguageRegistry: TextPack = {
	manifest: {
		id: "pack:fixture",
		schemaVersion: "1" as const,
		name: "Fixture",
		version: "1",
		packageName: "@ismail-elkorchi/textpack-fixture",
		targets: { languages: ["und"] },
		capabilitySlots: [],
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
