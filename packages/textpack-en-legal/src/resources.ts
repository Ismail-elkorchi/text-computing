import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"profile-en-legal": "legal-default\nlegal-citation\n",
	"rule-en-legal": "v.\nNo.\n",
	"termbase-en-legal":
		"court\tlemma=court\tpos=NOUN\tDomain=legal\ncontract\tlemma=contract\tpos=NOUN\tDomain=legal\nstatute\tlemma=statute\tpos=NOUN\tDomain=legal\n",
	"stoplist-en-legal": "hereby\nthereof\ntherein\n",
	"gazetteer-en-legal": "Supreme Court\tORG\nNew York\tGPE\n",
	"tagset-en-legal-lite":
		"NOUN\tdescription=legal-common-noun\nPROPN\tdescription=legal-proper-noun\nVERB\tdescription=legal-action-verb\n",
	"morph-en-legal":
		"courts\tlemma=court\tpos=NOUN\tNumber=Plur\tDomain=legal\ncontracts\tlemma=contract\tpos=NOUN\tNumber=Plur\tDomain=legal\n",
	"fst-en-legal": "section-symbol->section\nv.->versus\n",
	"grammar-en-legal":
		"case-caption-party-v-party\nstatutory-reference-title-section\n",
	"corpus-en-legal-smoke":
		"The Supreme Court sits in New York.\nThe contract cites Section 12.\n",
} as const;
