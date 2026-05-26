# Fixtures

This directory stores repository-level fixture material used by package tests and contract
validation.

- `inputs/` contains source inputs.
- `expected/` contains expected outputs.
- `generated/` contains generated artifacts that are checked in only when a repository command
  requires them.
- `reports/` contains task conformance report fixtures.
- `quarantine/` contains inputs withheld from required checks until their expected behavior is
  specified.

## Fixture sets

- [`tokenization-sbd/`](tokenization-sbd/)
- [`pos-morph-lemma/`](pos-morph-lemma/) — readiness slices, pack-backed lexicon fixtures, and recorded goldens for issue `#10`.
- [`rule-backed-ner/`](rule-backed-ner/) — multilingual readiness slices and recorded goldens for issue `#13`.
- [`corpus-tfidf-bm25/`](corpus-tfidf-bm25/) — explicit-token corpus slices and formula goldens for issue `#14`.
- [`retrieval/`](retrieval/) — explicit-token retrieval slice, expected hits, snippets, and explain output.
- [`conllu-dependency/`](conllu-dependency/) — valid, invalid, and expected-output CoNLL-U fixtures for dependency-target round-trip work.
- [`dependency-parser/`](dependency-parser/) — frozen expected dependency arcs and feature evidence for parser work.
- [`relation-extraction/`](relation-extraction/) — typed relation fixtures and negative controls.
- [`coreference/`](coreference/) — frozen mention/chain fixtures, expected outputs, and negative controls.
- [`multilingual-support/`](multilingual-support/) — coverage matrix and script input fixtures for multilingual fixture control.
- [`performance/`](performance/) — performance gate requirements for future operational statements.
- [`package-release/`](package-release/) — package release-track and release-gate requirements.
- [`textdoc/`](textdoc/) — curated document-model examples and invalid cases used to verify issue
  `#11`.
- [`textpack/`](textpack/) — licensed resource fixtures and manifest negatives used to verify issue
  `#12`.
- [`reports/`](reports/) — persisted `TextConformanceReportV1` fixture outputs
  artifacts for current slice-validated task surfaces.
