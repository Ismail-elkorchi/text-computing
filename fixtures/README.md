# Fixtures

This directory stores repository-level fixture material used by package tests and contract
validation.

- `inputs/` contains source inputs.
- `expected/` contains expected outputs.
- `generated/` contains generated artifacts that are checked in only when a repository command
  requires them.
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
- [`textdoc/`](textdoc/) — curated document-model and invalid cases.
- [`textpack/`](textpack/) — licensed resource fixtures and manifest negatives used to verify issue
  `#12`.
