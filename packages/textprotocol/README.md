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
