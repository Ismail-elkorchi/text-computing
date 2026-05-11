# textdoc dependency target contract

- **Status:** Readiness-only
- **Scope:** Minimal dependency-edge target shape for later CoNLL-U import-export and dependency parsing work
- **Schema:** `schemas/textdoc-dependency-target-v1.schema.json`

## Contract boundary

This contract defines the dependency edge shape that later `textdoc` documents must be able to carry. It is not a parser, scorer, importer, exporter, or Universal Dependencies completeness claim.

The schema is separate from `schemas/textdoc-document-v1.schema.json` until the dependency annotation model is implemented. This prevents readiness artifacts from silently widening the production document model.

## Target model

A dependency target records:

- a stable dependency id;
- the dependent token id;
- the head token id, or `null` for root;
- the dependency relation label;
- source CoNLL-U coordinates.

The target unit is `token`. Deterministic ordering is by sentence order, dependent token id, head token id, then relation.

## CoNLL-U mapping

CoNLL-U token rows with integer ids produce dependency targets. Multiword-token range rows are preserved by the importer/exporter plan but do not produce dependency edges themselves.

For CoNLL-U:

- `ID` maps to `source.conlluId` and the dependent token id;
- `HEAD` maps to `source.conlluHead` and the head token id;
- `DEPREL` maps to `source.conlluDeprel` and `relation`;
- `HEAD = 0` maps to `headTokenId = null`.

## Non-goals

- no dependency parser behavior;
- no treebank-scale Universal Dependencies support claim;
- no enhanced-dependency graph semantics beyond preserving the originating CoNLL-U columns;
- no malformed-input recovery policy beyond rejecting current invalid fixtures.
