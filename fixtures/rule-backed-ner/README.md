# Rule-backed NER fixtures

This fixture set records readiness artifacts for issue `#13`.

- `slices.json` freezes the multilingual rule-backed NER slices that feature work must cover.
- `tool-versions.json` freezes comparator versions, the supported label policy, and the
  diagnostic comparator set.
- `comparisons/` stores committed diagnostic comparator outputs from pinned external tools.
- `expected/` stores recorded goldens that validate against
  `schemas/rule-backed-ner-expected-v1.schema.json`.

This readiness set does not yet claim implemented named entity behavior.
