import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"profile-fr-core": "fr-core-default\nfr-core-news\n",
	"abbrev-fr-core": "M.\nMme.\nDr.\nPr.\n",
	"stoplist-fr-core": "le\nla\nles\net\n",
	"lexicon-fr-core":
		"maison\tlemma=maison\tpos=NOUN\tNumber=Sing\nmaisons\tlemma=maison\tpos=NOUN\tNumber=Plur\nparle\tlemma=parler\tpos=VERB\tNumber=Sing\tPerson=3\nparlent\tlemma=parler\tpos=VERB\tNumber=Plur\tPerson=3\n",
	"gazetteer-fr-core":
		"Paris\tLOC\tid=loc-paris\tnormalized=Paris\nLyon\tLOC\tid=loc-lyon\tnormalized=Lyon\nMarie\tPER\tid=per-marie\tnormalized=Marie\n",
	"tagset-fr-ud-lite":
		"NOUN\tdescription=nominal\nVERB\tdescription=verbal\nDET\tdescription=determiner\n",
	"morph-fr-core":
		"maisons\tlemma=maison\tpos=NOUN\tNumber=Plur\nparle\tlemma=parler\tpos=VERB\tNumber=Sing\tPerson=3\nparlent\tlemma=parler\tpos=VERB\tNumber=Plur\tPerson=3\n",
	"fst-fr-core": "pluriel-s->singulier\nelision-lapostrophe->article\n",
	"grammar-fr-core": "phrase-nominale-det-nom\nphrase-simple-sujet-verbe\n",
	"corpus-fr-smoke": "Les maisons parlent.\nMarie visite Paris.\n",
} as const;
