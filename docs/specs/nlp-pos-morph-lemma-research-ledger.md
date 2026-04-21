# POS, morphology, and lemma research ledger

## Scope

This ledger records the public sources used to freeze issue `#10` readiness artifacts. It is not a
claim that the repository has already matched the comparator behavior.

## Primary sources

1. **Universal POS inventory**
   - Slav Petrov, Dipanjan Das, and Ryan McDonald (2012), *A Universal Part-of-Speech Tagset*.
   - Source: https://aclanthology.org/L12-1115/
   - Relevance: fixes the cross-tool POS target around a shared universal inventory.
2. **Universal Dependencies target**
   - Joakim Nivre et al. (2020), *Universal Dependencies v2: An Evergrowing Multilingual Treebank Collection*.
   - Source: https://aclanthology.org/2020.lrec-1.497/
   - Relevance: defines the target representation for UPOS and morphology in the readiness gate.
3. **UD annotation guidelines**
   - Universal Dependencies Guidelines.
   - Source: https://universaldependencies.org/guidelines.html
   - Relevance: grounds tokenization, word segmentation, multiword-token handling, and feature naming.
4. **Code-switch POS difficulty**
   - *Part-of-Speech Tagging for Code-Switched, Transliterated Texts without Explicit Language Identification*.
   - Source: https://aclanthology.org/D18-1347/
   - Relevance: justifies explicit code-switch slices and non-failure difference recording.
5. **Historical spelling difficulty**
   - *Normalizing Early English Letters to Present-day English Spelling*.
   - Source: https://aclanthology.org/W18-4510/
   - Relevance: justifies dedicated historical-spelling slices and conservative lemma policy.

## Comparator freeze rationale

- `spaCy 3.8.14` is the Python comparator surface because it exposes POS, lemma, and morphology in a
  mature pipeline with widely used annotations.
- `wink-nlp 2.4.0` with `wink-eng-lite-web-model 1.8.1` is the JavaScript comparator surface
  because it is lightweight, deterministic in deployment, and relevant to the TypeScript ecosystem.
- `compromise 14.15.0` remains a second JavaScript comparator because it exposes a simplified tag
  surface that highlights non-isomorphic mappings against UD.

## Readiness consequences

- Tag mapping cannot be implicit.
- Slice coverage must include ambiguity and non-standard surface forms, not only clean modern text.
- Output-difference documentation is part of acceptance because comparator disagreement is expected
  around clitics, historical forms, and code switching.
