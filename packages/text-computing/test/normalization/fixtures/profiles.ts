import { buildNormalizationProfile } from "@ismail-elkorchi/text-computing/normalization/normalize";

export const historicalProfile = buildNormalizationProfile({
	id: "profile:historical",
	languages: ["en"],
	scripts: ["Latn"],
	periods: ["early-modern"],
	modalities: ["historical"],
	modes: ["historical"],
	editorialConvention: "search",
	targetViewKind: "historical-normalized",
});
