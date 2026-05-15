# Dependency parser readiness fixtures

These fixtures freeze expected dependency arcs before dependency-parser behavior is implemented.

Current status:

- `readiness-only`;
- expected arcs are derived from repository-authored CoNLL-U fixture rows;
- comparator files include one executed spaCy model-output capture and remaining non-executed capability/gap records;
- no dependency parser behavior or broad Universal Dependencies support is claimed.

The next feature gate must broaden comparator captures before parser behavior is merged.
