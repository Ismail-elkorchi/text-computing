import { createPack } from "@ismail-elkorchi/textpack";

export function demoPack() {
	return createPack(
		{
			schemaVersion: "1",
			id: "pack:demo",
			name: "Demo pipeline pack",
			version: "1.0.0",
			packageName: "@ismail-elkorchi/textpack-demo",
			targets: { languages: ["en"], modalities: ["typed"] },
			engines: { "@ismail-elkorchi/textpipeline": "0.1.0" },
			resources: [
				{
					id: "lexicon:demo",
					kind: "lexicon",
					name: "Demo lexicon",
					metadata: { entries: 1 },
				},
			],
			capabilitySlots: [
				{
					slot: "lexicon",
					status: "task-supported",
					tier: "lookup",
					resourceIds: ["lexicon:demo"],
					capabilities: { terminology: "lexicon" },
				},
			],
			license: "MIT",
		},
		{
			"lexicon:demo": { hello: ["hi"] },
		},
	);
}
