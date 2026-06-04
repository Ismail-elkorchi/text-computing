import type { TextPackManifest } from "@ismail-elkorchi/textpack";

export const manifest: TextPackManifest = {
	id: "pack:ar-core",
	name: "Arabic Core Reference Pack",
	version: "0.1.0",
	packageName: "@ismail-elkorchi/textpack-ar-core",
	kind: ["morphology", "lexicon", "segmentation-profile"],
	targets: { languages: ["ar"], scripts: ["Arab"], modalities: ["typed"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [
		{
			id: "morph-ar-root-demo",
			kind: "morphology",
			path: "resources/morph.ar.root.tsv",
			format: "tsv",
		},
		{
			id: "lexicon-ar-demo",
			kind: "lexicon",
			path: "resources/lexicon.ar.demo.tsv",
			format: "tsv",
		},
		{
			id: "profile-ar-core",
			kind: "segmentation-profile",
			path: "resources/profile.ar.core.txt",
			format: "lines",
		},
	],
	capabilities: { segmentation: "profile", morphology: "rules" },
	license: "MIT",
	citations: ["repo:packages/textpacks/textpack-ar-core/resources"],
} as const;
