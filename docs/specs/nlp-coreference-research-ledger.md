# NLP coreference research ledger

## Scope

This ledger covers readiness for mention detection and coreference-chain representation over explicit
text spans. It does not define discourse parsing, entity linking, or learned model training.

## Primary sources

- MUC-style and ACE-style coreference work motivates entity mentions, chains, and singleton handling.
- OntoNotes and CoNLL-2012 motivate span-backed mention clusters and explicit evaluation boundaries.
- Universal Anaphora-style work motivates cross-lingual annotation concerns and ambiguous mention policy.
- Neural coreference systems are useful comparators, but their confidence scores and model internals do
  not define this repository's deterministic representation.

## Comparator capability evidence

Comparator evidence for a later feature gate must record:

- exact tool name and version;
- command and environment sufficient for replay;
- input fixture ids and source hashes;
- mention spans and clusters returned by the comparator;
- mapping decisions into the repository mention and chain policy; and
- non-failure differences.

## Comparator limitations

Coreference comparators differ on singleton retention, mention-boundary policy, split antecedents,
cataphora, nested mentions, and language coverage. These differences must be represented explicitly
instead of hidden behind one flat score.

## Readiness consequences

- Mention spans remain first-class.
- Singleton mentions are preserved unless a later expected artifact explicitly excludes them.
- Ambiguity becomes diagnostics rather than silent resolution.
- Feature code must wait for expected outputs and executed comparator captures.
