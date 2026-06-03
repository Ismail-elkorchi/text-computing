import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"profile-fr-historical-normalization": "fr-19c-spelling-default\n",
	"lexicon-fr-historical": "estoit\tlemma=etre\tmodern=etait\nsçavoir\tlemma=savoir\tmodern=savoir\n",
	"fst-fr-historical": "long-s->s\nobsolete-oi->ai\n",
} as const;
