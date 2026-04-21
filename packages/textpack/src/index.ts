export const packageName = "@ismail-elkorchi/textpack" as const;
export const textPackManifestSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextPackManifestSchemaVersion = typeof textPackManifestSchemaVersion;

export type TextPackResourceKind =
  | "lexicon"
  | "stopwords"
  | "gazetteer"
  | "abbreviation-list";

export interface TextPackLicenseRef {
  readonly id: string;
  readonly spdx: string;
  readonly attribution?: string;
}

export interface TextPackProvenanceRecord {
  readonly id: string;
  readonly origin: string;
  readonly version?: string;
  readonly retrievedFrom?: string;
  readonly createdBy?: string;
  readonly notes?: readonly string[];
}

export interface TextPackResourceEntry {
  readonly resourceId: string;
  readonly lookupKey: string;
  readonly kind: TextPackResourceKind;
  readonly path: string;
  readonly language?: string;
  readonly profiles?: readonly string[];
  readonly overlayPrecedence: number;
  readonly licenseId: string;
  readonly provenanceId: string;
}

export interface TextPackEntrypoints {
  readonly manifest: string;
  readonly resourceRoot?: string;
}

export interface TextPackTests {
  readonly smoke: readonly string[];
  readonly lookup: readonly string[];
  readonly overlay: readonly string[];
}

export interface TextPackManifestV1 {
  readonly schemaVersion: TextPackManifestSchemaVersion;
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly resources: readonly TextPackResourceEntry[];
  readonly licenses: readonly TextPackLicenseRef[];
  readonly provenance: readonly TextPackProvenanceRecord[];
  readonly entrypoints: TextPackEntrypoints;
  readonly tests: TextPackTests;
  readonly notes?: readonly string[];
}

export interface TextPackLookupRequest {
  readonly kind: TextPackResourceKind;
  readonly language?: string;
  readonly profile?: string;
}

export interface TextPackResolvedResource {
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly resourceId: string;
  readonly lookupKey: string;
  readonly kind: TextPackResourceKind;
  readonly path: string;
  readonly language?: string;
  readonly profiles?: readonly string[];
  readonly overlayPrecedence: number;
  readonly license: TextPackLicenseRef;
  readonly provenance: TextPackProvenanceRecord;
}

export type TextPackLookupDiagnosticCode =
  | "language-mismatch"
  | "profile-mismatch"
  | "overlay-conflict";

export interface TextPackLookupDiagnostic {
  readonly code: TextPackLookupDiagnosticCode;
  readonly packId: string;
  readonly resourceId: string;
  readonly message: string;
}

export interface TextPackLookupResult {
  readonly resources: readonly TextPackResolvedResource[];
  readonly diagnostics: readonly TextPackLookupDiagnostic[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isTextPackResourceKind(value: unknown): value is TextPackResourceKind {
  return (
    value === "lexicon" ||
    value === "stopwords" ||
    value === "gazetteer" ||
    value === "abbreviation-list"
  );
}

export function normalizeTextPackLookupToken(value: string): string {
  return value.trim().toLowerCase();
}

export function isTextPackLicenseRef(value: unknown): value is TextPackLicenseRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.spdx) &&
    (value.attribution === undefined || isNonEmptyString(value.attribution))
  );
}

export function isTextPackProvenanceRecord(value: unknown): value is TextPackProvenanceRecord {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.origin) &&
    (value.version === undefined || isNonEmptyString(value.version)) &&
    (value.retrievedFrom === undefined || isNonEmptyString(value.retrievedFrom)) &&
    (value.createdBy === undefined || isNonEmptyString(value.createdBy)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextPackResourceEntry(value: unknown): value is TextPackResourceEntry {
  return (
    isRecord(value) &&
    isNonEmptyString(value.resourceId) &&
    isNonEmptyString(value.lookupKey) &&
    isTextPackResourceKind(value.kind) &&
    isNonEmptyString(value.path) &&
    (value.language === undefined || isNonEmptyString(value.language)) &&
    (value.profiles === undefined || isStringArray(value.profiles)) &&
    typeof value.overlayPrecedence === "number" &&
    Number.isInteger(value.overlayPrecedence) &&
    value.overlayPrecedence >= 0 &&
    isNonEmptyString(value.licenseId) &&
    isNonEmptyString(value.provenanceId)
  );
}

export function isTextPackEntrypoints(value: unknown): value is TextPackEntrypoints {
  return (
    isRecord(value) &&
    isNonEmptyString(value.manifest) &&
    (value.resourceRoot === undefined || isNonEmptyString(value.resourceRoot))
  );
}

export function isTextPackTests(value: unknown): value is TextPackTests {
  return (
    isRecord(value) &&
    isStringArray(value.smoke) &&
    value.smoke.length >= 1 &&
    isStringArray(value.lookup) &&
    value.lookup.length >= 1 &&
    isStringArray(value.overlay) &&
    value.overlay.length >= 1
  );
}

export function isTextPackManifestV1(value: unknown): value is TextPackManifestV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textPackManifestSchemaVersion &&
    isNonEmptyString(value.packId) &&
    isNonEmptyString(value.packageName) &&
    isNonEmptyString(value.version) &&
    Array.isArray(value.resources) &&
    value.resources.length >= 1 &&
    value.resources.every((entry) => isTextPackResourceEntry(entry)) &&
    Array.isArray(value.licenses) &&
    value.licenses.length >= 1 &&
    value.licenses.every((entry) => isTextPackLicenseRef(entry)) &&
    Array.isArray(value.provenance) &&
    value.provenance.length >= 1 &&
    value.provenance.every((entry) => isTextPackProvenanceRecord(entry)) &&
    isTextPackEntrypoints(value.entrypoints) &&
    isTextPackTests(value.tests) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

function compareTextPackResources(
  left: TextPackResolvedResource,
  right: TextPackResolvedResource,
): number {
  return (
    right.overlayPrecedence - left.overlayPrecedence ||
    left.packId.localeCompare(right.packId) ||
    left.resourceId.localeCompare(right.resourceId)
  );
}

export function resolveTextPackResources(
  manifests: readonly TextPackManifestV1[],
  request: TextPackLookupRequest,
): TextPackLookupResult {
  const diagnostics: TextPackLookupDiagnostic[] = [];
  const resources: TextPackResolvedResource[] = [];
  const requestLanguage =
    request.language === undefined ? undefined : normalizeTextPackLookupToken(request.language);
  const requestProfile =
    request.profile === undefined ? undefined : normalizeTextPackLookupToken(request.profile);

  for (const manifest of manifests) {
    const licensesById = new Map(manifest.licenses.map((license) => [license.id, license]));
    const provenanceById = new Map(manifest.provenance.map((record) => [record.id, record]));

    for (const resource of manifest.resources) {
      if (resource.kind !== request.kind) continue;

      const resourceLanguage =
        resource.language === undefined ? undefined : normalizeTextPackLookupToken(resource.language);
      const resourceProfiles = [...(resource.profiles ?? [])]
        .map((profile) => normalizeTextPackLookupToken(profile))
        .sort();

      if (
        requestLanguage !== undefined &&
        resourceLanguage !== undefined &&
        requestLanguage !== resourceLanguage
      ) {
        diagnostics.push({
          code: "language-mismatch",
          packId: manifest.packId,
          resourceId: resource.resourceId,
          message: `Resource ${resource.resourceId} does not match requested language ${request.language}.`,
        });
        continue;
      }

      if (requestProfile !== undefined) {
        if (resourceProfiles.length > 0 && !resourceProfiles.includes(requestProfile)) {
          diagnostics.push({
            code: "profile-mismatch",
            packId: manifest.packId,
            resourceId: resource.resourceId,
            message: `Resource ${resource.resourceId} does not match requested profile ${request.profile}.`,
          });
          continue;
        }
      } else if (resourceProfiles.length > 0) {
        continue;
      }

      const license = licensesById.get(resource.licenseId);
      const provenance = provenanceById.get(resource.provenanceId);
      if (!license || !provenance) continue;

      resources.push({
        packId: manifest.packId,
        packageName: manifest.packageName,
        version: manifest.version,
        resourceId: resource.resourceId,
        lookupKey: resource.lookupKey,
        kind: resource.kind,
        path: resource.path,
        overlayPrecedence: resource.overlayPrecedence,
        license,
        provenance,
        ...(resource.language ? { language: resource.language } : {}),
        ...(resource.profiles ? { profiles: resource.profiles } : {}),
      });
    }
  }

  resources.sort(compareTextPackResources);

  for (let index = 0; index < resources.length; index += 1) {
    const left = resources[index];
    if (!left) continue;
    for (let otherIndex = index + 1; otherIndex < resources.length; otherIndex += 1) {
      const right = resources[otherIndex];
      if (!right) continue;
      if (
        normalizeTextPackLookupToken(left.lookupKey) === normalizeTextPackLookupToken(right.lookupKey) &&
        left.overlayPrecedence === right.overlayPrecedence
      ) {
        diagnostics.push({
          code: "overlay-conflict",
          packId: right.packId,
          resourceId: right.resourceId,
          message: `Resources ${left.resourceId} and ${right.resourceId} share lookup key ${left.lookupKey} at overlay precedence ${left.overlayPrecedence}.`,
        });
      }
    }
  }

  return { resources, diagnostics };
}
