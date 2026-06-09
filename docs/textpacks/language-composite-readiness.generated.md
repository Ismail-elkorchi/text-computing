# Language Composite Readiness

Generated at: `2026-06-08T00:00:00.000Z`

This report is generated from the active forge graph. It gates language composites: `textpack-en`, `textpack-ar`, and `textpack-fr` stay non-publishable until every required slot is composite-ready.

Candidate packs are informational only. A candidate does not satisfy a slot until the exact required package is generated, audited, evaluated, publishable, declares production coverage for that slot, and is not descriptor-only.

## Summary

| Language | Composite | Ready slots | Blocked slots | Composite ready |
| --- | --- | ---: | --- | --- |
| `en` English | `@ismail-elkorchi/textpack-en` | 8/12 | `kb`, `corpus`, `parallel`, `quality` | `false` |
| `ar` Arabic | `@ismail-elkorchi/textpack-ar` | 8/12 | `kb`, `corpus`, `parallel`, `quality` | `false` |
| `fr` French | `@ismail-elkorchi/textpack-fr` | 8/12 | `kb`, `corpus`, `parallel`, `quality` | `false` |

## English (en)

| Slot | Required package | Stage | Candidates | Blockers |
| --- | --- | --- | --- | --- |
| `foundation` | `@ismail-elkorchi/textpack-foundation` | `composite-ready` | None | None |
| `core` | `@ismail-elkorchi/textpack-en-core` | `composite-ready` | None | None |
| `normalization` | `@ismail-elkorchi/textpack-en-normalization` | `composite-ready` | None | None |
| `segmentation` | `@ismail-elkorchi/textpack-en-segmentation` | `composite-ready` | None | None |
| `lexicon` | `@ismail-elkorchi/textpack-en-lexicon` | `composite-ready` | `@ismail-elkorchi/textpack-en-inflection-scowl`, `@ismail-elkorchi/textpack-en-wordlist-esdb`, `@ismail-elkorchi/textpack-wordnet-en` | None |
| `morphology` | `@ismail-elkorchi/textpack-en-morphology` | `composite-ready` | `@ismail-elkorchi/textpack-en-inflection-scowl`, `@ismail-elkorchi/textpack-en-syntax-ud-gumreddit` | None |
| `syntax` | `@ismail-elkorchi/textpack-en-syntax` | `composite-ready` | `@ismail-elkorchi/textpack-en-syntax-ud-gumreddit` | None |
| `kb` | `@ismail-elkorchi/textpack-en-kb` | `artifact-backed` | `@ismail-elkorchi/textpack-wordnet-en` | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-en-kb does not declare production coverage for the kb slot. |
| `search` | `@ismail-elkorchi/textpack-en-search` | `composite-ready` | `@ismail-elkorchi/textpack-en-wordlist-esdb` | None |
| `corpus` | `@ismail-elkorchi/textpack-en-corpus` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-en-corpus does not declare production coverage for the corpus slot. |
| `parallel` | `@ismail-elkorchi/textpack-en-parallel` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-en-parallel does not declare production coverage for the parallel slot. |
| `quality` | `@ismail-elkorchi/textpack-en-quality` | `artifact-backed` | `@ismail-elkorchi/textpack-en-core`, `@ismail-elkorchi/textpack-en-inflection-scowl`, `@ismail-elkorchi/textpack-en-lexicon`, `@ismail-elkorchi/textpack-en-morphology`, `@ismail-elkorchi/textpack-en-normalization`, `@ismail-elkorchi/textpack-en-search`, `@ismail-elkorchi/textpack-en-segmentation`, `@ismail-elkorchi/textpack-en-syntax`, `@ismail-elkorchi/textpack-en-syntax-ud-gumreddit`, `@ismail-elkorchi/textpack-en-wordlist-esdb`, `@ismail-elkorchi/textpack-wordnet-en` | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-en-quality does not declare production coverage for the quality slot. |

## Arabic (ar)

| Slot | Required package | Stage | Candidates | Blockers |
| --- | --- | --- | --- | --- |
| `foundation` | `@ismail-elkorchi/textpack-foundation` | `composite-ready` | None | None |
| `core` | `@ismail-elkorchi/textpack-ar-core` | `composite-ready` | None | None |
| `normalization` | `@ismail-elkorchi/textpack-ar-normalization` | `composite-ready` | None | None |
| `segmentation` | `@ismail-elkorchi/textpack-ar-segmentation` | `composite-ready` | `@ismail-elkorchi/textpack-ar-msa-morphology` | None |
| `lexicon` | `@ismail-elkorchi/textpack-ar-lexicon` | `composite-ready` | `@ismail-elkorchi/textpack-wordnet-ar` | None |
| `morphology` | `@ismail-elkorchi/textpack-ar-morphology` | `composite-ready` | `@ismail-elkorchi/textpack-ar-msa-morphology`, `@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa` | None |
| `syntax` | `@ismail-elkorchi/textpack-ar-syntax` | `composite-ready` | `@ismail-elkorchi/textpack-ar-syntax-sa`, `@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa` | None |
| `kb` | `@ismail-elkorchi/textpack-ar-kb` | `artifact-backed` | `@ismail-elkorchi/textpack-wordnet-ar` | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-ar-kb does not declare production coverage for the kb slot. |
| `search` | `@ismail-elkorchi/textpack-ar-search` | `composite-ready` | None | None |
| `corpus` | `@ismail-elkorchi/textpack-ar-corpus` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-ar-corpus does not declare production coverage for the corpus slot. |
| `parallel` | `@ismail-elkorchi/textpack-ar-parallel` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-ar-parallel does not declare production coverage for the parallel slot. |
| `quality` | `@ismail-elkorchi/textpack-ar-quality` | `artifact-backed` | `@ismail-elkorchi/textpack-ar-core`, `@ismail-elkorchi/textpack-ar-lexicon`, `@ismail-elkorchi/textpack-ar-morphology`, `@ismail-elkorchi/textpack-ar-msa-morphology`, `@ismail-elkorchi/textpack-ar-normalization`, `@ismail-elkorchi/textpack-ar-search`, `@ismail-elkorchi/textpack-ar-segmentation`, `@ismail-elkorchi/textpack-ar-syntax`, `@ismail-elkorchi/textpack-ar-syntax-sa`, `@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa`, `@ismail-elkorchi/textpack-wordnet-ar` | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-ar-quality does not declare production coverage for the quality slot. |

## French (fr)

| Slot | Required package | Stage | Candidates | Blockers |
| --- | --- | --- | --- | --- |
| `foundation` | `@ismail-elkorchi/textpack-foundation` | `composite-ready` | None | None |
| `core` | `@ismail-elkorchi/textpack-fr-core` | `composite-ready` | None | None |
| `normalization` | `@ismail-elkorchi/textpack-fr-normalization` | `composite-ready` | None | None |
| `segmentation` | `@ismail-elkorchi/textpack-fr-segmentation` | `composite-ready` | None | None |
| `lexicon` | `@ismail-elkorchi/textpack-fr-lexicon` | `composite-ready` | `@ismail-elkorchi/textpack-fr-lexicon-sa`, `@ismail-elkorchi/textpack-fr-lexique-sa` | None |
| `morphology` | `@ismail-elkorchi/textpack-fr-morphology` | `composite-ready` | `@ismail-elkorchi/textpack-fr-lexique-sa`, `@ismail-elkorchi/textpack-fr-morphology-sa`, `@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa`, `@ismail-elkorchi/textpack-fr-unimorph-sa` | None |
| `syntax` | `@ismail-elkorchi/textpack-fr-syntax` | `composite-ready` | `@ismail-elkorchi/textpack-fr-syntax-sa`, `@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa` | None |
| `kb` | `@ismail-elkorchi/textpack-fr-kb` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-fr-kb does not declare production coverage for the kb slot. |
| `search` | `@ismail-elkorchi/textpack-fr-search` | `composite-ready` | `@ismail-elkorchi/textpack-fr-lexique-sa`, `@ismail-elkorchi/textpack-fr-search-sa` | None |
| `corpus` | `@ismail-elkorchi/textpack-fr-corpus` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-fr-corpus does not declare production coverage for the corpus slot. |
| `parallel` | `@ismail-elkorchi/textpack-fr-parallel` | `artifact-backed` | None | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-fr-parallel does not declare production coverage for the parallel slot. |
| `quality` | `@ismail-elkorchi/textpack-fr-quality` | `artifact-backed` | `@ismail-elkorchi/textpack-fr-core`, `@ismail-elkorchi/textpack-fr-lexicon`, `@ismail-elkorchi/textpack-fr-lexicon-sa`, `@ismail-elkorchi/textpack-fr-lexique-sa`, `@ismail-elkorchi/textpack-fr-morphology`, `@ismail-elkorchi/textpack-fr-morphology-sa`, `@ismail-elkorchi/textpack-fr-normalization`, `@ismail-elkorchi/textpack-fr-search`, `@ismail-elkorchi/textpack-fr-search-sa`, `@ismail-elkorchi/textpack-fr-segmentation`, `@ismail-elkorchi/textpack-fr-syntax`, `@ismail-elkorchi/textpack-fr-syntax-sa`, `@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa`, `@ismail-elkorchi/textpack-fr-unimorph-sa` | slot is artifact-backed; descriptor-only metadata must be materialized into local task-usable payloads.<br>package has not passed the publishability gate.<br>@ismail-elkorchi/textpack-fr-quality does not declare production coverage for the quality slot. |

