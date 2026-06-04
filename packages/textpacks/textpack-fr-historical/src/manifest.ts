import type { TextPackManifest } from "@ismail-elkorchi/textpack";

export const manifest: TextPackManifest = {
	id: "pack:fr-historical",
	name: "French Historical Reference Pack",
	version: "0.1.0",
	packageName: "@ismail-elkorchi/textpack-fr-historical",
	kind: ["normalization-profile", "lexicon", "fst"],
	targets: {
		languages: ["fr"],
		scripts: ["Latn"],
		periods: ["19c"],
		modalities: ["historical"],
	},
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [
		{
			id: "profile-fr-historical-normalization",
			kind: "normalization-profile",
			path: "resources/profile.fr.historical.txt",
			format: "lines",
		},
		{
			id: "lexicon-fr-historical",
			kind: "lexicon",
			path: "resources/lexicon.fr.historical.tsv",
			format: "tsv",
		},
		{
			id: "fst-fr-historical",
			kind: "fst",
			path: "resources/fst.fr.historical.txt",
			format: "lines",
		},
	],
	capabilities: { normalization: "lexicon", historical: true },
	license: "MIT",
	citations: ["repo:packages/textpacks/textpack-fr-historical/resources"],
} as const;
