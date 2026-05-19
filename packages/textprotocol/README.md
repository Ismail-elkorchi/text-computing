# `@ismail-elkorchi/textprotocol`

Text-computing result envelope package.

The current public surface defines the repository result-envelope contract used to
serialize deterministic outputs together with producer metadata, payload kind,
optional provenance, and diagnostics.

The package also defines a small registered payload-kind set for package interop:

- `textdoc-document-v1`
- `textpipeline-trace-v1`
- `textconformance-report-v1`
- `public-vertical-slice-0.1-result-v1`

Compatibility checks can require producer identity, provenance, claim-boundary text, and limitation
metadata before a result envelope is treated as release evidence.

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
