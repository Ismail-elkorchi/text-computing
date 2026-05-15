# CoNLL-U dependency readiness fixtures

This directory contains public readiness fixtures for CoNLL-U / Universal Dependencies import-export and dependency-target annotation work.

The fixture set is intentionally readiness-only:

- `slices.json` records valid and invalid fixture paths and the recorded round-trip target contract.
- `expected/` records the exact fixture-scope export strings and layer counts.
- `tool-versions.json` records public standards, validator sources, and future comparator roles.
- `validation/` records executed external CoNLL-U validator outcomes for every frozen fixture.
- `valid/` contains small repository-authored CoNLL-U inputs that should parse and map to dependency targets.
- `invalid/` contains negative controls that must fail before importer/exporter behavior is implemented.

CoNLL-U fixture files keep the sentence-final blank separator required by the external validator. Repository whitespace attributes allow that format-specific trailing blank line for `*.conllu` files only.

No dependency parser or broad Universal Dependencies treebank support is claimed by these fixtures.
