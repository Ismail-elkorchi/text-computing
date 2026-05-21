# Rule-backed NER fixtures

This fixture set records readiness and slice-level feature evidence for rule-backed named entity recognition.

- `slices.json` freezes the input slices, PER/ORG/LOC label policy controls, split roles, CC0-compatible corpus-style fixture metadata, and false-positive controls.
- `tool-versions.json` freezes comparator versions.
- `expected/` records current deterministic expected outputs.
- `manifests/` and `resources/` contain the explicit gazetteer fixture resources consumed by the validator.
- `comparisons/` records diagnostic comparator captures and explicit `not-run` entries where added holdouts were outside the frozen execution scope.

The fixtures are package-evaluation evidence only. They do not claim broad NER dataset coverage, broad label coverage, entity linking, or broad multilingual NER support.
