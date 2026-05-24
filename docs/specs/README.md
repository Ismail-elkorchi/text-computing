# Specifications

This directory stores public package specifications and repository-level contract documents.

A specification document must state its scope, version, normative language, and verification expectations before implementation depends on it.

## Documents

- [`tokenization-sbd-readiness.md`](tokenization-sbd-readiness.md)
- [`pos-morph-lemma-readiness.md`](pos-morph-lemma-readiness.md) — readiness gate for issue `#10`.
- [`rule-backed-ner-readiness.md`](rule-backed-ner-readiness.md) — readiness gate for issue `#13`.
- [`corpus-tfidf-bm25-readiness.md`](corpus-tfidf-bm25-readiness.md) — readiness gate for issue `#14`.
- [`retrieval-readiness.md`](retrieval-readiness.md) — frozen-scope retrieval gate over explicit-token corpus fixtures.
- [`conllu-dependency-readiness.md`](conllu-dependency-readiness.md) — fixture-scope CoNLL-U / Universal Dependencies import-export round-trip gate.
- [`dependency-parser-readiness.md`](dependency-parser-readiness.md) — readiness gate and frozen-slice evidence for deterministic dependency parsing.
- [`relation-extraction-readiness.md`](relation-extraction-readiness.md) — typed relation extraction gate.
- [`coreference-readiness.md`](coreference-readiness.md) — frozen-slice mention and chain gate.
- [`performance-gates.md`](performance-gates.md) — performance and scale gate requirements before broad operational claims.
- [`package-release-gates.md`](package-release-gates.md) — package release-track and gate requirements.
- [`textcorpus-collection-contract.md`](textcorpus-collection-contract.md) — deterministic corpus collection and explicit-token fingerprint contract.
- [`textdoc-dependency-target-contract.md`](textdoc-dependency-target-contract.md) — minimal dependency-edge target contract for later CoNLL-U and dependency parsing work.
- [`textdoc-document-annotation-model.md`](textdoc-document-annotation-model.md) — structural contract for the document annotation model used by issue `#11`.
- [`textpipeline-processor-contract.md`](textpipeline-processor-contract.md) — deterministic processor ordering and trace contract.
- [`textpack-resource-manifest.md`](textpack-resource-manifest.md) — manifest and lookup contract for issue `#12`.
- [`multilingual-coverage.md`](multilingual-coverage.md) — multilingual fixture coverage axes and input seeds; not a support matrix.
