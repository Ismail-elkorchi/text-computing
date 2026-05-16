# CoNLL-U / UD dependency readiness research ledger

- **Status:** Slice-proven for frozen fixtures
- **Task id:** `nlp-conllu-dependency-roundtrip`
- **Scope:** Public evidence ledger for CoNLL-U / Universal Dependencies import-export round-trip and dependency-target annotation preparation

## Scope

This ledger supports the next dependency-parsing and CoNLL-U interchange gate. It records public sources and legacy-debt constraints before implementation starts.

The immediate task is not to build a parser. The immediate task is to make sure dependency annotations have a reproducible carrier format, negative controls, and recorded round-trip evidence over frozen fixtures.

## Primary public sources

- Universal Dependencies CoNLL-U format — `https://universaldependencies.org/format.html`
- Universal Dependencies guidelines — `https://universaldependencies.org/guidelines.html`
- Universal Dependencies v2 paper — `https://aclanthology.org/2020.lrec-1.497/`
- UniversalDependencies/tools validator — `https://github.com/UniversalDependencies/tools`

## Comparator and validator evidence

The readiness gate records the official UD format and guideline sources as standard references. It also records an executed UniversalDependencies/tools validator capture at commit `ee98e50bfc59b5a1a7e5024d7edbad148a992894`.

The executed capture is format/syntax evidence only. It proves that the frozen valid fixtures are accepted by the external validator and that the frozen invalid fixtures are rejected. It does not prove parser accuracy or broad Universal Dependencies treebank coverage.

Parser comparator captures are intentionally not claimed in this CoNLL-U round-trip gate. Dependency parser comparator and feature evidence lives in the separate dependency-parser gate.

## Legacy-debt constraints

- Do not treat a dependency parser, a CoNLL-U reader, and a document annotation model as the same component.
- Do not hide malformed input recovery behind silent permissive parsing.
- Do not collapse root arcs into ordinary token-to-token edges.
- Do not drop multiword-token rows merely because they do not carry HEAD/DEPREL values.
- Do not claim language coverage from repository-authored smoke fixtures.

## Readiness consequences

The current validator proves:

- valid fixtures parse according to the subset checked by the readiness gate;
- valid fixtures pass the recorded external UniversalDependencies/tools validation capture;
- invalid fixtures fail for the declared reason;
- invalid fixtures fail the recorded external UniversalDependencies/tools validation capture;
- dependency targets validate against `schemas/textdoc-dependency-target-v1.schema.json`;
- valid fixtures round-trip through `textdoc`, `textprotocol`, and `textconformance`;
- support status marks the task as `slice-proven` only for the frozen fixtures, not parser behavior.
