# textpack resource manifest

## Why this document exists

Issue `#12` requires a public manifest contract for lexicons, stopwords, gazetteers, abbreviation
lists, and related resource packs before any loader behavior is treated as accepted. This document
records the manifest conventions, the licensed fixture resources, the registry query surface, and
the failure policy that the repository validates.

## Manifest conventions

The canonical schema is
[`../../schemas/textpack-manifest-v1.schema.json`](../../schemas/textpack-manifest-v1.schema.json).

Each manifest records:

- `packId`, `packageName`, and `version`;
- resource entries with `resourceId`, `lookupKey`, `kind`, `path`, `overlayPrecedence`,
  `licenseId`, and `provenanceId`;
- manifest entrypoints;
- runnable test references; and
- shared `licenses` and `provenance` registries referenced by the resource entries.

## Loading, overlay, and mismatch policy

Resource registry creation is deterministic:

- manifests are converted into an in-memory resource catalog without reading files or executing pack
  code;
- registry summaries expose normalized language, profile, and resource-kind lists; and
- registry queries can filter by kind, language, profile, lookup key, pack id, or resource id.

Resource lookup is deterministic:

- resources are filtered by kind first;
- language comparison uses normalized lowercase tokens when both the request and the resource record
  a language;
- profile-specific resources are only considered when the requested profile matches, while
  profile-free resources remain eligible as base overlays; and
- successful candidates are ordered by descending `overlayPrecedence`, then `packId`, then
  `resourceId`.

Resource loading is deterministic and side-effect-free:

- callers provide resource file content by manifest path;
- stopwords and abbreviation lists load as one value per non-empty line;
- lexicons load from TSV rows with a surface value followed by `key=value` attributes;
- gazetteers load from TSV rows with a surface value followed by a label and optional `key=value`
  attributes; and
- loaded-entry lookup uses normalized lowercase tokens while preserving original values, line
  numbers, resource metadata, license references, and provenance references.

The repository treats these conditions as failures or diagnostics:

- duplicate `resourceId` values within one manifest are invalid;
- `licenseId` and `provenanceId` references must resolve inside the manifest;
- two resolved resources that share the same normalized `lookupKey` and `overlayPrecedence`
  produce an overlay-conflict diagnostic; and
- language/profile mismatches are recorded as diagnostics when a request has no successful
  candidates.
- malformed resource rows, duplicate loaded entries, and missing resource content are explicit
  loader diagnostics.

## Fixture inventory

Valid manifests and resources live under
[`../../fixtures/textpack/`](../../fixtures/textpack/):

- `manifests/textpack-en-core.json`
- `manifests/textpack-en-legal.json`
- `manifests/textpack-fr-core.json`
- `resources/textpack-en-core/*`
- `resources/textpack-en-legal/*`
- `resources/textpack-fr-core/*`

Negative controls live under `fixtures/textpack/invalid/`.

## Verification

`npm run -s check:fixtures` validates the pack manifest schema, checks licensed fixture paths,
rejects duplicate or missing references, exercises overlay conflicts, builds the registry, loads the
committed stopword, lexicon, and gazetteer resources, and proves deterministic lookup behavior with
recorded provenance.
