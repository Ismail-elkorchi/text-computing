import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"morph-tr-demo": "evlerimizden\tlemma=ev\tpos=NOUN\tNumber=Plur\tPerson=1\tCase=Abl\nokuyorum\tlemma=oku\tpos=VERB\tTense=Pres\tPerson=1\n",
	"fst-tr-demo": "noun+plural+possessive+case->surface\nverb+tense+person->surface\n",
	"lexicon-tr-demo": "ev\tlemma=ev\tpos=NOUN\noku\tlemma=oku\tpos=VERB\n",
} as const;
