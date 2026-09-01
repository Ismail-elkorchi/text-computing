# Capability Packs

`@ismail-elkorchi/textpack` is the structural TypeScript contract for
Capability Pack manifests, loading, composition, capability claims, and
resource handles.

The contract does not execute NLP tasks, read files, discover packs implicitly,
or apply hidden canonicalization. Readers are always caller-provided, and pack
loading performs no network or filesystem I/O.

## Contract API

```ts
import {
  createFetchResourceReader,
  createPack,
  getResource,
  listResources,
  loadPack,
  openResourceJson,
  openResourceLookupIndex,
  openResourceTable,
  validateManifest,
} from "@ismail-elkorchi/textpack";
```

The manifest schema is described by
[`../../schemas/textpack-manifest.schema.json`](../../schemas/textpack-manifest.schema.json).

Every capability slot declares both `status` and `tier`. Status reports availability; tier reports
the strongest behavior a schema-compatible runtime actually executes. A shipped table is
`resource-only` until an adapter performs the named task, finite keyed matching is `lookup`, and a
trained model is `model-backed` only when that exact artifact runs. The complete contract is documented in
[`../../docs/specs/textpack-capability-tiers.md`](../../docs/specs/textpack-capability-tiers.md).
The `capabilities(pack)` summary includes only runnable slots; profile and artifact metadata cannot
silently raise an executable capability level.

Bindings identify a capability slot, resource role, schema, resource id, and
whether the resource is required. They deliberately contain no implementation
package owner or package-engine map. Runtime compatibility comes from semantic
contracts, so pack identity remains stable when implementation modules move.

## Pack modules

Every `textpack-*` package exports:

```ts
export const manifest = { /* TextPackManifest */ };
export const resources = { /* PackResourceMap */ };
export const pack = { manifest, resources };
export default pack;
```

`loadPack` accepts that module shape and returns an immutable runtime pack.

```ts
const pack = await loadPack(await import("@ismail-elkorchi/textpack-en"));
const stoplists = listResources(pack, { kind: "stoplist", languages: "en" });
const data = getResource<string>(pack, stoplists[0].id);
```

In Node, package-local generated resources use the explicit Node adapter:

```ts
import { createNodeResourceReader } from "@ismail-elkorchi/textpack/node";

const reader = createNodeResourceReader();
```

Loading a pack never reads resource files. Pass a reader explicitly to `openResourceText`,
`openResourceJson`, or `openResourceTable` when opening a file-backed handle; in-memory resources do
not need one. A capability slot's `readerRequired: true` flag reports that its task resources include
handles that require this explicit materialization step.

Resource ids are exact. `getResource(pack, "x")` only returns the resource whose descriptor id is
`"x"`.

Generated large tables may declare a canonical `resourceRefs` entry with role `lookup-index` and
schema `textpack.lookup-index.v1`. The logical source descriptor and lookup view share one
`textpack-indexed-table-v1` physical store containing column-scoped key buckets, row buckets,
optional alias/label fuzzy key catalogs, and raw pattern catalogs for lexicon expert lookup.
`openResourceLookupIndex()` verifies the store and each bucket selected by a query; it never opens
or reconstructs the full source table on a targeted lookup path. `openResourceText()` reconstructs
the logical TSV only for callers that explicitly request full materialization. The forge rebuild
verifier proves that the metadata, keys, row references, rows, and reconstructed source agree.
Exact and KB-fuzzy callers must supply keys already normalized as `NFKC-casefold-Unicode-17`;
lexicon prefix, suffix, and fuzzy pattern queries retain their raw-text semantics. Task adapters own
normalization so `textpack` stays independent of Unicode policy packages.

## Descriptor queries and materialization

`textpack` queries descriptors and materializes resources. It does not own lexicon, KB, corpus,
morphology, syntax, search, quality, parallel, or model execution. Executors interpret generated
manifest `capabilitySlots[].bindings` for task selection, then use `textpack` only to open the
selected structural resources:

```ts
const pack = await loadPack(await import("@ismail-elkorchi/textpack-en"));
const profiles = listResources(pack, { schemaId: "textnorm.profile.v1" });
const reader = createFetchResourceReader();
const normalizationProfile = await openResourceJson(pack, profiles[0].id, reader);
const normalizationRules = await openResourceTable(pack, "en-normalization-rules", reader);
```

Executors decide how to interpret canonical resources. The SDK and adapters must not
use a schema alone or package-specific ID heuristics to decide which task resource to run. `textpack`
only validates manifests, loads modules, composes resource maps, queries descriptors, and materializes
text/JSON/table payloads from caller-provided resource values. `createFetchResourceReader()` is a
runtime-neutral helper for file-backed generated resources whose descriptors include `packageRoot`
and package-relative `path`; it uses `fetch`, not filesystem APIs.

Use `requireTaskResourceBindings` only for an executable `task-supported` slot. Expert APIs that
inspect a `profiled` or sampled dataset use `requireCapabilityResourceBindings`; this preserves
access to corpus, parallel, and syntax annotations without misrepresenting resource access as NLP
inference.

If those assets are served separately from the generated module, rebase frozen handles at the
reader boundary:

```ts
const reader = createFetchResourceReader({
  packageRoot: "https://cdn.example.test/textpacks/en/",
});
```

## Composition

`composePacks` composes already loaded packs. Duplicate resource ids fail by default; callers must
choose an explicit conflict policy when shadowing is intended.

## Boundary

Pack resources are caller-provided values. They may be strings, bytes, JSON values, typed objects, or
opaque resource handles. `textpack` validates the manifest and resource-map consistency; runtime
executors decide how to interpret resource payloads. Packs may describe artifacts produced by any
upstream toolchain, but a descriptor alone never makes a task executable.
