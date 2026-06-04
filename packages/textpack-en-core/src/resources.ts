import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"profile-en-core": "en-core-default\nen-core-technical\n",
	"abbrev-en-core": "Dr.\nMr.\nMs.\nProf.\nSr.\nJr.\nSt.\nAve.\n",
	"stoplist-en-core":
		"a\nan\nthe\nand\nas\nat\nbe\nby\nfor\nfrom\nin\nof\non\nto\n",
	"lexicon-en-core":
		"host\tlemma=host\tpos=VERB\ncorpora\tlemma=corpus\tpos=NOUN\nanalysis\tlemma=analysis\tpos=NOUN\tNumber=Sing\nanalyses\tlemma=analysis\tpos=NOUN\tNumber=Plur\n",
	"gazetteer-en-core":
		"Acme Corp\tORG\tid=org-acme-corp\tnormalized=Acme Corp\taliases=Acme\nAlice\tPER\tid=per-alice\tnormalized=Alice\nParis\tLOC\tid=loc-paris\tnormalized=Paris\n",
	"tagset-ud-lite":
		"NOUN\tdescription=common-noun\nPROPN\tdescription=proper-noun\nVERB\tdescription=verb\n",
	"morph-en-core":
		"hosts\tlemma=host\tpos=VERB\tNumber=Sing\tPerson=3\nanalyses\tlemma=analysis\tpos=NOUN\tNumber=Plur\n",
	"fst-en-core": "plural-s->singular\npast-ed->lemma\n",
	"grammar-en-core": "sentence-basic-svo\nnoun-phrase-det-adj-noun\n",
	"corpus-en-smoke": "Alice hosts corpora.\nAlice audits Acme Corp in Paris.\n",
} as const;
