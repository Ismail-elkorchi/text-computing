import type { TextPackManifest } from "@ismail-elkorchi/textpack";

export const manifest: TextPackManifest = {
	id: "pack:ocr-latin19c",
	name: "Latin 19c OCR Reference Pack",
	version: "0.1.0",
	packageName: "@ismail-elkorchi/textpack-ocr-latin19c",
	kind: ["normalization-profile", "quality-profile", "fst"],
	targets: { scripts: ["Latn"], periods: ["19c"], modalities: ["ocr"] },
	engines: { "@ismail-elkorchi/textpack": "^0.1.0" },
	resources: [
		{
			id: "profile-ocr-latin19c",
			kind: "normalization-profile",
			path: "resources/profile.ocr.latin19c.txt",
			format: "lines",
		},
		{
			id: "quality-ocr-latin19c",
			kind: "quality-profile",
			path: "resources/quality.ocr.latin19c.txt",
			format: "lines",
		},
		{
			id: "fst-ocr-latin19c",
			kind: "fst",
			path: "resources/fst.ocr.latin19c.txt",
			format: "lines",
		},
	],
	capabilities: { normalization: "fst", noisyText: true },
	license: "MIT",
	citations: ["repo:packages/textpacks/textpack-ocr-latin19c/resources"],
} as const;
