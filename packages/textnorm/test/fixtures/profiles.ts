import { buildNormalizationProfile } from "../../dist/normalize/mod.js";

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
