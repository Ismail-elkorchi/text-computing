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

- [`textdoc/`](textdoc/) — curated document-model and invalid cases.
- [`textpack/`](textpack/) — licensed resource fixtures and manifest negatives used to verify issue
  `#12`.
