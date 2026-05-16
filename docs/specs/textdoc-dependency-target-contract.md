# textdoc dependency target contract

- **Status:** Slice-proven for frozen CoNLL-U round-trip fixtures
- **Scope:** Minimal dependency-edge target shape for CoNLL-U import-export and later dependency parsing work
- **Schema:** `schemas/textdoc-dependency-target-v1.schema.json`

## Contract boundary

This contract defines the dependency edge shape that `textdoc` documents carry for the frozen CoNLL-U round-trip fixtures. It is not a parser, scorer, or Universal Dependencies completeness claim.

The repository-level document schema now accepts dependency-node and dependency layers for the frozen round-trip scope. That support must not be read as dependency parser behavior.

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

- no dependency parser behavior defined by this document;
- no treebank-scale Universal Dependencies support claim;
- no enhanced-dependency graph semantics beyond preserving the originating CoNLL-U columns;
- no malformed-input recovery policy beyond rejecting current invalid fixtures.
