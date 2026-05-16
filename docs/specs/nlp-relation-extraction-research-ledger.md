# NLP relation extraction research ledger

## Scope

This ledger covers readiness for typed relation extraction over explicit text spans. It does not define
entity linking, event extraction, open information extraction, or learned model training.

## Primary sources

- ACE-style relation extraction work supplies the historical distinction between entity mentions,
  relation arguments, and relation labels.
- TAC KBP relation extraction and slot-filling work motivates provenance and evidence spans.
- SemEval relation-classification tasks motivate explicit label inventories and negative examples.
- Open information extraction work is relevant as a comparator family, but it does not define this
  repository's typed closed-label semantics.

## Comparator capability evidence

Comparator evidence for a later feature gate must record:

- exact tool name and version;
- command and environment sufficient for replay;
- input fixture ids and source hashes;
- relation labels or open tuples returned by the comparator;
- mapping decisions into the repository label policy; and
- non-failure differences.

## Comparator limitations

Relation extraction surfaces differ across toolkits. Some emit typed relations, some emit open tuples,
some require trained models, and some require task-specific datasets. These differences are evidence
about behavior, not commands to widen the package boundary.

## Readiness consequences

- Relation arguments and evidence remain span-backed.
- Cooccurrence is not a relation without an evidence cue.
- Negation and ambiguity must become explicit diagnostics.
- Feature code must wait for expected outputs and executed comparator captures.
