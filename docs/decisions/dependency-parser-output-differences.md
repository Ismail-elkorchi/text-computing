# Dependency parser output differences

## Documented non-failure differences

These differences are acceptable only after they are recorded in comparator captures and bounded by the
fixture scope:

- Tokenization mismatch: a comparator may segment a surface form differently from the frozen CoNLL-U fixture.
- Multiword-token handling: a comparator may emit arcs over syntactic word rows, surface tokens, or both.
- Label-set mismatch: a comparator may emit language-specific labels or model labels requiring explicit mapping.
- Root convention mismatch: a comparator may expose root as self-head, null head, or index `0`; public outputs must normalize this explicitly.
- Non-projective behavior: parser algorithms may differ on non-projective arcs; no non-projective support is claimed yet.

## Not acceptable as silent differences

- Dropping arcs without diagnostics.
- Collapsing multiword-token rows into surface tokens without a recorded mapping.
- Replacing missing comparator output with expected gold arcs.
- Claiming parser support from CoNLL-U import/export behavior alone.
