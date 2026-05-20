# `@ismail-elkorchi/textprotocol`

Text-computing protocol schema package.

The current public surface defines the repository result-envelope contract and protocol schema-family
descriptors used to serialize deterministic outputs together with producer metadata, optional
provenance, diagnostics, limitations, and family-specific payloads.

The package also defines a small registered payload-kind set for package interop:

- `textdoc-document-v1`
- `textpipeline-trace-v1`
- `textconformance-report-v1`
- `public-vertical-slice-0.1-result-v1`

Compatibility checks can require producer identity, provenance, claim-boundary text, and limitation
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
The `pack-manifest` schema remains owned by `@ismail-elkorchi/textpack`.

## Compatibility policy

The package currently supports result-envelope schema version `1`.
Consumers can call `negotiateTextProtocolResultEnvelopeVersion()` to choose the highest supported
version from an offered set. A request with no common version fails closed and reports a diagnostic.

The package also defines one deterministic JSON transport wrapper:

- media type: `application/vnd.ismail-elkorchi.textprotocol.result-envelope.v1+json`;
- wrapper fields: `mediaType`, `schemaId`, `schemaVersion`, and `body`;
- body: stable JSON serialization of a compatible result envelope.

Use `serializeTextProtocolResultEnvelopeJson()` and `parseTextProtocolResultEnvelopeJson()` for this
transport. Other wire transports are not standardized by this package.

Use `canonicalizeTextProtocolJson()` when a caller needs deterministic JSON text before caller-owned
hashing or signing. This package does not define a network transport, signing protocol, or hash
algorithm.
