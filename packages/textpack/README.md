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
  loadPack,
  openResourceJson,
  openResourceTable,
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

## Schema-Based Selection

`textpack` selects and materializes resources. It does not own lexicon, KB, corpus, morphology,
syntax, search, quality, or parallel behavior. Task packages select canonical schemas and build
their own runtime objects:

```ts
const pack = await loadPack(await import("@ismail-elkorchi/textpack-en-syntax-ud-gumreddit"));
const syntaxResources = listResources(pack, { schemaId: "textdata.syntax.v1" });
const syntaxProfile = await openResourceJson(pack, syntaxResources[0].id, reader);
const annotationRows = await openResourceTable(pack, "en-ud-gumreddit-annotations", reader);
```

Runtime packages decide how to interpret canonical resources. `textpack` only validates manifests,
loads modules, composes resource maps, queries descriptors, and materializes text/JSON/table payloads
from caller-provided resource values.

## Composition

`composePacks` composes already loaded packs. Duplicate resource ids fail by default; callers must
choose an explicit conflict policy when shadowing is intended.

## Boundary

Pack resources are caller-provided values. They may be strings, bytes, JSON values, typed objects, or
opaque resource handles. `textpack` validates the manifest and resource-map consistency; higher
packages decide how to interpret resource payloads.
