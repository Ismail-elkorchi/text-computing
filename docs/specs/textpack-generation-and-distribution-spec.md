# Textpack Generation and Distribution Specification

Status: accepted architecture / implementation-gated
Version: 0.1.0
Owner: text-computing maintainers
Last updated: 2026-06-09
Scope: generated `@ismail-elkorchi/textpack-*` packages, composite packs, external artifacts, and developer experience
Related specs:
- [`text-computing-runtime-packages-final-spec.md`](text-computing-runtime-packages-final-spec.md)
- [`text-computing-runtime-packages-conformance-matrix.md`](text-computing-runtime-packages-conformance-matrix.md)
Normative language: MUST, MUST NOT, SHOULD, and MAY follow RFC-style meaning.
Verification expectation: generated textpacks, artifact descriptors, checksums, license metadata, inventories, quality reports, and conformance notes MUST stay synchronized with this specification.

## 1. Product Principle

The Text Computing resource architecture uses a large generated internal graph with a small developer-facing surface.

The internal graph MAY contain many concrete textpack packages because serious NLP resources require separate provenance, licensing, evaluation, update cadence, artifact policy, and capability boundaries.

The ordinary developer experience MUST remain small and predictable. Once a language composite passes the publishability gate, users SHOULD install a runtime package and one language composite:

```sh
npm install @ismail-elkorchi/textpipeline @ismail-elkorchi/textpack-fr
```

```ts
import { loadFrench } from "@ismail-elkorchi/textpack-fr";
```

Composite packages MUST simplify installation and loading, but MUST NOT hide licensing boundaries, artifact requirements, source provenance, or capability gaps. The public package surface is optimized for developer trust, not for minimizing the number of generated internal packages.

The existence of many generated concrete packs is acceptable when the forge owns them. It becomes an operational risk only if humans maintain them by hand.

## 2. Generation Rule

Production `@ismail-elkorchi/textpack-*` packages MUST be generated artifacts.

The source of truth is the forge input graph:

```text
source catalog entries
source snapshot specs
resource build specs
pack specs
composite specs
artifact descriptors
forge lockfiles
```

Generated package directories MAY exist as npm workspace packages under:

```text
packages/textpacks/<textpack-package>/
```

Generated files MUST NOT be edited by hand. Generated files MUST include a generated header when the file format permits comments.

Generated packages are non-publishable by default. A generated package is a build output, not automatically a public npm package.

Generated package directories MUST contain a `.textpack-generated.json` marker with:

```text
forge version
graph lockfile hash
generation timestamp
generator command
output checksum
generated file list
```

Small examples and smoke data MAY live in fixtures. Fixtures are forge inputs or tests. Fixtures are not production resources and MUST NOT be emitted as publishable `textpack-*` packages.

## 2.1 Publishability Gate

Every generated package defaults to:

```text
publishable: false
```

A generated package MAY become publishable only when its spec explicitly requests `publishable: true` and supplies all gate evidence:

```text
production-grade source coverage
audited license evidence
declared scope that does not overclaim
conformance/evaluation evidence
the standard generated reports
no sampled, fixture-backed, demo, or transitional status
```

The forge MUST fail a publishable request when any gate requirement is missing. The standard generated reports are:

```text
LICENSE.generated.md
NOTICE.generated.md
SOURCES.generated.json
ATTRIBUTION.generated.md
COVERAGE.generated.json
EVALUATION.generated.json
QUALITY.generated.json
```

Sampled, fixture-backed, demo, smoke-corpus, and transitional outputs MUST NOT be npm-publishable textpacks. A tiny morphology sample, syntax sample, search placeholder, quality placeholder, corpus smoke sample, KB demo, or fixture-backed reference is not a production textpack for that declared scope.

The current active generated graph contains foundation outputs, audited source-backed local task
slices, component recipe composites, and developer-facing English, Arabic, and French language
composites whose required KB, corpus, parallel, and quality slots are backed by local generated
payloads:

```text
@ismail-elkorchi/textpack-language-registry
@ismail-elkorchi/textpack-unicode-17
@ismail-elkorchi/textpack-cldr-core
@ismail-elkorchi/textpack-foundation
@ismail-elkorchi/textpack-ar
@ismail-elkorchi/textpack-ar-core
@ismail-elkorchi/textpack-ar-corpus
@ismail-elkorchi/textpack-ar-kb
@ismail-elkorchi/textpack-ar-lexicon
@ismail-elkorchi/textpack-ar-morphology
@ismail-elkorchi/textpack-ar-msa-morphology
@ismail-elkorchi/textpack-ar-normalization
@ismail-elkorchi/textpack-ar-parallel
@ismail-elkorchi/textpack-ar-quality
@ismail-elkorchi/textpack-ar-quality-sa
@ismail-elkorchi/textpack-ar-sa
@ismail-elkorchi/textpack-ar-search
@ismail-elkorchi/textpack-ar-segmentation
@ismail-elkorchi/textpack-ar-syntax
@ismail-elkorchi/textpack-ar-syntax-sa
@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa
@ismail-elkorchi/textpack-en
@ismail-elkorchi/textpack-en-core
@ismail-elkorchi/textpack-en-corpus
@ismail-elkorchi/textpack-en-inflection-scowl
@ismail-elkorchi/textpack-en-kb
@ismail-elkorchi/textpack-en-lexicon
@ismail-elkorchi/textpack-en-morphology
@ismail-elkorchi/textpack-en-normalization
@ismail-elkorchi/textpack-en-parallel
@ismail-elkorchi/textpack-en-quality
@ismail-elkorchi/textpack-en-segmentation
@ismail-elkorchi/textpack-en-search
@ismail-elkorchi/textpack-en-syntax
@ismail-elkorchi/textpack-en-syntax-ud-gumreddit
@ismail-elkorchi/textpack-en-wordlist-esdb
@ismail-elkorchi/textpack-fr
@ismail-elkorchi/textpack-fr-corpus
@ismail-elkorchi/textpack-fr-core
@ismail-elkorchi/textpack-fr-kb
@ismail-elkorchi/textpack-fr-lexicon
@ismail-elkorchi/textpack-fr-lexicon-sa
@ismail-elkorchi/textpack-fr-lexique-sa
@ismail-elkorchi/textpack-fr-morphology
@ismail-elkorchi/textpack-fr-morphology-sa
@ismail-elkorchi/textpack-fr-normalization
@ismail-elkorchi/textpack-fr-parallel
@ismail-elkorchi/textpack-fr-quality
@ismail-elkorchi/textpack-fr-quality-sa
@ismail-elkorchi/textpack-fr-sa
@ismail-elkorchi/textpack-fr-search
@ismail-elkorchi/textpack-fr-search-sa
@ismail-elkorchi/textpack-fr-segmentation
@ismail-elkorchi/textpack-fr-syntax
@ismail-elkorchi/textpack-fr-syntax-sa
@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa
@ismail-elkorchi/textpack-fr-unimorph-sa
@ismail-elkorchi/textpack-wikidata-ar
@ismail-elkorchi/textpack-wikidata-en
@ismail-elkorchi/textpack-wikidata-fr
@ismail-elkorchi/textpack-wordnet-ar
@ismail-elkorchi/textpack-wordnet-en
```

These packages are non-publishable by default at the rule level. An active package is publishable
only when its source or composite spec explicitly opts in and the forge gate records the required
evidence. Empty-resource packages in this list are recipe composites; they are valid only when they
declare required components, publish no `resources` directory, and do not claim direct resource
payloads.

The foundation graph (`textpack-language-registry`, `textpack-unicode-17`, `textpack-cldr-core`, and
`textpack-foundation`) is publishable after passing the gate. Current source-backed local task
components for English, Arabic, and French are publishable only for their narrow declared scopes.
Examples include Open English WordNet, Arabic WordNet, CAMeL Morph MSA, SCOWLv2/ESDB English
wordlist resources, selected UD annotation-profile resources, Lexique/UniMorph/UD French
share-alike isolated components, and generated component wrappers that expose those local resources
without adding new claims.

Descriptor-only packages are not publishable and do not satisfy task support. Descriptors preserve
source identity, checksums, license evidence, and artifact metadata, but they are `artifact-backed`
until local generated sentence rows, alignment rows, entity extracts, indexes, databases, or
equivalent task-usable payloads are materialized. The active English, Arabic, and French Tatoeba and
Wikidata packs have moved past descriptor-only status for their declared scopes: they contain local
Tatoeba sentence/link rows or local Wikidata entity/alias/relation extracts, generated quality
evidence, and runtime-readable resources.

Any composite whose required graph includes descriptor-only corpus, parallel, KB, or quality slots is
also non-publishable. The current `textpack-en`, `textpack-ar`, and `textpack-fr` composites are
publishable developer-facing packages for their declared generated scopes because their required
component graphs have 12/12 composite-ready slots, local task-usable KB/corpus/parallel payloads,
runtime adapters, conformance/evaluation evidence, and publishability approval. They still MUST NOT
claim OPUS coverage, full Wikidata dump coverage, parser models, neural models, raw web corpora, or
language coverage outside the declared component graph.

## 3. Forge Input Graph

The forge input graph is the implementation source for generated packs.

The default repository location is:

```text
tools/textpack-forge/
  sources/
  source-policies/
  snapshots/
  resources/
  packs/
  composites/
  artifacts/
  schemas/
  forge.lock.json
```

The root package scripts MAY wrap this tool, but generated packs MUST NOT depend on the forge at runtime.

| File kind | Purpose |
| --- | --- |
| `sources/*.source.json` | upstream source metadata, citation, license, and review state |
| `source-policies/*.policy.json` | metadata-only source universe, license class, package naming policy, composite policy, publishability posture, and per-language priority records |
| `snapshots/*.snapshot.json` | exact retrieved or externally addressed source snapshots |
| `resources/*.resource.json` | transformations from snapshots to canonical resources |
| `packs/*.pack.json` | concrete textpack package definitions |
| `composites/*.composite.json` | language, foundation, and policy composite recipes |
| `artifacts/*.artifact.json` | external artifact descriptors |
| `forge.lock.json` | locked source, transform, artifact, and output graph |

The policy validation order is:

```text
source policy universe -> active sources -> snapshots -> resources -> concrete packs -> artifacts -> composites -> reports
```

Metadata-only policy records do not ingest data and do not make a source publishable. A source becomes active only when it also appears in `sourcePaths`, has a snapshot descriptor, and is referenced by a resource spec.

The generated source policy outputs are:

```text
tools/textpack-forge/source-policy.generated.json
docs/textpacks/source-readiness.generated.md
```

The generated language-composite readiness outputs are:

```text
docs/textpacks/language-composite-readiness.generated.json
docs/textpacks/language-composite-readiness.generated.md
```

These reports MUST be derived from the active forge graph. They MUST treat candidate component packs
as informational only: a candidate pack does not satisfy a language-composite slot until the
exact required slot package is generated, source-audited, schema-valid, runtime-adapter-valid,
evaluated, publishable, declares production coverage for that slot, and is not descriptor-only.

The forge MUST fail any publishable language composite request for
`textpack-en`, `textpack-ar`, or `textpack-fr` unless the generated language-composite readiness
report marks that language `compositeReady: true`. This check is source-boundary enforcement, not
documentation: isolated share-alike, copyleft, noncommercial, local-only, blocked, or review-only
candidate packs MUST NOT make a default language composite publishable. Artifact descriptors MUST
NOT satisfy a corpus, parallel, KB, quality, or language-composite slot until the referenced data has
been materialized into local generated rows, extracts, indexes, databases, or equivalent task-usable
payloads and runtime adapters can read them.

The canonical resource schema registry is rooted in `schemas/`. Generated component packs MUST target
the relevant schema before they can pass a production-grade publishability review:

| Resource family | Canonical schema |
| --- | --- |
| Lexicon, gazetteer, termbase-style lookup data | `schemas/textpack-lexicon-resource.schema.json` |
| Segmentation and tokenization profiles | `schemas/textpack-segmentation-resource.schema.json` |
| Normalization, orthography, casing, diacritic, and transliteration profiles | `schemas/textpack-normalization-resource.schema.json` |
| Morphology inventories, analyzers, generators, paradigms, and feature inventories | `schemas/textpack-morphology-resource.schema.json` |
| Finite-state analyzers, generators, and transducers | `schemas/textpack-fst-resource.schema.json` |
| Syntax, tagsets, dependency labels, treebank profiles, and grammar resources | `schemas/textpack-syntax-resource.schema.json` |
| Search analyzer profiles | `schemas/textpack-search-analyzer-resource.schema.json` |
| Entity, sense, ontology, thesaurus, and semantic relation resources | `schemas/textpack-kb-resource.schema.json` |
| Corpus manifests, documents, annotation references, and artifact-backed corpora | `schemas/textpack-corpus-resource.schema.json` |
| Translation memories, bilingual lexicons, and alignment tables | `schemas/textpack-parallel-resource.schema.json` |
| Quality diagnostics, metrics, thresholds, and evaluation links | `schemas/textpack-quality-profile-resource.schema.json` |
| Task evidence records | `schemas/textpack-evaluation-record.schema.json` |
| Generated coverage reports | `schemas/textpack-coverage-report.schema.json` |

Source-specific resource schemas, such as UD syntax, CAMeL morphology, and WordNet projections, MAY
exist beside the canonical schemas. They do not replace the canonical family contracts; they
specialize them for a source family or task pipeline. A generated resource that declares
`metadata.canonicalSchema` in its manifest MUST validate against the named canonical schema.

The source policy classes are:

```text
default-safe
attribution
share-alike
copyleft
noncommercial/research
local-only
blocked/review-only
```

The build order is:

```text
sources -> snapshots -> resources -> concrete packs -> artifacts -> composites -> reports
```

The build phase MUST run offline from declared snapshots, descriptors, specs, and lockfiles. Snapshot or artifact acquisition MAY require network access, but only through explicit user commands.

The forge MUST provide an explicit acquisition/update workflow:

```sh
npm run -s forge:acquire
npm run -s forge:snapshot-update
npm run -s forge:license-audit
```

`forge:acquire` MUST download or import only files declared by snapshot descriptors and MUST verify the existing byte lengths and checksums before writing them into the snapshot data tree. `forge:snapshot-update` MUST recompute snapshot file checksums, aggregate snapshot checksums, resource input checksums, and snapshot lock entries after an intentional source refresh.

Resource specs MUST fail validation when they reference undeclared sources, undeclared snapshots, snapshot files not present in their snapshot descriptor, or input checksums that disagree with the snapshot descriptor.

`forge:license-audit` MUST fail when an active generated source lacks a source-policy record, conflicts with that record, is `blocked/review-only`, is published through a package name that omits its required policy suffix, is included as a required default composite component against policy, or is referenced by a composite component whose license policy is too narrow for the audited source class.

For language-targeted packs, the forge MUST also fail when a declared source is not listed in that language's source priority record as a first source, second-wave source, or isolated/review source. This keeps `en`, `ar`, and `fr` generation aligned with the source universe instead of letting ad hoc sources enter generated packages.

The forge MUST maintain per-language source priority records for the first production languages and planned expansion languages:

```text
en
ar
fr
grc
la
es
it
de
```

These records guide ingestion order only. They are not feature-completeness claims.

## 4. Manifest and Runtime Contract

Generated packs MUST target the canonical `TextPackManifest` schema at
`schemas/textpack-manifest.schema.json`. The canonical schema includes:

```text
schemaVersion: "1"
component pack graph
required vs optional components
component license policy
artifact descriptors
artifact profiles
capability slot status and capability contributions
generated gap notes
```

Composite packages MUST NOT emit placeholder resources to claim capability coverage.

## 5. Identity Rules

Every source, snapshot, resource, pack, composite, and artifact MUST have a stable id.

| Entity | Id pattern |
| --- | --- |
| Source | `source:<provider>:<dataset>` |
| Snapshot | `snapshot:<source-id>:<version-or-date>` |
| Resource | `resource:<pack-id>:<resource-kind>:<resource-name>` |
| Pack | npm package name without scope, for example `textpack-fr-morphology` |
| Composite | npm package name without scope, for example `textpack-fr` |
| Artifact | `artifact:<pack-id>:<profile>:<artifact-name>:<version>` |

Ids MUST be stable across rebuilds unless the semantic identity changes. Checksums prove content identity; ids identify meaning and graph position.

## 6. Versioning

Each generated package has:

```text
packageVersion
dataVersion
schemaVersion
sourceVersions
```

Version changes follow these rules:

| Change | Version impact |
| --- | --- |
| README/report-only change | patch |
| Checksum-preserving rebuild | patch or no release |
| Additive resource metadata | patch |
| Source refresh with changed resource contents | minor |
| Changed default composite policy | minor or major |
| Removed resource or capability | major |
| Changed resource schema | major |
| Changed loader API | major |
| Changed license policy of a default composite | major |

Data changes can change NLP behavior even when TypeScript APIs are unchanged. Reproducibility consumers MUST be able to pin package versions, data versions, source versions, artifact ids, and lockfile checksums.

## 7. Resource Size Classes

Resource size class is calculated from both packed npm tarball contribution and unpacked resource size.

| Class | Packed size | Unpacked size | Delivery mechanic |
| --- | ---: | ---: | --- |
| `tiny` | `<= 100 KB` | `<= 500 KB` | MAY ship in npm only after the publishability gate passes |
| `small` | `<= 1 MB` | `<= 5 MB` | MAY ship in npm only after the publishability gate passes |
| `medium` | `<= 10 MB` | `<= 50 MB` | MAY ship in npm only after the publishability gate passes and justification is recorded |
| `large` | `> 10 MB` | `> 50 MB` | artifact-backed by default |
| `huge` | `> 100 MB` | `> 500 MB` | artifact-backed only; MUST NOT ship in npm |

Composite packages SHOULD stay below `500 KB` packed unless explicitly approved in the composite spec.

The forge MUST emit package size reports and MUST fail builds that exceed configured size limits.

Size class is a delivery mechanic, not a quality level and not a publishability signal. A tiny package can be valid only if its declared scope is genuinely production-grade, such as a complete language registry projection. A tiny `morphology`, `syntax`, `search`, `quality`, `corpus`, `KB`, or `parallel` package that contains only a sample or placeholder MUST remain non-publishable.

## 8. Developer Surface

The intended product surface for an ordinary user is the language composite after it passes the publishability gate:

```text
@ismail-elkorchi/textpack-foundation
@ismail-elkorchi/textpack-en
@ismail-elkorchi/textpack-ar
@ismail-elkorchi/textpack-fr
```

and later:

```text
@ismail-elkorchi/textpack-grc
@ismail-elkorchi/textpack-la
@ismail-elkorchi/textpack-es
@ismail-elkorchi/textpack-it
@ismail-elkorchi/textpack-de
```

`@ismail-elkorchi/textpack-foundation` is the generated source-backed foundation composite. It MUST compose the generated language registry, Unicode, and CLDR foundation packs. Default language composites MUST require it so every language loader has the same language registry, Unicode coverage, and locale profile base.

Sampled search profiles, sampled quality profiles, UD task samples, demo packs, smoke corpora, and
fixture-backed references are removed from the active public package graph. They were validation
material, not production-grade language support.

Language composites such as `textpack-en`, `textpack-fr`, and `textpack-ar` MUST NOT be generated as
public packages until their required component graph is production-grade for the declared scope. The
current generated graph makes `textpack-en`, `textpack-ar`, and `textpack-fr` developer-facing only
after their KB, corpus, parallel, and quality slots are materialized locally, evaluated, and marked
composite-ready. Those composites remain recipe packages: they carry no original direct resource
payloads and preserve component names, license policies, generated reports, and full license
expressions while resolving task-usable component packs.

The forge MUST NOT synthesize missing language data. Capability slots without an upstream-backed resource, such as KB, parallel, broad evaluation coverage, production morphology analyzers, production syntax models, and production Arabic clitic segmentation, MUST remain generated gaps until real sources are added.

Each composite MUST be generated. A composite SHOULD be a recipe package by default: it declares required and optional component packs, capability policy, license policy, artifact policy, and loader helpers. It MUST NOT claim capabilities not supported by its component graph.

The forge MUST maintain generated readiness gates for the first developer-facing language composites:

```text
textpack-en
textpack-ar
textpack-fr
```

For each language, the readiness report MUST require `textpack-foundation` plus exact generated slot
packages for `core`, `normalization`, `segmentation`, `lexicon`, `morphology`, `syntax`, `kb`,
`search`, `corpus`, `parallel`, and `quality`. Narrower source-backed packs MAY appear as candidates,
but they MUST NOT make the language composite publishable until selected by the exact required slot
package or composed by one. Descriptor-only candidates still do not count.

Composite packages SHOULD expose language loaders:

```ts
export interface LoadLanguagePackOptions {
  profile?: "default" | "research" | "full" | "local";
  include?: readonly string[];
  exclude?: readonly string[];
  licensePolicy?:
    | "default"
    | "allow-attribution"
    | "allow-share-alike"
    | "allow-copyleft"
    | "local-only";
  artifactPolicy?: "none" | "locked" | "fetch-explicit";
  strict?: boolean;
}

export async function loadFrench(
  options?: LoadLanguagePackOptions
): Promise<TextPack>;
```

The default loader options MUST use:

```text
profile: default
strict: true
```

The generated loader MAY derive its default `licensePolicy` and `artifactPolicy` from the required
default component graph so that `await loadEnglish()` can resolve attribution-licensed default
components and explicit artifact-descriptor components. It MUST NOT derive defaults wider than the
required default graph, and it MUST NOT default to share-alike, copyleft, noncommercial,
licensed-only, local-only, or blocked sources.

Therefore `await loadFrench()` or `await loadEnglish()` MUST be offline, deterministic, and limited
to the default composite graph. Resolving an artifact-descriptor component is allowed only when it
does not download, unpack, or index external artifact bytes.

If requested optional packs or artifacts are missing, loaders MUST:

```text
throw in strict mode
return a pack with generated gap notes when strict is false
never fetch artifacts unless artifactPolicy is fetch-explicit
never install npm packages
never widen license policy implicitly
```

Advanced users MAY install or pin concrete packs directly:

```text
@ismail-elkorchi/textpack-fr-morphology
@ismail-elkorchi/textpack-ar-normalization
@ismail-elkorchi/textpack-la-historical
```

## 8.1 Language-Support Index

The foundation composite MUST expose a generated language-support index/API before production language resource ingestion begins.

The index MUST be generated from pinned source snapshots and the current generated pack graph. It MUST include at least:

```text
languageTag
languageName
scripts
regions
supportLevels
packs
capabilitySlots
sourceCoverage
lastBuiltAt
knownGaps
```

The API MUST allow runtime code to query these levels:

| Level | Meaning |
| --- | --- |
| `registered` | The language tag exists in the generated language registry. |
| `unicode-covered` | Foundation Unicode data identifies a script path for processing the language. |
| `profiled` | CLDR or equivalent foundation data provides a profile such as likely subtags or suppress-script coverage. |
| `task-supported` | At least one generated language, domain, corpus, KB, parallel, or historical pack targets the language with local task-usable payloads and runtime adapter support. |

The first generated API surface is:

```ts
listLanguageSupport()
getLanguageSupport(languageTag)
hasLanguageSupport(languageTag, level)
listLanguagesBySupportLevel(level)
```

This API is a coverage declaration, not a language-quality claim. `task-supported` MUST reflect
actual generated pack targets with local usable resources and known gaps; it MUST NOT imply
feature-complete support. Artifact descriptors alone are `artifact-backed`, not `task-supported`.

## 9. Composite Dependency Rules

Composite packages MUST declare required and optional component packs in their manifest.

| Component kind | Composite package reference |
| --- | --- |
| Required default permissive component | normal `dependencies` |
| Optional permissive component | descriptor only; explicit install |
| Share-alike component | descriptor only; explicit install |
| GPL/LGPL/copyleft component | descriptor only; explicit install |
| Heavy artifact-backed component | descriptor only; explicit install and/or fetch |
| Local-only component | never an npm dependency |

Composite packages MUST NOT use `optionalDependencies` for license-isolated, heavy, artifact-backed, or local-only packs, because npm may install optional dependencies automatically.

Optional components MUST be declared in the composite manifest and resolved at runtime only when the user explicitly requests them.

Default-policy language composites such as `textpack-en`, `textpack-fr`, and `textpack-ar` MUST NOT
include share-alike, copyleft, non-commercial, restricted, blocked, or local-only resources as direct
resource payloads or undifferentiated bundled data.

Policy-expanded composites MUST use explicit names such as:

```text
textpack-fr-sa
textpack-fr-full-sa
textpack-ar-gpl
textpack-la-research
textpack-en-legal-research
```

A package name without a policy suffix is the default policy surface unless the generated composite
spec explicitly declares `policySurface: "policy-expanded-wrapper"`. That wrapper surface is
allowed only for packages with no direct resource payloads, explicit isolated component
dependencies, generated license/report evidence, and loader defaults that permit the required
component policy.

The forge MAY allow a policy-expanded composite to directly declare isolated source IDs only when
the composite package name carries the required source-policy suffix, or when the package is a
no-payload policy-expanded wrapper and every required component declares a wide enough
`licensePolicy`. This allowance MUST NOT apply to copyleft, noncommercial/research, local-only,
blocked, aggregate, or review-only sources.

## 10. Capability Slots

The forge defines capability slots, not an identical package list for every language.

A fully supported language MUST cover the Text Computing feature surface through generated local
task packs, materialized local artifact outputs, or documented unavailable capabilities:

| Slot | Required coverage |
| --- | --- |
| `core` | orthography, punctuation, basic segmentation, abbreviations, stoplists, and language profile data |
| `normalization` | spelling, casing, diacritics, script variants, transliteration, or historical/noisy normalization when relevant |
| `lexicon` | lemmas, wordforms, gazetteers, termbases, aliases, and lookup metadata |
| `morphology` | morphology tables, analyzers, generators, paradigms, FSTs, or equivalent resources |
| `syntax` | POS tags, morphosyntactic features, dependency labels, grammar resources, and representative syntax data |
| `classical.tagger` | non-neural tagger resources and evaluation records |
| `classical.parser` | non-neural parser resources and evaluation records |
| `classical.classifier` | non-neural document or span classifier resources |
| `classical.languageModel` | n-gram or other non-neural language model resources |
| `classical.ranker` | non-neural ranking/reranking resources |
| `kb` | local entity labels, aliases, sense links, semantic relations, ontologies, thesauri, KB mappings, or generated local KB extracts/indexes |
| `search` | analyzer profiles, normalization/stemming hooks, ranking fields, and index configuration |
| `corpus` | local redistributable corpora, samples, derived statistics, evaluation records, or generated local corpus indexes |
| `quality` | text-quality, OCR/ATR, annotation-quality, corpus-quality, readability, and style profiles |
| `parallel` | local bilingual lexicons, translation memories, alignments, parallel samples, or generated local alignment indexes |
| `domain` | domain-specific terminology, gazetteers, rules, corpora, and evaluation records |
| `historical-noisy` | period, register, manuscript, OCR, spelling-variant, dialect, or transliteration overlays |

Each slot MUST have one support status:

```text
unsupported
planned
profiled
artifact-backed
task-supported
feature-complete
not-applicable
```

The `classical` parent slot MUST NOT be claimed unless at least one classical subslot is declared.

`artifact-backed` means a descriptor, checksum, license, and source record exist, but the data is not
materialized locally in a form a runtime adapter can use for the task. `task-supported` means local
generated rows, extracts, indexes, databases, or equivalent resources exist and a runtime adapter can
read them. `feature-complete` means task support is broad, evaluated, and production-grade for the
declared scope.

Different languages SHOULD emit different concrete pack shapes when the language or source situation requires it. Identical package symmetry MUST NOT be invented.

For example, Arabic may split script normalization, clitics, diacritics, Classical Arabic, dialectal Arabic, and root-pattern morphology differently from French. Classical Greek and Latin require stronger historical, corpus-citation, lemmatization, and morphology coverage than many modern languages.

## 11. Pack Classes and Naming

The generated graph MAY include these package classes:

| Class | Purpose |
| --- | --- |
| `foundation` | shared language registry, script profiles, locale data, tagsets, and cross-language profiles |
| `language-composite` | developer-facing generated recipe for one language |
| `language-component-composite` | generated recipe for a required language capability component, such as a broad lexicon component assembled from narrower audited packs |
| `language-concrete` | language-specific concrete resource pack for one or more capability slots |
| `domain` | domain pack such as legal, biomedical, news, classics, religious, or finance |
| `historical-noisy` | historical, OCR/ATR, manuscript, dialectal, social-text, or transliteration overlays |
| `kb` | entity, sense, wordnet, ontology, thesaurus, and semantic relation packs |
| `parallel` | bilingual or multilingual alignment, translation memory, transfer, and parallel corpus packs |
| `artifact-backed` | npm package with descriptors/loaders for resources too large to ship in the npm tarball |
| `license-isolated` | share-alike, copyleft, attribution-heavy, or source-specific resources kept out of permissive defaults |

Generated pack names SHOULD follow:

```text
textpack-<scope>
textpack-<lang>-<slot>
textpack-<lang>-<domain>
textpack-<lang>-<domain>-<policy>
textpack-<lang>-<period-or-register>
textpack-parallel-<src>-<tgt>
textpack-kb-<source-or-domain>
textpack-ocr-<script-or-lang>-<period>
```

Examples:

```text
textpack-fr-morphology
textpack-ar-dialect-ma
textpack-grc-classics
textpack-la-medieval
textpack-parallel-en-fr
textpack-kb-wikidata-core
textpack-ocr-latn-19c
```

Reserved policy suffixes:

| Suffix | Meaning |
| --- | --- |
| `-sa` | share-alike resources |
| `-gpl` | GPL/copyleft resources |
| `-lgpl` | LGPL/copyleft resources |
| `-research` | research profile with external artifacts or attribution-heavy resources |
| `-local` | local-only descriptor package; no raw redistributable data |
| `-artifacts` | artifact-backed resources |

Domain packs MUST use concrete names such as:

```text
textpack-en-legal
textpack-fr-biomedical
textpack-de-news
textpack-la-classics
textpack-grc-papyri
```

Vague catch-all names such as `textpack-<lang>-domain-common` SHOULD NOT be used.

## 12. First Language Targets

The first full-language targets are:

```text
English (en)
Arabic (ar)
French (fr)
```

The next planned full-language targets are:

```text
Classical Greek (grc)
Latin (la)
Spanish (es)
Italian (it)
German (de)
```

Variant overlays MAY later include:

```text
ar-MA
ar-EG
ar-Latn
grc-Grek
la-Latn
```

For these languages, the generated graph is expected to contain many concrete packages and external artifacts. The exact count is not a quality metric. Capability coverage, provenance, license separation, evaluation depth, and developer experience are the quality metrics.

## 13. Distribution Model

During alpha, the priority is to generate real local task-usable textpacks first. Size optimization
and public distribution come after task support is honest. Generated textpacks MAY be large and MAY
remain in the monorepo while a language reaches task support.

npm is the intended distribution mechanism for installable textpack modules after the publishability
gate passes:

```text
manifest
tiny, small, and approved medium resources after the publishability gate passes
loader helpers
resource descriptors
checksums
license and attribution files
quality and coverage reports
evaluation records
artifact descriptors
composite recipes
```

npm MUST NOT be used to silently deliver huge corpora, full indexes, massive snapshots, or heavy
model/resource archives through installation side effects once public distribution begins. During
alpha, large local generated resources may exist in the monorepo, but descriptor-only packages still
do not satisfy task support.

The following rules are mandatory:

```text
No postinstall downloads.
No implicit network access.
Artifact fetch commands are user-initiated.
Runtime package loading MUST NOT initiate network access.
Package import MUST NOT initiate filesystem writes outside normal module loading.
Tiny, small, and approved medium resources may ship in npm textpacks only after the publishability gate passes.
Large corpora, large indexes, large snapshots, and heavy archives use explicit artifact fetch commands.
All fetched artifacts are checksum-verified.
All fetched artifacts are recorded in an artifact lockfile.
```

The default npm install path must be useful without implicit network access. Larger scientific resources are opt-in.

## 14. Artifact Layer

Heavy resources are distributed through explicit artifact descriptors and fetch commands.

Example:

```sh
textpack artifact fetch fr --profile research
textpack artifact fetch fr --profile full
```

Artifact profiles:

| Profile | Meaning |
| --- | --- |
| `default` | npm-shipped resources only; no external artifact fetch required |
| `research` | larger redistributable corpora, evaluation sets, derived statistics, and indexes |
| `full` | maximal audited redistributable resources for the language or domain |
| `local` | locally licensed or non-redistributable sources; never published as raw npm data |

Artifact descriptors MUST include fields equivalent to:

```ts
interface TextPackArtifactDescriptor {
  artifactId: string;
  sourceIds: string[];
  version: string;
  profile: "research" | "full" | "local";
  sizeBytes: number;
  mediaType: string;
  compression?: "gzip" | "bzip2" | "zstd" | "zip" | "tar";
  checksum: {
    algorithm: "sha1" | "sha256" | "sha512";
    value: string;
  };
  licenseExpression: string;
  redistributionPolicy:
    | "redistributable"
    | "redistributable-with-attribution"
    | "derived-only"
    | "local-only"
    | "blocked";
  retrieval: {
    kind: "https" | "s3" | "huggingface" | "local" | "manual";
    uri?: string;
    instructions?: string;
  };
  cacheKey: string;
  expectedFiles: Array<{
    path: string;
    sizeBytes?: number;
    checksum?: string;
  }>;
}
```

Artifact descriptors SHOULD be content-addressed where possible. `sha256` or `sha512` is preferred.
`sha1` is allowed only when it is the strongest checksum published by the upstream artifact source
and the generated artifact descriptor records that limitation.

Artifact verification MUST occur before unpacking and after unpacking. Artifact unpacking MUST protect against path traversal, absolute paths, symlinks escaping the artifact root, and unexpected executable files.

The artifact lockfile MUST record every fetched artifact, checksum, retrieval source, unpacked location, and consuming textpack package.

## 15. Local-Only Resources

Local-only resources are described by public descriptors but never published as raw npm data or public artifacts.

A local-only descriptor MAY include:

```text
source name
expected file format
user acquisition instructions
checksum if the source is stable
local import command
license warning
supported transforms
```

The forge MAY generate local importers, but public CI MUST NOT require access to local-only raw data.

## 16. Provenance and License Policy

Every generated pack and artifact MUST be traceable to source catalog entries. Source metadata MUST include source id, version, retrieval method, checksum, license expression, attribution, citation, redistribution policy, and review status.

License expressions MUST use SPDX license expression syntax where possible.

When a source license cannot be represented exactly as SPDX, the source catalog MUST include:

```text
licenseExpression: LicenseRef-...
full license text or URL
review note
redistribution policy
```

Generated `package.json` files MUST NOT expose `LicenseRef-*` expressions directly through the npm
`license` field. When the manifest license expression contains a local license reference, the
package `license` field MUST be:

```text
SEE LICENSE IN LICENSE.generated.md
```

`LICENSE.generated.md` MUST include the exact manifest license expression, source license
expressions, source evidence URLs, and any package-local license evidence files. A publishable
package with a `LicenseRef-*` expression MUST include local license evidence copied from the pinned
snapshot under `licenses/`.

License evaluation is per source and per emitted resource. It is never per broad source family.

Default composites MUST NOT include share-alike, copyleft, non-commercial, restricted, blocked, or local-only resources.

Each generated package MUST include:

```text
LICENSE.generated.md
NOTICE.generated.md
SOURCES.generated.json
ATTRIBUTION.generated.md
```

Composite packages MUST include direct and transitive component attribution summaries.

Generated README files and reports MUST include required attribution and known limitations.

## 17. Generated Inventory Matrix

The forge MUST generate machine-readable and human-readable inventory matrices.

The inventory matrix MUST include:

```text
composite package id
concrete component package ids
capability slots covered by each component
source ids used by each component
license expression per component
artifact profile requirements
npm-shipped size
artifact-backed size
support level
known gaps
```

Required generated files:

```text
docs/textpacks/generated-inventory.md
docs/textpacks/generated-inventory.json
```

The generated inventory is part of drift verification.

## 18. Generated Package Layout

Concrete generated packs SHOULD use:

```text
packages/textpacks/<pack>/
  package.json
  README.md
  LICENSE.generated.md
  licenses/              # when local license evidence files exist
  NOTICE.generated.md
  SOURCES.generated.json
  ATTRIBUTION.generated.md
  COVERAGE.generated.json
  EVALUATION.generated.json
  QUALITY.generated.json
  pack.manifest.json
  src/index.ts
  resources/
  artifacts/
    descriptors/
  .textpack-generated.json
```

Composite generated packs SHOULD use:

```text
packages/textpacks/<composite>/
  package.json
  README.md
  LICENSE.generated.md
  licenses/              # when local license evidence files exist
  NOTICE.generated.md
  COMPONENTS.generated.json
  CAPABILITIES.generated.json
  SOURCES.generated.json
  ATTRIBUTION.generated.md
  pack.manifest.json
  src/index.ts
  .textpack-generated.json
```

Generated package layouts MAY vary only when the pack spec records the reason.

## 19. Quality and Evaluation Reports

Every generated pack MUST include a quality report.

The report MUST include:

```text
resource counts
accepted/rejected record counts
validation warnings
source coverage
known gaps
test fixtures used
conformance package surfaces exercised
artifact requirements
license warnings
quality metrics where applicable
```

Capability claims MUST be derived from quality reports and conformance tests. A package MUST NOT claim `morphology`, `syntax`, `parallel`, or any other capability because a file exists; it must claim capabilities because the resource graph and tests support them.

## 20. Feature Complete Language Support

A language is feature complete only when its generated composite can exercise all relevant Text Computing runtime surfaces:

```text
textfacts
textdoc
textpack
textlex
textfst
textrules
textnorm
textclassical
textpipeline
textdata
textcorpus
textsearch
textkb
textquality
textparallel
```

A runtime surface is relevant when the language has at least one supported capability slot that can exercise that package without inventing data or using placeholder resources.

A runtime surface MAY be marked `not-applicable` only with a generated gap note.

Feature complete does not mean every task has the same quality for every language. It means every capability is either backed by declared resources and tests or explicitly absent with a known gap.

Feature-complete status MUST be generated from conformance data, not manually assigned.

The support statement for a language MUST distinguish:

```text
registered
unicode-covered
profiled
task-supported
feature-complete
```

## 21. Verification

Generated textpack work MUST keep the standard repository checks passing:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
```

When the forge exists, generated-pack changes MUST also pass:

```sh
npm run -s forge:build
npm run -s forge:verify
npm run -s forge:drift
npm run -s forge:inventory
npm run -s forge:size
```

Drift verification MUST compare:

```text
generated package files
generated manifests
generated README/NOTICE/source files
generated inventory matrix
generated conformance notes
generated artifact descriptors
generated lockfiles
```

Generated outputs MUST be deterministic across machines given the same forge lockfile, Node.js version, and package-manager lockfile.
