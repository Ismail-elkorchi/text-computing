export const packageName = "@ismail-elkorchi/textprotocol" as const;
export const resultEnvelopeSchemaId =
  "urn:ismail-elkorchi:textprotocol:result-envelope:v1" as const;
export const resultEnvelopeSchemaVersion = 1 as const;
export const textProtocolResultEnvelopeJsonMediaType =
  "application/vnd.ismail-elkorchi.textprotocol.result-envelope.v1+json" as const;
export const textProtocolPayloadKindTextdocDocumentV1 = "textdoc-document-v1" as const;
export const textProtocolPayloadKindTextpipelineTraceV1 = "textpipeline-trace-v1" as const;
export const textProtocolPayloadKindTextconformanceReportV1 =
  "textconformance-report-v1" as const;
export const textProtocolPayloadKindVerticalSliceResultV1 =
  "public-vertical-slice-0.1-result-v1" as const;

export type PackageName = typeof packageName;
export type TextProtocolResultEnvelopeSchemaId = typeof resultEnvelopeSchemaId;
export type TextProtocolResultEnvelopeSchemaVersion = typeof resultEnvelopeSchemaVersion;
export type TextProtocolResultEnvelopeJsonMediaType =
  typeof textProtocolResultEnvelopeJsonMediaType;
export type TextProtocolPayloadKind =
  | typeof textProtocolPayloadKindTextdocDocumentV1
  | typeof textProtocolPayloadKindTextpipelineTraceV1
  | typeof textProtocolPayloadKindTextconformanceReportV1
  | typeof textProtocolPayloadKindVerticalSliceResultV1;

export type TextProtocolDiagnosticSeverity = "info" | "warning" | "error";

export interface TextProtocolProducerRef {
  readonly package: string;
  readonly version: string;
}

export interface TextProtocolReferenceRef {
  readonly kind: string;
  readonly id: string;
}

export interface TextProtocolSourceProvenance {
  readonly id: string;
  readonly sha256?: string;
}

export interface TextProtocolProvenance {
  readonly source?: TextProtocolSourceProvenance;
  readonly references?: readonly TextProtocolReferenceRef[];
}

export interface TextProtocolDiagnostic {
  readonly code: string;
  readonly severity: TextProtocolDiagnosticSeverity;
  readonly message?: string;
}

export interface TextProtocolPayloadKindDescriptor {
  readonly payloadKind: TextProtocolPayloadKind;
  readonly ownerPackage: string;
  readonly schemaId?: string;
  readonly schemaVersion?: string | number;
  readonly description: string;
}

export interface TextProtocolEnvelopeCompatibilityOptions {
  readonly expectedPayloadKind?: TextProtocolPayloadKind;
  readonly expectedProducerPackage?: string;
  readonly requireProvenance?: boolean;
  readonly requireClaimBoundary?: boolean;
  readonly requireLimitations?: boolean;
}

export interface TextProtocolEnvelopeCompatibilityResult {
  readonly ok: boolean;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextProtocolVersionNegotiationResult {
  readonly ok: boolean;
  readonly schemaId: TextProtocolResultEnvelopeSchemaId;
  readonly requestedVersions: readonly number[];
  readonly supportedVersions: readonly TextProtocolResultEnvelopeSchemaVersion[];
  readonly selectedVersion?: TextProtocolResultEnvelopeSchemaVersion;
  readonly diagnostics: readonly TextProtocolDiagnostic[];
}

export interface TextProtocolResultEnvelopeJsonTransportV1 {
  readonly mediaType: TextProtocolResultEnvelopeJsonMediaType;
  readonly schemaId: TextProtocolResultEnvelopeSchemaId;
  readonly schemaVersion: TextProtocolResultEnvelopeSchemaVersion;
  readonly body: string;
}

export interface TextProtocolResultEnvelopeV1<
  TPayload = unknown,
  TPayloadKind extends string = string,
> {
  readonly schemaId: TextProtocolResultEnvelopeSchemaId;
  readonly schemaVersion: TextProtocolResultEnvelopeSchemaVersion;
  readonly producer: TextProtocolProducerRef;
  readonly payloadKind: TPayloadKind;
  readonly payload: TPayload;
  readonly provenance?: TextProtocolProvenance;
  readonly diagnostics?: readonly TextProtocolDiagnostic[];
  readonly claimBoundary?: string;
  readonly limitations?: readonly string[];
}

export const textProtocolPayloadKindRegistry: readonly TextProtocolPayloadKindDescriptor[] = [
  {
    payloadKind: textProtocolPayloadKindTextdocDocumentV1,
    ownerPackage: "@ismail-elkorchi/textdoc",
    schemaId: "https://github.com/Ismail-elkorchi/text-computing/schemas/textdoc-document-v1.schema.json",
    schemaVersion: 1,
    description: "textdoc document annotation model v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindTextpipelineTraceV1,
    ownerPackage: "@ismail-elkorchi/textpipeline",
    schemaId:
      "https://github.com/Ismail-elkorchi/text-computing/schemas/textpipeline-trace-v1.schema.json",
    schemaVersion: 1,
    description: "textpipeline deterministic processor trace v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindTextconformanceReportV1,
    ownerPackage: "@ismail-elkorchi/textconformance",
    schemaId:
      "https://github.com/Ismail-elkorchi/text-computing/schemas/textconformance-report-v1.schema.json",
    schemaVersion: 1,
    description: "textconformance report v1 payload.",
  },
  {
    payloadKind: textProtocolPayloadKindVerticalSliceResultV1,
    ownerPackage: "text-computing",
    description: "Public Vertical Slice 0.1 result payload.",
  },
] as const;

export const textProtocolSupportedResultEnvelopeSchemaVersions: readonly TextProtocolResultEnvelopeSchemaVersion[] =
  [resultEnvelopeSchemaVersion] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

export function isTextProtocolPayloadKind(value: unknown): value is TextProtocolPayloadKind {
  return textProtocolPayloadKindRegistry.some((entry) => entry.payloadKind === value);
}

export function getTextProtocolPayloadKindDescriptor(
  payloadKind: string,
): TextProtocolPayloadKindDescriptor | undefined {
  return textProtocolPayloadKindRegistry.find((entry) => entry.payloadKind === payloadKind);
}

export function isTextProtocolProducerRef(value: unknown): value is TextProtocolProducerRef {
  return (
    isRecord(value) &&
    isNonEmptyString(value.package) &&
    isNonEmptyString(value.version)
  );
}

export function isTextProtocolReferenceRef(value: unknown): value is TextProtocolReferenceRef {
  return isRecord(value) && isNonEmptyString(value.kind) && isNonEmptyString(value.id);
}

export function isTextProtocolSourceProvenance(
  value: unknown,
): value is TextProtocolSourceProvenance {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.sha256 === undefined || isNonEmptyString(value.sha256))
  );
}

export function isTextProtocolProvenance(value: unknown): value is TextProtocolProvenance {
  return (
    isRecord(value) &&
    (value.source === undefined || isTextProtocolSourceProvenance(value.source)) &&
    (value.references === undefined ||
      (Array.isArray(value.references) &&
        value.references.every((entry) => isTextProtocolReferenceRef(entry))))
  );
}

export function isTextProtocolDiagnostic(value: unknown): value is TextProtocolDiagnostic {
  return (
    isRecord(value) &&
    isNonEmptyString(value.code) &&
    (value.severity === "info" || value.severity === "warning" || value.severity === "error") &&
    (value.message === undefined || isNonEmptyString(value.message))
  );
}

function compatibilityError(code: string, message: string): TextProtocolDiagnostic {
  return { code, severity: "error", message };
}

function hasErrorDiagnostics(diagnostics: readonly TextProtocolDiagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}

function uniqueSortedNumbers(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => right - left);
}

function compareStableJsonKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

function stableJsonStringifyValue(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("textprotocol JSON transport cannot serialize non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringifyValue(entry, seen)).join(",")}]`;
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      throw new TypeError("textprotocol JSON transport cannot serialize cyclic values");
    }
    seen.add(value);
    const objectEntries = Object.entries(value);
    for (const [key, entry] of objectEntries) {
      if (entry === undefined) {
        throw new TypeError(
          `textprotocol JSON transport cannot serialize undefined object property ${key}`,
        );
      }
    }
    const entries = objectEntries
      .sort(([left], [right]) => compareStableJsonKeys(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJsonStringifyValue(entry, seen)}`);
    seen.delete(value);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`textprotocol JSON transport cannot serialize ${typeof value}`);
}

function stableJsonStringify(value: unknown): string {
  return stableJsonStringifyValue(value, new WeakSet());
}

export function isTextProtocolResultEnvelopeV1(
  value: unknown,
): value is TextProtocolResultEnvelopeV1 {
  return (
    isRecord(value) &&
    value.schemaId === resultEnvelopeSchemaId &&
    value.schemaVersion === resultEnvelopeSchemaVersion &&
    isTextProtocolProducerRef(value.producer) &&
    isNonEmptyString(value.payloadKind) &&
    "payload" in value &&
    (value.provenance === undefined || isTextProtocolProvenance(value.provenance)) &&
    (value.diagnostics === undefined ||
      (Array.isArray(value.diagnostics) &&
        value.diagnostics.every((entry) => isTextProtocolDiagnostic(entry)))) &&
    (value.claimBoundary === undefined || isNonEmptyString(value.claimBoundary)) &&
    (value.limitations === undefined || isStringArray(value.limitations))
  );
}

export function isTextProtocolResultEnvelopeForPayloadKind<
  TPayloadKind extends TextProtocolPayloadKind,
>(
  value: unknown,
  payloadKind: TPayloadKind,
): value is TextProtocolResultEnvelopeV1<unknown, TPayloadKind> {
  return isTextProtocolResultEnvelopeV1(value) && value.payloadKind === payloadKind;
}

export function negotiateTextProtocolResultEnvelopeVersion(
  requestedVersions: readonly number[],
): TextProtocolVersionNegotiationResult {
  const diagnostics: TextProtocolDiagnostic[] = [];
  const requested = uniqueSortedNumbers(requestedVersions);
  if (requested.length === 0) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.version-request-empty",
        "At least one requested result-envelope schema version is required.",
      ),
    );
  }
  for (const version of requested) {
    if (!Number.isInteger(version) || version <= 0) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.version-request-invalid",
          "Requested result-envelope schema versions must be positive integers.",
        ),
      );
    }
  }
  const selectedVersion = requested.find((version) =>
    textProtocolSupportedResultEnvelopeSchemaVersions.includes(
      version as TextProtocolResultEnvelopeSchemaVersion,
    ),
  ) as TextProtocolResultEnvelopeSchemaVersion | undefined;
  if (selectedVersion === undefined && diagnostics.length === 0) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.version-unsupported",
        `No requested result-envelope schema version is supported. Supported versions: ${textProtocolSupportedResultEnvelopeSchemaVersions.join(", ")}.`,
      ),
    );
  }
  return {
    ok: selectedVersion !== undefined && !hasErrorDiagnostics(diagnostics),
    schemaId: resultEnvelopeSchemaId,
    requestedVersions: requested,
    supportedVersions: textProtocolSupportedResultEnvelopeSchemaVersions,
    ...(selectedVersion === undefined ? {} : { selectedVersion }),
    diagnostics,
  };
}

export function isTextProtocolResultEnvelopeJsonTransportV1(
  value: unknown,
): value is TextProtocolResultEnvelopeJsonTransportV1 {
  return (
    isRecord(value) &&
    value.mediaType === textProtocolResultEnvelopeJsonMediaType &&
    value.schemaId === resultEnvelopeSchemaId &&
    value.schemaVersion === resultEnvelopeSchemaVersion &&
    typeof value.body === "string"
  );
}

export function checkTextProtocolResultEnvelopeCompatibility(
  value: unknown,
  options: TextProtocolEnvelopeCompatibilityOptions = {},
): TextProtocolEnvelopeCompatibilityResult {
  const diagnostics: TextProtocolDiagnostic[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      diagnostics: [
        compatibilityError("textprotocol.envelope-not-object", "Result envelope must be an object."),
      ],
    };
  }

  if (value.schemaId !== resultEnvelopeSchemaId) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-id",
        `Result envelope schemaId must be ${resultEnvelopeSchemaId}.`,
      ),
    );
  }

  if (value.schemaVersion !== resultEnvelopeSchemaVersion) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.schema-version",
        `Result envelope schemaVersion must be ${resultEnvelopeSchemaVersion}.`,
      ),
    );
  }

  if (!isTextProtocolProducerRef(value.producer)) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.producer",
        "Result envelope producer must declare non-empty package and version.",
      ),
    );
  } else if (
    options.expectedProducerPackage !== undefined &&
    value.producer.package !== options.expectedProducerPackage
  ) {
    diagnostics.push(
      compatibilityError(
        "textprotocol.producer-package",
        `Result envelope producer package must be ${options.expectedProducerPackage}.`,
      ),
    );
  }

  if (!isNonEmptyString(value.payloadKind)) {
    diagnostics.push(
      compatibilityError("textprotocol.payload-kind", "Result envelope payloadKind must be non-empty."),
    );
  } else {
    if (!isTextProtocolPayloadKind(value.payloadKind)) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.payload-kind-unregistered",
          `Result envelope payloadKind ${value.payloadKind} is not registered.`,
        ),
      );
    }
    if (
      options.expectedPayloadKind !== undefined &&
      value.payloadKind !== options.expectedPayloadKind
    ) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.payload-kind-expected",
          `Result envelope payloadKind must be ${options.expectedPayloadKind}.`,
        ),
      );
    }
  }

  if (!("payload" in value)) {
    diagnostics.push(
      compatibilityError("textprotocol.payload-missing", "Result envelope payload is required."),
    );
  }

  if (value.provenance === undefined) {
    if (options.requireProvenance === true) {
      diagnostics.push(
        compatibilityError("textprotocol.provenance-missing", "Result envelope provenance is required."),
      );
    }
  } else if (!isTextProtocolProvenance(value.provenance)) {
    diagnostics.push(
      compatibilityError("textprotocol.provenance", "Result envelope provenance is invalid."),
    );
  }

  if (
    value.diagnostics !== undefined &&
    (!Array.isArray(value.diagnostics) ||
      !value.diagnostics.every((entry: unknown) => isTextProtocolDiagnostic(entry)))
  ) {
    diagnostics.push(
      compatibilityError("textprotocol.diagnostics", "Result envelope diagnostics are invalid."),
    );
  }

  if (value.claimBoundary === undefined) {
    if (options.requireClaimBoundary === true) {
      diagnostics.push(
        compatibilityError(
          "textprotocol.claim-boundary-missing",
          "Result envelope claimBoundary is required.",
        ),
      );
    }
  } else if (!isNonEmptyString(value.claimBoundary)) {
    diagnostics.push(
      compatibilityError("textprotocol.claim-boundary", "Result envelope claimBoundary is invalid."),
    );
  }

  if (value.limitations === undefined) {
    if (options.requireLimitations === true) {
      diagnostics.push(
        compatibilityError("textprotocol.limitations-missing", "Result envelope limitations are required."),
      );
    }
  } else if (!isStringArray(value.limitations)) {
    diagnostics.push(
      compatibilityError("textprotocol.limitations", "Result envelope limitations are invalid."),
    );
  }

  return {
    ok: !hasErrorDiagnostics(diagnostics),
    diagnostics,
  };
}

export function serializeTextProtocolResultEnvelopeJson(
  value: TextProtocolResultEnvelopeV1,
  options: TextProtocolEnvelopeCompatibilityOptions = {},
): TextProtocolResultEnvelopeJsonTransportV1 {
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(value, options);
  if (!compatibility.ok) {
    throw new TypeError(
      `Cannot serialize incompatible textprotocol result envelope: ${compatibility.diagnostics
        .map((entry) => entry.code)
        .join(", ")}`,
    );
  }
  return {
    mediaType: textProtocolResultEnvelopeJsonMediaType,
    schemaId: resultEnvelopeSchemaId,
    schemaVersion: resultEnvelopeSchemaVersion,
    body: stableJsonStringify(value),
  };
}

export function parseTextProtocolResultEnvelopeJson(
  transport: TextProtocolResultEnvelopeJsonTransportV1,
  options: TextProtocolEnvelopeCompatibilityOptions = {},
): TextProtocolResultEnvelopeV1 {
  if (!isTextProtocolResultEnvelopeJsonTransportV1(transport)) {
    throw new TypeError("textprotocol result-envelope JSON transport wrapper is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(transport.body);
  } catch (error) {
    throw new TypeError(`textprotocol result-envelope JSON body is invalid: ${String(error)}`);
  }
  const compatibility = checkTextProtocolResultEnvelopeCompatibility(parsed, options);
  if (!compatibility.ok || !isTextProtocolResultEnvelopeV1(parsed)) {
    throw new TypeError(
      `Parsed textprotocol result envelope is incompatible: ${compatibility.diagnostics
        .map((entry) => entry.code)
        .join(", ")}`,
    );
  }
  return parsed;
}
