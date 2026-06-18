import type { PackResourceMap } from "@ismail-elkorchi/textpack";

export const resources: PackResourceMap = {
	"profile-ocr-latin19c": "latin-19c-ocr-default\n",
	"quality-ocr-latin19c": "confusable:l/1\nconfusable:O/0\n",
	"fst-ocr-latin19c": "rn->m\ncl->d\n",
} as const;
