# Tokenization and sentence boundary fixtures

This directory stores issue #9 readiness fixtures.

- `slices.json` defines input slices and coverage purposes.
- `tool-versions.json` records normative references and package-under-test versions.
- `expected/` stores recorded expected outputs for accepted slices.
- Expected-output files must conform to `schemas/tokenization-sbd-expected-v1.schema.json` before behavior is added.

Current files define readiness structure, recorded expected outputs, and behavior verification artifacts for the committed slices only. They do not establish broad language or tokenizer coverage.
