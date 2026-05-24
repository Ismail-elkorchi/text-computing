# Dependency parser output differences

## Documented non-failure differences

These differences are acceptable only after they are bounded by the fixture scope and represented in
product expected outputs or diagnostics:

- UD validator exact match: direct CoNLL-U validator acceptance proves fixture-format consistency, not parser prediction behavior.
- Tokenization mismatch: a parser may segment a surface form differently from the frozen CoNLL-U fixture.
- Multiword-token handling: parser outputs must specify whether arcs use syntactic word rows, surface tokens, or both.
- Label-set mismatch: parser outputs must map or preserve language-specific labels explicitly.
- Root convention mismatch: parser outputs must normalize root as index `0` or declare a loss marker.
- Non-projective behavior: parser algorithms may differ on non-projective arcs; no non-projective support is claimed yet.

## Recorded differences for frozen fixtures

- Current frozen expected arcs are copied from repository-authored CoNLL-U rows.
- The parser feature gate must not claim prediction quality from these expected arcs.

## Not acceptable as silent differences

- Dropping arcs without diagnostics.
- Collapsing multiword-token rows into surface tokens without a recorded mapping.
- Claiming parser support from CoNLL-U import/export behavior alone.
