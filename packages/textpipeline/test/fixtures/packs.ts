import { createPack } from "@ismail-elkorchi/textpack";

export function demoPack() {
	return createPack(
		{
			id: "pack:demo",
			name: "Demo pipeline pack",
			version: "1.0.0",
			packageName: "@ismail-elkorchi/textpack-demo",
			kind: ["lexicon"],
			targets: { languages: ["en"] },
			engines: { textpipeline: "0.1.0" },
			resources: [
				{
					id: "lexicon:demo",
					kind: "lexicon",
					name: "Demo lexicon",
					metadata: { entries: 1 },
				},
			],
			capabilities: { terminology: "lexicon" },
		},
		{
			"lexicon:demo": { hello: ["hi"] },
		},
	);
}
