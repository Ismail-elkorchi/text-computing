# Tokenization and sentence boundary fixtures

This directory stores issue #9 readiness fixtures.

- `slices.json` defines input slices and coverage purposes.
- `tool-versions.json` records normative references, package-under-test versions, and diagnostic tools used for output inspection.
- `comparisons/` stores diagnostic output snapshots from pinned external tools.
- `expected/` stores recorded expected outputs for accepted slices.
- Expected-output files must conform to `schemas/tokenization-sbd-expected-v1.schema.json` before behavior is added.
- Repository verification derives `textprotocol` result envelopes and
  `textconformance` reports from the recorded expected outputs to prove that
  issue `#9` outputs survive the public document/protocol/conformance path.

Current files define readiness structure, diagnostic comparison snapshots, and recorded expected outputs only; they do not add tokenization or sentence-boundary behavior.
