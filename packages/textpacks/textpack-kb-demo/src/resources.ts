import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"kb-demo-entities":
		"Q1\tlabel=Acme Corp\ttype=Organization\nQ2\tlabel=Paris\ttype=Place\n",
	"ontology-demo-relations":
		"Organization\tlocatedIn\tPlace\nPlace\tpartOf\tPlace\n",
	"lexicon-demo-aliases": "Acme\tkb=Q1\nParis\tkb=Q2\n",
} as const;
