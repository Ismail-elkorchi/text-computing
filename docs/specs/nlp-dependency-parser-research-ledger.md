# NLP dependency parser research ledger

## Scope

This ledger covers readiness for a deterministic dependency parsing baseline. It does not claim parser
behavior. The current gate freezes expected arcs, one executed comparator capture, and remaining
capability/gap records.

## Primary sources

- Universal Dependencies CoNLL-U format: `https://universaldependencies.org/format.html`
  - Relevance: defines `HEAD`, `DEPREL`, basic dependency trees, enhanced dependencies, and row constraints.
- Universal Dependencies guidelines: `https://universaldependencies.org/guidelines.html`
  - Relevance: defines the cross-lingual annotation framework that dependency-parser outputs must map to.
- spaCy `DependencyParser`: `https://spacy.io/api/dependencyparser/`
  - Relevance: representative Python parser surface with token head/dependency outputs and transition-based design.
- Stanza dependency parsing: `https://stanfordnlp.github.io/stanza/depparse.html`
  - Relevance: representative Python neural parser surface producing UD-style dependency trees.
- Stanza system paper: `https://arxiv.org/abs/2003.07082`
  - Relevance: describes multilingual neural NLP pipeline coverage, including dependency parsing over UD treebanks.
- Universal Dependencies v2 overview paper: `https://arxiv.org/abs/2004.10643`
  - Relevance: describes UD v2 as a multilingual treebank collection and annotation framework.

## Comparator evidence

- `fixtures/dependency-parser/comparisons/spacy-3.8.json` records executed spaCy parser outputs for the
  frozen slices.
- `fixtures/dependency-parser/comparisons/stanza-1.12.json` records the Stanza 1.12.0 parser artifact surface.
- `fixtures/dependency-parser/comparisons/ud-validator-ee98e50.json` records direct UD/CoNLL-U validation of the frozen expected arcs. It is fixture-format evidence, not parser model-output evidence.
- `fixtures/dependency-parser/comparisons/javascript-gap-2026-05.json` records that no committed JavaScript
  dependency-parser comparator is available in this readiness gate.

## Comparator limitations

- Only the spaCy comparator has committed parser model-output capture in this gate.
- spaCy/Stanza behavior is model- and language-package-dependent.
- Stanza 1.12.0 execution remains uncommitted for this gate because its runtime depends on model assets that are not vendored in this repository.
- The UD validator capture proves frozen CoNLL-U row validity and expected-arc consistency; it does not prove parser behavior.
- JavaScript ecosystem comparison remains a gap to revisit before feature implementation.

## Readiness consequences

- Parser feature code must not start from the assumption that CoNLL-U I/O equals parsing.
- Parser output must target `textdoc` dependency annotations and pass through `textprotocol` and `textconformance`.
- Additional executed comparator captures are mandatory before a parser feature PR.
- The first parser implementation must preserve ambiguity or diagnostic failures rather than silently choosing arcs.
