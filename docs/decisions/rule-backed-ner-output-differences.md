# Rule-backed NER output differences

## Status

Accepted for readiness gating.

## Documented non-failure differences

The following differences are recorded and must not be treated as automatic failures in issue
`#13`:

1. **Label-taxonomy mismatch**
   - spaCy exposes labels such as `PERSON`, `ORG`, `GPE`, `FAC`, and others that do not map
     one-to-one to the current `PER` / `ORG` / `LOC` policy.
   - Readiness requirement: mappings and out-of-scope labels must remain explicit.
2. **Flat versus nested spans**
   - External toolkits may emit only flat spans, while repository outputs must be able to represent
     nested or overlapping spans when the slice demands them.
   - Readiness requirement: flat comparator output is diagnostic evidence, not a reason to narrow
     the repository representation.
3. **Alias handling**
   - Comparators may recognize only the canonical name, only the alias, or both.
   - Readiness requirement: alias disagreements must be recorded per slice instead of silently
     normalized away.
4. **Capitalization ambiguity**
   - Lowercased common nouns and capitalized names may be treated differently across toolkits.
   - Readiness requirement: false positives and false negatives caused by capitalization remain
     explicit in the fixture policy and slice notes.
5. **False matches from gazetteers or heuristics**
   - Heuristic systems may over-match substrings such as common nouns that share a surface with a
     company or location name.
   - Readiness requirement: false matches must be part of the frozen slice set before behavior is
     accepted.
