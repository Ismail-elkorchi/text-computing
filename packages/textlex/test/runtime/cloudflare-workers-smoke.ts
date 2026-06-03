import {
	buildPronunciationLexicon,
	lookupPronunciations,
} from "../../dist/index.js";

const pronunciations = buildPronunciationLexicon([
	{
		id: "workers",
		form: "workers",
		pronunciations: ["wɜːrkərz"],
		notation: "ipa",
	},
]);

if (lookupPronunciations(pronunciations, "workers")[0]?.notation !== "ipa") {
	throw new Error("workers pronunciation lookup failed");
}
