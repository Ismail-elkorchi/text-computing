import {
	buildAffixTable,
	buildLexicon,
	lookup,
	lookupAffixes,
} from "../../dist/index.js";

const lexicon = buildLexicon([{ id: "browser", forms: ["browser"] }]);
if (lookup(lexicon, "browser")[0]?.entryId !== "browser") {
	throw new Error("browser lookup failed");
}

const affixes = buildAffixTable([{ id: "pre", kind: "prefix", form: "pre" }]);
if (lookupAffixes(affixes, "preview")[0]?.entry.id !== "pre") {
	throw new Error("browser affix lookup failed");
}
