# CoNLL-U / UD dependency readiness research ledger

- **Status:** Readiness-only
- **Task id:** `nlp-conllu-dependency-readiness`
- **Scope:** Public evidence ledger for CoNLL-U / Universal Dependencies import-export and dependency-target annotation preparation

## Scope

This ledger supports the next dependency-parsing and CoNLL-U interchange gate. It records public sources and legacy-debt constraints before implementation starts.

The immediate task is not to build a parser. The immediate task is to make sure dependency annotations have a reproducible carrier format, negative controls, and round-trip evidence expectations.

## Primary public sources

- Universal Dependencies CoNLL-U format — `https://universaldependencies.org/format.html`
- Universal Dependencies guidelines — `https://universaldependencies.org/guidelines.html`
- Universal Dependencies v2 paper — `https://aclanthology.org/2020.lrec-1.497/`
- UniversalDependencies/tools validator — `https://github.com/UniversalDependencies/tools`

## Comparator and validator evidence

The readiness gate records the official UD format and guideline sources as standard references. It also records the public UD tools repository as a future validation reference.

Comparator captures are intentionally not claimed in this readiness gate. Parser and importer/exporter comparators must be frozen in a later feature gate before dependency behavior is implemented.

## Legacy-debt constraints

- Do not treat a dependency parser, a CoNLL-U reader, and a document annotation model as the same component.
- Do not hide malformed input recovery behind silent best-effort parsing.
- Do not collapse root arcs into ordinary token-to-token edges.
- Do not drop multiword-token rows merely because they do not carry HEAD/DEPREL values.
- Do not claim language coverage from repository-authored smoke fixtures.

## Readiness consequences

Implementation can start only after the validator proves:

- valid fixtures parse according to the subset checked by the readiness gate;
- invalid fixtures fail for the declared reason;
- dependency targets validate against `schemas/textdoc-dependency-target-v1.schema.json`;
- support status marks the task as `readiness-only`, not implemented behavior.
