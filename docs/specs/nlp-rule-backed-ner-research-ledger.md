# Rule-backed NER research ledger

## Scope

This ledger records the public sources used to freeze issue `#13` readiness artifacts. It is not a
claim that the repository has already matched the comparator behavior.

## Primary sources

1. **Flat-span shared-task and label baseline**
   - Erik F. Tjong Kim Sang and Fien De Meulder (2003), *Introduction to the CoNLL-2003 Shared
     Task: Language-Independent Named Entity Recognition*.
   - Source: https://aclanthology.org/W03-0419/
   - Relevance: fixes a widely used flat-span baseline and the familiar `PER` / `ORG` / `LOC`
     label surface for the current readiness gate.
2. **Named entity survey**
   - David Nadeau and Satoshi Sekine (2007), *A survey of named entity recognition and
     classification*.
   - Source: https://www.benjamins.com/catalog/li.30.1.03nad
   - Relevance: records the classical rule-based, dictionary-based, and evaluation design space
     that this repository must curate explicitly.
3. **Nested entity difficulty**
   - Xiaozhi Wang et al. (2018), *Deep Exhaustive Model for Nested Named Entity Recognition*.
   - Source: https://aclanthology.org/D18-1309/
   - Relevance: justifies dedicated readiness slices for nested and overlapping spans rather than
     assuming flat labels are sufficient.
4. **Capitalization robustness**
   - Md Arafat Sultan, Chuan-Jie Lin, and William Yang Wang (2019), *Robustness to Capitalization
     Errors in Named Entity Recognition*.
   - Source: https://aclanthology.org/D19-5531.pdf
   - Relevance: justifies capitalization-ambiguity slices and the requirement to document false
     matches separately from actual entity misses.

## Comparator capability evidence

- `spaCy` named entity component:
  - Source: https://spacy.io/api/entityrecognizer
  - Relevance: mature Python comparator with documented span-based entity output.
- `wink-nlp` entities API:
  - Source: https://winkjs.org/wink-nlp/entities.html
  - Relevance: JavaScript comparator that exposes entity spans and types through a compact API.
- `compromise` named-entities surface:
  - Source: https://www.npmjs.com/package/compromise/v/14.15.0
  - Relevance: JavaScript comparator with heuristic entity extraction and a narrower label surface.

## Readiness consequences

- The label policy must be explicit and narrower than the aggregate label sets exposed by external
  toolkits.
- Nested spans, overlapping spans, aliases, capitalization ambiguity, and false matches must all
  appear in the frozen slices before behavior begins.
- Comparator disagreement over flat spans, richer labels, and capitalization sensitivity is expected
  and must be documented as output differences rather than hidden in code.
