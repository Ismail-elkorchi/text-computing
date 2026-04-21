# textpack resource manifest

## Why this document exists

Issue `#12` requires a public manifest contract for lexicons, stopwords, gazetteers, abbreviation
lists, and related resource packs before any loader behavior is treated as accepted. This document
records the manifest conventions, the licensed fixture resources, and the failure policy that the
repository validates.

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

## Overlay and mismatch policy

Resource lookup is deterministic:

- resources are filtered by kind first;
- language comparison uses normalized lowercase tokens when both the request and the resource record
  a language;
- profile-specific resources are only considered when the requested profile matches, while
  profile-free resources remain eligible as base overlays; and
- successful candidates are ordered by descending `overlayPrecedence`, then `packId`, then
  `resourceId`.

The repository treats these conditions as failures or diagnostics:

- duplicate `resourceId` values within one manifest are invalid;
- `licenseId` and `provenanceId` references must resolve inside the manifest;
- two resolved resources that share the same normalized `lookupKey` and `overlayPrecedence`
  produce an overlay-conflict diagnostic; and
- language/profile mismatches are recorded as diagnostics, not silently ignored.

## Fixture inventory

Valid manifests and resources live under
[`../../fixtures/textpack/`](../../fixtures/textpack/):

- `manifests/textpack-en-core.json`
- `manifests/textpack-en-legal.json`
- `resources/textpack-en-core/*`
- `resources/textpack-en-legal/*`

Negative controls live under `fixtures/textpack/invalid/`.

## Verification

`npm run -s check:fixtures` validates the pack manifest schema, checks licensed fixture paths,
rejects duplicate or missing references, exercises overlay conflicts, and proves deterministic
lookup behavior with recorded provenance.
