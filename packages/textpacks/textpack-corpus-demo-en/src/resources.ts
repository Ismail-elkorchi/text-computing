import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"corpus-demo-en-lines":
		"doc1\tAlice audits Acme Corp.\ndoc2\tBob indexes corpus records.\n",
	"dataset-demo-en-metadata": "doc1\tdomain=demo\ndoc2\tdomain=demo\n",
} as const;
