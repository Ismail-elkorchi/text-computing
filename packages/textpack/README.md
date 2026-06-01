# `@ismail-elkorchi/textpack`

Text resource package.

## Manifest contract

The public contract for resource packs is
[`../../schemas/textpack-manifest-v1.schema.json`](../../schemas/textpack-manifest-v1.schema.json).
It defines:

- `manifestVersion`, pack `id`, npm `packageName`, and `version`;
- descriptive `kind`, declared `targets`, `engines`, `externalData`, and `capabilities`;
- resource-family maps under `resources` and matching logical identifiers under `provides`;
- manifest entrypoints and required `smoke`, `negative`, and `representative` tests;
- structured `licenses`, `provenance`, and `reviewState`; and
- optional explicit composition metadata.

`@ismail-elkorchi/textpack` does not execute rules, fetch remote registries, or manage corpora. It
validates pack metadata, builds deterministic resource registries, checks compatibility policy, and
loads caller-provided resource content.

## Resource loading

Resource loading is pure: callers provide resource content by manifest path. The package does not
read files, open network connections, or execute pack code.

The current loader surface covers committed alpha formats:

- line-delimited stopwords, rules, profiles, structures, transducers, and benchmark fixtures;
- TSV lexicons, morphology tables, and tagsets with `key=value` attributes; and
- TSV gazetteers with labels and optional attributes.

Loaded entries preserve resolved resource metadata, derived license/provenance metadata, line
number, exact lookup token, and deterministic overlay order.

Resource lookup is exact by default. Case folding, trimming, or any other canonicalization must be
provided explicitly by the caller through a declared canonicalizer. The exported
`textPackDemoTrimLowercaseCanonicalizer` is fixture/demo behavior only; it is not a package-level
multilingual default.

## Resource registry and composition

`createTextPackResourceRegistry` builds a deterministic in-memory catalog from one or more manifests.
The registry exposes exact language, profile, family, kind, and review-state summaries.
`queryTextPackResourceRegistry` selects resources by family, kind, language, profile, lookup key,
pack id, or resource id.

`createTextPackCatalog` turns a registry into a deterministic catalog artifact containing pack,
resource-family, license, provenance, review-state, and test coverage summaries.

`composeTextPackResources` accepts explicit pack/precedence inputs for overlay composition. It never
discovers packs implicitly.

`loadTextPackRegistryResources` loads selected registry resources from caller-provided content while
preserving license, provenance, and overlay metadata.

Authoring helpers are immutable:

- `createTextPackManifest` creates a normalized manifest from explicit package metadata.
- `addTextPackManifestResource` appends one paired resource path and provided resource id.
- `updateTextPackManifestResource` updates one paired resource path/id without breaking the pair.
- `removeTextPackManifestResource` removes one paired resource path/id and rederives capability flags.
- `planTextPackResourceTransaction` plans add/update/remove resource operations, returns the next
  manifest, validates metadata before and after the mutation, and includes the expected resource
  inventory audit result.
- `createTextPackCatalogUpdatePlan` compares before/after manifest sets, emits before/after catalogs,
  summarizes pack additions, removals, retained packs, version/review/resource deltas, and audits
  caller-supplied resource inventories.
- `createTextPackReviewReport` emits a machine-readable pack review/vetting report over manifest
  governance, resource inventory, compatibility policy, review-state transition, required evidence,
  and deterministic diagnostics.
- `validateTextPackResourceInventory` checks a caller-supplied package-relative resource file
  inventory against the manifest and reports missing declared files, orphan files, duplicate provided
  ids, and stale resource/provides pairs.
- `validateTextPackAuthoringMetadata` validates license, provenance, review, test, resource, and
  overlay metadata before a pack is used.
- `loadTextPackFromFileSystem` loads resources from a caller-provided filesystem reader in the
  deterministic registry order.

`loadTextPackFromFileSystem` still keeps the package pure: callers provide the file reader and path
resolver. The package does not import Node filesystem APIs.

## Manifest governance and compatibility

`validateTextPackManifestGovernance` checks a manifest before registry construction. It reports
duplicate provided identifiers, resource/provides mismatches, missing metadata, unsafe package paths,
capability/resource mismatches, deprecated review state, and same-scope overlay conflicts.

`checkTextPackCompatibility` checks caller-supplied policy for engine versions, required profiles,
mandatory resource identifiers, minimum review state, and explicit mutually exclusive overlays.

`createTextPackReviewReport` combines governance, inventory, compatibility, and evidence policy into
a JSON review report for pack promotion, retention, downgrade, or deprecation decisions. It does not
perform committee workflow, network lookup, or hidden registry access; callers supply the resource
inventory and any reviewer, conformance, benchmark, security, or migration evidence references.

The validator does not read files and does not treat fixture identifiers as resource paths. Pack
authors remain responsible for supplying package-relative resources, explicit provenance, licenses,
and tests before a pack is considered releasable.

## Consumer example

[`../../examples/textpack-en-core-consumer.mjs`](../../examples/textpack-en-core-consumer.mjs)
shows a consumer creating a manifest from `@ismail-elkorchi/textpack-en-core`, validating it,
loading resources through package APIs, and performing deterministic lookup.

[`../../examples/textpack-authoring-consumer.mjs`](../../examples/textpack-authoring-consumer.mjs)
shows a consumer creating a local pack, planning add/update resource transactions, auditing the
filesystem inventory, loading the resulting resources, and performing deterministic lookup.

[`../../examples/textpack-catalog-update-plan-consumer.mjs`](../../examples/textpack-catalog-update-plan-consumer.mjs)
shows a consumer creating a catalog update plan for a versioned pack resource update.

[`../../examples/textpack-pack-manifest-envelope-consumer.mjs`](../../examples/textpack-pack-manifest-envelope-consumer.mjs)
shows a consumer validating a textpack manifest with `textpack`, wrapping it in a `textprotocol`
pack-manifest schema-family JSON transport, parsing it, and revalidating the parsed manifest.

[`../../examples/textpack-review-report-consumer.mjs`](../../examples/textpack-review-report-consumer.mjs)
shows a consumer creating a textpack review report for an installed reference pack and rendering it
through `textlab`.
