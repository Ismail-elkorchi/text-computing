# Text Computing Runtime Packages — Final Product Specification

Status: final product implementation target
Scope: TypeScript/npm runtime libraries for broad text computing and non-neural NLP
Namespace: `@ismail-elkorchi/*`
Primary constraint: every package is standalone, installable from npm, and useful by itself.
Repository constraint: packages may be developed and published from a shared monorepo/workspace; per-package GitHub repositories are optional, not required.
Neural constraint: neural networks, transformers, neural embeddings, neural generation, neural translation, and neural inference adapters are out of scope.

---

## 0. Product definition

The Text Computing ecosystem is a family of TypeScript packages for explicit, inspectable, resource-backed, corpus-backed, search-backed, knowledge-backed, and classical statistical text processing.

It is designed to cover practical NLP and corpus-processing work without neural models:

- Unicode text facts and string algorithms
- document modeling, views, spans, annotations, and annotation graphs
- resource packs for languages, scripts, domains, periods, corpora, gazetteers, grammars, finite-state resources, and classical statistical artifacts
- symbolic and rule-based NLP
- finite-state morphology, rewrite rules, transliteration, segmentation, generation, and spelling candidates
- lexicons, gazetteers, termbases, morphology dictionaries, stoplists, abbreviation tables, and phrase lists
- grammars, annotation patterns, extraction rules, and constraint rules
- classical statistical NLP: n-gram models, HMMs, MEMMs, CRFs, maximum entropy models, Naive Bayes, perceptrons, linear classifiers, topic models, clustering, and feature pipelines
- corpus analysis, corpus linguistics, concordance, collocations, keyness, dispersion, terminology, lexicography, stylometry, and diachronic analysis
- datasets, corpus readers, annotation-format readers, and streaming data abstractions
- search, indexing, retrieval, analyzers, ranking, query languages, faceting, and highlighting
- knowledge resources, entity linking, word-sense resources, ontologies, thesauri, semantic relations, and terminology KBs
- noisy text, OCR/ATR text, historical text, spelling variation, social text, dialectal text, transliteration variants, and non-standard orthographies
- text quality analysis, style diagnostics, readability, integrity, corpus quality, and annotation quality
- multilingual and multi-script processing for all human languages through a universal Unicode kernel plus explicit resource packs

The ecosystem is not one monolithic library. It is a set of runtime packages with strict package boundaries and a shared document/evidence model.

---

## 1. Final runtime package set

### 1.1 Core substrate

| Package | Purpose |
|---|---|
| `@ismail-elkorchi/textfacts` | Unicode and single-text fact kernel. No external resources. No language packs. No corpus logic. |
| `@ismail-elkorchi/textdoc` | Document, view, span, layer, annotation, annotation graph, and evidence substrate. |
| `@ismail-elkorchi/textpack` | Resource-pack manifests, loading, overlays, capabilities, and resource handles. |

### 1.2 Symbolic and resource engines

| Package | Purpose |
|---|---|
| `@ismail-elkorchi/textlex` | Lexicons, gazetteers, termbases, dictionaries, tries, phrase lists, abbreviation tables, and lexical lookup. |
| `@ismail-elkorchi/textfst` | Finite-state automata and transducers for morphology, rewrite, spelling, segmentation, transliteration, hyphenation, and rule compilation. |
| `@ismail-elkorchi/textrules` | Rule language, annotation patterns, local grammars, extraction rules, rewrite rules, grammar constraints, and symbolic processors. |
| `@ismail-elkorchi/textnorm` | Resource-backed normalization for noisy, historical, dialectal, transliterated, OCR/ATR, and spelling-variant text. |

### 1.3 Classical statistical NLP

| Package | Purpose |
|---|---|
| `@ismail-elkorchi/textclassical` | Classical statistical NLP: feature extraction, n-gram LMs, HMM, MEMM, CRF, maxent, Naive Bayes, perceptron, linear classifiers, topic models, clustering, and non-neural taggers/parsers/classifiers. |

### 1.4 Orchestration, data, corpus, search, and knowledge

| Package | Purpose |
|---|---|
| `@ismail-elkorchi/textpipeline` | Processor graph, dependency ordering, pipeline execution, streaming document flows, and package composition. |
| `@ismail-elkorchi/textdata` | Dataset and corpus readers, streaming records, splits, labeled samples, annotation-format import/export, and data packages. |
| `@ismail-elkorchi/textcorpus` | Corpus stores, corpus queries, concordance, collocations, word sketches, keyness, dispersion, terminology, lexicography, stylometry, reuse, and diachrony. |
| `@ismail-elkorchi/textsearch` | Search analyzers, inverted indexes, positional indexes, retrieval models, query languages, ranking, filtering, faceting, and highlighting. |
| `@ismail-elkorchi/textkb` | Knowledge resources, ontologies, thesauri, wordnets, entity linking, sense linking, semantic relation lookup, and terminology KBs. |
| `@ismail-elkorchi/textquality` | Text quality, noisy-text quality, OCR/ATR diagnostics, readability, style, corpus quality, annotation quality, and integrity dashboards. |
| `@ismail-elkorchi/textparallel` | Parallel corpora, alignment, translation memory, bilingual terminology, bilingual lexicon extraction, and rule-based transfer workflows. |

### 1.5 Resource package families

All large or language-specific resources are published as independent packages. They are not bundled into engines.

| Family | Purpose |
|---|---|
| `@ismail-elkorchi/textpack-*` | Language, script, locale, domain, historical, noisy-text, finite-state, grammar, lexicon, KB, corpus, and composite resource packs. |
| `@ismail-elkorchi/textplugin-*` | Optional standalone processors built on the runtime APIs. |

Examples:

```text
@ismail-elkorchi/textpack-unicode-profiles
@ismail-elkorchi/textpack-cldr-fr
@ismail-elkorchi/textpack-ar-core
@ismail-elkorchi/textpack-ja-segmentation
@ismail-elkorchi/textpack-tr-morphology
@ismail-elkorchi/textpack-fr-historical
@ismail-elkorchi/textpack-ocr-latin19c
@ismail-elkorchi/textpack-biomed-terms
@ismail-elkorchi/textpack-legal-citations
@ismail-elkorchi/textpack-wordnet-en
@ismail-elkorchi/textpack-wikidata-snapshot
@ismail-elkorchi/textpack-corpus-demo-en
```

---

## 2. Dependency graph

The dependency graph is acyclic. Higher packages may depend on lower packages, but `textfacts` and `textpack` remain independent roots.

```text
textfacts
  └── no sibling dependency

textpack
  └── no sibling dependency

textdoc
  └── textfacts

textlex
  ├── textfacts
  ├── textdoc
  └── optional textpack

textfst
  ├── textfacts
  └── optional textpack

textrules
  ├── textfacts
  ├── textdoc
  ├── textlex
  ├── textfst
  └── optional textpack

textnorm
  ├── textfacts
  ├── textdoc
  ├── textlex
  ├── textfst
  ├── textrules
  └── optional textclassical

textclassical
  ├── textfacts
  ├── textdoc
  ├── textlex
  ├── textfst
  └── optional textpack

textpipeline
  ├── textfacts
  ├── textdoc
  ├── textpack
  ├── optional textlex
  ├── optional textfst
  ├── optional textrules
  ├── optional textnorm
  └── optional textclassical

textdata
  ├── textfacts
  ├── textdoc
  └── optional textpack

textcorpus
  ├── textfacts
  ├── textdoc
  ├── textdata
  ├── textlex
  ├── optional textrules
  └── optional textclassical

textsearch
  ├── textfacts
  ├── textdoc
  ├── textlex
  ├── optional textfst
  ├── optional textrules
  └── optional textcorpus

textkb
  ├── textfacts
  ├── textdoc
  ├── textlex
  ├── optional textpack
  ├── optional textrules
  └── optional textcorpus

textquality
  ├── textfacts
  ├── textdoc
  ├── textlex
  ├── textnorm
  ├── optional textrules
  ├── optional textclassical
  └── optional textcorpus

textparallel
  ├── textfacts
  ├── textdoc
  ├── textdata
  ├── textcorpus
  ├── textlex
  ├── textfst
  ├── textrules
  └── optional textclassical

textpack-*
  ├── textpack
  └── peer dependencies on the engines used by the pack

textplugin-*
  └── peer dependencies on the runtime packages extended by the plugin
```

---

## 3. Creation order

This is the implementation order for a complete ecosystem.

1. `textfacts`
2. `textdoc`
3. `textpack`
4. `textlex`
5. `textfst`
6. `textrules`
7. first reference `textpack-*` packages
8. `textnorm`
9. `textclassical`
10. `textpipeline`
11. `textdata`
12. `textcorpus`
13. `textsearch`
14. `textkb`
15. `textquality`
16. `textparallel`
17. broad `textpack-*` and `textplugin-*` expansion

The first reference packs must exercise different language realities:

- a Latin-script space-delimited language pack
- an inflection-rich language pack
- an agglutinative language pack
- a Semitic/root-pattern language pack
- a right-to-left script pack
- a no-space segmentation pack
- a historical spelling pack
- an OCR/noisy text pack
- a domain terminology pack
- a knowledge-base pack
- a small corpus pack

---

## 4. Shared runtime model

All packages above `textfacts` share the `textdoc` model.

### 4.1 Coordinate systems

Supported coordinate systems:

```ts
export type TextUnit =
  | "utf8-byte"
  | "utf16-code-unit"
  | "unicode-scalar"
  | "grapheme"
  | "word"
  | "sentence"
  | "paragraph"
  | "line"
  | "block"
  | "token"
  | "morpheme"
  | "annotation";
```

UTF-16 code units are the default JavaScript coordinate system. All other coordinates must be explicit.

### 4.2 Span

```ts
export interface Span {
  start: number;
  end: number;
  unit: TextUnit;
}

export interface SpanRef {
  viewId: string;
  span: Span;
}
```

All spans are half-open.

### 4.3 Text source and view

```ts
export interface TextSource {
  id: string;
  text: string;
  inputKind: "string" | "utf8" | "utf16le" | "bytes";
  byteLength?: number;
  wellFormed: boolean;
  metadata?: Record<string, unknown>;
}

export interface TextView {
  id: string;
  kind:
    | "raw"
    | "decoded"
    | "normalized"
    | "casefolded"
    | "tailored"
    | "tokenized"
    | "morphological"
    | "transliterated"
    | "transcribed"
    | "historical-normalized"
    | "ocr-corrected"
    | "noisy-normalized"
    | "search"
    | "task"
    | "external";
  text: string;
  sourceViewId?: string;
  spanMapId?: string;
  transform: TransformInfo;
}
```

### 4.4 Span map

```ts
export interface SpanMap {
  id: string;
  sourceViewId: string;
  targetViewId: string;
  entries: SpanMapEntry[];
}

export interface SpanMapEntry {
  source: Span;
  target: Span;
  relation:
    | "identity"
    | "normalized"
    | "expanded"
    | "contracted"
    | "inserted"
    | "deleted"
    | "reordered"
    | "aligned"
    | "approximate";
  cost?: number;
}
```

### 4.5 Evidence

```ts
export type EvidenceMode =
  | "algorithm"
  | "rule"
  | "lexicon"
  | "gazetteer"
  | "fst"
  | "grammar"
  | "statistical"
  | "corpus"
  | "search"
  | "kb"
  | "manual"
  | "composite";

export type Exactness =
  | "E0" // exact from text + deterministic algorithm only
  | "E1" // exact given declared resources/rules
  | "E2" // exact corpus/statistical computation, interpretive meaning
  | "E3"; // diagnostic candidate, not an assertion

export interface Evidence {
  mode: EvidenceMode;
  exactness: Exactness;
  producer: string;
  packageName: string;
  packageVersion: string;
  resourceIds?: string[];
  ruleIds?: string[];
  fstIds?: string[];
  grammarIds?: string[];
  statisticalModelIds?: string[];
  corpusIds?: string[];
  kbIds?: string[];
  inputViewIds: string[];
  optionsHash?: string;
}
```

### 4.6 Annotation

```ts
export interface Annotation<T = unknown> {
  id: string;
  layer: string;
  type: string;
  spans: SpanRef[];
  value?: T;
  features?: Record<string, unknown>;
  evidence: Evidence;
  alternatives?: AnnotationAlternative<T>[];
}

export interface AnnotationAlternative<T = unknown> {
  value?: T;
  features?: Record<string, unknown>;
  evidence: Evidence;
  score?: Score;
}

export interface Score {
  kind: "cost" | "probability" | "logprob" | "margin" | "rank" | "weight" | "association";
  value: number;
  scale?: string;
}
```

Deterministic outputs use `E0` or `E1`. Classical statistical outputs use `E2` or `E3` depending on task semantics.

### 4.7 Standard layer namespace

```text
unicode.*
view.*
segment.*
token.*
subtoken.*
morpheme.*
morph.*
lemma.*
stem.*
lexical.*
syntax.*
chunk.*
phrase.*
entity.*
link.*
sense.*
term.*
relation.*
event.*
time.*
quantity.*
coref.*
quote.*
discourse.*
semantics.*
classification.*
sentiment.*
topic.*
summary.*
alignment.*
translation.*
corpus.*
search.*
kb.*
quality.*
style.*
security.*
custom.*
```

---

## 5. Task coverage map

| Task family | Main package | Supporting packages |
|---|---|---|
| Unicode facts | `textfacts` | — |
| decoding and input normalization | `textfacts` | `textdoc` |
| document views and annotations | `textdoc` | `textfacts` |
| resource loading | `textpack` | all engines |
| lexicons and gazetteers | `textlex` | `textpack`, `textkb` |
| finite-state morphology and rewrite | `textfst` | `textlex`, `textrules` |
| tokenization tailoring | `textfacts`, `textfst`, `textrules` | `textpack` |
| sentence splitting tailoring | `textfacts`, `textrules`, `textclassical` | `textpack` |
| spelling correction candidates | `textfst`, `textnorm` | `textlex`, `textclassical` |
| historical normalization | `textnorm` | `textfst`, `textrules`, `textlex`, `textcorpus` |
| noisy text normalization | `textnorm` | `textclassical`, `textlex`, `textrules` |
| morphology | `textfst`, `textrules`, `textclassical` | `textpack`, `textlex` |
| POS and morphosyntactic tagging | `textclassical`, `textrules` | `textlex`, `textpack` |
| chunking | `textrules`, `textclassical` | `textdoc` |
| dependency parsing | `textrules`, `textclassical` | `textpack` |
| constituency parsing | `textrules`, `textclassical` | `textpack` |
| NER | `textrules`, `textclassical`, `textkb` | `textlex` |
| entity linking | `textkb` | `textlex`, `textrules`, `textsearch` |
| relation extraction | `textrules`, `textkb`, `textclassical` | `textdoc` |
| event extraction | `textrules`, `textkb`, `textclassical` | `textdoc` |
| temporal and quantity extraction | `textrules` | `textkb`, `textlex` |
| coreference | `textrules`, `textclassical`, `textkb` | `textdoc` |
| quote extraction and attribution | `textrules`, `textclassical` | `textdoc` |
| word sense disambiguation | `textkb`, `textrules`, `textclassical` | `textcorpus` |
| terminology extraction | `textcorpus`, `textkb` | `textlex`, `textrules`, `textclassical` |
| lexicographic word sketches | `textcorpus` | `textrules`, `textlex` |
| classification | `textclassical` | `textdoc`, `textcorpus` |
| sentiment and stance by lexicon/classical models | `textclassical`, `textlex`, `textrules` | `textkb` |
| extractive summarization | `textcorpus`, `textclassical` | `textsearch`, `textkb` |
| topic modeling | `textclassical`, `textcorpus` | `textdata` |
| concordance and KWIC | `textcorpus` | `textsearch` |
| collocation and keyness | `textcorpus` | `textclassical` |
| stylometry and authorship features | `textcorpus`, `textclassical` | `textquality` |
| corpus quality | `textquality`, `textcorpus` | `textfacts` |
| search and retrieval | `textsearch` | `textfacts`, `textlex`, `textfst` |
| knowledge-base lookup | `textkb` | `textsearch`, `textlex` |
| rule-based translation and transfer | `textparallel`, `textrules`, `textfst` | `textlex` |
| parallel corpus alignment | `textparallel` | `textclassical`, `textcorpus` |
| dataset loading | `textdata` | `textdoc`, `textpack` |
| pipelines | `textpipeline` | all task packages |

---

## 6. `@ismail-elkorchi/textfacts`

### 6.1 Mission

`textfacts` is the Unicode and single-text fact kernel. It answers what is exactly true about one text under spec-pinned Unicode algorithms and local deterministic computations.

It has no sibling dependencies. It does not load language packs. It does not do morphology, POS tagging, NER, parsing, corpus analysis, search indexing, statistical learning, or pipeline orchestration.

### 6.2 Standalone tasks

A user installing only `textfacts` can:

- read string and byte inputs
- validate Unicode well-formedness
- scan lone surrogates, noncharacters, default ignorables, bidi controls, join controls, variation selectors, and controls
- normalize to NFC, NFD, NFKC, NFKD
- compute normalization deltas
- case-map and case-fold
- inspect Unicode categories, scripts, script extensions, word-break classes, grapheme-break classes, sentence-break classes, line-break classes, bidi classes, East Asian width, and emoji properties
- segment grapheme clusters, words, and sentences by Unicode default rules
- compute line-break opportunities
- resolve bidirectional text facts
- compute root collation keys
- compare strings under root UCA/DUCET ordering
- compute confusable skeletons and mixed-script token facts
- count code units, scalars, graphemes, words, sentences, lines, punctuation classes, whitespace, symbols, digits, marks, and scripts
- compute local character frequencies, word frequencies, local n-grams, repeated spans, and local surface profiles
- compute canonical stable hashes
- produce single-text fact reports with provenance

### 6.3 Required entrypoints

```text
@ismail-elkorchi/textfacts
@ismail-elkorchi/textfacts/input
@ismail-elkorchi/textfacts/unicode
@ismail-elkorchi/textfacts/normalize
@ismail-elkorchi/textfacts/casefold
@ismail-elkorchi/textfacts/segment
@ismail-elkorchi/textfacts/linebreak
@ismail-elkorchi/textfacts/bidi
@ismail-elkorchi/textfacts/security
@ismail-elkorchi/textfacts/integrity
@ismail-elkorchi/textfacts/collation
@ismail-elkorchi/textfacts/facts
@ismail-elkorchi/textfacts/hash
@ismail-elkorchi/textfacts/idna
```

### 6.4 Core APIs

```ts
export function readText(input: TextInput, options?: ReadTextOptions): TextSource;
export function normalize(text: string, form: NormalizationForm): string;
export function normalizationDeltas(text: string, form: NormalizationForm): NormalizationDelta[];
export function segmentGraphemes(text: string, options?: SegmentOptions): Iterable<Span>;
export function segmentWords(text: string, options?: SegmentOptions): Iterable<Span>;
export function segmentSentences(text: string, options?: SegmentOptions): Iterable<Span>;
export function lineBreakOpportunities(text: string, options?: LineBreakOptions): Iterable<LineBreakOpportunity>;
export function scanIntegrityFindings(text: string, options?: IntegrityOptions): IntegrityFinding[];
export function confusableSkeleton(text: string, options?: ConfusableOptions): string;
export function rootCollationKey(text: string, options?: CollationOptions): Uint8Array;
export function surfaceProfile(text: string, options?: SurfaceProfileOptions): SurfaceProfile;
export function wordFrequencies(text: string, options?: WordFrequencyOptions): FrequencyTable;
export function charNgrams(text: string, options: NgramOptions): NgramTable;
export function wordNgrams(text: string, options: NgramOptions): NgramTable;
```

### 6.5 Profile readiness

`textfacts` exposes profile interfaces but not profile data. A profile may describe:

- boundary overrides
- script-boundary policies
- abbreviation suppressions
- locale collation tailoring handles
- line-break tailoring handles
- security policy presets

Profile data is provided by `textpack-*` packages and applied by higher packages.

### 6.6 Boundaries

`textfacts` must not implement:

- language-specific tokenization beyond Unicode defaults
- dictionary segmentation
- morphology
- POS tagging
- lemmatization beyond Unicode/string transforms
- gazetteer lookup
- NER
- syntactic parsing
- statistical learning
- corpus analysis across documents
- search indexing
- pack loading
- pipeline execution

---

## 7. `@ismail-elkorchi/textdoc`

### 7.1 Mission

`textdoc` is the central document, view, span, layer, annotation, and evidence package. It provides the object model used by all NLP task packages.

### 7.2 Standalone tasks

A user installing only `textdoc` can:

- create a document from text
- attach metadata
- create and manage views
- create and manage span maps
- convert offsets between coordinate systems
- create, update, delete, query, and merge annotations
- group annotations into layers
- represent alternatives and ambiguity
- represent dependency graphs, parse trees, coreference chains, entity links, term candidates, quality findings, and alignments
- query annotations by span, overlap, type, layer, features, evidence, and graph relation
- serialize and deserialize documents to stable JSON

### 7.3 Required entrypoints

```text
@ismail-elkorchi/textdoc
@ismail-elkorchi/textdoc/document
@ismail-elkorchi/textdoc/view
@ismail-elkorchi/textdoc/span
@ismail-elkorchi/textdoc/layer
@ismail-elkorchi/textdoc/annotation
@ismail-elkorchi/textdoc/graph
@ismail-elkorchi/textdoc/query
@ismail-elkorchi/textdoc/selection
@ismail-elkorchi/textdoc/serialize
```

### 7.4 Document API

```ts
export interface TextDocument {
  id: string;
  sources: Record<string, TextSource>;
  views: Record<string, TextView>;
  spanMaps: Record<string, SpanMap>;
  layers: Record<string, AnnotationLayer>;
  graphs: Record<string, AnnotationGraph>;
  metadata: Record<string, unknown>;
}

export function createDocument(input: TextInput, options?: CreateDocumentOptions): TextDocument;
export function addView(doc: TextDocument, view: TextView): TextDocument;
export function addSpanMap(doc: TextDocument, spanMap: SpanMap): TextDocument;
export function addAnnotation<T>(doc: TextDocument, annotation: Annotation<T>): TextDocument;
export function selectAnnotations(doc: TextDocument, query: AnnotationQuery): Annotation[];
export function mapSpan(doc: TextDocument, ref: SpanRef, targetViewId: string): SpanRef[];
export function toTextDocJson(doc: TextDocument, options?: SerializeOptions): TextDocJson;
export function fromTextDocJson(json: TextDocJson): TextDocument;
```

### 7.5 Built-in annotation structures

```ts
export interface TokenValue {
  index: number;
  text: string;
  normalized?: string;
}

export interface MorphAnalysisValue {
  lemma?: string;
  stem?: string;
  pos?: string;
  features?: Record<string, string | string[]>;
  analysis?: string;
}

export interface DependencyEdgeValue {
  head: string;
  dependent: string;
  relation: string;
}

export interface ParseTreeValue {
  label: string;
  children: Array<ParseTreeValue | string>;
}

export interface EntityValue {
  label: string;
  canonical?: string;
  kbId?: string;
}

export interface TermCandidateValue {
  term: string;
  head?: string;
  score?: Score;
  domain?: string;
}

export interface QualityFindingValue {
  kind: string;
  severity?: "info" | "notice" | "warning" | "error";
  message?: string;
}
```

### 7.6 Boundaries

`textdoc` does not decide what annotations are correct. It stores and queries annotations produced by other packages.

---

## 8. `@ismail-elkorchi/textpack`

### 8.1 Mission

`textpack` defines how external resources are described, loaded, composed, and exposed to runtime engines.

It is independent from all engines so that resource packages can be validated and inspected without installing the whole ecosystem.

### 8.2 Resource kinds

```ts
export type ResourceKind =
  | "unicode-profile"
  | "locale-profile"
  | "segmentation-profile"
  | "normalization-profile"
  | "lexicon"
  | "gazetteer"
  | "termbase"
  | "abbreviation-table"
  | "stoplist"
  | "phrase-list"
  | "fst"
  | "morphology"
  | "grammar"
  | "rule-set"
  | "statistical-model"
  | "corpus"
  | "dataset"
  | "knowledge-base"
  | "ontology"
  | "translation-memory"
  | "alignment-table"
  | "quality-profile"
  | "composite";
```

### 8.3 Manifest

```ts
export interface TextPackManifest {
  id: string;
  name: string;
  version: string;
  packageName: string;
  kind: ResourceKind[];
  targets: {
    languages?: string[];
    scripts?: string[];
    regions?: string[];
    domains?: string[];
    periods?: string[];
    orthographies?: string[];
    modalities?: Array<"typed" | "ocr" | "atr" | "asr" | "social" | "transliterated" | "historical">;
  };
  engines: Record<string, string>;
  resources: TextPackResource[];
  dependencies?: TextPackDependency[];
  capabilities: TextPackCapabilities;
  license?: string;
  citations?: string[];
}
```

### 8.4 Loading APIs

```ts
export function validateManifest(manifest: unknown): TextPackManifest;
export function createPack(manifest: TextPackManifest, resources: PackResourceMap): TextPack;
export function loadPack(module: unknown): Promise<TextPack>;
export function composePacks(packs: TextPack[], options?: PackComposeOptions): TextPack;
export function listResources(pack: TextPack, query?: ResourceQuery): TextPackResource[];
export function getResource<T>(pack: TextPack, id: string): T;
export function capabilities(pack: TextPack): TextPackCapabilities;
```

### 8.5 Capability levels

A pack never claims generic language support. It declares explicit capabilities:

```ts
export interface TextPackCapabilities {
  segmentation?: "none" | "default" | "profile" | "dictionary" | "fst" | "rules";
  normalization?: "none" | "unicode" | "lexicon" | "rules" | "fst" | "statistical";
  morphology?: "none" | "lookup" | "rules" | "fst" | "statistical";
  tagging?: "none" | "rules" | "statistical" | "hybrid";
  parsing?: "none" | "rules" | "statistical" | "hybrid";
  extraction?: "none" | "gazetteer" | "rules" | "statistical" | "hybrid";
  search?: "none" | "analyzer" | "index-profile";
  terminology?: "none" | "lexicon" | "corpus" | "kb";
  historical?: boolean;
  noisyText?: boolean;
  parallel?: boolean;
}
```

---

## 9. `@ismail-elkorchi/textlex`

### 9.1 Mission

`textlex` provides efficient lexical resources and lookup engines: dictionaries, gazetteers, termbases, phrase lists, abbreviation tables, stoplists, affix tables, pronunciation lexicons, and lookup indexes.

### 9.2 Standalone tasks

A user installing only `textlex` can:

- create lexicons and gazetteers
- load lexicon resources from packs or local data
- perform exact lookup, normalized lookup, casefold lookup, prefix lookup, suffix lookup, fuzzy lookup, and phrase lookup
- build tries, double-array tries, DAWGs, minimal perfect hash maps, and token phrase indexes
- annotate documents with lexical matches
- manage aliases, variants, inflected forms, labels, features, and source metadata
- create stopword lists, abbreviation lists, wordlists, and termbases
- export lookup results as `textdoc` annotations

### 9.3 Required entrypoints

```text
@ismail-elkorchi/textlex
@ismail-elkorchi/textlex/lexicon
@ismail-elkorchi/textlex/gazetteer
@ismail-elkorchi/textlex/term
@ismail-elkorchi/textlex/trie
@ismail-elkorchi/textlex/phrase
@ismail-elkorchi/textlex/fuzzy
@ismail-elkorchi/textlex/annotate
```

### 9.4 Core APIs

```ts
export interface LexicalEntry {
  id: string;
  forms: string[];
  canonical?: string;
  labels?: string[];
  features?: Record<string, unknown>;
  language?: string;
  script?: string;
  source?: string;
}

export interface Lexicon {
  id: string;
  entries: LexicalEntry[];
  index: LexiconIndex;
}

export function buildLexicon(entries: Iterable<LexicalEntry>, options?: LexiconOptions): Lexicon;
export function lookup(lexicon: Lexicon, text: string, options?: LookupOptions): LexicalMatch[];
export function phraseLookup(lexicon: Lexicon, tokens: TokenValue[], options?: PhraseLookupOptions): PhraseMatch[];
export function annotateLexicon(doc: TextDocument, lexicon: Lexicon, options?: AnnotateLexiconOptions): TextDocument;
```

### 9.5 Gazetteer model

```ts
export interface GazetteerEntry extends LexicalEntry {
  entityType?: string;
  kbId?: string;
  priority?: number;
  aliases?: string[];
  disambiguationHints?: Record<string, unknown>;
}
```

### 9.6 Boundaries

`textlex` performs lexical lookup. It does not perform entity linking, ontology reasoning, or corpus term extraction. Those belong to `textkb` and `textcorpus`.

---

## 10. `@ismail-elkorchi/textfst`

### 10.1 Mission

`textfst` provides finite-state automata and transducers for TypeScript text processing. It is the finite-state backbone for morphology, spelling candidates, transliteration, rewrite rules, tokenization profiles, segmentation, hyphenation, shallow generation, and rule compilation.

### 10.2 Standalone tasks

A user installing only `textfst` can:

- build acceptors and transducers
- compile regular expressions into automata
- compile replacement rules into transducers
- compile lexicon-style morphological resources
- apply transducers to strings
- compose, union, concatenate, intersect, subtract, determinize, minimize, invert, project, epsilon-remove, and sort automata
- compute shortest paths and n-best paths
- use weighted automata with tropical and log semirings
- run morphological analysis and generation from FST resources
- generate spelling candidates by edit-distance and weighted confusion transducers
- run transliteration and orthographic conversion
- perform hyphenation and syllabification when resources exist

### 10.3 Required entrypoints

```text
@ismail-elkorchi/textfst
@ismail-elkorchi/textfst/automaton
@ismail-elkorchi/textfst/transducer
@ismail-elkorchi/textfst/compile
@ismail-elkorchi/textfst/regex
@ismail-elkorchi/textfst/rewrite
@ismail-elkorchi/textfst/lexc
@ismail-elkorchi/textfst/twol
@ismail-elkorchi/textfst/apply
@ismail-elkorchi/textfst/weight
@ismail-elkorchi/textfst/morph
@ismail-elkorchi/textfst/spell
```

### 10.4 Core data structures

```ts
export interface Fst {
  id: string;
  kind: "acceptor" | "transducer";
  semiring: "boolean" | "tropical" | "log";
  states: FstState[];
  arcs: FstArc[];
  startState: number;
  finalWeights: Record<number, number>;
  alphabet?: string[];
  metadata?: Record<string, unknown>;
}

export interface FstArc {
  from: number;
  to: number;
  input: string;
  output: string;
  weight?: number;
}
```

### 10.5 APIs

```ts
export function compileRegex(pattern: string, options?: FstCompileOptions): Fst;
export function compileRewrite(rule: RewriteRule, options?: RewriteCompileOptions): Fst;
export function compileLexicon(source: LexcSource, options?: LexcCompileOptions): Fst;
export function compose(left: Fst, right: Fst, options?: ComposeOptions): Fst;
export function determinize(fst: Fst, options?: DeterminizeOptions): Fst;
export function minimize(fst: Fst, options?: MinimizeOptions): Fst;
export function applyDown(fst: Fst, input: string, options?: ApplyOptions): FstResult[];
export function applyUp(fst: Fst, output: string, options?: ApplyOptions): FstResult[];
export function shortestPath(fst: Fst, options?: ShortestPathOptions): FstPath[];
```

### 10.6 Morphology APIs

```ts
export interface MorphFstResult {
  surface: string;
  analysis: string;
  lemma?: string;
  tags?: string[];
  weight?: number;
  spans?: SpanRef[];
}

export function analyzeWord(fst: Fst, word: string, options?: MorphAnalyzeOptions): MorphFstResult[];
export function generateWord(fst: Fst, analysis: string, options?: MorphGenerateOptions): MorphFstResult[];
```

### 10.7 Boundaries

`textfst` is an automata/transducer runtime and compiler. It does not define annotation cascades, corpus statistics, KB reasoning, or pipeline scheduling.

---

## 11. `@ismail-elkorchi/textrules`

### 11.1 Mission

`textrules` provides deterministic rule-based NLP over `textdoc` documents. It includes token and annotation pattern matching, local grammars, cascades, extraction rules, transformation rules, grammar constraints, and symbolic processors.

### 11.2 Standalone tasks

A user installing only `textrules` with hand-written rules can:

- match token patterns
- match character-span patterns
- match annotation patterns
- match dependency patterns
- match parse-tree patterns
- run finite-state cascades over annotations
- create annotations from rule matches
- rewrite views and preserve span maps
- split, merge, or retokenize documents
- extract dates, quantities, citations, mentions, entities, relations, events, quotes, and discourse markers
- implement rule-based sentence splitting, tokenization, lemmatization, stemming, NER, relation extraction, coreference, quote attribution, and style checks
- run grammar constraints and agreement checks
- create rule-based feature extractors for `textclassical`

### 11.3 Required entrypoints

```text
@ismail-elkorchi/textrules
@ismail-elkorchi/textrules/pattern
@ismail-elkorchi/textrules/compile
@ismail-elkorchi/textrules/match
@ismail-elkorchi/textrules/cascade
@ismail-elkorchi/textrules/rewrite
@ismail-elkorchi/textrules/grammar
@ismail-elkorchi/textrules/extract
@ismail-elkorchi/textrules/constraints
@ismail-elkorchi/textrules/processor
```

### 11.4 Rule model

```ts
export interface RuleSet {
  id: string;
  version: string;
  rules: Rule[];
  resources?: string[];
  metadata?: Record<string, unknown>;
}

export interface Rule {
  id: string;
  phase?: string;
  priority?: number;
  when: Pattern;
  action: RuleAction[];
  options?: Record<string, unknown>;
}

export type Pattern =
  | CharPattern
  | TokenPattern
  | AnnotationPattern
  | DependencyPattern
  | TreePattern
  | SequencePattern
  | BooleanPattern;
```

### 11.5 Execution APIs

```ts
export function compileRuleSet(ruleSet: RuleSet, options?: RuleCompileOptions): CompiledRuleSet;
export function matchRules(doc: TextDocument, rules: CompiledRuleSet, options?: MatchOptions): RuleMatch[];
export function applyRules(doc: TextDocument, rules: CompiledRuleSet, options?: ApplyRuleOptions): TextDocument;
export function rewriteView(doc: TextDocument, rules: CompiledRuleSet, options?: RewriteViewOptions): TextDocument;
export function createRuleProcessor(rules: CompiledRuleSet, options?: RuleProcessorOptions): TextProcessor;
```

### 11.6 Grammar support

`textrules` supports:

- local grammars over annotations
- cascaded finite-state annotation grammars
- regular expressions over tokens and annotations
- dependency-pattern grammars
- tree-pattern grammars
- feature-structure constraints
- agreement rules
- phrase-structure grammars for deterministic and chart-based parsing
- grammar-driven shallow transfer rules for `textparallel`

### 11.7 Built-in symbolic processors

The package must include generic processors that can be driven by rules or resource packs:

- `RuleTokenizer`
- `RuleSentenceSplitter`
- `RuleLemmatizer`
- `RuleStemmer`
- `RuleChunker`
- `RuleEntityRecognizer`
- `RuleRelationExtractor`
- `RuleEventExtractor`
- `RuleTimeExtractor`
- `RuleQuantityExtractor`
- `RuleCitationExtractor`
- `RuleCoreferenceResolver`
- `RuleQuoteAttributor`
- `RuleStyleChecker`
- `RuleTransferProcessor`

### 11.8 Boundaries

`textrules` does not train statistical models, store corpora, or manage search indexes. It may emit features and annotations that those packages consume.

---

## 12. `@ismail-elkorchi/textnorm`

### 12.1 Mission

`textnorm` performs resource-backed text normalization above Unicode normalization. It handles noisy text, historical spelling, OCR/ATR errors, dialectal spelling, social-media variants, transliteration variants, spacing errors, punctuation variation, and orthographic modernization.

It never overwrites the source text. It creates views, candidates, variant graphs, and span maps.

### 12.2 Standalone tasks

A user installing only `textnorm` can:

- create normalized views with span maps
- normalize spelling variants using lexicons, FSTs, and rules
- generate candidate corrections for OCR/ATR noise
- detect and normalize repeated characters, informal contractions, casing patterns, and punctuation variants
- normalize historical spellings to configured editorial conventions
- normalize transliterated text to canonical forms when resources exist
- produce ambiguity lists and variant graphs
- compute edit scripts between original and normalized views
- annotate normalization decisions as evidence-bearing annotations

### 12.3 Required entrypoints

```text
@ismail-elkorchi/textnorm
@ismail-elkorchi/textnorm/normalize
@ismail-elkorchi/textnorm/variant
@ismail-elkorchi/textnorm/noisy
@ismail-elkorchi/textnorm/historical
@ismail-elkorchi/textnorm/ocr
@ismail-elkorchi/textnorm/transliteration
@ismail-elkorchi/textnorm/spell
@ismail-elkorchi/textnorm/view
```

### 12.4 Core APIs

```ts
export interface NormalizationCandidate {
  source: SpanRef;
  candidate: string;
  kind:
    | "spelling"
    | "historical"
    | "ocr"
    | "dialect"
    | "transliteration"
    | "punctuation"
    | "spacing"
    | "casing";
  evidence: Evidence;
  score?: Score;
}

export interface NormalizationViewResult {
  view: TextView;
  spanMap: SpanMap;
  candidates: NormalizationCandidate[];
}

export function normalizeDocument(doc: TextDocument, options: TextNormOptions): NormalizationViewResult;
export function candidateNormalizations(doc: TextDocument, options: CandidateOptions): NormalizationCandidate[];
export function buildVariantGraph(doc: TextDocument, options?: VariantGraphOptions): VariantGraph;
```

### 12.5 Historical text mode

Historical mode supports:

- diplomatic source view
- editorial-normalized view
- search-normalized view
- lemma-oriented view
- period-specific spelling maps
- abbreviation expansion candidates
- uncertainty tags
- witness/edition variant references

### 12.6 Noisy and OCR/ATR mode

Noisy/OCR mode supports:

- character confusion tables
- word confusion tables
- edit-distance candidate generation
- FST-based noisy-channel candidate generation
- corpus-frequency reranking through `textclassical`
- line-break and hyphenation repair
- broken token merge/split candidates
- confidence-free diagnostic mode for quality review

---

## 13. `@ismail-elkorchi/textclassical`

### 13.1 Mission

`textclassical` provides non-neural statistical NLP. It owns feature extraction, classical trainable models, sequence models, n-gram language models, topic models, clustering, and non-neural task processors.

### 13.2 Standalone tasks

A user installing only `textclassical` can:

- extract sparse feature vectors from text and annotations
- vectorize dictionaries, token windows, character n-grams, word n-grams, gazetteer hits, affixes, shapes, POS tags, and lexicon features
- train and run Naive Bayes classifiers
- train and run maximum entropy / logistic regression classifiers
- train and run perceptron and averaged perceptron classifiers
- train and run linear classifiers with hinge/logistic losses
- train and run HMM taggers
- train and run MEMM taggers
- train and run linear-chain CRF taggers
- train and run classical chunkers
- train and run non-neural POS taggers
- train and run sequence labelers for NER and slot filling
- train and run n-gram language models with smoothing
- train and run topic models and corpus clustering
- run language identification based on character n-grams and classical classifiers
- run extractive summarizers based on centroid, graph, frequency, or lexical cohesion methods
- run sentiment classifiers based on lexicons and classical features
- export statistical outputs as `textdoc` annotations

### 13.3 Required entrypoints

```text
@ismail-elkorchi/textclassical
@ismail-elkorchi/textclassical/features
@ismail-elkorchi/textclassical/vectorize
@ismail-elkorchi/textclassical/classify
@ismail-elkorchi/textclassical/sequence
@ismail-elkorchi/textclassical/hmm
@ismail-elkorchi/textclassical/crf
@ismail-elkorchi/textclassical/maxent
@ismail-elkorchi/textclassical/perceptron
@ismail-elkorchi/textclassical/lm
@ismail-elkorchi/textclassical/topic
@ismail-elkorchi/textclassical/cluster
@ismail-elkorchi/textclassical/tagger
@ismail-elkorchi/textclassical/parser
@ismail-elkorchi/textclassical/summary
```

### 13.4 Feature extraction

```ts
export interface FeatureSpec {
  id: string;
  extract: FeatureExtractor;
  namespace?: string;
}

export interface FeatureVector {
  ids: number[];
  values: number[];
  featureSpaceId: string;
}

export function extractFeatures(doc: TextDocument, spec: FeatureSpec[], options?: FeatureOptions): FeatureVector[];
export function fitVectorizer(samples: Iterable<FeatureRecord>, options?: VectorizerOptions): Vectorizer;
export function transformVectorizer(vectorizer: Vectorizer, samples: Iterable<FeatureRecord>): SparseMatrix;
```

### 13.5 Classification APIs

```ts
export type ClassicalClassifierKind =
  | "naive-bayes"
  | "maxent"
  | "perceptron"
  | "averaged-perceptron"
  | "linear-svm"
  | "logistic-regression";

export function trainClassifier(samples: Iterable<LabeledFeatureRecord>, options: TrainClassifierOptions): ClassicalClassifier;
export function classify(classifier: ClassicalClassifier, features: FeatureVector): ClassificationResult;
export function classifyDocument(doc: TextDocument, classifier: ClassicalClassifier, options?: ClassifyDocOptions): TextDocument;
```

### 13.6 Sequence APIs

```ts
export type SequenceModelKind = "hmm" | "memm" | "crf" | "perceptron-sequence";

export function trainSequenceTagger(samples: Iterable<SequenceSample>, options: TrainSequenceOptions): SequenceTagger;
export function tagSequence(tagger: SequenceTagger, sequence: SequenceInput, options?: TagOptions): SequenceTagResult;
export function annotateSequence(doc: TextDocument, tagger: SequenceTagger, options?: AnnotateSequenceOptions): TextDocument;
```

### 13.7 N-gram language models

```ts
export type SmoothingKind =
  | "mle"
  | "laplace"
  | "lidstone"
  | "witten-bell"
  | "good-turing"
  | "kneser-ney"
  | "absolute-discount"
  | "stupid-backoff";

export function trainNgramLanguageModel(corpus: Iterable<TokenSequence>, options: TrainNgramLmOptions): NgramLanguageModel;
export function scoreSequence(lm: NgramLanguageModel, tokens: string[]): Score;
export function perplexity(lm: NgramLanguageModel, corpus: Iterable<TokenSequence>): number;
```

### 13.8 Topic and clustering APIs

```ts
export function trainLda(corpus: Iterable<DocumentTermVector>, options: LdaOptions): TopicModel;
export function inferTopics(model: TopicModel, doc: DocumentTermVector): TopicDistribution;
export function clusterDocuments(vectors: SparseMatrix, options: ClusterOptions): ClusterResult;
```

### 13.9 Boundaries

`textclassical` must not implement neural networks, transformer inference, neural embeddings, neural translation, or neural generation.

---

## 14. `@ismail-elkorchi/textpipeline`

### 14.1 Mission

`textpipeline` composes processors into runnable NLP pipelines. It is the orchestrator for document processing, but not the owner of task algorithms.

### 14.2 Standalone tasks

A user installing only `textpipeline` plus simple custom processors can:

- define processors
- define processor requirements and outputs
- build a dependency graph
- run processors over documents
- run streaming document flows
- cache intermediate layers
- handle processor failures
- inspect pipeline plans
- compose pack-provided processors

### 14.3 Required entrypoints

```text
@ismail-elkorchi/textpipeline
@ismail-elkorchi/textpipeline/processor
@ismail-elkorchi/textpipeline/graph
@ismail-elkorchi/textpipeline/run
@ismail-elkorchi/textpipeline/stream
@ismail-elkorchi/textpipeline/cache
@ismail-elkorchi/textpipeline/pack
```

### 14.4 Processor API

```ts
export interface TextProcessor {
  id: string;
  version: string;
  requires?: ProcessorRequirement[];
  provides: ProcessorOutput[];
  process(doc: TextDocument, context: ProcessorContext): Promise<TextDocument> | TextDocument;
}

export interface ProcessorRequirement {
  layer?: string;
  viewKind?: TextView["kind"];
  resourceKind?: ResourceKind;
  capability?: string;
}

export interface ProcessorOutput {
  layer?: string;
  viewKind?: TextView["kind"];
  annotations?: string[];
}

export function createPipeline(processors: TextProcessor[], options?: PipelineOptions): TextPipeline;
export function planPipeline(pipeline: TextPipeline, doc?: TextDocument): PipelinePlan;
export function runPipeline(pipeline: TextPipeline, doc: TextDocument, options?: RunOptions): Promise<TextDocument>;
export function streamPipeline(pipeline: TextPipeline, docs: AsyncIterable<TextDocument>, options?: StreamOptions): AsyncIterable<TextDocument>;
```

### 14.5 Processor families

The pipeline must support processors from:

- `textfacts` wrappers
- `textlex` lexicon annotators
- `textfst` morphology/transliteration processors
- `textrules` rule processors
- `textnorm` normalization processors
- `textclassical` statistical processors
- `textcorpus` corpus-aware processors
- `textsearch` retrieval processors
- `textkb` linking processors
- `textquality` quality processors
- `textparallel` alignment/transfer processors

---

## 15. `@ismail-elkorchi/textdata`

### 15.1 Mission

`textdata` loads, streams, converts, and represents datasets and corpora. It provides runtime access to text datasets and annotated data without turning corpus analysis into a file-format package.

### 15.2 Standalone tasks

A user installing only `textdata` can:

- read plain text collections
- read JSONL records
- read CSV/TSV text datasets
- read CoNLL-style token/tag files
- read CoNLL-U dependency corpora
- read IOB/BIO/BILOU sequence-labeling datasets
- read TEI/XML text files into `textdoc`
- read basic HTML/XML text with structural annotations
- read parallel text files and alignment files
- create train/dev/test splits
- stream large datasets
- attach dataset metadata
- export `textdoc` documents to JSONL and tabular formats

### 15.3 Required entrypoints

```text
@ismail-elkorchi/textdata
@ismail-elkorchi/textdata/dataset
@ismail-elkorchi/textdata/reader
@ismail-elkorchi/textdata/writer
@ismail-elkorchi/textdata/stream
@ismail-elkorchi/textdata/split
@ismail-elkorchi/textdata/conllu
@ismail-elkorchi/textdata/iob
@ismail-elkorchi/textdata/tei
@ismail-elkorchi/textdata/parallel
```

### 15.4 Dataset API

```ts
export interface TextDataset<T = TextDocument> {
  id: string;
  metadata: Record<string, unknown>;
  records: AsyncIterable<T> | Iterable<T>;
}

export function readDataset(input: DatasetInput, options: DatasetReadOptions): Promise<TextDataset>;
export function streamRecords<T>(dataset: TextDataset<T>): AsyncIterable<T>;
export function splitDataset<T>(dataset: TextDataset<T>, options: SplitOptions): DatasetSplits<T>;
export function writeDataset<T>(dataset: TextDataset<T>, output: DatasetOutput, options?: DatasetWriteOptions): Promise<void>;
```

### 15.5 Boundaries

`textdata` loads and converts data. Corpus statistics belong to `textcorpus`. Model training belongs to `textclassical`.

---

## 16. `@ismail-elkorchi/textcorpus`

### 16.1 Mission

`textcorpus` provides corpus storage, corpus querying, corpus linguistics, lexicographic analysis, terminology extraction, stylometry, reuse detection, diachronic analysis, and corpus-backed text statistics.

### 16.2 Standalone tasks

A user installing only `textcorpus` can:

- create a corpus from documents
- store metadata and corpus partitions
- build token, lemma, annotation, and metadata indexes
- search corpus documents by token, lemma, annotation, and metadata
- create word lists and frequency lists
- generate n-gram lists
- generate concordances and KWIC lines
- compute collocations and association scores
- compute keyness between corpora
- compute dispersion and distribution plots
- compute lexical diversity and stylometric profiles
- compute word sketches from grammar relations
- extract terms and multiword terms
- compare corpora by time, author, domain, region, source, or pack metadata
- detect repeated passages and document reuse
- build diachronic trend tables
- produce corpus-derived lexicographic examples

### 16.3 Required entrypoints

```text
@ismail-elkorchi/textcorpus
@ismail-elkorchi/textcorpus/store
@ismail-elkorchi/textcorpus/query
@ismail-elkorchi/textcorpus/concordance
@ismail-elkorchi/textcorpus/frequency
@ismail-elkorchi/textcorpus/ngram
@ismail-elkorchi/textcorpus/collocation
@ismail-elkorchi/textcorpus/keyness
@ismail-elkorchi/textcorpus/dispersion
@ismail-elkorchi/textcorpus/terms
@ismail-elkorchi/textcorpus/lexicography
@ismail-elkorchi/textcorpus/stylometry
@ismail-elkorchi/textcorpus/reuse
@ismail-elkorchi/textcorpus/diachronic
```

### 16.4 Corpus API

```ts
export interface CorpusDocumentRef {
  id: string;
  metadata: Record<string, unknown>;
}

export interface TextCorpus {
  id: string;
  documents: CorpusDocumentRef[];
  indexes: CorpusIndexManifest;
  metadata: Record<string, unknown>;
}

export function createCorpus(docs: Iterable<TextDocument>, options?: CorpusOptions): TextCorpus;
export function addDocuments(corpus: TextCorpus, docs: Iterable<TextDocument>): TextCorpus;
export function corpusQuery(corpus: TextCorpus, query: CorpusQuery, options?: CorpusQueryOptions): CorpusResult;
```

### 16.5 Concordance and KWIC

```ts
export interface KwicLine {
  docId: string;
  hit: SpanRef;
  left: string;
  node: string;
  right: string;
  metadata: Record<string, unknown>;
}

export function concordance(corpus: TextCorpus, query: CorpusQuery, options?: ConcordanceOptions): KwicLine[];
```

### 16.6 Collocation and keyness

```ts
export type AssociationMeasure =
  | "mi"
  | "mi3"
  | "t-score"
  | "z-score"
  | "chi-square"
  | "log-likelihood"
  | "dice"
  | "logdice"
  | "raw-frequency"
  | "relative-frequency";

export function collocations(corpus: TextCorpus, query: CorpusQuery, options?: CollocationOptions): CollocationResult[];
export function keyness(focus: TextCorpus, reference: TextCorpus, options?: KeynessOptions): KeynessItem[];
```

### 16.7 Terminology and lexicography

```ts
export function extractTerms(corpus: TextCorpus, options?: TermExtractionOptions): TermCandidate[];
export function wordSketch(corpus: TextCorpus, lemma: string, options?: WordSketchOptions): WordSketch;
export function goodDictionaryExamples(corpus: TextCorpus, query: CorpusQuery, options?: GdexOptions): DictionaryExample[];
```

### 16.8 Stylometry and authorship features

`textcorpus` exposes stylometric features, not final authorship claims:

- function-word profile
- punctuation profile
- sentence-length distribution
- character n-gram profile
- word n-gram profile
- type-token measures
- lexical diversity measures
- readability features
- section-level regularity
- document similarity matrices

---

## 17. `@ismail-elkorchi/textsearch`

### 17.1 Mission

`textsearch` provides analyzers, indexes, retrieval, ranking, query parsing, filtering, faceting, highlighting, and search-aware text processing.

### 17.2 Standalone tasks

A user installing only `textsearch` can:

- build analyzers from tokenizers, filters, normalizers, stemmers, lexicons, and FSTs
- build inverted indexes
- build positional indexes
- build character n-gram indexes
- build fielded document indexes
- run Boolean queries
- run phrase and proximity queries
- run wildcard, prefix, suffix, fuzzy, and regex queries
- run BM25 and TF-IDF retrieval
- compute term vectors
- highlight matches
- create facets and filters
- create spelling suggestions from edit distance and corpus term statistics
- expose corpus search over annotations and metadata

### 17.3 Required entrypoints

```text
@ismail-elkorchi/textsearch
@ismail-elkorchi/textsearch/analyzer
@ismail-elkorchi/textsearch/index
@ismail-elkorchi/textsearch/query
@ismail-elkorchi/textsearch/rank
@ismail-elkorchi/textsearch/filter
@ismail-elkorchi/textsearch/facet
@ismail-elkorchi/textsearch/highlight
@ismail-elkorchi/textsearch/suggest
@ismail-elkorchi/textsearch/cql
```

### 17.4 Analyzer API

```ts
export interface Analyzer {
  id: string;
  analyze(text: string | TextDocument, options?: AnalyzeOptions): Iterable<SearchToken>;
}

export interface SearchToken {
  term: string;
  position: number;
  startCU: number;
  endCU: number;
  type?: string;
  payload?: Record<string, unknown>;
}

export function createAnalyzer(components: AnalyzerComponent[], options?: AnalyzerOptions): Analyzer;
export function analyze(analyzer: Analyzer, input: string | TextDocument): SearchToken[];
```

### 17.5 Index and query API

```ts
export interface SearchIndex {
  id: string;
  fields: Record<string, FieldConfig>;
  stats: IndexStats;
}

export function createIndex(schema: IndexSchema, options?: IndexOptions): SearchIndex;
export function addToIndex(index: SearchIndex, doc: TextDocument, options?: AddOptions): SearchIndex;
export function search(index: SearchIndex, query: SearchQuery, options?: SearchOptions): SearchResult[];
export function explain(index: SearchIndex, query: SearchQuery, docId: string): SearchExplanation;
```

### 17.6 Ranking models

Required ranking models:

- Boolean retrieval
- TF-IDF cosine scoring
- BM25
- BM25F for fields
- language-model retrieval with smoothing
- DFR-style extensible scoring hook
- static score boosts from metadata
- rule-based reranking hooks

### 17.7 Boundaries

`textsearch` does not perform entity linking or KB reasoning. It can retrieve candidates for `textkb`.

---

## 18. `@ismail-elkorchi/textkb`

### 18.1 Mission

`textkb` provides knowledge-backed NLP: entity linking, sense linking, terminology KB lookup, thesaurus navigation, ontology lookup, semantic relation extraction support, and knowledge-aware gazetteers.

### 18.2 Standalone tasks

A user installing only `textkb` can:

- create a knowledge base
- load entity records, concept records, senses, aliases, definitions, semantic relations, and source mappings
- build alias indexes
- link entity mentions to KB IDs
- link terms to termbase concepts
- link words to word senses when a sense resource exists
- disambiguate candidates using context features, priors, lexical evidence, corpus counts, and rule constraints
- query semantic relations
- create ontology-aware gazetteer annotations
- create lexical chains and cohesion features
- export linked annotations to `textdoc`

### 18.3 Required entrypoints

```text
@ismail-elkorchi/textkb
@ismail-elkorchi/textkb/kb
@ismail-elkorchi/textkb/entity
@ismail-elkorchi/textkb/sense
@ismail-elkorchi/textkb/term
@ismail-elkorchi/textkb/ontology
@ismail-elkorchi/textkb/thesaurus
@ismail-elkorchi/textkb/link
@ismail-elkorchi/textkb/disambiguate
@ismail-elkorchi/textkb/semantic-relations
```

### 18.4 KB data structures

```ts
export interface KnowledgeBase {
  id: string;
  entities: EntityRecordStore;
  concepts: ConceptRecordStore;
  senses: SenseRecordStore;
  relations: SemanticRelationStore;
  aliases: AliasIndex;
  metadata: Record<string, unknown>;
}

export interface EntityRecord {
  id: string;
  labels: Record<string, string[]>;
  aliases?: Record<string, string[]>;
  types?: string[];
  descriptions?: Record<string, string>;
  relations?: SemanticRelation[];
  priors?: Record<string, number>;
}

export interface SenseRecord {
  id: string;
  lemma: string;
  pos?: string;
  language?: string;
  definition?: string;
  examples?: string[];
  relations?: SemanticRelation[];
}
```

### 18.5 Linking APIs

```ts
export function candidateEntities(kb: KnowledgeBase, mention: string, options?: CandidateOptions): EntityCandidate[];
export function linkEntities(doc: TextDocument, kb: KnowledgeBase, options?: EntityLinkOptions): TextDocument;
export function linkTerms(doc: TextDocument, kb: KnowledgeBase, options?: TermLinkOptions): TextDocument;
export function disambiguateSense(doc: TextDocument, kb: KnowledgeBase, options?: SenseOptions): TextDocument;
```

### 18.6 Relation support

`textkb` supports relation inventories for:

- synonymy
- antonymy
- hypernymy and hyponymy
- meronymy and holonymy
- instance-of
- part-of
- broader/narrower term
- related term
- equivalent concept
- domain-specific typed relations

### 18.7 Boundaries

`textkb` stores and links knowledge. It does not crawl external KBs at runtime, train neural entity linkers, or replace corpus terminology extraction.

---

## 19. `@ismail-elkorchi/textquality`

### 19.1 Mission

`textquality` produces inspectable diagnostics about text quality, corpus quality, noisy text, OCR/ATR quality, annotation quality, readability, style, and processing readiness.

### 19.2 Standalone tasks

A user installing only `textquality` can:

- compute Unicode integrity quality reports
- compute OCR/ATR noise indicators
- compute spelling-variant and OOV profiles
- compute language-mix and script-mix profiles
- compute boilerplate and duplication indicators
- compute readability measures
- compute lexical diversity measures
- compute sentence and paragraph complexity measures
- compute punctuation and whitespace quality findings
- compute tokenization and segmentation quality diagnostics
- compute annotation coverage and conflict diagnostics
- compute corpus balance and metadata coverage diagnostics
- run rule-based grammar and style checks when rules exist
- produce quality annotations and summary reports

### 19.3 Required entrypoints

```text
@ismail-elkorchi/textquality
@ismail-elkorchi/textquality/document
@ismail-elkorchi/textquality/corpus
@ismail-elkorchi/textquality/ocr
@ismail-elkorchi/textquality/noisy
@ismail-elkorchi/textquality/readability
@ismail-elkorchi/textquality/style
@ismail-elkorchi/textquality/annotation
@ismail-elkorchi/textquality/report
```

### 19.4 Quality API

```ts
export interface QualityFinding {
  id: string;
  kind: string;
  spans?: SpanRef[];
  severity: "info" | "notice" | "warning" | "error";
  message: string;
  evidence: Evidence;
  metrics?: Record<string, number>;
}

export interface QualityReport {
  id: string;
  target: "document" | "corpus" | "annotation-layer";
  findings: QualityFinding[];
  metrics: Record<string, number>;
  summaries: Record<string, unknown>;
}

export function analyzeDocumentQuality(doc: TextDocument, options?: DocumentQualityOptions): QualityReport;
export function analyzeCorpusQuality(corpus: TextCorpus, options?: CorpusQualityOptions): QualityReport;
export function annotateQuality(doc: TextDocument, options?: QualityAnnotateOptions): TextDocument;
```

### 19.5 Quality dimensions

Required dimensions:

- Unicode integrity
- invisible/control character profile
- OCR/ATR confusion profile
- likely broken tokens
- likely merge/split errors
- line-break/hyphenation artifacts
- duplicate spans
- boilerplate spans
- low-information spans
- language/script mixture
- OOV and lexicon coverage
- morphology coverage
- sentence complexity
- readability
- style rules
- annotation conflicts
- annotation sparsity
- corpus metadata gaps
- corpus imbalance indicators

### 19.6 Boundaries

`textquality` reports diagnostics and candidates. It does not silently repair text. Repair and normalization belong to `textnorm`.

---

## 20. `@ismail-elkorchi/textparallel`

### 20.1 Mission

`textparallel` handles multilingual aligned resources: parallel corpora, sentence alignment, word alignment, bilingual lexicon extraction, translation memory, bilingual terminology, and rule-based transfer workflows.

### 20.2 Standalone tasks

A user installing only `textparallel` can:

- represent aligned documents
- align documents by sections, paragraphs, sentences, or tokens
- train and run classical sentence alignment
- train and run classical word alignment
- build translation memories
- search translation memories
- extract bilingual terminology
- induce bilingual lexicon candidates
- compare collocations across languages
- run rule-based shallow transfer using lexicons, FSTs, and rules
- create aligned annotations between source and target documents

### 20.3 Required entrypoints

```text
@ismail-elkorchi/textparallel
@ismail-elkorchi/textparallel/alignment
@ismail-elkorchi/textparallel/sentence-align
@ismail-elkorchi/textparallel/word-align
@ismail-elkorchi/textparallel/translation-memory
@ismail-elkorchi/textparallel/bilingual-lexicon
@ismail-elkorchi/textparallel/bilingual-terms
@ismail-elkorchi/textparallel/transfer
@ismail-elkorchi/textparallel/parallel-corpus
```

### 20.4 Alignment data structures

```ts
export interface AlignmentLink {
  source: SpanRef;
  target: SpanRef;
  relation: "equivalent" | "partial" | "inserted" | "deleted" | "reordered" | "unknown";
  score?: Score;
  evidence: Evidence;
}

export interface ParallelDocument {
  id: string;
  sourceDoc: TextDocument;
  targetDoc: TextDocument;
  links: AlignmentLink[];
  metadata: Record<string, unknown>;
}
```

### 20.5 APIs

```ts
export function alignSentences(source: TextDocument, target: TextDocument, options?: SentenceAlignOptions): AlignmentLink[];
export function alignWords(source: TextDocument, target: TextDocument, options?: WordAlignOptions): AlignmentLink[];
export function buildTranslationMemory(docs: Iterable<ParallelDocument>, options?: TmOptions): TranslationMemory;
export function searchTranslationMemory(tm: TranslationMemory, query: string, options?: TmSearchOptions): TranslationMemoryHit[];
export function extractBilingualTerms(corpus: ParallelCorpus, options?: BilingualTermOptions): BilingualTermCandidate[];
export function shallowTransfer(doc: TextDocument, resources: TransferResources, options?: TransferOptions): TextDocument;
```

### 20.6 Boundaries

`textparallel` supports non-neural alignment and rule-based transfer. Neural machine translation is out of scope.

---

## 21. Resource packs

### 21.1 Pack package shape

Every `textpack-*` package exports:

```ts
export const manifest: TextPackManifest;
export const resources: PackResourceMap;
export default { manifest, resources };
```

A resource pack may also export convenience functions, but the manifest and resource map are mandatory.

### 21.2 Pack kinds

Recommended pack categories:

```text
textpack-lang-<tag>
textpack-script-<script>
textpack-cldr-<locale>
textpack-domain-<domain>
textpack-historical-<period-or-corpus>
textpack-noisy-<source-type>
textpack-ocr-<script-period>
textpack-fst-<language-or-task>
textpack-grammar-<language-or-domain>
textpack-lexicon-<language-or-domain>
textpack-kb-<source>
textpack-corpus-<name>
textpack-parallel-<language-pair>
textpack-composite-<purpose>
```

### 21.3 Pack contents by task

A language pack may contain:

- segmentation profile
- abbreviation table
- stoplist
- function-word list
- tokenizer rules
- sentence rules
- morphology FST
- lemma dictionary
- POS tag dictionary
- feature mapping table
- chunking rules
- dependency labels
- grammar rules
- named-entity gazetteers
- entity-linking aliases
- termbase
- quality profile
- search analyzer profile

A domain pack may contain:

- domain termbase
- domain gazetteers
- citation patterns
- extraction rules
- controlled vocabulary
- ontology links
- corpus reference profile
- quality profile

A historical/noisy pack may contain:

- historical spelling maps
- abbreviation expansion tables
- OCR confusion tables
- ATR confusion tables
- noisy-channel FSTs
- period metadata
- editorial convention profiles
- search-normalization profiles

A parallel pack may contain:

- bilingual dictionary
- transfer rules
- alignment priors
- translation memory
- bilingual termbase
- bilingual phrase table

---

## 22. Non-neural task guarantees

The ecosystem must cover each NLP task through at least one non-neural path:

| Task | Required non-neural path |
|---|---|
| language identification | character n-gram + classical classifier; rule/profile hints |
| tokenization | Unicode defaults, profile rules, dictionary segmentation, FST segmentation |
| sentence splitting | Unicode defaults, abbreviation tables, rules, classical boundary model |
| morphology | lookup, rules, FST analyzer/generator, classical tagger |
| lemmatization | lexicon lookup, FST, rules, edit-tree/classical model |
| POS tagging | rules, HMM, MEMM, CRF, perceptron |
| chunking | rules, regex chunking, CRF/perceptron chunker |
| parsing | rule grammars, chart parsing, transition/graph parsers with classical features |
| NER | gazetteers, rules, CRF/perceptron sequence labeler |
| entity linking | alias lookup, priors, context features, graph constraints |
| relation extraction | rules, dependency patterns, classical classifiers |
| event extraction | rules, trigger lexicons, classical classifiers |
| temporal extraction | rules, calendars, normalization tables |
| quantity extraction | rules, unit lexicons, normalization tables |
| coreference | rules, salience models, mention constraints, classical rankers |
| sentiment | lexicons, rules, classical classifiers |
| topic modeling | LDA, NMF, LSA, clustering |
| summarization | extractive frequency, centroid, graph, coverage, query-focused retrieval |
| terminology | corpus statistics, POS/grammar patterns, C-value-like and keyness methods, KB linking |
| search | lexical analyzers, inverted indexes, BM25/TF-IDF/language-model retrieval |
| translation | rule-based transfer, dictionaries, FST morphology, translation memory |
| QA | retrieval + rule extraction + KB lookup |
| quality analysis | rules, profiles, counts, corpus comparisons, classical anomaly models |
| historical normalization | resource-backed variant maps, FSTs, rules, corpus-backed ranking |
| noisy text normalization | confusion tables, edit FSTs, rules, classical reranking |

---

## 23. Final product shape

The packages can be developed in a monorepo/workspace and consumed independently from npm:

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import { loadPack } from "@ismail-elkorchi/textpack";
import { compileRuleSet, applyRules } from "@ismail-elkorchi/textrules";
import { analyzeWord } from "@ismail-elkorchi/textfst/morph";
import { buildLexicon } from "@ismail-elkorchi/textlex";
import { trainSequenceTagger } from "@ismail-elkorchi/textclassical/sequence";
import { createPipeline, runPipeline } from "@ismail-elkorchi/textpipeline";
import { createCorpus, concordance } from "@ismail-elkorchi/textcorpus";
import { createIndex, search } from "@ismail-elkorchi/textsearch";
import { linkEntities } from "@ismail-elkorchi/textkb";
import { normalizeDocument } from "@ismail-elkorchi/textnorm";
import { analyzeDocumentQuality } from "@ismail-elkorchi/textquality";
```

The intended final shape is:

- `textfacts` is the minimal Unicode kernel.
- `textdoc` is the annotation substrate.
- `textpack-*` packages carry all language, domain, historical, noisy, KB, and corpus resources.
- `textlex`, `textfst`, and `textrules` are the symbolic engine core.
- `textclassical` supplies trainable non-neural NLP.
- `textpipeline` composes processors.
- `textdata` gets text and annotations into the system.
- `textcorpus` makes corpora analytically useful.
- `textsearch` makes text retrievable.
- `textkb` makes text linkable to knowledge resources.
- `textnorm` handles variation without destroying source text.
- `textquality` makes quality and processing readiness explicit.
- `textparallel` covers multilingual alignment, translation memory, and rule-based transfer.

The ecosystem is feature-complete when a user can combine these packages to build NLTK-style symbolic/statistical experiments, spaCy/CoreNLP/Stanza-style annotation pipelines, GATE/UIMA-style document annotation workflows, Unitex/HFST/foma-style rule and finite-state analyzers, AntConc/Sketch Engine-style corpus workbenches, Lucene-style search analyzers, and knowledge-backed entity/terminology systems — without neural models and without hiding resources or evidence.
