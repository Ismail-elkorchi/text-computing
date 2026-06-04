import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"morph-ar-root-demo":
		"كتب\troot=ك-ت-ب\tpattern=فعل\tpos=VERB\nكتاب\troot=ك-ت-ب\tpattern=فعال\tpos=NOUN\n",
	"lexicon-ar-demo": "كتاب\tlemma=كتاب\tpos=NOUN\nكتب\tlemma=كتب\tpos=VERB\n",
	"profile-ar-core": "rtl-arabic-default\nclitic-aware-tokenization\n",
} as const;
