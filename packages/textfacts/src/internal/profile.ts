import { TextfactsError } from "./error.ts";

export type TextfactsProfileId = "unicode-17.0.0-default";

export interface TextfactsTailoringPolicy {
  segmentation: "uax29-default";
  lineBreak: "uax14-default";
  normalization: "uax15-default";
  collation: "ducet-default";
  idna: "uts46-default";
  security: "uts39-default";
}

export interface TextfactsResolvedProfile {
  id: TextfactsProfileId;
  unicodeVersion: "17.0.0";
  algorithmRevision: "Unicode 17.0.0";
  tailoring: TextfactsTailoringPolicy;
}

export type TextfactsProfileInput = TextfactsProfileId | Partial<TextfactsResolvedProfile>;

export const DEFAULT_TEXTFACTS_PROFILE: TextfactsResolvedProfile = {
  id: "unicode-17.0.0-default",
  unicodeVersion: "17.0.0",
  algorithmRevision: "Unicode 17.0.0",
  tailoring: {
    segmentation: "uax29-default",
    lineBreak: "uax14-default",
    normalization: "uax15-default",
    collation: "ducet-default",
    idna: "uts46-default",
    security: "uts39-default",
  },
};

function isDefaultTailoring(tailoring: unknown): boolean {
  if (tailoring === undefined) return true;
  if (typeof tailoring !== "object" || tailoring === null) return false;
  const value = tailoring as Partial<TextfactsTailoringPolicy>;
  return (
    (value.segmentation === undefined || value.segmentation === "uax29-default") &&
    (value.lineBreak === undefined || value.lineBreak === "uax14-default") &&
    (value.normalization === undefined || value.normalization === "uax15-default") &&
    (value.collation === undefined || value.collation === "ducet-default") &&
    (value.idna === undefined || value.idna === "uts46-default") &&
    (value.security === undefined || value.security === "uts39-default")
  );
}

export function resolveTextfactsProfile(profile?: TextfactsProfileInput): TextfactsResolvedProfile {
  if (profile === undefined || profile === "unicode-17.0.0-default") {
    return DEFAULT_TEXTFACTS_PROFILE;
  }
  if (typeof profile !== "object" || profile === null) {
    throw new TextfactsError("PROFILE_UNSUPPORTED", "Unsupported textfacts profile", { profile });
  }
  if (
    (profile.id === undefined || profile.id === DEFAULT_TEXTFACTS_PROFILE.id) &&
    (profile.unicodeVersion === undefined ||
      profile.unicodeVersion === DEFAULT_TEXTFACTS_PROFILE.unicodeVersion) &&
    (profile.algorithmRevision === undefined ||
      profile.algorithmRevision === DEFAULT_TEXTFACTS_PROFILE.algorithmRevision) &&
    isDefaultTailoring(profile.tailoring)
  ) {
    return DEFAULT_TEXTFACTS_PROFILE;
  }
  throw new TextfactsError("PROFILE_UNSUPPORTED", "Unsupported textfacts profile or tailoring", {
    profile,
  });
}

export function assertProfileAlgorithmRevision(
  explicitRevision: string | undefined,
  profile: TextfactsResolvedProfile,
): string {
  if (explicitRevision === undefined) return profile.algorithmRevision;
  if (explicitRevision !== profile.algorithmRevision) {
    throw new TextfactsError(
      "PROFILE_REVISION_MISMATCH",
      "Explicit algorithmRevision does not match the selected textfacts profile",
      { algorithmRevision: explicitRevision, profileId: profile.id },
    );
  }
  return explicitRevision;
}
