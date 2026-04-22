# Repository schemas

This directory stores repository-level JSON Schemas.

Package-local schemas remain inside the package that owns their runtime or documentation contract, such as `packages/textfacts/schemas/`.

## Repository-level schemas

- [`tokenization-sbd-expected-v1.schema.json`](tokenization-sbd-expected-v1.schema.json)
- [`tokenization-sbd-slices-v1.schema.json`](tokenization-sbd-slices-v1.schema.json)
- [`tokenization-sbd-tool-versions-v1.schema.json`](tokenization-sbd-tool-versions-v1.schema.json)
- [`pos-morph-lemma-expected-v1.schema.json`](pos-morph-lemma-expected-v1.schema.json) — expected-output schema for issue `#10`.
- [`pos-morph-lemma-slices-v1.schema.json`](pos-morph-lemma-slices-v1.schema.json) — readiness slice schema for issue `#10`.
- [`pos-morph-lemma-tool-versions-v1.schema.json`](pos-morph-lemma-tool-versions-v1.schema.json) — frozen comparator/version schema for issue `#10`.
- [`rule-backed-ner-expected-v1.schema.json`](rule-backed-ner-expected-v1.schema.json) — expected-output schema for issue `#13`.
- [`rule-backed-ner-slices-v1.schema.json`](rule-backed-ner-slices-v1.schema.json) — readiness slice schema for issue `#13`.
- [`rule-backed-ner-tool-versions-v1.schema.json`](rule-backed-ner-tool-versions-v1.schema.json) — frozen comparator/version schema for issue `#13`.
- [`tokenization-sbd-comparison-v1.schema.json`](tokenization-sbd-comparison-v1.schema.json) — diagnostic comparator output schema for tokenization/SBD readiness.
- [`textdoc-token-sentence-annotation-set-v1.schema.json`](textdoc-token-sentence-annotation-set-v1.schema.json) — textdoc token/sentence annotation set schema.
- [`textdoc-document-v1.schema.json`](textdoc-document-v1.schema.json) — document annotation model schema for issue `#11`.
- [`textpipeline-trace-v1.schema.json`](textpipeline-trace-v1.schema.json) — deterministic processor trace schema.
- [`textpack-manifest-v1.schema.json`](textpack-manifest-v1.schema.json) — pack manifest schema for issue `#12`.
- [`support-status-v1.schema.json`](support-status-v1.schema.json) — canonical package and task support-status schema.
- [`textprotocol-result-envelope-v1.schema.json`](textprotocol-result-envelope-v1.schema.json) — result envelope schema for public repository outputs.
- [`textconformance-report-v1.schema.json`](textconformance-report-v1.schema.json) — machine-readable conformance report schema.
