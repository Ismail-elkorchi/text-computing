# `@ismail-elkorchi/textpack`

Resource-pack manifests, loading, composition, capabilities, and resource handles.

`textpack` is an independent root package. It does not execute NLP engines, read files, fetch
network resources, discover packs implicitly, or apply hidden canonicalization.

## Final API

```ts
import {
  createPack,
  getResource,
  listResources,
  loadMorphology,
  loadSyntaxResources,
  loadPack,
  validateManifest,
} from "@ismail-elkorchi/textpack";
```

The final manifest shape is described by
[`../../schemas/textpack-manifest.schema.json`](../../schemas/textpack-manifest.schema.json).

## Pack Modules

Every `textpack-*` package exports:

```ts
export const manifest = { /* TextPackManifest */ };
export const resources = { /* PackResourceMap */ };
export default { manifest, resources };
```

`loadPack` accepts that module shape and returns an immutable runtime pack.

```ts
const pack = await loadPack(await import("@ismail-elkorchi/textpack-en-core"));
const stoplists = listResources(pack, { kind: "stoplist", languages: "en" });
const data = getResource<string>(pack, stoplists[0].id);
```

Resource ids are exact. `getResource(pack, "x")` only returns the resource whose descriptor id is
`"x"`.

## Resource Family Adapters

`textpack` provides lightweight adapters that select resources by capability slot and resource kind,
then parse declared payload formats into resource handles:

```ts
const pack = await loadPack(await import("@ismail-elkorchi/textpack-en-syntax-ud-gumreddit"));
const syntax = loadSyntaxResources(pack);
const morphology = loadMorphology(pack);
```

The adapters cover the shared textpack resource families: lexicon, segmentation, normalization,
morphology, syntax, search, knowledge base, corpus, parallel, and quality. They parse TSV resources
as `{ columns, rows }`, JSON resources as JSON values, and leave unknown formats as raw payloads.

## Composition

`composePacks` composes already loaded packs. Duplicate resource ids fail by default; callers must
choose an explicit conflict policy when shadowing is intended.

## Boundary

Pack resources are caller-provided values. They may be strings, bytes, JSON values, typed objects, or
opaque resource handles. `textpack` validates the manifest and resource-map consistency; higher
packages decide how to interpret resource payloads.
