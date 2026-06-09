# Text Computing Runtime Packages - Spec Conformance Matrix

Status: implementation conformance audit
Scope: current repository implementation against
[`text-computing-runtime-packages-final-spec.md`](text-computing-runtime-packages-final-spec.md)
and the generated textpack distribution target in
[`textpack-generation-and-distribution-spec.md`](textpack-generation-and-distribution-spec.md)
Version: baseline at commit `736de89cbb1d4047690a7d5e735e1c9d61edfcab`
Normative language: this document is an audit matrix. The final product specification remains the
normative source for package missions, boundaries, and required APIs.
Verification expectation: keep this matrix in sync when public entrypoints, required API coverage,
package boundaries, reference-pack contents, or verification scripts change.

## Reading the matrix

- "Required entrypoints" are the package import paths named by the final specification.
- "Required APIs" are the function names shown in the final specification for that package.
- "Implemented depth" describes the current implementation level, not the eventual product ceiling.
- "Tests" lists the active verification surface in package scripts and repository checks.
- "Known gaps" names the next conformance work. Some gaps are intentional boundaries, not defects.

## Runtime package summary

| Package | Entrypoints | Required APIs | Implemented depth | Tests | Known gaps |
| --- | --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textfacts` | Complete | Complete | Unicode kernel with generated tables and deterministic local facts | Node, Deno, Bun, browser, Workers, pack dry-run, schema validation | Profile data and language tailoring remain outside this package by design |
| `@ismail-elkorchi/textdoc` | Complete | Complete | Final document, view, span, annotation, graph, selection, and JSON substrate | Node, Deno, Bun, browser, Workers, pack audit | Coordinate conversion is span-map based; automatic cross-unit offset conversion is still limited |
| `@ismail-elkorchi/textpack` | Complete | Complete | Single canonical manifest validation/loading with recipe components, artifact descriptors, component policies, capability slots, and gap notes | Node, Deno, Bun, browser, Workers, pack audit, repo manifest validation | Artifact fetch/unpack flows are not implemented yet; resource payload interpretation and discovery remain outside the runtime boundary |
| `@ismail-elkorchi/textlex` | Complete | Complete | Lexicon, gazetteer, term, phrase, fuzzy, trie, and annotation baseline | Node, Deno, Bun, browser, Workers, pack audit | Larger resource-backed lookup benchmarks and advanced compressed-index guarantees remain follow-up |
| `@ismail-elkorchi/textfst` | Complete | Complete | Deterministic FST, regex, rewrite, lexc, twol, morph, spell, weight, and apply baseline | Node, Deno, Bun, browser, Workers, pack audit | Industrial-strength lexc/twol coverage and large weighted-FST optimization remain follow-up |
| `@ismail-elkorchi/textrules` | Complete | Complete | Rule model, matching, cascades, rewrites, constraints, grammar, extractors, processor bridge | Node, Deno, Bun, browser, Workers, pack audit | Final spec's named processor family is not yet represented as a full named class set |
| `@ismail-elkorchi/textnorm` | Complete | Complete | Resource-backed normalization candidates, views, span maps, historical/noisy/OCR helpers | Node, Deno, Bun, browser, Workers, pack audit | Broad language resources and statistical reranking integrations remain follow-up |
| `@ismail-elkorchi/textclassical` | Complete | Complete | Sparse features, vectorizers, classifiers, sequence taggers, n-gram LMs, topic, cluster, parser, summary baseline | Node, Deno, Bun, browser, Workers, pack audit | Model quality/evaluation corpora and advanced training controls remain follow-up |
| `@ismail-elkorchi/textpipeline` | Complete | Complete | Processor contracts, dependency planning, execution, streaming, cache, and pack registry | Node, Deno, Bun, browser, Workers, pack audit | Distributed scheduling, worker pools, and recovery workflows need integration-level hardening |
| `@ismail-elkorchi/textdata` | Complete | Complete | Dataset, reader, writer, stream, split, CoNLL-U, IOB, TEI, and parallel reader baseline | Node, Deno, Bun, browser, Workers, pack audit | Broader format coverage, general HTML handling, and large-stream stress fixtures remain follow-up |
| `@ismail-elkorchi/textcorpus` | Complete | Complete | In-memory corpus store, query, concordance, frequency, n-gram, collocation, keyness, dispersion, terminology, lexicography, stylometry, reuse, diachrony | Node, Deno, Bun, browser, Workers, pack audit | Persistent index storage, large-corpus scaling, and grammar-rich word sketches remain follow-up |
| `@ismail-elkorchi/textsearch` | Complete | Complete | Analyzer, in-memory positional index, query, ranking, filtering, facets, highlights, suggestions, CQL | Node, Deno, Bun, browser, Workers, pack audit | Persistent indexes, larger analyzers, and production-scale query benchmarks remain follow-up |
| `@ismail-elkorchi/textkb` | Complete | Complete | Structural KB stores, alias indexes, candidate generation, linking, senses, ontology, thesaurus, relations | Node, Deno, Bun, browser, Workers, pack audit | Large KB resources and richer disambiguation evaluation remain follow-up |
| `@ismail-elkorchi/textquality` | Complete | Complete | Document, corpus, OCR/noisy, readability, style, annotation, and report diagnostics | Node, Deno, Bun, browser, Workers, pack audit | Dashboards and larger quality-profile/resource packs remain follow-up |
| `@ismail-elkorchi/textparallel` | Complete | Complete | Parallel documents/corpora, sentence and word alignment, TM, bilingual terms/lexicon, shallow transfer | Node, Deno, Bun, browser, Workers, pack audit | Large bilingual resources, persistent TM search, and stronger alignment evaluation remain follow-up |

## Runtime package details

### `@ismail-elkorchi/textfacts`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textfacts`, `@ismail-elkorchi/textfacts/input`, `@ismail-elkorchi/textfacts/unicode`, `@ismail-elkorchi/textfacts/normalize`, `@ismail-elkorchi/textfacts/casefold`, `@ismail-elkorchi/textfacts/segment`, `@ismail-elkorchi/textfacts/linebreak`, `@ismail-elkorchi/textfacts/bidi`, `@ismail-elkorchi/textfacts/security`, `@ismail-elkorchi/textfacts/integrity`, `@ismail-elkorchi/textfacts/collation`, `@ismail-elkorchi/textfacts/facts`, `@ismail-elkorchi/textfacts/hash`, `@ismail-elkorchi/textfacts/idna` |
| Required APIs | `readText`, `normalize`, `normalizationDeltas`, `segmentGraphemes`, `segmentWords`, `segmentSentences`, `lineBreakOpportunities`, `scanIntegrityFindings`, `confusableSkeleton`, `rootCollationKey`, `surfaceProfile`, `wordFrequencies`, `charNgrams`, `wordNgrams` |
| Implemented depth | Full current kernel: pinned Unicode data, generated normalization/segmentation/security/collation tables, stable hashing, IDNA, integrity scans, and local text facts. |
| Tests | `test:node`, `test:deno`, `test:bun`, `test:browser`, `test:workers`, `test:all`, `check:pack`, `schema:validate`, root `lint`, root `build`, root `schema:validate`. |
| Known gaps | Profile data is intentionally absent. Locale/language tailoring, dictionary segmentation, morphology, corpus behavior, and pack loading remain higher-package responsibilities. |

### `@ismail-elkorchi/textdoc`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textdoc`, `@ismail-elkorchi/textdoc/document`, `@ismail-elkorchi/textdoc/view`, `@ismail-elkorchi/textdoc/span`, `@ismail-elkorchi/textdoc/layer`, `@ismail-elkorchi/textdoc/annotation`, `@ismail-elkorchi/textdoc/graph`, `@ismail-elkorchi/textdoc/query`, `@ismail-elkorchi/textdoc/selection`, `@ismail-elkorchi/textdoc/serialize` |
| Required APIs | `createDocument`, `addView`, `addSpanMap`, `addAnnotation`, `selectAnnotations`, `mapSpan`, `toTextDocJson`, `fromTextDocJson` |
| Implemented depth | Final substrate for text sources, views, span maps, layers, annotations, alternatives, graphs, deterministic selection, validation, and stable JSON. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public entrypoint tests, JSON round-trip tests, graph/layer/query tests, `check:pack`, root checks. |
| Known gaps | Span conversion is explicit-span-map based. Automatic conversion between every coordinate unit listed in the final spec is not yet a general service. `textdoc` remains storage/query substrate and does not judge annotation correctness. |

### `@ismail-elkorchi/textpack`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textpack` |
| Required APIs | `validateManifest`, `createPack`, `loadPack`, `composePacks`, `listResources`, `getResource`, `capabilities` |
| Implemented depth | Independent manifest and resource-pack root with resource-kind validation, I-JSON-safe metadata checks, immutable pack creation/loading, query helpers, and explicit overlay composition. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, manifest validation tests, composition tests, `check:pack`, repository `validate-textpack-packages`, root checks. |
| Known gaps | Resource payloads are opaque handles. Runtime file/network discovery and engine-specific interpretation are intentionally not implemented here. Artifact fetch/unpack flows are not implemented yet. |

### `@ismail-elkorchi/textlex`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textlex`, `@ismail-elkorchi/textlex/lexicon`, `@ismail-elkorchi/textlex/gazetteer`, `@ismail-elkorchi/textlex/term`, `@ismail-elkorchi/textlex/trie`, `@ismail-elkorchi/textlex/phrase`, `@ismail-elkorchi/textlex/fuzzy`, `@ismail-elkorchi/textlex/annotate` |
| Required APIs | `buildLexicon`, `lookup`, `phraseLookup`, `annotateLexicon` |
| Implemented depth | Deterministic lexicon/gazetteer/term builders, normalized lookup, tries and related indexes, phrase and fuzzy lookup, wordlists, abbreviations, affixes, pronunciations, and textdoc annotation emission. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, lookup/resource/annotation tests, `check:pack`, root checks. |
| Known gaps | Advanced compressed-index performance guarantees, large lexical resources, and full benchmark fixtures are follow-up work. Entity linking and ontology semantics remain `textkb` responsibilities. |

### `@ismail-elkorchi/textfst`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textfst`, `@ismail-elkorchi/textfst/automaton`, `@ismail-elkorchi/textfst/transducer`, `@ismail-elkorchi/textfst/compile`, `@ismail-elkorchi/textfst/regex`, `@ismail-elkorchi/textfst/rewrite`, `@ismail-elkorchi/textfst/lexc`, `@ismail-elkorchi/textfst/twol`, `@ismail-elkorchi/textfst/apply`, `@ismail-elkorchi/textfst/weight`, `@ismail-elkorchi/textfst/morph`, `@ismail-elkorchi/textfst/spell` |
| Required APIs | `compileRegex`, `compileRewrite`, `compileLexicon`, `compose`, `determinize`, `minimize`, `applyDown`, `applyUp`, `shortestPath`, `analyzeWord`, `generateWord` |
| Implemented depth | Deterministic automata/transducer runtime with regex and rewrite compilation, lexc/twol support, weighted operations, morphology apply/generate helpers, spelling candidates, hyphenation, syllabification, and resource-pack parsing helpers. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, FST suite tests, `check:pack`, root checks. |
| Known gaps | Large-scale FST optimization, complete lexc/twol language coverage, and industrial morphology fixtures remain follow-up work. |

### `@ismail-elkorchi/textrules`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textrules`, `@ismail-elkorchi/textrules/pattern`, `@ismail-elkorchi/textrules/compile`, `@ismail-elkorchi/textrules/match`, `@ismail-elkorchi/textrules/cascade`, `@ismail-elkorchi/textrules/rewrite`, `@ismail-elkorchi/textrules/grammar`, `@ismail-elkorchi/textrules/extract`, `@ismail-elkorchi/textrules/constraints`, `@ismail-elkorchi/textrules/processor` |
| Required APIs | `compileRuleSet`, `matchRules`, `applyRules`, `rewriteView`, `createRuleProcessor` |
| Implemented depth | Final rule-set model, pattern compilation/matching, deterministic cascades, actions, rewrites with span maps, constraints, grammar structures, extractor helpers, and textpipeline processor creation. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, rule suite tests, `check:pack`, root checks. |
| Known gaps | The spec's named processor family (`RuleTokenizer`, `RuleSentenceSplitter`, and related named processors) is not yet represented as a complete named class catalog. Coverage is currently through generic rule sets and processor adapters. |

### `@ismail-elkorchi/textnorm`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textnorm`, `@ismail-elkorchi/textnorm/normalize`, `@ismail-elkorchi/textnorm/variant`, `@ismail-elkorchi/textnorm/noisy`, `@ismail-elkorchi/textnorm/historical`, `@ismail-elkorchi/textnorm/ocr`, `@ismail-elkorchi/textnorm/transliteration`, `@ismail-elkorchi/textnorm/spell`, `@ismail-elkorchi/textnorm/view` |
| Required APIs | `normalizeDocument`, `candidateNormalizations`, `buildVariantGraph` |
| Implemented depth | Normalization candidates, normalized views, span maps, edit scripts, variant graphs, historical helpers, noisy text helpers, OCR confusion support, transliteration maps, spelling maps, and textdoc annotations. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, normalization suite tests, `check:pack`, root checks. |
| Known gaps | Broad language/period/noisy-text resources live in `textpack-*` packages and are still small. Statistical reranking through `textclassical` is not yet a broad integration path. |

### `@ismail-elkorchi/textclassical`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textclassical`, `@ismail-elkorchi/textclassical/features`, `@ismail-elkorchi/textclassical/vectorize`, `@ismail-elkorchi/textclassical/classify`, `@ismail-elkorchi/textclassical/sequence`, `@ismail-elkorchi/textclassical/hmm`, `@ismail-elkorchi/textclassical/crf`, `@ismail-elkorchi/textclassical/maxent`, `@ismail-elkorchi/textclassical/perceptron`, `@ismail-elkorchi/textclassical/lm`, `@ismail-elkorchi/textclassical/topic`, `@ismail-elkorchi/textclassical/cluster`, `@ismail-elkorchi/textclassical/tagger`, `@ismail-elkorchi/textclassical/parser`, `@ismail-elkorchi/textclassical/summary` |
| Required APIs | `extractFeatures`, `fitVectorizer`, `transformVectorizer`, `trainClassifier`, `classify`, `classifyDocument`, `trainSequenceTagger`, `tagSequence`, `annotateSequence`, `trainNgramLanguageModel`, `scoreSequence`, `perplexity`, `trainLda`, `inferTopics`, `clusterDocuments` |
| Implemented depth | Sparse feature extraction, vectorization, classifiers, sequence taggers, n-gram language models, topic inference, clustering, language ID, sentiment, parser helpers, and extractive summarization. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, model suite tests, `check:pack`, root checks. |
| Known gaps | Current implementations are deterministic baselines. Model quality evaluation, larger training corpora, serialization compatibility suites, and advanced optimizer controls remain follow-up work. Neural models remain out of scope. |

### `@ismail-elkorchi/textpipeline`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textpipeline`, `@ismail-elkorchi/textpipeline/processor`, `@ismail-elkorchi/textpipeline/graph`, `@ismail-elkorchi/textpipeline/run`, `@ismail-elkorchi/textpipeline/stream`, `@ismail-elkorchi/textpipeline/cache`, `@ismail-elkorchi/textpipeline/pack` |
| Required APIs | `createPipeline`, `planPipeline`, `runPipeline`, `streamPipeline` |
| Implemented depth | Processor contracts, requirement/provision validation, deterministic graph planning, execution context, failure handling, in-memory cache snapshots, streaming, and pack-backed processor registry support. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, processor-family tests, pipeline suite tests, `check:pack`, root checks, repository trace/report schemas. |
| Known gaps | Distributed scheduling, worker-pool execution, and recovery workflows have schema and changeset coverage but need stronger runtime integration and end-to-end tests. |

### `@ismail-elkorchi/textdata`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textdata`, `@ismail-elkorchi/textdata/dataset`, `@ismail-elkorchi/textdata/reader`, `@ismail-elkorchi/textdata/writer`, `@ismail-elkorchi/textdata/stream`, `@ismail-elkorchi/textdata/split`, `@ismail-elkorchi/textdata/conllu`, `@ismail-elkorchi/textdata/iob`, `@ismail-elkorchi/textdata/tei`, `@ismail-elkorchi/textdata/parallel` |
| Required APIs | `readDataset`, `streamRecords`, `splitDataset`, `writeDataset` |
| Implemented depth | Dataset records and metadata, plain text/JSONL/CSV/CoNLL/CoNLL-U/IOB/TEI/parallel readers, JSONL/tabular writers, deterministic splits, batching, streaming transforms, and textdoc conversion. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, reader/writer/split tests, sibling-boundary tests, `check:pack`, root checks. |
| Known gaps | General HTML extraction, more annotation exchange formats, very large stream fixtures, and broader data-package fixtures remain follow-up work. Corpus statistics remain `textcorpus` responsibility. |

### `@ismail-elkorchi/textcorpus`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textcorpus`, `@ismail-elkorchi/textcorpus/store`, `@ismail-elkorchi/textcorpus/query`, `@ismail-elkorchi/textcorpus/concordance`, `@ismail-elkorchi/textcorpus/frequency`, `@ismail-elkorchi/textcorpus/ngram`, `@ismail-elkorchi/textcorpus/collocation`, `@ismail-elkorchi/textcorpus/keyness`, `@ismail-elkorchi/textcorpus/dispersion`, `@ismail-elkorchi/textcorpus/terms`, `@ismail-elkorchi/textcorpus/lexicography`, `@ismail-elkorchi/textcorpus/stylometry`, `@ismail-elkorchi/textcorpus/reuse`, `@ismail-elkorchi/textcorpus/diachronic` |
| Required APIs | `createCorpus`, `addDocuments`, `corpusQuery`, `concordance`, `collocations`, `keyness`, `extractTerms`, `wordSketch`, `goodDictionaryExamples` |
| Implemented depth | Deterministic corpus construction, token/lemma/annotation/metadata/partition queries, concordance, frequency, n-grams, association/keyness, dispersion, term extraction, lexicographic examples, stylometry, reuse, diachrony, and textdata interop. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, corpus suite tests, `check:pack`, root checks. |
| Known gaps | Persistent filesystem index storage, large-corpus scaling tests, grammar-rich word-sketch extraction, and field-weight learning/profile workflows remain follow-up work. |

### `@ismail-elkorchi/textsearch`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textsearch`, `@ismail-elkorchi/textsearch/analyzer`, `@ismail-elkorchi/textsearch/index`, `@ismail-elkorchi/textsearch/query`, `@ismail-elkorchi/textsearch/rank`, `@ismail-elkorchi/textsearch/filter`, `@ismail-elkorchi/textsearch/facet`, `@ismail-elkorchi/textsearch/highlight`, `@ismail-elkorchi/textsearch/suggest`, `@ismail-elkorchi/textsearch/cql` |
| Required APIs | `createAnalyzer`, `analyze`, `createIndex`, `addToIndex`, `search`, `explain` |
| Implemented depth | Deterministic analyzer components, fielded positional in-memory indexes, term/phrase/proximity/wildcard/prefix/suffix/fuzzy/regex/metadata/annotation/range queries, Boolean logic, BM25/TF-IDF/language-model ranking, filters, facets, highlights, suggestions, explanations, and CQL parsing. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, search suite tests, `check:pack`, root checks. |
| Known gaps | Persistent index storage, large collection benchmarks, production analyzer profiles, and search/corpus integration stress tests remain follow-up work. Entity linking remains `textkb` responsibility. |

### `@ismail-elkorchi/textkb`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textkb`, `@ismail-elkorchi/textkb/kb`, `@ismail-elkorchi/textkb/entity`, `@ismail-elkorchi/textkb/sense`, `@ismail-elkorchi/textkb/term`, `@ismail-elkorchi/textkb/ontology`, `@ismail-elkorchi/textkb/thesaurus`, `@ismail-elkorchi/textkb/link`, `@ismail-elkorchi/textkb/disambiguate`, `@ismail-elkorchi/textkb/semantic-relations` |
| Required APIs | `candidateEntities`, `linkEntities`, `linkTerms`, `disambiguateSense` |
| Implemented depth | Immutable KB record stores, concept/entity/sense/relation stores, alias indexes, candidate generation, entity/term/sense linking, relation queries, ontology/thesaurus helpers, gazetteer-style annotations, and cohesion features. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, KB suite tests, `check:pack`, root checks. |
| Known gaps | Large KB resources, external ID mapping fixtures, richer disambiguation models, and KB-search/corpus integration evaluation remain follow-up work. Runtime crawling is intentionally out of scope. |

### `@ismail-elkorchi/textquality`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textquality`, `@ismail-elkorchi/textquality/document`, `@ismail-elkorchi/textquality/corpus`, `@ismail-elkorchi/textquality/ocr`, `@ismail-elkorchi/textquality/noisy`, `@ismail-elkorchi/textquality/readability`, `@ismail-elkorchi/textquality/style`, `@ismail-elkorchi/textquality/annotation`, `@ismail-elkorchi/textquality/report` |
| Required APIs | `analyzeDocumentQuality`, `analyzeCorpusQuality`, `annotateQuality` |
| Implemented depth | Unicode integrity, whitespace, punctuation, segmentation, language/script mix, morphology coverage, noisy/OCR indicators, readability, lexical diversity, annotation conflicts, corpus metadata/balance checks, style rules, reports, and quality annotations. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, dimension-specific tests, quality suite tests, `check:pack`, root checks. |
| Known gaps | Dashboard/reporting UI is outside current runtime. Larger profile resources, corpus-scale quality baselines, and richer annotation-quality policies remain follow-up work. Repair remains `textnorm` responsibility. |

### `@ismail-elkorchi/textparallel`

| Field | Current conformance |
| --- | --- |
| Required entrypoints | `@ismail-elkorchi/textparallel`, `@ismail-elkorchi/textparallel/alignment`, `@ismail-elkorchi/textparallel/sentence-align`, `@ismail-elkorchi/textparallel/word-align`, `@ismail-elkorchi/textparallel/translation-memory`, `@ismail-elkorchi/textparallel/bilingual-lexicon`, `@ismail-elkorchi/textparallel/bilingual-terms`, `@ismail-elkorchi/textparallel/transfer`, `@ismail-elkorchi/textparallel/parallel-corpus` |
| Required APIs | `alignSentences`, `alignWords`, `buildTranslationMemory`, `searchTranslationMemory`, `extractBilingualTerms`, `shallowTransfer` |
| Implemented depth | Alignment links, parallel documents/corpora, deterministic sentence/word aligners, trainable finite alignment helpers, translation memory, bilingual term extraction, bilingual lexicon induction, collocation comparison, shallow transfer, and alignment annotations. |
| Tests | Node/Deno/Bun/browser/Workers runtime tests, public API/type tests, alignment/TM/terms/transfer/corpus suite tests, `check:pack`, root checks. |
| Known gaps | Large bilingual resources, persistent translation-memory indexes, stronger alignment evaluation, and full rule-transfer language coverage remain follow-up work. Neural translation remains out of scope. |

## Resource pack details

Current generated resource packs live under `packages/textpacks/*`. The active forge graph emits
only source-backed foundation packs and the foundation composite. Generated packages are
non-publishable by default; publishability requires the gate evidence defined in the textpack
generation and distribution specification.

| Package | Required shape | Implemented depth | Tests | Known gaps |
| --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textpack-language-registry` | Root module exports `manifest`, `resources`, `default`; package exports `.` and `./pack.manifest.json` | Source-backed BCP 47/IANA language registry foundation pack generated from a pinned IANA-style snapshot with checksum validation | `build`, smoke, `npm pack --dry-run`, repo textpack manifest validation, forge drift | Runtime language-support APIs and downstream engine use remain follow-up |
| `@ismail-elkorchi/textpack-unicode-17` | Same required pack shape | Source-backed Unicode 17 foundation pack generated from pinned UCD `Blocks.txt`, `Scripts.txt`, and `PropertyValueAliases.txt` snapshots | `build`, smoke, `npm pack --dry-run`, repo textpack manifest validation, forge drift | Only selected UCD foundation files are projected; deeper Unicode resources remain follow-up |
| `@ismail-elkorchi/textpack-cldr-core` | Same required pack shape | Source-backed CLDR core foundation pack generated from pinned `cldr-core` supplemental JSON snapshots for likely subtags, aliases, and script variants | `build`, smoke, `npm pack --dry-run`, repo textpack manifest validation, forge drift | Only selected CLDR core projections are included; locale display data and collation resources remain follow-up |
| `@ismail-elkorchi/textpack-foundation` | Root module exports `manifest`, `resources`, `loadFoundation`, language-support helpers, and `default`; package exports `.` and `./pack.manifest.json` | Source-backed recipe composite resolving `textpack-language-registry`, `textpack-unicode-17`, and `textpack-cldr-core`, plus generated language-support index/API for `registered`, `unicode-covered`, `profiled`, and `task-supported` queries | `build`, smoke, negative, `npm pack --dry-run`, repo textpack manifest validation, forge drift | Language-support task coverage is empty until publishable language/task packs exist; downstream engine integration remains follow-up |

## Removed sampled/demo packs

Sampled language packs, fixture-backed references, UD sample packs, search/quality placeholders, and
demo packages have been removed from the active generated package graph. They are not npm-publishable
textpacks and do not count toward language conformance.

| Package class | Current status | Required action |
| --- | --- | --- |
| `textpack-*-morphology-ud-sa`, `textpack-*-syntax-ud-sa`, `textpack-ar-segmentation-ud-sa` | Deleted from active graph | Reintroduce only as production-grade task packs with real resources, audited licenses, and evaluation evidence |
| `textpack-*-search`, `textpack-*-quality`, `textpack-*-normalization` sampled slices | Deleted from active graph | Reintroduce only with real analyzer, quality, or normalization policy resources for the declared scope |
| `textpack-kb-demo`, `textpack-corpus-demo-en`, fixture-backed domain/historical/OCR packs | Deleted from active graph | Keep examples as fixtures or replace with production-grade source-backed packs |

## Generated-pack target details

| Target area | Current conformance | Known gaps |
| --- | --- | --- |
| Forge generation | Source-backed foundation package emission | `tools/textpack-forge` can build, acquire declared snapshot files, update snapshot/resource checksums, license-audit, verify, and drift-check source-backed foundation packs, the foundation composite, source entry files, deterministic transforms, generated markers, package reports, inventory, and size reports; richer production transforms and artifact flows remain follow-up |
| Manifest graph support | Partial | The canonical manifest schema, types, validator, and runtime resolver support recipe components, artifact descriptors, component policies, capability slots, generated gap notes, and required-component missing failures; artifact fetch/unpack flows are not implemented |
| Foundation composite | Source-backed first wave | Developer-facing `textpack-foundation` exists with generated `loadFoundation` and language-support query helpers over the source-backed registry, Unicode, and CLDR component graph |
| Language composites | Removed from active graph | `textpack-en`, `textpack-ar`, and `textpack-fr` must be reintroduced only after their required component graphs are production-grade and pass the publishability gate |
| Composite dependency policy | Partial | Required vs optional component loading, include/exclude, license policy, artifact policy, and required missing-component failures are implemented; transitive artifact profiles and production language composites remain follow-up |
| Artifact layer | Not implemented | No explicit artifact fetch command, artifact descriptors, artifact lockfile, profile cache, or artifact unpacking security checks exist yet |
| Publishability gate | Implemented default block | Generated package metadata, reports, markers, inventory, and size reports record `publishable: false` unless a spec opts in and passes evidence checks; no current generated pack is publishable |
| Size classes | Scaffolded | Size report covers source-backed foundation packs; size is delivery mechanics only, not publishability or quality |
| Stable ids and versioning | Partial | Forge source/snapshot/package ids and canonical manifest `schemaVersion` exist; full dataVersion/sourceVersion enforcement is not implemented |
| Generated inventory | Scaffolded | `docs/textpacks/generated-inventory.md` and `docs/textpacks/generated-inventory.json` are generated from source-backed foundation packs only; feature-complete language coverage is not implemented |
| Provenance/license reports | Source-backed foundation package reports | Generated NOTICE, SOURCES, ATTRIBUTION, QUALITY, and COVERAGE files exist for foundation packs and the foundation composite; deeper datasheet pipelines are not implemented |
| Generated package layout | Source-backed foundation and composite layout | Foundation packs have generated package folders, package metadata, tests, manifests, resource files, package reports, markers, inventory, and size reports |
| Feature-complete language support | Not implemented | English, Arabic, French, and later languages have only foundation-level registered/unicode/profile coverage until production language resources are ingested |

## Cross-cutting conformance notes

- The runtime package inventory is complete. The generated production textpack inventory is not yet
  complete.
- Public subpath entrypoints match the final specification for every runtime package.
- Required function names from the final specification are present for every runtime package.
- Runtime packages are ESM and side-effect-free by package metadata, and shipped code avoids
  Node-only APIs in the runtime smoke paths.
- Root CI currently runs build, lint, and schema validation. The broader package `test:all` matrix
  passes locally and should be considered a release-confidence gate when publishing all packages.
- The largest remaining conformance risk is generated resource depth: several runtime packages expose
  final-shaped deterministic baselines, while the final product target implies generated production
  packs, language composites, external artifacts, provenance, richer license audits, larger resources,
  persistent indexes, scaling tests, richer model evaluation, and complete processor/resource
  families.
