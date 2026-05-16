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
- [`pos-morph-lemma-comparison-v1.schema.json`](pos-morph-lemma-comparison-v1.schema.json) — diagnostic comparator output schema for issue `#10`.
- [`rule-backed-ner-expected-v1.schema.json`](rule-backed-ner-expected-v1.schema.json) — expected-output schema for issue `#13`.
- [`rule-backed-ner-slices-v1.schema.json`](rule-backed-ner-slices-v1.schema.json) — readiness slice schema for issue `#13`.
- [`rule-backed-ner-tool-versions-v1.schema.json`](rule-backed-ner-tool-versions-v1.schema.json) — frozen comparator/version schema for issue `#13`.
- [`rule-backed-ner-comparison-v1.schema.json`](rule-backed-ner-comparison-v1.schema.json) — diagnostic comparator output schema for issue `#13`.
- [`corpus-tfidf-bm25-expected-v1.schema.json`](corpus-tfidf-bm25-expected-v1.schema.json) — expected-output schema for issue `#14`.
- [`corpus-tfidf-bm25-slices-v1.schema.json`](corpus-tfidf-bm25-slices-v1.schema.json) — readiness corpus schema for issue `#14`.
- [`corpus-tfidf-bm25-tool-versions-v1.schema.json`](corpus-tfidf-bm25-tool-versions-v1.schema.json) — frozen formula/comparator schema for issue `#14`.
- [`corpus-tfidf-bm25-comparison-v1.schema.json`](corpus-tfidf-bm25-comparison-v1.schema.json) — diagnostic comparator output schema for issue `#14`.
- [`retrieval-expected-v1.schema.json`](retrieval-expected-v1.schema.json) — expected-output schema for frozen-scope retrieval behavior.
- [`conllu-dependency-slices-v1.schema.json`](conllu-dependency-slices-v1.schema.json) — CoNLL-U / UD readiness fixture schema.
- [`conllu-dependency-tool-versions-v1.schema.json`](conllu-dependency-tool-versions-v1.schema.json) — public source, validator, and future comparator role schema for CoNLL-U / UD readiness.
- [`conllu-dependency-roundtrip-expected-v1.schema.json`](conllu-dependency-roundtrip-expected-v1.schema.json) — expected-output schema for fixture-scope CoNLL-U round-trip behavior.
- [`conllu-validator-capture-v1.schema.json`](conllu-validator-capture-v1.schema.json) — external CoNLL-U validator capture schema.
- [`dependency-parser-slices-v1.schema.json`](dependency-parser-slices-v1.schema.json) — readiness slice schema for dependency-parser work.
- [`dependency-parser-expected-v1.schema.json`](dependency-parser-expected-v1.schema.json) — expected dependency-arc schema for parser readiness.
- [`dependency-parser-tool-versions-v1.schema.json`](dependency-parser-tool-versions-v1.schema.json) — comparator capability and standard source schema for parser readiness.
- [`dependency-parser-comparison-v1.schema.json`](dependency-parser-comparison-v1.schema.json) — comparator capability/capture schema for parser readiness.
- [`relation-extraction-slices-v1.schema.json`](relation-extraction-slices-v1.schema.json) — readiness fixture schema for relation extraction.
- [`relation-extraction-expected-v1.schema.json`](relation-extraction-expected-v1.schema.json) — expected-output schema for future relation extraction behavior.
- [`coreference-slices-v1.schema.json`](coreference-slices-v1.schema.json) — readiness fixture schema for coreference.
- [`coreference-expected-v1.schema.json`](coreference-expected-v1.schema.json) — expected-output schema for future coreference behavior.
- [`multilingual-support-tiers-v1.schema.json`](multilingual-support-tiers-v1.schema.json) — multilingual support-tier matrix schema.
- [`performance-gates-v1.schema.json`](performance-gates-v1.schema.json) — performance gate requirement schema.
- [`tokenization-sbd-comparison-v1.schema.json`](tokenization-sbd-comparison-v1.schema.json) — diagnostic comparator output schema for tokenization/SBD readiness.
- [`textdoc-token-sentence-annotation-set-v1.schema.json`](textdoc-token-sentence-annotation-set-v1.schema.json) — textdoc token/sentence annotation set schema.
- [`textdoc-document-v1.schema.json`](textdoc-document-v1.schema.json) — document annotation model schema for issue `#11`.
- [`textdoc-dependency-target-v1.schema.json`](textdoc-dependency-target-v1.schema.json) — minimal dependency-edge target contract for later CoNLL-U and dependency parsing work.
- [`textpipeline-trace-v1.schema.json`](textpipeline-trace-v1.schema.json) — deterministic processor trace schema.
- [`textpack-manifest-v1.schema.json`](textpack-manifest-v1.schema.json) — pack manifest schema for issue `#12`.
- [`support-status-v1.schema.json`](support-status-v1.schema.json) — canonical package and task support-status schema.
- [`toolkit-capability-scorecard-v1.schema.json`](toolkit-capability-scorecard-v1.schema.json) — evidence-linked package and task capability scorecard schema.
- [`textprotocol-result-envelope-v1.schema.json`](textprotocol-result-envelope-v1.schema.json) — result envelope schema for public repository outputs.
- [`textconformance-report-v1.schema.json`](textconformance-report-v1.schema.json) — machine-readable conformance report schema.
- [`task-evidence-manifest-v1.schema.json`](task-evidence-manifest-v1.schema.json) — repository manifest for persisted task evidence reports.
- [`evidence-run-v1.schema.json`](evidence-run-v1.schema.json) — replayable comparator/evidence run schema.
- [`evidence-ledger-v1.schema.json`](evidence-ledger-v1.schema.json) — repository evidence ledger schema.
