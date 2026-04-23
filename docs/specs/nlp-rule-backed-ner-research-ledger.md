# Rule-backed NER research ledger

## Scope

This ledger records the public sources and comparator choices used to freeze issue `#13`
readiness artifacts. It is not a claim that the repository has already matched comparator behavior.

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
   - Source: https://aclanthology.org/D19-5531/
   - Relevance: justifies capitalization-ambiguity slices and the requirement to document false
     matches separately from actual entity misses.

## Comparator capability evidence

- `spaCy` named entity recognizer:
  - Source: https://spacy.io/api/entityrecognizer
  - Relevance: mature Python comparator with documented contiguous span output and explicit native
    labels.
- `compromise` organization / people / places surface:
  - Source: https://www.npmjs.com/package/compromise/v/14.15.0
  - Relevance: lightweight JavaScript heuristic comparator with organization, person, and place
    grouping behavior.
- `Stanza` multilingual pipeline:
  - Source: https://stanfordnlp.github.io/stanza/getting_started.html
  - Relevance: confirms that multilingual NER is a real competitor surface even though it is not
    the frozen comparator for this readiness gate.

## Comparator limitations

- The frozen comparator set in this repository is English-first. Spanish and Arabic readiness slices
  are mandatory, but their comparator captures may be recorded as `not-run` when the frozen
  comparator is outside its declared language surface.
- `winkNLP` is not the frozen JavaScript comparator for issue `#13` because its default
  `entities()` surface prioritizes dates, times, URLs, and other non-`PER`/`ORG`/`LOC`
  entities, with custom entities treated as a separate feature surface.
  - Source: https://winkjs.org/wink-nlp/entities.html
  - Source: https://winkjs.org/wink-nlp/learn-custom-entities.html

## Readiness consequences

- The label policy must remain explicit and narrower than the aggregate label sets exposed by
  external toolkits.
- Multilingual slices and recorded expected outputs are mandatory even when the frozen comparators
  are English-first.
- Comparator disagreement over flat spans, richer labels, capitalization sensitivity, and span
  inflation must be documented as output differences rather than hidden in code.
