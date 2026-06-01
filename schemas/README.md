# Repository schemas

This directory stores repository-level JSON Schemas.

Package-local schemas remain inside the package that owns their runtime or documentation contract, such as `packages/textfacts/schemas/`.

## Repository-level schemas

- [`tokenization-sbd-expected-v1.schema.json`](tokenization-sbd-expected-v1.schema.json)
- [`tokenization-sbd-slices-v1.schema.json`](tokenization-sbd-slices-v1.schema.json)
- [`tokenization-sbd-tool-versions-v1.schema.json`](tokenization-sbd-tool-versions-v1.schema.json)
- [`tokenization-sbd-corpus-aggregate-v1.schema.json`](tokenization-sbd-corpus-aggregate-v1.schema.json) — curated corpus aggregate schema for tokenization/SBD evidence.
- [`pos-morph-lemma-expected-v1.schema.json`](pos-morph-lemma-expected-v1.schema.json) — expected-output schema for issue `#10`.
- [`pos-morph-lemma-slices-v1.schema.json`](pos-morph-lemma-slices-v1.schema.json) — readiness slice schema for issue `#10`.
- [`pos-morph-lemma-tool-versions-v1.schema.json`](pos-morph-lemma-tool-versions-v1.schema.json) — target contract schema for issue `#10`.
- [`pos-morph-lemma-corpus-evaluation-v1.schema.json`](pos-morph-lemma-corpus-evaluation-v1.schema.json) — UD-style corpus evaluation input schema for POS/morph/lemma evidence.
- [`pos-morph-lemma-corpus-evaluation-report-v1.schema.json`](pos-morph-lemma-corpus-evaluation-report-v1.schema.json) — UD-style corpus evaluation report schema for POS/morph/lemma evidence.
- [`rule-backed-ner-expected-v1.schema.json`](rule-backed-ner-expected-v1.schema.json) — expected-output schema for issue `#13`.
- [`rule-backed-ner-slices-v1.schema.json`](rule-backed-ner-slices-v1.schema.json) — readiness slice schema for issue `#13`.
- [`rule-backed-ner-tool-versions-v1.schema.json`](rule-backed-ner-tool-versions-v1.schema.json) — label policy schema for issue `#13`.
- [`corpus-tfidf-bm25-expected-v1.schema.json`](corpus-tfidf-bm25-expected-v1.schema.json) — expected-output schema for issue `#14`.
- [`corpus-tfidf-bm25-slices-v1.schema.json`](corpus-tfidf-bm25-slices-v1.schema.json) — readiness corpus schema for issue `#14`.
- [`corpus-tfidf-bm25-tool-versions-v1.schema.json`](corpus-tfidf-bm25-tool-versions-v1.schema.json) — frozen formula schema for issue `#14`.
- [`retrieval-expected-v1.schema.json`](retrieval-expected-v1.schema.json) — expected-output schema for frozen-scope retrieval behavior.
- [`retrieval-qrels-v1.schema.json`](retrieval-qrels-v1.schema.json) — relevance-judgment schema for frozen-scope retrieval behavior.
- [`retrieval-evaluation-v1.schema.json`](retrieval-evaluation-v1.schema.json) — expected evaluation-metric schema for frozen-scope retrieval behavior.
- [`conllu-dependency-slices-v1.schema.json`](conllu-dependency-slices-v1.schema.json) — CoNLL-U / UD readiness fixture schema.
- [`conllu-dependency-tool-versions-v1.schema.json`](conllu-dependency-tool-versions-v1.schema.json) — public source and validator schema for CoNLL-U / UD readiness.
- [`conllu-dependency-roundtrip-expected-v1.schema.json`](conllu-dependency-roundtrip-expected-v1.schema.json) — expected-output schema for fixture-scope CoNLL-U round-trip behavior.
- [`conllu-validator-capture-v1.schema.json`](conllu-validator-capture-v1.schema.json) — external CoNLL-U validator capture schema.
- [`dependency-parser-slices-v1.schema.json`](dependency-parser-slices-v1.schema.json) — readiness slice schema for dependency-parser work.
- [`dependency-parser-expected-v1.schema.json`](dependency-parser-expected-v1.schema.json) — expected dependency-arc schema for parser readiness.
- [`dependency-parser-tool-versions-v1.schema.json`](dependency-parser-tool-versions-v1.schema.json) — standard source schema for parser readiness.
- [`relation-extraction-slices-v1.schema.json`](relation-extraction-slices-v1.schema.json) — readiness fixture schema for relation extraction.
- [`relation-extraction-expected-v1.schema.json`](relation-extraction-expected-v1.schema.json) — expected-output schema for future relation extraction behavior.
- [`coreference-slices-v1.schema.json`](coreference-slices-v1.schema.json) — fixture schema for coreference.
- [`coreference-expected-v1.schema.json`](coreference-expected-v1.schema.json) — expected-output schema for frozen coreference behavior.
- [`multilingual-coverage-v1.schema.json`](multilingual-coverage-v1.schema.json) — multilingual coverage matrix schema.
- [`performance-gates-v1.schema.json`](performance-gates-v1.schema.json) — performance gate requirement schema.
- [`package-release-gates-v1.schema.json`](package-release-gates-v1.schema.json) — package release gate schema.
- [`textdoc-token-sentence-annotation-set-v1.schema.json`](textdoc-token-sentence-annotation-set-v1.schema.json) — textdoc token/sentence annotation set schema.
- [`textdoc-document-v1.schema.json`](textdoc-document-v1.schema.json) — document annotation model schema for issue `#11`.
- [`textdoc-dependency-target-v1.schema.json`](textdoc-dependency-target-v1.schema.json) — minimal dependency-edge target contract for later CoNLL-U and dependency parsing work.
- [`textdoc-task-graph-profile-v1.schema.json`](textdoc-task-graph-profile-v1.schema.json) — declarative task graph profile schema for textdoc validation.
- [`textdoc-task-graph-validation-report-v1.schema.json`](textdoc-task-graph-validation-report-v1.schema.json) — task graph validation report schema.
- [`textpipeline-trace-v1.schema.json`](textpipeline-trace-v1.schema.json) — deterministic processor trace schema.
- [`textpipeline-batch-run-report-v1.schema.json`](textpipeline-batch-run-report-v1.schema.json) — deterministic textpipeline batch run report schema.
- [`textpipeline-worker-run-report-v1.schema.json`](textpipeline-worker-run-report-v1.schema.json) — deterministic textpipeline worker run report schema.
- [`textpipeline-worker-pool-run-report-v1.schema.json`](textpipeline-worker-pool-run-report-v1.schema.json) — deterministic textpipeline worker-pool run report schema.
- [`textpack-manifest-v1.schema.json`](textpack-manifest-v1.schema.json) — pack manifest schema for issue `#12`.
- [`textpack-catalog-v1.schema.json`](textpack-catalog-v1.schema.json) — pack catalog schema for reference-pack evidence.
- [`textpack-review-report-v1.schema.json`](textpack-review-report-v1.schema.json) — pack review and vetting report schema.
- [`textpack-catalog-update-plan-v1.schema.json`](textpack-catalog-update-plan-v1.schema.json) — pack catalog update plan schema.
- [`textprotocol-result-envelope-v1.schema.json`](textprotocol-result-envelope-v1.schema.json) — result envelope schema for public repository outputs.
- [`textprotocol-document-bundle-v1.schema.json`](textprotocol-document-bundle-v1.schema.json) — protocol document-bundle envelope schema.
- [`textprotocol-annotation-bundle-v1.schema.json`](textprotocol-annotation-bundle-v1.schema.json) — protocol annotation-bundle envelope schema.
- [`textprotocol-evidence-bundle-v1.schema.json`](textprotocol-evidence-bundle-v1.schema.json) — protocol evidence-bundle envelope schema.
- [`textprotocol-processor-trace-v1.schema.json`](textprotocol-processor-trace-v1.schema.json) — protocol processor-trace envelope schema.
- [`textprotocol-corpus-metric-envelope-v1.schema.json`](textprotocol-corpus-metric-envelope-v1.schema.json) — protocol corpus-metric envelope schema.
- [`textprotocol-mapping-loss-report-v1.schema.json`](textprotocol-mapping-loss-report-v1.schema.json) — protocol mapping-loss report schema.
- [`textprotocol-protocol-error-v1.schema.json`](textprotocol-protocol-error-v1.schema.json) — protocol error envelope schema.
- [`textprotocol-registry-manifest-v1.schema.json`](textprotocol-registry-manifest-v1.schema.json) — protocol payload-kind and schema-family registry manifest schema.
- [`textconformance-report-v1.schema.json`](textconformance-report-v1.schema.json) — machine-readable conformance report schema.
- [`textconformance-suite-v1.schema.json`](textconformance-suite-v1.schema.json) — declarative conformance suite schema.
- [`textconformance-benchmark-report-v1.schema.json`](textconformance-benchmark-report-v1.schema.json) — benchmark report schema separate from conformance reports.
- [`textconformance-benchmark-threshold-policy-v1.schema.json`](textconformance-benchmark-threshold-policy-v1.schema.json) — benchmark threshold policy schema.
- [`textconformance-benchmark-threshold-evaluation-v1.schema.json`](textconformance-benchmark-threshold-evaluation-v1.schema.json) — benchmark threshold evaluation schema.
