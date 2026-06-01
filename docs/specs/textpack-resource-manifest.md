# textpack resource manifest

## Why this document exists

Issue `#12` requires a public manifest contract for lexicons, stopwords, gazetteers, rules,
tagsets, morphology resources, benchmark fixtures, and related resource packs before loader behavior
is treated as accepted. This document records the manifest conventions, reference fixture packs, the
registry query surface, and the failure policy that the repository validates.

## Manifest conventions

The canonical schema is
[`../../schemas/textpack-manifest-v1.schema.json`](../../schemas/textpack-manifest-v1.schema.json).

Each manifest records:

- `manifestVersion`, pack `id`, npm `packageName`, and `version`;
- descriptive `kind`, target scope, engine compatibility, external data versions, and capabilities;
- resource-family arrays under `resources`;
- stable logical identifiers under `provides`;
- manifest and loader entrypoints;
- required `smoke`, `negative`, and `representative` test references;
- structured code/data licenses and provenance; and
- `reviewState` plus optional explicit overlay composition metadata.

Resource paths are package-relative or repository-relative in fixtures. Values in `provides` are
logical identifiers, not file paths.

## Loading, overlay, and mismatch policy

Resource registry creation is deterministic:

- manifests are converted into an in-memory resource catalog without reading files or executing pack
  code;
- registry summaries expose exact language, profile, resource-family, resource-kind, and review-state
  lists; and
- registry queries can filter by family, kind, language, profile, lookup key, pack id, or resource id.

Resource lookup is deterministic:

- resources are filtered by family or kind first;
- language comparison is exact by default when both the request and the resource record a language;
- case folding, trimming, or any other canonicalization is allowed only when the caller supplies an
  explicit canonicalizer;
- profile-specific resources are only considered when the requested profile matches, while
  profile-free resources remain eligible as base overlays; and
- successful candidates are ordered by descending overlay precedence, then pack id, then resource id.

Resource loading is deterministic and side-effect-free:

- callers provide resource file content by manifest path;
- stopwords, rules, profiles, structures, transducers, and benchmark fixtures load as one value per
  non-empty line;
- lexicons, morphology tables, and tagsets load from TSV rows with a surface value followed by
  `key=value` attributes;
- gazetteers load from TSV rows with a surface value followed by a label and optional `key=value`
  attributes; and
- loaded-entry lookup uses exact values by default while preserving original values, line numbers,
  resource metadata, license metadata, and provenance metadata. Canonicalized lookup records the
  canonicalizer id plus query-side and entry-side original and canonical values.

The repository treats these conditions as failures or diagnostics:

- duplicate logical ids in `provides`;
- mismatched resource and provided-id counts for a family;
- missing license, provenance, target scope, or required test references;
- resource declarations without matching true capability flags;
- true capability flags without matching resources;
- unsafe resource, entrypoint, or test paths;
- deprecated review state for active packs;
- overlay conflicts at equal precedence; and
- language/profile mismatches when a request has no successful candidates.

Malformed resource rows, duplicate loaded entries, and missing resource content are explicit loader
diagnostics.

## Review and vetting reports

`createTextPackReviewReport` emits a `textpack-review-report-v1` artifact over a manifest and caller
supplied policy. The report records:

- current and target review state plus the derived transition;
- manifest-governance, resource-inventory, compatibility-policy, metadata, limitation, and evidence
  requirements;
- caller-supplied reviewer, conformance, benchmark, security, or migration evidence references; and
- deterministic diagnostics separated by manifest, inventory, compatibility, or evidence source.

The report is an exchange artifact. It does not discover packs, fetch remote evidence, execute
committee workflow, or assign support claims beyond the supplied manifest and policy.

## Fixture inventory

Repository-level fixture manifests and resources live under
[`../../fixtures/textpack/`](../../fixtures/textpack/):

- `manifests/textpack-en-core.json`
- `manifests/textpack-en-legal.json`
- `manifests/textpack-fr-core.json`
- `resources/textpack-en-core/*`
- `resources/textpack-en-legal/*`
- `resources/textpack-fr-core/*`
- `catalog.v1.json`
- `review-report.v1.json`

Installable reference packs live under:

- `../../packages/textpack-en-core/`
- `../../packages/textpack-en-legal/`
- `../../packages/textpack-fr-core/`

Negative controls live under `fixtures/textpack/invalid/`.

## Verification

`npm run -s check:fixtures` validates the pack manifest schema, checks fixture paths, rejects invalid
metadata, exercises overlay conflicts, builds the registry, regenerates the catalog and review report,
loads committed resources, validates installable `textpack-*` package manifests, and verifies
deterministic lookup behavior with recorded provenance.
