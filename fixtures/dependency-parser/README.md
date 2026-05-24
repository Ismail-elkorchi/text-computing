# Dependency parser fixtures

These fixtures freeze expected dependency arcs and comparator evidence for the current dependency-parser
slice.

Current status:

- deterministic expected arcs for declared frozen slices;
- expected arcs are derived from repository-authored CoNLL-U fixture rows;
- comparator files include executed spaCy and Stanza model-output captures, direct UD validation, and a JavaScript gap record;
- broad Universal Dependencies support is not claimed.

The next gate must broaden UD slices, performance thresholds, and JavaScript gap resolution before wider parser behavior.
