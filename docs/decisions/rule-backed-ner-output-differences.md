# Rule-backed NER output differences

## Status

Accepted for readiness gating.

## Documented non-failure differences

The following differences are recorded and must not be treated as automatic failures in issue
`#13`:

1. **Label-taxonomy mismatch**
   - `spaCy` exposes labels such as `PERSON`, `ORG`, and `GPE` that do not map one-to-one to
     the current `PER` / `ORG` / `LOC` policy.
   - Readiness requirement: mappings and out-of-scope labels must remain explicit.
2. **Flat versus nested spans**
   - External toolkits may emit only flat spans, while repository outputs must be able to represent
     nested or overlapping spans when the slice demands them.
   - Readiness requirement: flat comparator output is diagnostic evidence, not a reason to narrow
     the repository representation.
3. **Alias grouping differences**
   - Heuristic systems such as `compromise` may group a canonical organization name and its
     acronym into one larger span, while repository goldens keep them as separate spans.
   - Readiness requirement: grouped versus separate alias spans must be recorded per slice instead
     of silently normalized away.
4. **Punctuation attachment and span inflation**
   - Comparator surfaces may include surrounding punctuation or determiners (for example
     `Alice Smith.` or `The University of California`) when the repository golden trims those
     characters from the entity span.
   - Readiness requirement: punctuation and determiner attachment remain explicit non-failure
     differences.
5. **Comparator language coverage limitations**
   - The frozen comparator set is English-first, so Spanish and Arabic readiness slices may be
     recorded as `not-run` rather than as false negatives from an undeclared model.
   - Readiness requirement: language-surface limitations must remain explicit in committed
     comparator captures.
6. **Capitalization ambiguity and false matches**
   - Lowercased common nouns and capitalized names may be treated differently across toolkits.
   - Readiness requirement: false positives and false negatives caused by capitalization remain
     explicit in the fixture policy and slice notes.
