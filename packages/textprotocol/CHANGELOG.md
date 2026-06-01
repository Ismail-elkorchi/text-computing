# Changelog

## Next

- Extend processor-trace schema-family payloads to carry full textpipeline trace metadata and cached entries.
- Add external-validation assertions for schema-family transport of pack manifests owned by textpack.
- Add protocol-error helper APIs for converting compatibility diagnostics into schema-family envelopes.
- Add protocol schema-family descriptors, structural guards, repository schemas, and canonical JSON helper for document bundles, annotation bundles, evidence bundles, processor traces, corpus metrics, mapping-loss reports, and protocol errors.
- Register the `textpipeline-batch-run-report-v1` payload kind for textpipeline batch report exchange.
- Add deterministic JSON transport helpers for registered schema-family envelopes.

## 0.1.0

- Promote the result-envelope v1 package surface to public alpha for bounded package interop.
- Keep the alpha scope limited to schema version 1, supported-version negotiation, and deterministic JSON transport.

## 0.0.0

- Establish package workspace metadata.
- Add the `textprotocol-result-envelope-v1` contract and runtime guards for producer metadata, provenance, and diagnostics.
