export const packageName = "@ismail-elkorchi/textprotocol" as const;
export const resultEnvelopeSchemaId =
  "urn:ismail-elkorchi:textprotocol:result-envelope:v1" as const;
export const resultEnvelopeSchemaVersion = 1 as const;

export type PackageName = typeof packageName;
export type TextProtocolResultEnvelopeSchemaId = typeof resultEnvelopeSchemaId;
export type TextProtocolResultEnvelopeSchemaVersion = typeof resultEnvelopeSchemaVersion;

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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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
        value.diagnostics.every((entry) => isTextProtocolDiagnostic(entry))))
  );
}
