# Fixtures

This directory stores repository-level fixture material used by package tests and contract
validation.

- `inputs/` contains source inputs.
- `expected/` contains expected outputs.
- `generated/` contains generated artifacts that are checked in only when a repository command
  requires them.
- `reports/` contains validation reports.
- `quarantine/` contains inputs withheld from required checks until their expected behavior is
  specified.

## Fixture sets

- [`tokenization-sbd/`](tokenization-sbd/)
- [`pos-morph-lemma/`](pos-morph-lemma/) — readiness slices, pack-backed lexicon fixtures, and recorded goldens for issue `#10`.
- [`rule-backed-ner/`](rule-backed-ner/) — multilingual readiness slices, comparator captures, and recorded goldens for issue `#13`.
- [`corpus-tfidf-bm25/`](corpus-tfidf-bm25/) — explicit-token corpus slices, formula goldens, and comparator captures for issue `#14`.
- [`textdoc/`](textdoc/) — curated document-model examples and invalid cases used to prove issue
  `#11`.
- [`textpack/`](textpack/) — licensed resource fixtures and manifest negatives used to prove issue
  `#12`.
