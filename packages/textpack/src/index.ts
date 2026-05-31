export const packageName = "@ismail-elkorchi/textpack" as const;
export const textPackManifestVersion = "1.0.0" as const;
export const textPackCatalogSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextPackManifestVersion = typeof textPackManifestVersion;
export type TextPackCatalogSchemaVersion = typeof textPackCatalogSchemaVersion;

export const textPackKinds = [
  "profile",
  "language",
  "morph",
  "domain",
  "historical",
  "structure",
  "composite",
] as const;

export const textPackResourceFamilies = [
  "profiles",
  "rules",
  "lexicons",
  "stopwords",
  "gazetteers",
  "tagsets",
  "morphology",
  "transducers",
  "structures",
  "benchmarks",
] as const;

export const textPackReviewStates = [
  "experimental",
  "candidate",
  "stable",
  "reference",
  "deprecated",
] as const;

export type TextPackKind = (typeof textPackKinds)[number];
export type TextPackResourceFamily = (typeof textPackResourceFamilies)[number];
export type TextPackReviewState = (typeof textPackReviewStates)[number];

export type TextPackResourceKind =
  | "profile"
  | "rule"
  | "lexicon"
  | "stopwords"
  | "gazetteer"
  | "tagset"
  | "morphology"
  | "transducer"
  | "structure"
  | "benchmark";

export interface TextPackTargets {
  readonly languages?: readonly string[];
  readonly scripts?: readonly string[];
  readonly regions?: readonly string[];
  readonly periods?: readonly string[];
  readonly domains?: readonly string[];
  readonly genres?: readonly string[];
  readonly profiles?: readonly string[];
}

export interface TextPackEntrypoints {
  readonly manifest: string;
  readonly load?: string;
}

export interface TextPackTests {
  readonly smoke: readonly string[];
  readonly negative: readonly string[];
  readonly representative: readonly string[];
}

export interface TextPackLicenses {
  readonly code: readonly string[];
  readonly data: readonly string[];
  readonly notices?: readonly string[];
}

export interface TextPackProvenance {
  readonly sources: readonly string[];
  readonly generated: boolean;
  readonly createdBy?: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextPackComposition {
  readonly overlayPrecedence?: number;
  readonly exclusiveWith?: readonly string[];
}

export type TextPackResourceFamilyMap = Partial<Record<TextPackResourceFamily, readonly string[]>>;
export type TextPackCapabilityMap = Partial<Record<TextPackResourceFamily, boolean | string>>;

export interface TextPackManifestV1 {
  readonly manifestVersion: TextPackManifestVersion;
  readonly id: string;
  readonly packageName: string;
  readonly version: string;
  readonly kind: readonly TextPackKind[];
  readonly targets: TextPackTargets;
  readonly engines: Readonly<Record<string, string>>;
  readonly externalData: Readonly<Record<string, string>>;
  readonly capabilities: TextPackCapabilityMap;
  readonly resources: TextPackResourceFamilyMap;
  readonly provides: TextPackResourceFamilyMap;
  readonly entrypoints: TextPackEntrypoints;
  readonly licenses: TextPackLicenses;
  readonly provenance: TextPackProvenance;
  readonly tests: TextPackTests;
  readonly reviewState: TextPackReviewState;
  readonly composition?: TextPackComposition;
  readonly limitations?: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextPackLicenseRef {
  readonly id: string;
  readonly spdx: string;
  readonly notices?: readonly string[];
}

export interface TextPackProvenanceRecord {
  readonly id: string;
  readonly sources: readonly string[];
  readonly generated: boolean;
  readonly createdBy?: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextPackResolvedResource {
  readonly packId: string;
  readonly packageName: string;
  readonly version: string;
  readonly resourceId: string;
  readonly lookupKey: string;
  readonly kind: TextPackResourceKind;
  readonly family: TextPackResourceFamily;
  readonly path: string;
  readonly language?: string;
  readonly profiles?: readonly string[];
  readonly overlayPrecedence: number;
  readonly license: TextPackLicenseRef;
  readonly provenance: TextPackProvenanceRecord;
  readonly licenseId: string;
  readonly provenanceId: string;
  readonly reviewState: TextPackReviewState;
}

export interface TextPackLookupRequest {
  readonly kind?: TextPackResourceKind;
  readonly family?: TextPackResourceFamily;
  readonly language?: string;
  readonly profile?: string;
  readonly canonicalizer?: TextPackCanonicalizer;
}

export interface TextPackRegistryQuery extends TextPackLookupRequest {
  readonly packId?: string;
  readonly resourceId?: string;
  readonly lookupKey?: string;
}

export type TextPackLookupDiagnosticCode =
  | "language-mismatch"
  | "profile-mismatch"
  | "overlay-conflict"
  | "family-kind-mismatch";

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

export interface TextPackResourceRegistry {
  readonly manifests: readonly TextPackManifestV1[];
  readonly resources: readonly TextPackResolvedResource[];
  readonly kinds: readonly TextPackResourceKind[];
  readonly families: readonly TextPackResourceFamily[];
  readonly languages: readonly string[];
  readonly profiles: readonly string[];
  readonly reviewStates: readonly TextPackReviewState[];
}

export interface TextPackCatalogPackSummaryV1 {
  readonly id: string;
  readonly packageName: string;
  readonly version: string;
  readonly reviewState: TextPackReviewState;
  readonly languages: readonly string[];
  readonly profiles: readonly string[];
  readonly resourceCount: number;
  readonly resourceFamilies: readonly TextPackResourceFamily[];
  readonly resourceIds: readonly string[];
  readonly licenses: TextPackLicenses;
  readonly provenance: TextPackProvenance;
  readonly tests: TextPackTests;
  readonly limitations?: readonly string[];
}

export interface TextPackCatalogFamilySummaryV1 {
  readonly family: TextPackResourceFamily;
  readonly resourceCount: number;
  readonly resourceIds: readonly string[];
}

export interface TextPackCatalogV1 {
  readonly schemaVersion: TextPackCatalogSchemaVersion;
  readonly packageName: PackageName;
  readonly packCount: number;
  readonly resourceCount: number;
  readonly languages: readonly string[];
  readonly profiles: readonly string[];
  readonly reviewStates: readonly TextPackReviewState[];
  readonly packs: readonly TextPackCatalogPackSummaryV1[];
  readonly resourcesByFamily: readonly TextPackCatalogFamilySummaryV1[];
}

export interface TextPackCanonicalizer {
  readonly id: string;
  canonicalize(value: string): string;
}

export interface TextPackCanonicalizationMetadata {
  readonly canonicalizerId: string;
  readonly originalValue: string;
  readonly canonicalValue: string;
}

export interface TextPackResourceParseOptions {
  readonly canonicalizer?: TextPackCanonicalizer;
}

export interface TextPackEntryLookupOptions {
  readonly canonicalizer?: TextPackCanonicalizer;
}

export interface TextPackEntryLookupCanonicalizationMetadata {
  readonly canonicalizerId: string;
  readonly query: TextPackCanonicalizationMetadata;
  readonly entry: TextPackCanonicalizationMetadata;
}

export type TextPackResourceLoadDiagnosticCode =
  | "resource-content-missing"
  | "malformed-resource-row"
  | "duplicate-resource-entry";

export interface TextPackResourceLoadDiagnostic {
  readonly code: TextPackResourceLoadDiagnosticCode;
  readonly packId: string;
  readonly resourceId: string;
  readonly path: string;
  readonly line?: number;
  readonly message: string;
}

export interface TextPackLoadedEntry {
  readonly value: string;
  readonly lookupToken: string;
  readonly line: number;
  readonly attributes: Readonly<Record<string, string>>;
  readonly canonicalization?: TextPackCanonicalizationMetadata;
  readonly label?: string;
}

export interface TextPackLoadedResource {
  readonly resource: TextPackResolvedResource;
  readonly entries: readonly TextPackLoadedEntry[];
}

export type TextPackResourceContentSource = ReadonlyMap<string, string> | Readonly<Record<string, string>>;

export interface TextPackLoadResult {
  readonly resources: readonly TextPackLoadedResource[];
  readonly diagnostics: readonly (
    | TextPackLookupDiagnostic
    | TextPackResourceLoadDiagnostic
    | TextPackManifestGovernanceDiagnostic
  )[];
}

export interface TextPackEntryLookupMatch {
  readonly resource: TextPackResolvedResource;
  readonly entry: TextPackLoadedEntry;
  readonly canonicalization?: TextPackEntryLookupCanonicalizationMetadata;
}

export type TextPackManifestGovernanceDiagnosticCode =
  | "invalid-manifest-shape"
  | "duplicate-provides-id"
  | "duplicate-resource-path"
  | "resource-provides-length-mismatch"
  | "unsupported-resource-family"
  | "resource-family-without-capability"
  | "capability-without-resource"
  | "missing-license"
  | "missing-provenance"
  | "missing-target-scope"
  | "missing-test-ref"
  | "unsafe-resource-path"
  | "unsafe-entrypoint-path"
  | "unsafe-test-ref"
  | "overlay-conflict"
  | "deprecated-review-state";

export interface TextPackManifestGovernanceDiagnostic {
  readonly code: TextPackManifestGovernanceDiagnosticCode;
  readonly packId?: string;
  readonly resourceId?: string;
  readonly ref?: string;
  readonly message: string;
}

export interface TextPackManifestGovernanceResult {
  readonly ok: boolean;
  readonly diagnostics: readonly TextPackManifestGovernanceDiagnostic[];
}

export type TextPackCompatibilityDiagnosticCode =
  | "engine-version-missing"
  | "engine-version-incompatible"
  | "profile-missing"
  | "mandatory-resource-missing"
  | "review-state-too-low"
  | "exclusive-overlay-conflict";

export interface TextPackCompatibilityPolicy {
  readonly packageVersions?: Readonly<Record<string, string>>;
  readonly requiredProfiles?: readonly string[];
  readonly mandatoryResources?: readonly string[];
  readonly minimumReviewState?: Exclude<TextPackReviewState, "deprecated">;
  readonly activePackIds?: readonly string[];
}

export interface TextPackCompatibilityDiagnostic {
  readonly code: TextPackCompatibilityDiagnosticCode;
  readonly packId: string;
  readonly ref?: string;
  readonly message: string;
}

export interface TextPackCompatibilityResult {
  readonly ok: boolean;
  readonly diagnostics: readonly TextPackCompatibilityDiagnostic[];
}

export interface TextPackCompositionInput {
  readonly manifest: TextPackManifestV1;
  readonly precedence?: number;
}

export interface TextPackManifestDraftOptions {
  readonly id: string;
  readonly packageName: string;
  readonly version: string;
  readonly kind: readonly TextPackKind[];
  readonly targets: TextPackTargets;
  readonly resources: TextPackResourceFamilyMap;
  readonly provides: TextPackResourceFamilyMap;
  readonly licenses: TextPackLicenses;
  readonly provenance: TextPackProvenance;
  readonly tests: TextPackTests;
  readonly engines?: Readonly<Record<string, string>>;
  readonly externalData?: Readonly<Record<string, string>>;
  readonly capabilities?: TextPackCapabilityMap;
  readonly entrypoints?: Partial<TextPackEntrypoints>;
  readonly reviewState?: Exclude<TextPackReviewState, "deprecated">;
  readonly composition?: TextPackComposition;
  readonly limitations?: readonly string[];
  readonly notes?: readonly string[];
}

export interface TextPackManifestResourceInput {
  readonly family: TextPackResourceFamily;
  readonly resourcePath: string;
  readonly resourceId: string;
}

export interface TextPackManifestResourceUpdateOptions {
  readonly family?: TextPackResourceFamily;
  readonly resourcePath?: string;
  readonly resourceId?: string;
}

export interface TextPackManifestUpdateOptions {
  readonly version?: string;
  readonly targets?: TextPackTargets;
  readonly resources?: TextPackResourceFamilyMap;
  readonly provides?: TextPackResourceFamilyMap;
  readonly capabilities?: TextPackCapabilityMap;
  readonly reviewState?: Exclude<TextPackReviewState, "deprecated">;
  readonly composition?: TextPackComposition;
  readonly limitations?: readonly string[];
  readonly notes?: readonly string[];
  readonly provenanceNotes?: readonly string[];
}

export type TextPackFileSystemReadText = (path: string) => string | Promise<string>;
export type TextPackFileSystemResolvePath = (root: string, resourcePath: string) => string;

export interface TextPackFileSystemLoadOptions extends TextPackResourceParseOptions {
  readonly manifest: TextPackManifestV1;
  readonly root: string;
  readonly request?: TextPackLookupRequest;
  readonly readText: TextPackFileSystemReadText;
  readonly resolvePath?: TextPackFileSystemResolvePath;
}

const resourceKindByFamily: Readonly<Record<TextPackResourceFamily, TextPackResourceKind>> = {
  profiles: "profile",
  rules: "rule",
  lexicons: "lexicon",
  stopwords: "stopwords",
  gazetteers: "gazetteer",
  tagsets: "tagset",
  morphology: "morphology",
  transducers: "transducer",
  structures: "structure",
  benchmarks: "benchmark",
};

const reviewStateRank: Readonly<Record<TextPackReviewState, number>> = {
  experimental: 0,
  candidate: 1,
  stable: 2,
  reference: 3,
  deprecated: -1,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isPossiblyEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

function isBooleanOrString(value: unknown): value is boolean | string {
  return typeof value === "boolean" || isNonEmptyString(value);
}

function isTextPackKind(value: unknown): value is TextPackKind {
  return textPackKinds.includes(value as TextPackKind);
}

function isTextPackReviewState(value: unknown): value is TextPackReviewState {
  return textPackReviewStates.includes(value as TextPackReviewState);
}

function isTextPackResourceFamily(value: unknown): value is TextPackResourceFamily {
  return textPackResourceFamilies.includes(value as TextPackResourceFamily);
}

function isTextPackResourceKind(value: unknown): value is TextPackResourceKind {
  return Object.values(resourceKindByFamily).includes(value as TextPackResourceKind);
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every((entry) => isNonEmptyString(entry));
}

function isCapabilityMap(value: unknown): value is TextPackCapabilityMap {
  return isRecord(value) && Object.values(value).every((entry) => isBooleanOrString(entry));
}

function isResourceFamilyMap(value: unknown): value is TextPackResourceFamilyMap {
  return isRecord(value) && Object.entries(value).every(([key, entries]) => isTextPackResourceFamily(key) && isStringArray(entries));
}

function isTextPackResourceFamilyArray(value: unknown): value is readonly TextPackResourceFamily[] {
  return Array.isArray(value) && value.every((entry) => isTextPackResourceFamily(entry));
}

function hasAnyTargetScope(targets: TextPackTargets): boolean {
  return Object.values(targets).some((value) => Array.isArray(value) && value.length > 0);
}

function isTextPackTargets(value: unknown): value is TextPackTargets {
  if (!isRecord(value)) return false;
  const allowed = new Set(["languages", "scripts", "regions", "periods", "domains", "genres", "profiles"]);
  return Object.entries(value).every(([key, entries]) => allowed.has(key) && isStringArray(entries)) && hasAnyTargetScope(value);
}

export function isTextPackEntrypoints(value: unknown): value is TextPackEntrypoints {
  return (
    isRecord(value) &&
    isNonEmptyString(value.manifest) &&
    (value.load === undefined || isNonEmptyString(value.load))
  );
}

export function isTextPackTests(value: unknown): value is TextPackTests {
  return (
    isRecord(value) &&
    isStringArray(value.smoke) &&
    value.smoke.length >= 1 &&
    isStringArray(value.negative) &&
    value.negative.length >= 1 &&
    isStringArray(value.representative) &&
    value.representative.length >= 1
  );
}

export function isTextPackLicenses(value: unknown): value is TextPackLicenses {
  return (
    isRecord(value) &&
    isStringArray(value.code) &&
    value.code.length >= 1 &&
    isStringArray(value.data) &&
    value.data.length >= 1 &&
    (value.notices === undefined || isStringArray(value.notices))
  );
}

export function isTextPackProvenance(value: unknown): value is TextPackProvenance {
  return (
    isRecord(value) &&
    isStringArray(value.sources) &&
    value.sources.length >= 1 &&
    typeof value.generated === "boolean" &&
    (value.createdBy === undefined || isStringArray(value.createdBy)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function isTextPackComposition(value: unknown): value is TextPackComposition {
  return (
    value === undefined ||
    (isRecord(value) &&
      (value.overlayPrecedence === undefined ||
        (typeof value.overlayPrecedence === "number" &&
          Number.isInteger(value.overlayPrecedence) &&
          value.overlayPrecedence >= 0)) &&
      (value.exclusiveWith === undefined || isStringArray(value.exclusiveWith)))
  );
}

export function isTextPackManifestV1(value: unknown): value is TextPackManifestV1 {
  return (
    isRecord(value) &&
    value.manifestVersion === textPackManifestVersion &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.packageName) &&
    isNonEmptyString(value.version) &&
    Array.isArray(value.kind) &&
    value.kind.length >= 1 &&
    value.kind.every((entry) => isTextPackKind(entry)) &&
    isTextPackTargets(value.targets) &&
    isStringRecord(value.engines) &&
    isStringRecord(value.externalData) &&
    isCapabilityMap(value.capabilities) &&
    isResourceFamilyMap(value.resources) &&
    isResourceFamilyMap(value.provides) &&
    isTextPackEntrypoints(value.entrypoints) &&
    isTextPackLicenses(value.licenses) &&
    isTextPackProvenance(value.provenance) &&
    isTextPackTests(value.tests) &&
    isTextPackReviewState(value.reviewState) &&
    isTextPackComposition(value.composition) &&
    (value.limitations === undefined || isStringArray(value.limitations)) &&
    (value.notes === undefined || isStringArray(value.notes))
  );
}

export function normalizeTextPackLookupToken(value: string): string {
  return value.trim().toLowerCase();
}

export const textPackDemoTrimLowercaseCanonicalizer: TextPackCanonicalizer = {
  id: "textpack.demo.trim-lowercase",
  canonicalize: normalizeTextPackLookupToken,
};

function canonicalizeTextPackValue(
  value: string,
  canonicalizer: TextPackCanonicalizer,
): TextPackCanonicalizationMetadata {
  if (!isNonEmptyString(canonicalizer.id)) {
    throw new TypeError("Textpack canonicalizer id must be a non-empty string.");
  }

  const canonicalValue = canonicalizer.canonicalize(value);
  if (typeof canonicalValue !== "string") {
    throw new TypeError(`Textpack canonicalizer ${canonicalizer.id} must return a string.`);
  }

  return {
    canonicalizerId: canonicalizer.id,
    originalValue: value,
    canonicalValue,
  };
}

function comparableTextPackValue(value: string, canonicalizer?: TextPackCanonicalizer): string {
  return canonicalizer ? canonicalizeTextPackValue(value, canonicalizer).canonicalValue : value;
}

function textPackContentForPath(source: TextPackResourceContentSource, resourcePath: string): string | undefined {
  const maybeMap = source as ReadonlyMap<string, string>;
  if (typeof maybeMap.get === "function") return maybeMap.get(resourcePath);
  return (source as Readonly<Record<string, string | undefined>>)[resourcePath];
}

function splitTextPackResourceLines(content: string): readonly string[] {
  return content.split(/\r\n|\n|\r/u);
}

function parseTextPackAttributes(
  cells: readonly string[],
  resource: TextPackResolvedResource,
  line: number,
  diagnostics: TextPackResourceLoadDiagnostic[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const cell of cells) {
    const separator = cell.indexOf("=");
    if (separator <= 0 || separator === cell.length - 1) {
      diagnostics.push({
        code: "malformed-resource-row",
        packId: resource.packId,
        resourceId: resource.resourceId,
        path: resource.path,
        line,
        message: `Resource ${resource.resourceId} contains a malformed attribute at line ${line}.`,
      });
      continue;
    }
    const key = cell.slice(0, separator).trim();
    const value = cell.slice(separator + 1).trim();
    if (key.length === 0 || value.length === 0) {
      diagnostics.push({
        code: "malformed-resource-row",
        packId: resource.packId,
        resourceId: resource.resourceId,
        path: resource.path,
        line,
        message: `Resource ${resource.resourceId} contains an empty attribute at line ${line}.`,
      });
      continue;
    }
    attributes[key] = value;
  }
  return attributes;
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

function sortedUniqueTextPackValues(values: Iterable<string | undefined>): readonly string[] {
  return [...new Set([...values].filter(isNonEmptyString))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizedTextPackStringArray(values: readonly string[] | undefined): readonly string[] | undefined {
  if (values === undefined) return undefined;
  return sortedUniqueTextPackValues(values);
}

function normalizedTextPackTargets(targets: TextPackTargets): TextPackTargets {
  const normalized: Partial<Record<keyof TextPackTargets, readonly string[]>> = {};
  const entries = [
    ["languages", normalizedTextPackStringArray(targets.languages)],
    ["scripts", normalizedTextPackStringArray(targets.scripts)],
    ["regions", normalizedTextPackStringArray(targets.regions)],
    ["periods", normalizedTextPackStringArray(targets.periods)],
    ["domains", normalizedTextPackStringArray(targets.domains)],
    ["genres", normalizedTextPackStringArray(targets.genres)],
    ["profiles", normalizedTextPackStringArray(targets.profiles)],
  ] as const;
  for (const [key, value] of entries) {
    if (value !== undefined && value.length > 0) normalized[key] = value;
  }
  return normalized;
}

function normalizedTextPackStringRecord(
  record: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> {
  if (record === undefined) return {};
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => isNonEmptyString(value))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizedTextPackResourceFamilyMap(
  map: TextPackResourceFamilyMap,
): TextPackResourceFamilyMap {
  const normalized: Partial<Record<TextPackResourceFamily, readonly string[]>> = {};
  for (const family of textPackResourceFamilies) {
    const values = map[family];
    if (values !== undefined && values.length > 0) {
      normalized[family] = [...values];
    }
  }
  return normalized;
}

function normalizedTextPackManifestResourceMaps(
  resources: TextPackResourceFamilyMap,
  provides: TextPackResourceFamilyMap,
): {
  readonly resources: TextPackResourceFamilyMap;
  readonly provides: TextPackResourceFamilyMap;
} {
  const normalizedResources: Partial<Record<TextPackResourceFamily, readonly string[]>> = {};
  const normalizedProvides: Partial<Record<TextPackResourceFamily, readonly string[]>> = {};

  for (const family of textPackResourceFamilies) {
    const paths = resources[family] ?? [];
    const ids = provides[family] ?? [];
    const pairs = Array.from({ length: Math.max(paths.length, ids.length) }, (_, index) => ({
      path: paths[index],
      id: ids[index],
    })).sort((left, right) =>
      `${left.id ?? ""}\u0000${left.path ?? ""}`.localeCompare(`${right.id ?? ""}\u0000${right.path ?? ""}`),
    );
    const normalizedPaths = pairs
      .map((pair) => pair.path)
      .filter((entry): entry is string => entry !== undefined);
    const normalizedIds = pairs
      .map((pair) => pair.id)
      .filter((entry): entry is string => entry !== undefined);
    if (normalizedPaths.length > 0) normalizedResources[family] = normalizedPaths;
    if (normalizedIds.length > 0) normalizedProvides[family] = normalizedIds;
  }

  for (const [family, paths] of Object.entries(resources)) {
    if (!isTextPackResourceFamily(family)) {
      normalizedResources[family as TextPackResourceFamily] = [...paths].sort((left, right) =>
        left.localeCompare(right),
      );
    }
  }

  for (const [family, ids] of Object.entries(provides)) {
    if (!isTextPackResourceFamily(family)) {
      normalizedProvides[family as TextPackResourceFamily] = [...ids].sort((left, right) =>
        left.localeCompare(right),
      );
    }
  }

  return {
    resources: normalizedResources,
    provides: normalizedProvides,
  };
}

function normalizedTextPackCapabilities(
  resources: TextPackResourceFamilyMap,
  explicitCapabilities: TextPackCapabilityMap = {},
): TextPackCapabilityMap {
  const normalized: Partial<Record<TextPackResourceFamily, boolean | string>> = {};
  for (const family of textPackResourceFamilies) {
    const explicit = explicitCapabilities[family];
    if (explicit !== undefined) {
      normalized[family] = explicit;
      continue;
    }
    if ((resources[family] ?? []).length > 0) {
      normalized[family] = true;
    }
  }
  return normalized;
}

function normalizedTextPackTests(tests: TextPackTests): TextPackTests {
  return {
    smoke: sortedUniqueTextPackValues(tests.smoke),
    negative: sortedUniqueTextPackValues(tests.negative),
    representative: sortedUniqueTextPackValues(tests.representative),
  };
}

function normalizedTextPackLicenses(licenses: TextPackLicenses): TextPackLicenses {
  return {
    code: sortedUniqueTextPackValues(licenses.code),
    data: sortedUniqueTextPackValues(licenses.data),
    ...(licenses.notices === undefined
      ? {}
      : { notices: sortedUniqueTextPackValues(licenses.notices) }),
  };
}

function normalizedTextPackProvenance(provenance: TextPackProvenance): TextPackProvenance {
  return {
    sources: sortedUniqueTextPackValues(provenance.sources),
    generated: provenance.generated,
    ...(provenance.createdBy === undefined
      ? {}
      : { createdBy: sortedUniqueTextPackValues(provenance.createdBy) }),
    ...(provenance.notes === undefined
      ? {}
      : { notes: sortedUniqueTextPackValues(provenance.notes) }),
  };
}

function normalizedTextPackOptionalStrings(values: readonly string[] | undefined): readonly string[] | undefined {
  if (values === undefined) return undefined;
  const normalized = sortedUniqueTextPackValues(values);
  return normalized.length === 0 ? undefined : normalized;
}

function isSafeTextPackPackageRelativePath(value: string): boolean {
  const normalized = value.startsWith("./") ? value.slice(2) : value;
  if (value !== value.trim()) return false;
  if (normalized.length === 0 || normalized.includes("\0") || normalized.includes("\\")) return false;
  if (normalized.startsWith("/") || /^[A-Za-z]:/u.test(normalized)) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(normalized)) return false;
  return !normalized.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..");
}

function isSafeTextPackTestRef(value: string): boolean {
  if (isSafeTextPackPackageRelativePath(value)) return true;
  if (value !== value.trim()) return false;
  if (value.includes("\0") || value.includes("\\")) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:(?:\/|\\)/u.test(value)) return false;
  return /^[A-Za-z][A-Za-z0-9.-]*(?::[A-Za-z0-9._-]+)+$/u.test(value);
}

function addTextPackGovernanceDiagnostic(
  diagnostics: TextPackManifestGovernanceDiagnostic[],
  diagnostic: TextPackManifestGovernanceDiagnostic,
): void {
  diagnostics.push(diagnostic);
}

function canonicalManifestPath(value: string): string {
  return value.startsWith("./") ? value.slice(2) : value;
}

function resourceIdsForManifest(manifest: TextPackManifestV1): readonly string[] {
  return textPackResourceFamilies.flatMap((family) => [...(manifest.provides[family] ?? [])]);
}

function textPackOverlayKey(resource: TextPackResolvedResource): string {
  const profiles = [...(resource.profiles ?? [])].sort((left, right) => left.localeCompare(right));
  return [
    resource.kind,
    resource.lookupKey,
    resource.language ?? "",
    profiles.join("\u001f"),
    String(resource.overlayPrecedence),
  ].join("\u001e");
}

function derivedTextPackLicense(manifest: TextPackManifestV1): TextPackLicenseRef {
  return {
    id: "license:data",
    spdx: manifest.licenses.data.join(" OR "),
    ...(manifest.licenses.notices ? { notices: manifest.licenses.notices } : {}),
  };
}

function derivedTextPackProvenance(manifest: TextPackManifestV1): TextPackProvenanceRecord {
  return {
    id: "provenance:manifest",
    sources: manifest.provenance.sources,
    generated: manifest.provenance.generated,
    ...(manifest.provenance.createdBy ? { createdBy: manifest.provenance.createdBy } : {}),
    ...(manifest.provenance.notes ? { notes: manifest.provenance.notes } : {}),
  };
}

function manifestResourceLanguage(manifest: TextPackManifestV1): string | undefined {
  return manifest.targets.languages?.length === 1 ? manifest.targets.languages[0] : undefined;
}

function manifestResourceProfiles(manifest: TextPackManifestV1): readonly string[] | undefined {
  return manifest.targets.profiles && manifest.targets.profiles.length > 0 ? manifest.targets.profiles : undefined;
}

function resolveTextPackManifestResources(
  manifest: TextPackManifestV1,
  precedenceOverride?: number,
): readonly TextPackResolvedResource[] {
  const resources: TextPackResolvedResource[] = [];
  const license = derivedTextPackLicense(manifest);
  const provenance = derivedTextPackProvenance(manifest);
  const overlayPrecedence = precedenceOverride ?? manifest.composition?.overlayPrecedence ?? 0;
  const language = manifestResourceLanguage(manifest);
  const profiles = manifestResourceProfiles(manifest);

  for (const family of textPackResourceFamilies) {
    const paths = manifest.resources[family] ?? [];
    const provides = manifest.provides[family] ?? [];
    const kind = resourceKindByFamily[family];
    for (let index = 0; index < paths.length; index += 1) {
      const resourcePath = paths[index];
      const resourceId = provides[index];
      if (!resourcePath || !resourceId) continue;
      resources.push({
        packId: manifest.id,
        packageName: manifest.packageName,
        version: manifest.version,
        resourceId,
        lookupKey: resourceId,
        kind,
        family,
        path: canonicalManifestPath(resourcePath),
        overlayPrecedence,
        license,
        provenance,
        licenseId: license.id,
        provenanceId: provenance.id,
        reviewState: manifest.reviewState,
        ...(language ? { language } : {}),
        ...(profiles ? { profiles } : {}),
      });
    }
  }

  return resources;
}

export function createTextPackResourceRegistry(
  manifests: readonly TextPackManifestV1[],
): TextPackResourceRegistry {
  const resources = manifests
    .flatMap((manifest) => [...resolveTextPackManifestResources(manifest)])
    .sort(compareTextPackResources);

  return {
    manifests: [...manifests],
    resources,
    kinds: [...new Set(resources.map((resource) => resource.kind))]
      .sort((left, right) => left.localeCompare(right)),
    families: [...new Set(resources.map((resource) => resource.family))]
      .sort((left, right) => left.localeCompare(right)),
    languages: sortedUniqueTextPackValues(resources.map((resource) => resource.language)),
    profiles: sortedUniqueTextPackValues(resources.flatMap((resource) => resource.profiles ?? [])),
    reviewStates: sortedUniqueTextPackValues(resources.map((resource) => resource.reviewState)) as readonly TextPackReviewState[],
  };
}

export function composeTextPackResources(
  inputs: readonly TextPackCompositionInput[],
): TextPackResourceRegistry {
  const resources = inputs
    .flatMap((input) => [...resolveTextPackManifestResources(input.manifest, input.precedence)])
    .sort(compareTextPackResources);
  const manifests = inputs.map((input) => input.manifest);
  return {
    manifests,
    resources,
    kinds: [...new Set(resources.map((resource) => resource.kind))]
      .sort((left, right) => left.localeCompare(right)),
    families: [...new Set(resources.map((resource) => resource.family))]
      .sort((left, right) => left.localeCompare(right)),
    languages: sortedUniqueTextPackValues(resources.map((resource) => resource.language)),
    profiles: sortedUniqueTextPackValues(resources.flatMap((resource) => resource.profiles ?? [])),
    reviewStates: sortedUniqueTextPackValues(resources.map((resource) => resource.reviewState)) as readonly TextPackReviewState[],
  };
}

export function createTextPackCatalog(registry: TextPackResourceRegistry): TextPackCatalogV1 {
  const packs = [...registry.manifests]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((manifest) => {
      const resources = registry.resources.filter((resource) => resource.packId === manifest.id);
      return {
        id: manifest.id,
        packageName: manifest.packageName,
        version: manifest.version,
        reviewState: manifest.reviewState,
        languages: [...(manifest.targets.languages ?? [])].sort((left, right) => left.localeCompare(right)),
        profiles: [...(manifest.targets.profiles ?? [])].sort((left, right) => left.localeCompare(right)),
        resourceCount: resources.length,
        resourceFamilies: sortedUniqueTextPackValues(resources.map((resource) => resource.family)) as readonly TextPackResourceFamily[],
        resourceIds: resources.map((resource) => resource.resourceId).sort((left, right) => left.localeCompare(right)),
        licenses: manifest.licenses,
        provenance: manifest.provenance,
        tests: manifest.tests,
        ...(manifest.limitations ? { limitations: manifest.limitations } : {}),
      };
    });

  const resourcesByFamily = registry.families.map((family) => {
    const resources = registry.resources.filter((resource) => resource.family === family);
    return {
      family,
      resourceCount: resources.length,
      resourceIds: resources.map((resource) => resource.resourceId).sort((left, right) => left.localeCompare(right)),
    };
  });

  return {
    schemaVersion: textPackCatalogSchemaVersion,
    packageName,
    packCount: registry.manifests.length,
    resourceCount: registry.resources.length,
    languages: registry.languages,
    profiles: registry.profiles,
    reviewStates: registry.reviewStates,
    packs,
    resourcesByFamily,
  };
}

function isTextPackCatalogPackSummaryV1(value: unknown): value is TextPackCatalogPackSummaryV1 {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.packageName) &&
    isNonEmptyString(value.version) &&
    isTextPackReviewState(value.reviewState) &&
    isPossiblyEmptyStringArray(value.languages) &&
    isPossiblyEmptyStringArray(value.profiles) &&
    typeof value.resourceCount === "number" &&
    Number.isInteger(value.resourceCount) &&
    value.resourceCount >= 0 &&
    isTextPackResourceFamilyArray(value.resourceFamilies) &&
    isPossiblyEmptyStringArray(value.resourceIds) &&
    isTextPackLicenses(value.licenses) &&
    isTextPackProvenance(value.provenance) &&
    isTextPackTests(value.tests) &&
    (value.limitations === undefined || isPossiblyEmptyStringArray(value.limitations))
  );
}

function isTextPackCatalogFamilySummaryV1(value: unknown): value is TextPackCatalogFamilySummaryV1 {
  return (
    isRecord(value) &&
    isTextPackResourceFamily(value.family) &&
    typeof value.resourceCount === "number" &&
    Number.isInteger(value.resourceCount) &&
    value.resourceCount >= 0 &&
    isPossiblyEmptyStringArray(value.resourceIds)
  );
}

export function isTextPackCatalogV1(value: unknown): value is TextPackCatalogV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === textPackCatalogSchemaVersion &&
    value.packageName === packageName &&
    typeof value.packCount === "number" &&
    Number.isInteger(value.packCount) &&
    value.packCount >= 0 &&
    typeof value.resourceCount === "number" &&
    Number.isInteger(value.resourceCount) &&
    value.resourceCount >= 0 &&
    isPossiblyEmptyStringArray(value.languages) &&
    isPossiblyEmptyStringArray(value.profiles) &&
    Array.isArray(value.reviewStates) &&
    value.reviewStates.every((entry) => isTextPackReviewState(entry)) &&
    Array.isArray(value.packs) &&
    value.packs.every((entry) => isTextPackCatalogPackSummaryV1(entry)) &&
    Array.isArray(value.resourcesByFamily) &&
    value.resourcesByFamily.every((entry) => isTextPackCatalogFamilySummaryV1(entry))
  );
}

export function validateTextPackManifestGovernance(
  manifest: unknown,
): TextPackManifestGovernanceResult {
  const diagnostics: TextPackManifestGovernanceDiagnostic[] = [];
  if (!isTextPackManifestV1(manifest)) {
    const packId = isRecord(manifest) && isNonEmptyString(manifest.id) ? manifest.id : undefined;
    return {
      ok: false,
      diagnostics: [
        {
          code: "invalid-manifest-shape",
          ...(packId === undefined ? {} : { packId }),
          message: "Textpack manifest does not satisfy the version 1 runtime shape.",
        },
        ...metadataDiagnosticsForManifestLikeValue(manifest),
      ],
    };
  }

  if (!hasAnyTargetScope(manifest.targets)) {
    addTextPackGovernanceDiagnostic(diagnostics, {
      code: "missing-target-scope",
      packId: manifest.id,
      message: `Manifest ${manifest.id} must declare at least one target scope.`,
    });
  }

  if (manifest.reviewState === "deprecated") {
    addTextPackGovernanceDiagnostic(diagnostics, {
      code: "deprecated-review-state",
      packId: manifest.id,
      message: `Manifest ${manifest.id} is deprecated and cannot be promoted as an active pack.`,
    });
  }

  if (manifest.licenses.code.length === 0 || manifest.licenses.data.length === 0) {
    addTextPackGovernanceDiagnostic(diagnostics, {
      code: "missing-license",
      packId: manifest.id,
      message: `Manifest ${manifest.id} must declare code and data licenses.`,
    });
  }

  if (manifest.provenance.sources.length === 0) {
    addTextPackGovernanceDiagnostic(diagnostics, {
      code: "missing-provenance",
      packId: manifest.id,
      message: `Manifest ${manifest.id} must declare one or more provenance sources.`,
    });
  }

  const providedIds = new Set<string>();
  const resourcePathKeys = new Set<string>();
  for (const family of textPackResourceFamilies) {
    const paths = manifest.resources[family] ?? [];
    const ids = manifest.provides[family] ?? [];
    const capability = manifest.capabilities[family];

    if (paths.length !== ids.length) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "resource-provides-length-mismatch",
        packId: manifest.id,
        ref: family,
        message: `Manifest ${manifest.id} has ${paths.length} ${family} resources but ${ids.length} provided ids.`,
      });
    }

    if (paths.length > 0 && capability !== true) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "resource-family-without-capability",
        packId: manifest.id,
        ref: family,
        message: `Manifest ${manifest.id} declares ${family} resources without a true capability flag.`,
      });
    }

    if (paths.length === 0 && capability === true) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "capability-without-resource",
        packId: manifest.id,
        ref: family,
        message: `Manifest ${manifest.id} statements ${family} capability without declaring resources.`,
      });
    }

    for (const resourcePath of paths) {
      const resourcePathKey = `${family}\u0000${canonicalManifestPath(resourcePath)}`;
      if (resourcePathKeys.has(resourcePathKey)) {
        addTextPackGovernanceDiagnostic(diagnostics, {
          code: "duplicate-resource-path",
          packId: manifest.id,
          ref: resourcePath,
          message: `Manifest ${manifest.id} repeats ${family} resource path ${resourcePath}.`,
        });
      }
      resourcePathKeys.add(resourcePathKey);
      if (!isSafeTextPackPackageRelativePath(resourcePath)) {
        addTextPackGovernanceDiagnostic(diagnostics, {
          code: "unsafe-resource-path",
          packId: manifest.id,
          ref: resourcePath,
          message: `Manifest ${manifest.id} uses an unsafe package-relative resource path.`,
        });
      }
    }

    for (const resourceId of ids) {
      if (providedIds.has(resourceId)) {
        addTextPackGovernanceDiagnostic(diagnostics, {
          code: "duplicate-provides-id",
          packId: manifest.id,
          resourceId,
          message: `Manifest ${manifest.id} repeats provided resource id ${resourceId}.`,
        });
      }
      providedIds.add(resourceId);
    }
  }

  for (const key of Object.keys(manifest.resources)) {
    if (!isTextPackResourceFamily(key)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "unsupported-resource-family",
        packId: manifest.id,
        ref: key,
        message: `Manifest ${manifest.id} declares unsupported resource family ${key}.`,
      });
    }
  }

  for (const [field, value] of Object.entries(manifest.entrypoints)) {
    if (!isSafeTextPackPackageRelativePath(value)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "unsafe-entrypoint-path",
        packId: manifest.id,
        ref: `${field}:${value}`,
        message: `Entrypoint ${field} uses an unsafe package-relative path.`,
      });
    }
  }

  for (const [field, refs] of Object.entries(manifest.tests)) {
    if (refs.length === 0) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "missing-test-ref",
        packId: manifest.id,
        ref: field,
        message: `Manifest ${manifest.id} must declare ${field} test references.`,
      });
    }
    for (const ref of refs) {
      if (!isSafeTextPackTestRef(ref)) {
        addTextPackGovernanceDiagnostic(diagnostics, {
          code: "unsafe-test-ref",
          packId: manifest.id,
          ref: `${field}:${ref}`,
          message: `Test reference ${ref} is neither a safe package-relative path nor a stable test identifier.`,
        });
      }
    }
  }

  const overlayKeys = new Map<string, TextPackResolvedResource>();
  for (const resource of resolveTextPackManifestResources(manifest)) {
    const overlayKey = textPackOverlayKey(resource);
    const conflict = overlayKeys.get(overlayKey);
    if (conflict !== undefined) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "overlay-conflict",
        packId: manifest.id,
        resourceId: resource.resourceId,
        ref: conflict.resourceId,
        message: `Resources ${conflict.resourceId} and ${resource.resourceId} share a lookup key and overlay precedence.`,
      });
    } else {
      overlayKeys.set(overlayKey, resource);
    }
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics,
  };
}

function metadataDiagnosticsForManifestLikeValue(
  manifest: unknown,
): readonly TextPackManifestGovernanceDiagnostic[] {
  if (!isRecord(manifest)) return [];
  const diagnostics: TextPackManifestGovernanceDiagnostic[] = [];
  const packId = isNonEmptyString(manifest.id) ? manifest.id : undefined;
  const licenses = manifest.licenses;
  const provenance = manifest.provenance;

  if (
    !isRecord(licenses) ||
    !Array.isArray(licenses.code) ||
    licenses.code.length === 0 ||
    !Array.isArray(licenses.data) ||
    licenses.data.length === 0
  ) {
    diagnostics.push({
      code: "missing-license",
      ...(packId === undefined ? {} : { packId }),
      message: "Manifest must declare code and data licenses.",
    });
  }

  if (
    !isRecord(provenance) ||
    !Array.isArray(provenance.sources) ||
    provenance.sources.length === 0
  ) {
    diagnostics.push({
      code: "missing-provenance",
      ...(packId === undefined ? {} : { packId }),
      message: "Manifest must declare one or more provenance sources.",
    });
  }

  return diagnostics;
}

function parseTextPackVersion(value: string): readonly [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u.exec(value);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareTextPackVersions(left: string, right: string): number {
  const parsedLeft = parseTextPackVersion(left);
  const parsedRight = parseTextPackVersion(right);
  if (!parsedLeft || !parsedRight) return left.localeCompare(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (parsedLeft[index] ?? 0) - (parsedRight[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function satisfiesTextPackVersionRange(version: string, range: string): boolean {
  if (range === "*" || range === version) return true;
  if (range.startsWith(">=")) return compareTextPackVersions(version, range.slice(2)) >= 0;
  if (range.startsWith("^")) {
    const base = range.slice(1);
    const parsedVersion = parseTextPackVersion(version);
    const parsedBase = parseTextPackVersion(base);
    if (!parsedVersion || !parsedBase) return false;
    return parsedVersion[0] === parsedBase[0] && compareTextPackVersions(version, base) >= 0;
  }
  if (range.startsWith("~")) {
    const base = range.slice(1);
    const parsedVersion = parseTextPackVersion(version);
    const parsedBase = parseTextPackVersion(base);
    if (!parsedVersion || !parsedBase) return false;
    return (
      parsedVersion[0] === parsedBase[0] &&
      parsedVersion[1] === parsedBase[1] &&
      compareTextPackVersions(version, base) >= 0
    );
  }
  return false;
}

export function checkTextPackCompatibility(
  manifest: TextPackManifestV1,
  policy: TextPackCompatibilityPolicy = {},
): TextPackCompatibilityResult {
  const diagnostics: TextPackCompatibilityDiagnostic[] = [];
  const packageVersions = policy.packageVersions ?? {};

  for (const [engineName, expectedRange] of Object.entries(manifest.engines)) {
    const actualVersion = packageVersions[engineName];
    if (actualVersion === undefined) {
      diagnostics.push({
        code: "engine-version-missing",
        packId: manifest.id,
        ref: engineName,
        message: `Compatibility policy did not provide version for ${engineName}.`,
      });
      continue;
    }
    if (!satisfiesTextPackVersionRange(actualVersion, expectedRange)) {
      diagnostics.push({
        code: "engine-version-incompatible",
        packId: manifest.id,
        ref: `${engineName}:${expectedRange}`,
        message: `${engineName}@${actualVersion} does not satisfy ${expectedRange}.`,
      });
    }
  }

  const manifestProfiles = new Set(manifest.targets.profiles ?? []);
  for (const profile of policy.requiredProfiles ?? []) {
    if (!manifestProfiles.has(profile)) {
      diagnostics.push({
        code: "profile-missing",
        packId: manifest.id,
        ref: profile,
        message: `Manifest ${manifest.id} does not declare required profile ${profile}.`,
      });
    }
  }

  const resourceIds = new Set(resourceIdsForManifest(manifest));
  for (const resourceId of policy.mandatoryResources ?? []) {
    if (!resourceIds.has(resourceId)) {
      diagnostics.push({
        code: "mandatory-resource-missing",
        packId: manifest.id,
        ref: resourceId,
        message: `Manifest ${manifest.id} does not provide mandatory resource ${resourceId}.`,
      });
    }
  }

  if (
    policy.minimumReviewState !== undefined &&
    reviewStateRank[manifest.reviewState] < reviewStateRank[policy.minimumReviewState]
  ) {
    diagnostics.push({
      code: "review-state-too-low",
      packId: manifest.id,
      ref: policy.minimumReviewState,
      message: `Manifest ${manifest.id} review state ${manifest.reviewState} is below ${policy.minimumReviewState}.`,
    });
  }

  const activePackIds = new Set(policy.activePackIds ?? []);
  for (const exclusivePackId of manifest.composition?.exclusiveWith ?? []) {
    if (activePackIds.has(exclusivePackId)) {
      diagnostics.push({
        code: "exclusive-overlay-conflict",
        packId: manifest.id,
        ref: exclusivePackId,
        message: `Manifest ${manifest.id} is mutually exclusive with active pack ${exclusivePackId}.`,
      });
    }
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics,
  };
}

export function createTextPackManifestDraft(
  options: TextPackManifestDraftOptions,
): TextPackManifestV1 {
  const normalizedMaps = normalizedTextPackManifestResourceMaps(options.resources, options.provides);
  const resources = normalizedMaps.resources;
  const provides = normalizedMaps.provides;
  const limitations = normalizedTextPackOptionalStrings(options.limitations);
  const notes = normalizedTextPackOptionalStrings(options.notes);
  return {
    manifestVersion: textPackManifestVersion,
    id: options.id,
    packageName: options.packageName,
    version: options.version,
    kind: sortedUniqueTextPackValues(options.kind) as readonly TextPackKind[],
    targets: normalizedTextPackTargets(options.targets),
    engines: normalizedTextPackStringRecord(
      options.engines ?? { [packageName]: "^0.1.0" },
    ),
    externalData: normalizedTextPackStringRecord(options.externalData),
    capabilities: normalizedTextPackCapabilities(resources, options.capabilities),
    resources,
    provides,
    entrypoints: {
      manifest: options.entrypoints?.manifest ?? "./pack.manifest.json",
      ...(options.entrypoints?.load === undefined ? {} : { load: options.entrypoints.load }),
    },
    licenses: normalizedTextPackLicenses(options.licenses),
    provenance: normalizedTextPackProvenance(options.provenance),
    tests: normalizedTextPackTests(options.tests),
    reviewState: options.reviewState ?? "experimental",
    ...(options.composition === undefined ? {} : { composition: options.composition }),
    ...(limitations === undefined ? {} : { limitations }),
    ...(notes === undefined ? {} : { notes }),
  };
}

export function createTextPackManifest(
  options: TextPackManifestDraftOptions,
): TextPackManifestV1 {
  return createTextPackManifestDraft(options);
}

export function updateTextPackManifest(
  manifest: TextPackManifestV1,
  options: TextPackManifestUpdateOptions,
): TextPackManifestV1 {
  const normalizedMaps = normalizedTextPackManifestResourceMaps(
    options.resources ?? manifest.resources,
    options.provides ?? manifest.provides,
  );
  const resources = normalizedMaps.resources;
  const provides = normalizedMaps.provides;
  const capabilities =
    options.capabilities !== undefined
      ? normalizedTextPackCapabilities(resources, options.capabilities)
      : options.resources !== undefined
        ? normalizedTextPackCapabilities(resources)
        : manifest.capabilities;
  const provenanceNotes = normalizedTextPackOptionalStrings([
    ...(manifest.provenance.notes ?? []),
    ...(options.provenanceNotes ?? []),
  ]);
  const limitations = normalizedTextPackOptionalStrings(options.limitations ?? manifest.limitations);
  const notes = normalizedTextPackOptionalStrings(options.notes ?? manifest.notes);
  return {
    ...manifest,
    version: options.version ?? manifest.version,
    targets: normalizedTextPackTargets(options.targets ?? manifest.targets),
    capabilities,
    resources,
    provides,
    provenance: {
      ...normalizedTextPackProvenance(manifest.provenance),
      ...(provenanceNotes === undefined ? {} : { notes: provenanceNotes }),
    },
    reviewState: options.reviewState ?? manifest.reviewState,
    ...(options.composition === undefined ? {} : { composition: options.composition }),
    ...(limitations === undefined ? {} : { limitations }),
    ...(notes === undefined ? {} : { notes }),
  };
}

export function addTextPackManifestResource(
  manifest: TextPackManifestV1,
  resource: TextPackManifestResourceInput,
): TextPackManifestV1 {
  const resources = {
    ...manifest.resources,
    [resource.family]: [...(manifest.resources[resource.family] ?? []), resource.resourcePath],
  };
  const provides = {
    ...manifest.provides,
    [resource.family]: [...(manifest.provides[resource.family] ?? []), resource.resourceId],
  };
  return updateTextPackManifest(manifest, { resources, provides });
}

export function updateTextPackManifestResource(
  manifest: TextPackManifestV1,
  resourceId: string,
  options: TextPackManifestResourceUpdateOptions,
): TextPackManifestV1 {
  const currentFamily = textPackResourceFamilies.find((family) =>
    (manifest.provides[family] ?? []).includes(resourceId),
  );
  if (currentFamily === undefined) {
    throw new RangeError(`Textpack manifest resource ${resourceId} was not found.`);
  }

  const resources: Partial<Record<TextPackResourceFamily, string[]>> = {};
  const provides: Partial<Record<TextPackResourceFamily, string[]>> = {};
  for (const family of textPackResourceFamilies) {
    resources[family] = [...(manifest.resources[family] ?? [])];
    provides[family] = [...(manifest.provides[family] ?? [])];
  }

  const currentIndex = provides[currentFamily]?.indexOf(resourceId) ?? -1;
  const currentPath = resources[currentFamily]?.[currentIndex];
  if (currentIndex < 0 || currentPath === undefined) {
    throw new RangeError(`Textpack manifest resource ${resourceId} has no paired path.`);
  }

  resources[currentFamily]?.splice(currentIndex, 1);
  provides[currentFamily]?.splice(currentIndex, 1);
  const nextFamily = options.family ?? currentFamily;
  resources[nextFamily] = [...(resources[nextFamily] ?? []), options.resourcePath ?? currentPath];
  provides[nextFamily] = [...(provides[nextFamily] ?? []), options.resourceId ?? resourceId];

  return updateTextPackManifest(manifest, { resources, provides });
}

export function validateTextPackAuthoringMetadata(
  manifest: unknown,
): TextPackManifestGovernanceResult {
  return validateTextPackManifestGovernance(manifest);
}

export function queryTextPackResourceRegistry(
  registry: TextPackResourceRegistry,
  request: TextPackRegistryQuery,
): TextPackLookupResult {
  const mismatchDiagnostics: TextPackLookupDiagnostic[] = [];
  const resources: TextPackResolvedResource[] = [];
  const requestLanguage =
    request.language === undefined
      ? undefined
      : comparableTextPackValue(request.language, request.canonicalizer);
  const requestProfile =
    request.profile === undefined
      ? undefined
      : comparableTextPackValue(request.profile, request.canonicalizer);
  const requestLookupKey =
    request.lookupKey === undefined
      ? undefined
      : comparableTextPackValue(request.lookupKey, request.canonicalizer);

  for (const resource of registry.resources) {
    if (request.kind !== undefined && resource.kind !== request.kind) continue;
    if (request.family !== undefined && resource.family !== request.family) continue;
    if (request.kind !== undefined && request.family !== undefined && resourceKindByFamily[request.family] !== request.kind) {
      mismatchDiagnostics.push({
        code: "family-kind-mismatch",
        packId: resource.packId,
        resourceId: resource.resourceId,
        message: `Requested family ${request.family} does not resolve to kind ${request.kind}.`,
      });
      continue;
    }
    if (request.packId !== undefined && resource.packId !== request.packId) continue;
    if (request.resourceId !== undefined && resource.resourceId !== request.resourceId) continue;
    if (
      requestLookupKey !== undefined &&
      comparableTextPackValue(resource.lookupKey, request.canonicalizer) !== requestLookupKey
    ) {
      continue;
    }

    const resourceLanguage =
      resource.language === undefined
        ? undefined
        : comparableTextPackValue(resource.language, request.canonicalizer);
    const resourceProfiles = [...(resource.profiles ?? [])]
      .map((profile) => comparableTextPackValue(profile, request.canonicalizer))
      .sort();

    if (
      requestLanguage !== undefined &&
      resourceLanguage !== undefined &&
      requestLanguage !== resourceLanguage
    ) {
      mismatchDiagnostics.push({
        code: "language-mismatch",
        packId: resource.packId,
        resourceId: resource.resourceId,
        message: `Resource ${resource.resourceId} does not match requested language ${request.language}.`,
      });
      continue;
    }

    if (requestProfile !== undefined) {
      if (resourceProfiles.length > 0 && !resourceProfiles.includes(requestProfile)) {
        mismatchDiagnostics.push({
          code: "profile-mismatch",
          packId: resource.packId,
          resourceId: resource.resourceId,
          message: `Resource ${resource.resourceId} does not match requested profile ${request.profile}.`,
        });
        continue;
      }
    } else if (resourceProfiles.length > 0) {
      continue;
    }

    resources.push(resource);
  }

  resources.sort(compareTextPackResources);
  const diagnostics: TextPackLookupDiagnostic[] = resources.length === 0 ? [...mismatchDiagnostics] : [];

  for (let index = 0; index < resources.length; index += 1) {
    const left = resources[index];
    if (!left) continue;
    for (let otherIndex = index + 1; otherIndex < resources.length; otherIndex += 1) {
      const right = resources[otherIndex];
      if (!right) continue;
      if (
        comparableTextPackValue(left.lookupKey, request.canonicalizer) ===
          comparableTextPackValue(right.lookupKey, request.canonicalizer) &&
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

export function resolveTextPackResources(
  manifests: readonly TextPackManifestV1[],
  request: TextPackLookupRequest,
): TextPackLookupResult {
  return queryTextPackResourceRegistry(createTextPackResourceRegistry(manifests), request);
}

export function parseTextPackResourceContent(
  resource: TextPackResolvedResource,
  content: string,
  options: TextPackResourceParseOptions = {},
): {
  readonly entries: readonly TextPackLoadedEntry[];
  readonly diagnostics: readonly TextPackResourceLoadDiagnostic[];
} {
  const diagnostics: TextPackResourceLoadDiagnostic[] = [];
  const entries: TextPackLoadedEntry[] = [];
  const seenLookupTokens = new Set<string>();

  for (const [lineIndex, rawLine] of splitTextPackResourceLines(content).entries()) {
    const line = lineIndex + 1;
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const cells = trimmed.split("\t").map((cell) => cell.trim());
    const value = cells[0] ?? "";
    if (value.length === 0) {
      diagnostics.push({
        code: "malformed-resource-row",
        packId: resource.packId,
        resourceId: resource.resourceId,
        path: resource.path,
        line,
        message: `Resource ${resource.resourceId} contains an empty value at line ${line}.`,
      });
      continue;
    }

    let label: string | undefined;
    let attributes: Record<string, string> = {};

    if (resource.kind === "lexicon" || resource.kind === "morphology" || resource.kind === "tagset") {
      if (cells.length < 2) {
        diagnostics.push({
          code: "malformed-resource-row",
          packId: resource.packId,
          resourceId: resource.resourceId,
          path: resource.path,
          line,
          message: `${resource.kind} resource ${resource.resourceId} must contain attributes at line ${line}.`,
        });
        continue;
      }
      const diagnosticCount = diagnostics.length;
      attributes = parseTextPackAttributes(cells.slice(1), resource, line, diagnostics);
      if (diagnostics.length > diagnosticCount) continue;
    } else if (resource.kind === "gazetteer") {
      label = cells[1];
      if (label === undefined || label.length === 0) {
        diagnostics.push({
          code: "malformed-resource-row",
          packId: resource.packId,
          resourceId: resource.resourceId,
          path: resource.path,
          line,
          message: `Gazetteer resource ${resource.resourceId} must contain a label at line ${line}.`,
        });
        continue;
      }
      const diagnosticCount = diagnostics.length;
      attributes = parseTextPackAttributes(cells.slice(2), resource, line, diagnostics);
      if (diagnostics.length > diagnosticCount) continue;
    } else if (cells.length > 1) {
      diagnostics.push({
        code: "malformed-resource-row",
        packId: resource.packId,
        resourceId: resource.resourceId,
        path: resource.path,
        line,
        message: `Line ${line} in ${resource.resourceId} must contain a single value.`,
      });
      continue;
    }

    const canonicalization = options.canonicalizer
      ? canonicalizeTextPackValue(value, options.canonicalizer)
      : undefined;
    const lookupToken = canonicalization?.canonicalValue ?? value;
    if (seenLookupTokens.has(lookupToken)) {
      diagnostics.push({
        code: "duplicate-resource-entry",
        packId: resource.packId,
        resourceId: resource.resourceId,
        path: resource.path,
        line,
        message: `Resource ${resource.resourceId} repeats lookup entry ${value} at line ${line}.`,
      });
      continue;
    }
    seenLookupTokens.add(lookupToken);

    entries.push({
      value,
      lookupToken,
      line,
      attributes,
      ...(canonicalization ? { canonicalization } : {}),
      ...(label ? { label } : {}),
    });
  }

  return { entries, diagnostics };
}

export function loadTextPackResources(
  manifests: readonly TextPackManifestV1[],
  request: TextPackLookupRequest,
  contents: TextPackResourceContentSource,
  options: TextPackResourceParseOptions = {},
): TextPackLoadResult {
  return loadTextPackRegistryResources(
    createTextPackResourceRegistry(manifests),
    request,
    contents,
    options,
  );
}

export function loadTextPackRegistryResources(
  registry: TextPackResourceRegistry,
  request: TextPackRegistryQuery,
  contents: TextPackResourceContentSource,
  options: TextPackResourceParseOptions = {},
): TextPackLoadResult {
  const resolved = queryTextPackResourceRegistry(registry, request);
  const diagnostics: (TextPackLookupDiagnostic | TextPackResourceLoadDiagnostic)[] = [
    ...resolved.diagnostics,
  ];
  const resources: TextPackLoadedResource[] = [];

  for (const resource of resolved.resources) {
    const content = textPackContentForPath(contents, resource.path);
    if (content === undefined) {
      diagnostics.push({
        code: "resource-content-missing",
        packId: resource.packId,
        resourceId: resource.resourceId,
        path: resource.path,
        message: `Resource content is missing for ${resource.path}.`,
      });
      continue;
    }

    const parsed = parseTextPackResourceContent(resource, content, options);
    diagnostics.push(...parsed.diagnostics);
    resources.push({
      resource,
      entries: parsed.entries,
    });
  }

  return { resources, diagnostics };
}

function defaultTextPackFileSystemResourcePath(root: string, resourcePath: string): string {
  const normalizedRoot = root.endsWith("/") ? root.slice(0, -1) : root;
  return `${normalizedRoot}/${canonicalManifestPath(resourcePath)}`;
}

export async function loadTextPackFromFileSystem(
  options: TextPackFileSystemLoadOptions,
): Promise<TextPackLoadResult> {
  const governance = validateTextPackManifestGovernance(options.manifest);
  if (!governance.ok) {
    return {
      resources: [],
      diagnostics: governance.diagnostics,
    };
  }

  const registry = createTextPackResourceRegistry([options.manifest]);
  const request = options.request ?? {};
  const resolved = queryTextPackResourceRegistry(registry, request);
  const contents: Record<string, string> = {};
  const resolvePath = options.resolvePath ?? defaultTextPackFileSystemResourcePath;

  for (const resource of resolved.resources) {
    contents[resource.path] = await options.readText(resolvePath(options.root, resource.path));
  }

  return loadTextPackRegistryResources(registry, request, contents, options);
}

export function lookupTextPackLoadedEntries(
  resources: readonly TextPackLoadedResource[],
  value: string,
  options: TextPackEntryLookupOptions = {},
): readonly TextPackEntryLookupMatch[] {
  const queryCanonicalization = options.canonicalizer
    ? canonicalizeTextPackValue(value, options.canonicalizer)
    : undefined;
  const lookupToken = queryCanonicalization?.canonicalValue ?? value;
  const matches: TextPackEntryLookupMatch[] = [];

  for (const resource of resources) {
    for (const entry of resource.entries) {
      const entryCanonicalization = options.canonicalizer
        ? canonicalizeTextPackValue(entry.value, options.canonicalizer)
        : undefined;
      const entryLookupToken = entryCanonicalization?.canonicalValue ?? entry.lookupToken;
      if (entryLookupToken === lookupToken) {
        matches.push({
          resource: resource.resource,
          entry,
          ...(queryCanonicalization && entryCanonicalization
            ? {
                canonicalization: {
                  canonicalizerId: queryCanonicalization.canonicalizerId,
                  query: queryCanonicalization,
                  entry: entryCanonicalization,
                },
              }
            : {}),
        });
      }
    }
  }

  return matches;
}
