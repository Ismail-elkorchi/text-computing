# Source Readiness

Generated at: `2026-06-08T00:00:00.000Z`

This report is generated from the forge source-policy universe. It is metadata-only unless a source also appears in `sourcePaths`, `snapshotPaths`, and a resource spec.

Policy rule: a source may not generate a pack until its policy class, package name, composite license policy, publishability gate, and source review state all agree.

## License Classes

| Class | Default composite | Publishable by default | Required suffixes | Source count |
| --- | --- | --- | --- | ---: |
| `default-safe` | `true` | `true` | None | 5 |
| `attribution` | `true` | `true` | None | 8 |
| `share-alike` | `false` | `false` | `-sa`, `-wiktionary`, `-wikipedia` | 9 |
| `copyleft` | `false` | `false` | `-gpl`, `-lgpl` | 4 |
| `noncommercial/research` | `false` | `false` | `-research`, `-nc` | 6 |
| `local-only` | `false` | `false` | `-local` | 4 |
| `blocked/review-only` | `false` | `false` | None | 30 |

## Language Priorities

| Language | First sources | Second wave | Isolated / review-only |
| --- | --- | --- | --- |
| `ar` Arabic | `source:unicode:ucd`:default-safe/approved<br>`source:unicode:cldr-core`:default-safe/approved<br>`source:ud:arabic`:blocked/review-only/pending<br>`source:unimorph:arabic`:blocked/review-only/pending<br>`source:camel:morph`:attribution/approved<br>`source:wordnet:arabic-4`:attribution/approved<br>`source:wikidata:main`:default-safe/approved | `source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:tatoeba:sentences`:attribution/approved<br>`source:opus:collection`:blocked/review-only/pending | `source:quranic-arabic-corpus`:copyleft/pending<br>`source:tashkeela:corpus`:blocked/review-only/pending<br>`source:arabic:dialect-corpora-unclear`:blocked/review-only/pending |
| `de` German | `source:unicode:ucd`:default-safe/approved<br>`source:unicode:cldr-core`:default-safe/approved<br>`source:ud:german`:blocked/review-only/pending<br>`source:unimorph:german`:blocked/review-only/pending<br>`source:wordnet:odenet`:share-alike/approved<br>`source:wikidata:main`:default-safe/approved | `source:freeling:german-morphy`:share-alike/approved<br>`source:german:german-commons`:share-alike/pending<br>`source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:tatoeba:sentences`:attribution/approved<br>`source:opus:collection`:blocked/review-only/pending | `source:german:germanet`:local-only/blocked<br>`source:german:leipzig-corpora`:local-only/pending<br>`source:german:smor`:copyleft/pending |
| `en` English | `source:unicode:ucd`:default-safe/approved<br>`source:unicode:cldr-core`:default-safe/approved<br>`source:iana:language-subtag-registry`:default-safe/approved<br>`source:ud:english`:blocked/review-only/pending<br>`source:unimorph:english`:blocked/review-only/pending<br>`source:wordnet:open-english`:attribution/approved<br>`source:wikidata:main`:default-safe/approved<br>`source:scowl:english-speller`:blocked/review-only/pending | `source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:tatoeba:sentences`:attribution/approved<br>`source:opus:collection`:blocked/review-only/pending | `source:wikipedia:raw-text`:share-alike/approved<br>`source:web-corpora:large`:blocked/review-only/pending<br>`source:wordnet:princeton`:blocked/review-only/pending |
| `es` Spanish | `source:unicode:ucd`:default-safe/approved<br>`source:unicode:cldr-core`:default-safe/approved<br>`source:ud:spanish`:blocked/review-only/pending<br>`source:unimorph:spanish`:blocked/review-only/pending<br>`source:wordnet:mcr-spanish`:attribution/approved<br>`source:freeling:spanish-srg`:copyleft/approved<br>`source:wikidata:main`:default-safe/approved | `source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:tatoeba:sentences`:attribution/approved<br>`source:opus:collection`:blocked/review-only/pending | `source:spanish:billion-word-corpus`:share-alike/approved |
| `fr` French | `source:unicode:ucd`:default-safe/approved<br>`source:unicode:cldr-core`:default-safe/approved<br>`source:ud:french`:blocked/review-only/pending<br>`source:unimorph:french`:blocked/review-only/pending<br>`source:fr:morphalou`:blocked/review-only/pending<br>`source:fr:lefff`:copyleft/approved<br>`source:fr:lexique`:blocked/review-only/pending<br>`source:wordnet:wolf`:blocked/review-only/pending<br>`source:wikidata:main`:default-safe/approved | `source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:tatoeba:sentences`:attribution/approved<br>`source:opus:collection`:blocked/review-only/pending | `source:wikipedia:raw-text`:share-alike/approved |
| `grc` Ancient Greek | `source:unicode:ucd`:default-safe/approved<br>`source:iana:language-subtag-registry`:default-safe/approved<br>`source:glottolog:cldf`:attribution/approved<br>`source:opengreekandlatin:corpus`:blocked/review-only/pending<br>`source:treebank:agldt`:share-alike/approved<br>`source:wikidata:main`:default-safe/approved | `source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:wordnet:ancient-greek`:blocked/review-only/pending | `source:ud:ancient-greek-proiel`:noncommercial/research/pending<br>`source:greek:lsj-perseus`:blocked/review-only/pending |
| `it` Italian | `source:unicode:ucd`:default-safe/approved<br>`source:unicode:cldr-core`:default-safe/approved<br>`source:ud:italian`:blocked/review-only/pending<br>`source:unimorph:italian`:blocked/review-only/pending<br>`source:it:morph-it`:blocked/review-only/pending<br>`source:wordnet:multiwordnet-italian`:attribution/approved<br>`source:wikidata:main`:default-safe/approved | `source:freeling:italian-morph-it`:share-alike/approved<br>`source:wiktionary:all`:share-alike/approved<br>`source:dbnary:all`:share-alike/approved<br>`source:tatoeba:sentences`:attribution/approved<br>`source:opus:collection`:blocked/review-only/pending | `source:it:italwordnet`:local-only/blocked<br>`source:ud:italian-isdt`:noncommercial/research/pending |
| `la` Latin | `source:unicode:ucd`:default-safe/approved<br>`source:iana:language-subtag-registry`:default-safe/approved<br>`source:glottolog:cldf`:attribution/approved<br>`source:latin:lila-lemma-bank`:blocked/review-only/pending<br>`source:opengreekandlatin:corpus`:blocked/review-only/pending<br>`source:treebank:agldt`:share-alike/approved<br>`source:wikidata:main`:default-safe/approved | `source:wiktionary:all`:share-alike/approved<br>`source:latin:lewis-short`:blocked/review-only/pending | `source:latin:lasla`:noncommercial/research/pending<br>`source:ud:latin-proiel`:noncommercial/research/pending<br>`source:latin:index-thomisticus`:noncommercial/research/pending |

## Source Catalog

| Source | Family | Policy | Review | Priority | Default composite | Publishable source posture | Languages | Capabilities | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `source:arabic:dialect-corpora-unclear` | `ARRES` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `ar` | `corpus`, `morphology`, `segmentation` | Placeholder policy boundary for dialect corpora until specific source entries replace it. |
| `source:camel:morph` | `ARRES` | `attribution` | `approved` | `first` | `true` | `true` | `ar` | `morphology`, `segmentation`, `normalization` | Primary Arabic morphology/segmentation candidate once transforms and evaluation are added. |
| `source:dbnary:all` | `WIKT` | `share-alike` | `approved` | `second` | `false` | `false` | `*` | `lexicon`, `translations` | Wiktionary-derived source; keep isolated from permissive default packages. |
| `source:fr:lefff` | `FRLEX` | `copyleft` | `approved` | `isolated` | `false` | `false` | `fr` | `lexicon`, `morphology` | Core French resource but must be generated only into an explicitly isolated package. |
| `source:fr:lexique` | `FRLEX` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `fr` | `lexicon`, `morphology`, `frequency` | Exact version and license must be pinned before generation. |
| `source:fr:morphalou` | `FRLEX` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `fr` | `lexicon`, `morphology` | Exact version and license must be pinned before generation. |
| `source:freeling:german-morphy` | `DELEX` | `share-alike` | `approved` | `second` | `false` | `false` | `de` | `lexicon`, `morphology` | Optional German morphology source with share-alike isolation. |
| `source:freeling:italian-morph-it` | `ITLEX` | `share-alike` | `approved` | `second` | `false` | `false` | `it` | `lexicon`, `morphology` | Optional Italian morphology source with share-alike isolation. |
| `source:freeling:spanish-srg` | `ESLEX` | `copyleft` | `approved` | `isolated` | `false` | `false` | `es` | `lexicon`, `morphology` | Useful Spanish lexicon/morphology source but not allowed in default composites. |
| `source:german:german-commons` | `CORPUS` | `share-alike` | `pending` | `second` | `false` | `false` | `de` | `corpus`, `frequency` | Use source-level licenses and derived statistics only after review. |
| `source:german:germanet` | `WN` | `local-only` | `blocked` | `review` | `false` | `false` | `de` | `kb`, `lexical-semantics` | Requires separate license terms and cannot be public by default. |
| `source:german:leipzig-corpora` | `CORPUS` | `local-only` | `pending` | `review` | `false` | `false` | `de` | `corpus`, `frequency` | Treat as access-controlled unless redistribution is explicitly allowed. |
| `source:german:smor` | `DELEX` | `copyleft` | `pending` | `isolated` | `false` | `false` | `de` | `morphology`, `fst` | Needs deliberate copyleft isolation and stem lexicon review. |
| `source:glottolog:cldf` | `GLOTTO` | `attribution` | `approved` | `first` | `true` | `true` | `*` | `language-registry`, `language-reference` | Metadata-only until a snapshot and transform are declared. |
| `source:greek:dependency-treebank` | `GREEK` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `el` | `syntax`, `morphology`, `semantics` | Exact release/license metadata required. |
| `source:greek:gdt-gud` | `GREEK` | `noncommercial/research` | `pending` | `isolated` | `false` | `false` | `el` | `syntax`, `morphology` | GDT is listed as CC-BY-NC-SA; do not use in unrestricted defaults. |
| `source:greek:hellenic-national-corpus` | `CORPUS` | `local-only` | `blocked` | `review` | `false` | `false` | `el` | `corpus`, `frequency` | Use as access/query source unless redistribution is explicitly allowed. |
| `source:greek:lsj-perseus` | `GREEK` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `grc` | `lexicon`, `definitions` | Exact edition/license capture required before use. |
| `source:iana:language-subtag-registry` | `IANA` | `default-safe` | `approved` | `first` | `true` | `true` | `*` | `language-registry` | Active source-backed foundation input. |
| `source:it:italwordnet` | `WN` | `local-only` | `blocked` | `review` | `false` | `false` | `it` | `kb`, `lexical-semantics` | Licensed distribution; not a default public source. |
| `source:it:morph-it` | `ITLEX` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `it` | `lexicon`, `morphology` | License metadata differs by version/distribution notes; pin before use. |
| `source:latin:index-thomisticus` | `LATIN` | `noncommercial/research` | `pending` | `isolated` | `false` | `false` | `la` | `corpus`, `syntax`, `morphology` | Research-only Latin treebank source. |
| `source:latin:lasla` | `LATIN` | `noncommercial/research` | `pending` | `isolated` | `false` | `false` | `la` | `corpus`, `morphology`, `syntax` | Research-only Latin source. |
| `source:latin:lewis-short` | `LATIN` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `la` | `lexicon`, `definitions` | Exact edition/license capture required before use. |
| `source:latin:lila-kb` | `LILA` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `la` | `kb`, `lexicon` | Exact license and version must be pinned before generation. |
| `source:latin:lila-lemma-bank` | `LILA` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `la` | `lexicon`, `morphology`, `kb` | Core Latin candidate; exact license and version must be pinned before generation. |
| `source:omw:core` | `WN` | `attribution` | `approved` | `first` | `true` | `true` | `en`, `fr`, `es`, `it`, `el` | `kb`, `lexical-semantics` | Use component-level license capture before generating language-specific wordnet packs. |
| `source:opengreekandlatin:corpus` | `CLASSICAL` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `la`, `grc` | `corpus`, `lexicon`, `historical` | Edition and CTS metadata must be reviewed per corpus slice. |
| `source:opus:collection` | `OPUS` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `*` | `parallel`, `corpus` | The collection is not a redistributable source by itself; every subcorpus needs its own policy entry. |
| `source:quranic-arabic-corpus` | `ARRES` | `copyleft` | `pending` | `isolated` | `false` | `false` | `ar` | `morphology`, `syntax`, `corpus` | Specialized Classical Arabic source; not allowed in default permissive composites. |
| `source:scowl:english-speller` | `ENLEX` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `en` | `lexicon`, `spelling`, `search` | Exact variant set and license need audit before generation. |
| `source:spanish:billion-word-corpus` | `CORPUS` | `share-alike` | `approved` | `isolated` | `false` | `false` | `es` | `corpus`, `frequency` | Use only with explicit share-alike separation. |
| `source:tashkeela:corpus` | `ARRES` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `ar` | `corpus`, `diacritization`, `quality` | Exact versioned license must be reviewed before any redistribution. |
| `source:tatoeba:sentences` | `TATOEBA` | `attribution` | `approved` | `second` | `false` | `true` | `*` | `corpus`, `parallel`, `examples` | Attribution must preserve sentence-level author/source requirements. |
| `source:treebank:agldt` | `CLASSICAL` | `share-alike` | `approved` | `isolated` | `false` | `false` | `la`, `grc` | `syntax`, `morphology`, `corpus` | Classical treebank source with explicit share-alike isolation. |
| `source:ud:ancient-greek-proiel` | `UD` | `noncommercial/research` | `pending` | `isolated` | `false` | `false` | `grc` | `syntax`, `morphology`, `tagging` | Not suitable for unrestricted public packages. |
| `source:ud:arabic` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `ar` | `syntax`, `morphology`, `tagging` | Metadata-only until each selected Arabic treebank license is audited. |
| `source:ud:english` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `en` | `syntax`, `morphology`, `tagging` | Metadata-only until each selected English treebank license is audited. |
| `source:ud:french` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `fr` | `syntax`, `morphology`, `tagging` | Metadata-only until each selected French treebank license is audited. |
| `source:ud:german` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `de` | `syntax`, `morphology`, `tagging` | Metadata-only until each selected German treebank license is audited. |
| `source:ud:greek` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `el` | `syntax`, `morphology`, `tagging` | Metadata-only until each selected Modern Greek treebank license is audited. |
| `source:ud:italian` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `it` | `syntax`, `morphology`, `tagging` | Metadata-only until selected Italian treebanks are audited independently of Italian-ISDT. |
| `source:ud:italian-isdt` | `UD` | `noncommercial/research` | `pending` | `isolated` | `false` | `false` | `it` | `syntax`, `morphology`, `tagging` | Not suitable for unrestricted public packages. |
| `source:ud:latin-proiel` | `UD` | `noncommercial/research` | `pending` | `isolated` | `false` | `false` | `la` | `syntax`, `morphology`, `tagging` | Not suitable for unrestricted public packages. |
| `source:ud:spanish` | `UD` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `es` | `syntax`, `morphology`, `tagging` | Metadata-only until each selected Spanish treebank license is audited. |
| `source:unicode:cldr-core` | `CLDR` | `default-safe` | `approved` | `first` | `true` | `true` | `*` | `locale-profile`, `script-profile`, `search` | Active source-backed foundation input. |
| `source:unicode:ucd` | `UCD` | `default-safe` | `approved` | `first` | `true` | `true` | `*` | `unicode-profile`, `normalization`, `script-profile`, `quality` | Active source-backed foundation input. |
| `source:unimorph:arabic` | `UNIMORPH` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `ar` | `morphology` | Metadata-only until per-language UniMorph license is pinned. |
| `source:unimorph:english` | `UNIMORPH` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `en` | `morphology` | Metadata-only until per-language UniMorph license is pinned. |
| `source:unimorph:french` | `UNIMORPH` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `fr` | `morphology` | Metadata-only until per-language UniMorph license is pinned. |
| `source:unimorph:german` | `UNIMORPH` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `de` | `morphology` | Metadata-only until per-language UniMorph license is pinned. |
| `source:unimorph:italian` | `UNIMORPH` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `it` | `morphology` | Metadata-only until per-language UniMorph license is pinned. |
| `source:unimorph:spanish` | `UNIMORPH` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `es` | `morphology` | Metadata-only until per-language UniMorph license is pinned. |
| `source:web-corpora:large` | `CORPUS` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `*` | `corpus`, `frequency`, `quality` | Do not redistribute raw web text without source-specific legal basis. |
| `source:wikidata:main` | `WD` | `default-safe` | `approved` | `first` | `true` | `true` | `*` | `kb`, `entity-linking`, `lexicon` | Only main structured namespaces are in this policy; non-main namespaces need separate entries. |
| `source:wikipedia:raw-text` | `WIKI` | `share-alike` | `approved` | `isolated` | `false` | `false` | `*` | `corpus`, `kb`, `frequency` | Raw wiki text must not enter permissive default packages. |
| `source:wiktionary:all` | `WIKT` | `share-alike` | `approved` | `second` | `false` | `false` | `*` | `lexicon`, `morphology`, `definitions`, `translations` | Must remain outside default composites unless the component explicitly allows share-alike data. |
| `source:wordnet:ancient-greek` | `WN` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `grc` | `kb`, `lexical-semantics` | Exact release/license verification required. |
| `source:wordnet:arabic-4` | `ARRES` | `attribution` | `approved` | `first` | `true` | `true` | `ar` | `kb`, `lexical-semantics` | Arabic semantic source candidate. |
| `source:wordnet:greek-omw` | `WN` | `default-safe` | `approved` | `first` | `true` | `true` | `el` | `kb`, `lexical-semantics` | Modern Greek semantic source candidate. |
| `source:wordnet:mcr-spanish` | `WN` | `attribution` | `approved` | `first` | `true` | `true` | `es` | `kb`, `lexical-semantics` | Candidate Spanish semantic source. |
| `source:wordnet:multiwordnet-italian` | `WN` | `attribution` | `approved` | `first` | `true` | `true` | `it` | `kb`, `lexical-semantics` | Italian semantic source candidate. |
| `source:wordnet:odenet` | `WN` | `share-alike` | `approved` | `isolated` | `false` | `false` | `de` | `kb`, `lexical-semantics` | Core German semantic candidate, but the share-alike boundary must be explicit. |
| `source:wordnet:open-english` | `WN` | `attribution` | `approved` | `first` | `true` | `true` | `en` | `kb`, `lexical-semantics` | Good default English semantic source once generated reports and evaluation exist. |
| `source:wordnet:princeton` | `WN` | `blocked/review-only` | `pending` | `review` | `false` | `false` | `en` | `kb`, `lexical-semantics` | Reference lineage source; exact version and license file must be pinned before use. |
| `source:wordnet:wolf` | `WN` | `blocked/review-only` | `pending` | `first` | `false` | `false` | `fr` | `kb`, `lexical-semantics` | Review CeCILL-C obligations before generating package policy. |

