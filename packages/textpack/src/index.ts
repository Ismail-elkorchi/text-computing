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
  readonly canonicalizer?: TextPackCanonicalizer;
}

export interface TextPackRegistryQuery extends TextPackLookupRequest {
  readonly packId?: string;
  readonly resourceId?: string;
  readonly lookupKey?: string;
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

export interface TextPackResourceRegistry {
  readonly manifests: readonly TextPackManifestV1[];
  readonly resources: readonly TextPackResolvedResource[];
  readonly kinds: readonly TextPackResourceKind[];
  readonly languages: readonly string[];
  readonly profiles: readonly string[];
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
  readonly diagnostics: readonly (TextPackLookupDiagnostic | TextPackResourceLoadDiagnostic)[];
}

export interface TextPackEntryLookupMatch {
  readonly resource: TextPackResolvedResource;
  readonly entry: TextPackLoadedEntry;
  readonly canonicalization?: TextPackEntryLookupCanonicalizationMetadata;
}

export type TextPackManifestGovernanceDiagnosticCode =
  | "invalid-manifest-shape"
  | "duplicate-license-id"
  | "duplicate-provenance-id"
  | "duplicate-resource-id"
  | "missing-license-ref"
  | "missing-provenance-ref"
  | "unsafe-resource-path"
  | "unsafe-entrypoint-path"
  | "unsafe-test-ref"
  | "overlay-conflict";

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

function sortedUniqueTextPackValues(values: Iterable<string | undefined>): readonly string[] {
  return [...new Set([...values].filter(isNonEmptyString))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function isSafeTextPackPackageRelativePath(value: string): boolean {
  if (value !== value.trim()) return false;
  if (value.length === 0 || value.includes("\0") || value.includes("\\")) return false;
  if (value.startsWith("/") || /^[A-Za-z]:/u.test(value)) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)) return false;
  return !value.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..");
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

function textPackOverlayKey(resource: TextPackResourceEntry): string {
  const profiles = [...(resource.profiles ?? [])].sort((left, right) => left.localeCompare(right));
  return [
    resource.kind,
    resource.lookupKey,
    resource.language ?? "",
    profiles.join("\u001f"),
    String(resource.overlayPrecedence),
  ].join("\u001e");
}

function resolveTextPackManifestResources(
  manifest: TextPackManifestV1,
): readonly TextPackResolvedResource[] {
  const licensesById = new Map(manifest.licenses.map((license) => [license.id, license]));
  const provenanceById = new Map(manifest.provenance.map((record) => [record.id, record]));
  const resources: TextPackResolvedResource[] = [];

  for (const resource of manifest.resources) {
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
    languages: sortedUniqueTextPackValues(resources.map((resource) => resource.language)),
    profiles: sortedUniqueTextPackValues(resources.flatMap((resource) => resource.profiles ?? [])),
  };
}

export function validateTextPackManifestGovernance(
  manifest: unknown,
): TextPackManifestGovernanceResult {
  const diagnostics: TextPackManifestGovernanceDiagnostic[] = [];
  if (!isTextPackManifestV1(manifest)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: "invalid-manifest-shape",
          message: "Textpack manifest does not satisfy the version 1 runtime shape.",
        },
      ],
    };
  }

  const licenseIds = new Set<string>();
  for (const license of manifest.licenses) {
    if (licenseIds.has(license.id)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "duplicate-license-id",
        packId: manifest.packId,
        ref: license.id,
        message: `Manifest ${manifest.packId} repeats license id ${license.id}.`,
      });
    }
    licenseIds.add(license.id);
  }

  const provenanceIds = new Set<string>();
  for (const provenance of manifest.provenance) {
    if (provenanceIds.has(provenance.id)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "duplicate-provenance-id",
        packId: manifest.packId,
        ref: provenance.id,
        message: `Manifest ${manifest.packId} repeats provenance id ${provenance.id}.`,
      });
    }
    provenanceIds.add(provenance.id);
  }

  const resourceIds = new Set<string>();
  const overlayKeys = new Map<string, TextPackResourceEntry>();
  for (const resource of manifest.resources) {
    if (resourceIds.has(resource.resourceId)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "duplicate-resource-id",
        packId: manifest.packId,
        resourceId: resource.resourceId,
        message: `Manifest ${manifest.packId} repeats resource id ${resource.resourceId}.`,
      });
    }
    resourceIds.add(resource.resourceId);

    if (!licenseIds.has(resource.licenseId)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "missing-license-ref",
        packId: manifest.packId,
        resourceId: resource.resourceId,
        ref: resource.licenseId,
        message: `Resource ${resource.resourceId} references missing license id ${resource.licenseId}.`,
      });
    }

    if (!provenanceIds.has(resource.provenanceId)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "missing-provenance-ref",
        packId: manifest.packId,
        resourceId: resource.resourceId,
        ref: resource.provenanceId,
        message: `Resource ${resource.resourceId} references missing provenance id ${resource.provenanceId}.`,
      });
    }

    if (!isSafeTextPackPackageRelativePath(resource.path)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "unsafe-resource-path",
        packId: manifest.packId,
        resourceId: resource.resourceId,
        ref: resource.path,
        message: `Resource ${resource.resourceId} uses an unsafe package-relative path.`,
      });
    }

    const overlayKey = textPackOverlayKey(resource);
    const conflictingResource = overlayKeys.get(overlayKey);
    if (conflictingResource !== undefined) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "overlay-conflict",
        packId: manifest.packId,
        resourceId: resource.resourceId,
        ref: conflictingResource.resourceId,
        message: `Resources ${conflictingResource.resourceId} and ${resource.resourceId} share a lookup key and overlay precedence.`,
      });
    } else {
      overlayKeys.set(overlayKey, resource);
    }
  }

  const entrypoints = [
    ["manifest", manifest.entrypoints.manifest],
    ["resourceRoot", manifest.entrypoints.resourceRoot],
  ] as const;
  for (const [field, value] of entrypoints) {
    if (value !== undefined && !isSafeTextPackPackageRelativePath(value)) {
      addTextPackGovernanceDiagnostic(diagnostics, {
        code: "unsafe-entrypoint-path",
        packId: manifest.packId,
        ref: `${field}:${value}`,
        message: `Entrypoint ${field} uses an unsafe package-relative path.`,
      });
    }
  }

  for (const [field, refs] of Object.entries(manifest.tests)) {
    for (const ref of refs) {
      if (!isSafeTextPackTestRef(ref)) {
        addTextPackGovernanceDiagnostic(diagnostics, {
          code: "unsafe-test-ref",
          packId: manifest.packId,
          ref: `${field}:${ref}`,
          message: `Test reference ${ref} is neither a safe package-relative path nor a stable test identifier.`,
        });
      }
    }
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics,
  };
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
    if (resource.kind !== request.kind) continue;
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
    if (trimmed.length === 0) continue;

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

    if (resource.kind === "lexicon") {
      if (cells.length < 2) {
        diagnostics.push({
          code: "malformed-resource-row",
          packId: resource.packId,
          resourceId: resource.resourceId,
          path: resource.path,
          line,
          message: `Lexicon resource ${resource.resourceId} must contain attributes at line ${line}.`,
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
