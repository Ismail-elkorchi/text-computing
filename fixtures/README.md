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
- [`textdoc/`](textdoc/) — curated document-model examples and invalid cases used to prove issue
  `#11`.
- [`textpack/`](textpack/) — licensed resource fixtures and manifest negatives used to prove issue
  `#12`.
