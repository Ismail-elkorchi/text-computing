# POS, morphology, and lemma output differences

## Status

Accepted for readiness gating.

## Documented non-failure differences

The following differences are recorded and must not be treated as automatic failures in issue
`#10`:

1. **Tag-inventory mismatch**
   - spaCy and compromise expose inventories that do not match UD `UPOS` one-to-one.
   - Readiness requirement: mapping rules must be explicit and versioned.
2. **Clitics and multiword tokens**
   - Comparator outputs may differ when a surface form is segmented differently upstream.
   - Readiness requirement: record the difference at the slice level instead of hiding it.
3. **Historical spellings**
   - Comparators may keep surface lemmas, back off to coarse tags, or abstain on morphology.
   - Readiness requirement: ambiguity and abstention must remain explicit in the expected-output
     format.
4. **Code switching**
   - One side of a mixed-language slice may receive weaker analysis than the other.
   - Readiness requirement: record the asymmetry as a documented difference unless the target
     contract explicitly defines a stronger requirement.
5. **Unknown words**
   - Comparators may emit fallback tags such as `X`, language-specific coarse tags, or no lemma.
   - Readiness requirement: unknown handling must be testable and provenance-bearing.
