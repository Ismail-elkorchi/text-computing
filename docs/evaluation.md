# Evaluation and readiness

## Current status

The project is alpha. It can process real English, French, and Modern Standard
Arabic text in controlled deterministic workflows. Its strongest current uses
are Unicode segmentation, normalization, resource-backed lexical and morphology
lookup, search analysis, explicit-mention KB linking, and rule-based quality
diagnostics.

The Arabic pack now has the first model-backed capability: ONNX named entity
recognition with explicit artifact materialization and held-out task evidence.
It is not yet a substitute for stronger domain-specific NER systems, and the
generated packs still lack evaluated pretrained POS/dependency resources,
general coreference, and embeddings. Classical sequence learning and a
trainable projective dependency parser are available through `/learning`. Its differentiators remain
reproducibility, integrity checks, source coordinates, inspectable runtime
evidence, explicit resource ownership, and audited data generation.

## Model-backed Arabic NER gate

`npm run -s test:nlp:model` runs the generated Arabic Capability Pack through
the ordinary Text Computing API and the Node ONNX executor. It verifies the
exact 178,495,423-byte quantized model artifact and evaluates a deterministic
100-example sample from the official AQMAR test feature split. Matching requires
the exact UTF-16 span and entity type; only PER, ORG, and LOC are scored.

The command is read-only: it fails on F1 below 0.5 or drift from the committed
evidence. Updating that evidence requires an explicit
`node tools/evaluate-ner-model.mjs --update`, followed by Forge regeneration.

| Precision | Recall | F1 | Required F1 |
| ---: | ---: | ---: | ---: |
| 0.505263 | 0.533333 | 0.518919 | 0.500000 |

The model is useful as an operational vertical slice, but this score is modest.
AQMAR is Arabic Wikipedia, DATE is outside the shared scoring policy, and the
result does not establish dialectal, OCR, social-text, or domain-specific
fitness. The model artifact is fetched or provisioned explicitly and is not
included in the npm package.

## Committed gates

Results below were measured on 2026-09-08 with Node.js 24.14.0. The command is
`npm run -s test:nlp`; budgets, fixtures, and failures are committed code rather
than release-note assertions.

The held-out fixture contains 30 task cases across English, French, and Arabic.
All currently pass. These are focused regression cases for segmentation,
normalization, morphology, explicit-mention entity linking, and search. They are
too small and curated to support a general accuracy claim.
Linking results are scored from `entityLinks`, separately from NER's `entities`.
Reported `entityLink*` metrics use supplied mentions; they are not NER scores.

The external fixture contains 100 recent Tatoeba sentences per language. Its
rows were added after the forge snapshot cutoff and are deterministically
selected from checksummed exports. The gate verifies non-empty and valid word,
sentence, and grapheme spans; deterministic segmentation; idempotent
normalization; absence of implicit entity links; and unique, bounded quality
findings. It is a real-text robustness gate, not an annotated accuracy corpus.

| Language | Documents | Code units | Lexical units | Sentences | Gate failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| English | 100 | 4,901 | 1,075 | 113 | 0 |
| French | 100 | 4,806 | 1,049 | 104 | 0 |
| Arabic | 100 | 3,345 | 722 | 102 | 0 |

Isolated cold-start gates use one realistic sentence and a fresh process for
each language/preset pair:

| Language | Preset | Time | Peak RSS | Budget |
| --- | --- | ---: | ---: | --- |
| English | core | 325 ms | 122 MiB | 1,500 ms / 140 MiB |
| English | lookup | 544 ms | 170 MiB | 5,000 ms / 300 MiB |
| French | core | 315 ms | 122 MiB | 1,500 ms / 140 MiB |
| French | lookup | 470 ms | 149 MiB | 5,000 ms / 300 MiB |
| Arabic | core | 308 ms | 122 MiB | 1,500 ms / 140 MiB |
| Arabic | lookup | 765 ms | 170 MiB | 5,000 ms / 300 MiB |

Timing and RSS vary by machine; the enforced budgets are the stable contract.
Arabic morphology remains the heaviest path, but its domain-scoped index keeps
cold lookup well inside the same budget used by the other languages.

## Important limitations

- Entity linking requires explicit mention spans or entity annotations. Alias
  scanning is not NER and is not used by ordinary document analysis.
- Arabic model-backed NER is opt-in and requires an ONNX executor plus an
  explicit artifact reader; there is no heuristic fallback.
- Morphology returns deterministic resource candidates; it does not perform
  contextual disambiguation.
- Sentence segmentation is pinned and tailored, but abbreviation and genre
  coverage is still limited.
- The external sample checks robustness properties, not gold linguistic labels.
- Browser and edge deployments must serve pack assets with byte-range support
  for efficient indexed lookup. Node uses direct file ranges.
- Corpus analysis, parallel-text operations, dataset conversion, and pipeline
  orchestration are public modules. Their algorithm tests do not by themselves
  establish accuracy for a particular language or deployment.

Before a stable release, the project needs larger independently annotated
accuracy corpora, genre/domain slices, explicit accuracy thresholds, broader
browser/edge performance measurements, and more memory headroom for Arabic
morphology.
