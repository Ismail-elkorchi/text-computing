# `@ismail-elkorchi/textprotocol`

Text-computing protocol schema package.

The current public surface defines the repository result-envelope contract and protocol schema-family
descriptors used to serialize deterministic outputs together with producer metadata, optional
provenance, diagnostics, limitations, and family-specific payloads.

The package also defines a small registered payload-kind set for package interop:

- `textdoc-document-v1`
- `textpipeline-trace-v1`
- `textpipeline-batch-run-report-v1`
- `textconformance-report-v1`
- `public-vertical-slice-0.1-result-v1`

Compatibility checks can require producer identity, provenance, scope-boundary text, and limitation
metadata before a result envelope is treated as release evidence.

The package also declares these protocol schema families:

- `pack-manifest`
- `document-bundle`
- `annotation-bundle`
- `evidence-bundle`
- `result-envelope`
- `processor-trace`
- `corpus-metric-envelope`
- `mapping-loss-report`
- `protocol-error`

Family guards validate protocol-owned envelope shapes without importing downstream package code.
The `pack-manifest` schema remains owned by `@ismail-elkorchi/textpack`; callers that validate a
manifest with the owning package can pass `externallyValidatedFamilies: ["pack-manifest"]` when
checking, serializing, parsing, or inspecting that schema family.
`createTextProtocolProtocolErrorPayloadFromDiagnostics()`,
`createTextProtocolProtocolErrorEnvelopeV1()`, and
`createTextProtocolProtocolErrorEnvelopeFromDiagnostics()` convert compatibility diagnostics into
machine-readable `protocol-error` envelopes for schema-family exchange.

## Compatibility policy

The package currently supports result-envelope schema version `1`.
Consumers can call `negotiateTextProtocolResultEnvelopeVersion()` to choose the highest supported
version from an offered set. A request with no common version fails closed and reports a diagnostic.

The package also defines one deterministic JSON transport wrapper:

- media type: `application/vnd.ismail-elkorchi.textprotocol.result-envelope.v1+json`;
- wrapper fields: `mediaType`, `schemaId`, `schemaVersion`, and `body`;
- body: stable JSON serialization of a compatible result envelope.

Use `serializeTextProtocolResultEnvelopeJson()` and `parseTextProtocolResultEnvelopeJson()` for this
transport.

The package also defines a deterministic JSON transport wrapper for registered schema-family
envelopes:

- media type: `application/vnd.ismail-elkorchi.textprotocol.schema-family-envelope.v1+json`;
- wrapper fields: `mediaType`, `schemaId`, `schemaVersion`, `family`, and `body`;
- body: stable JSON serialization of a compatible registered schema-family envelope.

Use `serializeTextProtocolSchemaFamilyEnvelopeJson()` and
`parseTextProtocolSchemaFamilyEnvelopeJson()` for document bundles, annotation bundles, evidence
bundles, processor traces, corpus metric envelopes, mapping-loss reports, protocol errors,
externally validated pack manifests, and other registered schema-family envelopes. Other wire
transports are not standardized by this package.

The package also exposes a registry manifest for the current protocol surface:

- `createTextProtocolRegistryManifestV1()`
- `isTextProtocolRegistryManifestV1()`
- `serializeTextProtocolRegistryManifestJson()`
- `parseTextProtocolRegistryManifestJson()`

The manifest lists registered payload-kind descriptors, schema-family descriptors, result-envelope
version support, JSON media types, summary counts, and limitations. Its schema is
[`../../schemas/textprotocol-registry-manifest-v1.schema.json`](../../schemas/textprotocol-registry-manifest-v1.schema.json).
The registry manifest does not replace owner validation for externally owned schema payloads.

Processor-trace envelopes can carry full textpipeline trace metadata, including execution mode, run
status, processor order, context fingerprint, cache policy, and cached processor entries.

Use `canonicalizeTextProtocolJson()` when a caller needs deterministic JSON text before caller-owned
hashing or signing. This package does not define a network transport, signing protocol, or hash
algorithm.

## Runnable examples

- [`../../examples/textprotocol-registry-manifest-consumer.mjs`](../../examples/textprotocol-registry-manifest-consumer.mjs)
  creates the registry manifest and round-trips it through canonical JSON transport.
