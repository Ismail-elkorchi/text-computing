import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"profile-ja-segmentation": "no-space-japanese-default\n",
	"lexicon-ja-segmentation":
		"東京\tlemma=東京\tpos=PROPN\n大学\tlemma=大学\tpos=NOUN\n行く\tlemma=行く\tpos=VERB\n",
	"rules-ja-segmentation":
		"prefer-longest-dictionary-match\nkeep-katakana-runs\n",
} as const;
