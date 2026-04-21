# `@ismail-elkorchi/textpack`

Text resource package.

## Manifest contract

The public contract for repository-level resource packs is
[`../../schemas/textpack-manifest-v1.schema.json`](../../schemas/textpack-manifest-v1.schema.json).
It defines:

- pack identity and npm package identity;
- resource identity, lookup keys, overlay precedence, and package-relative paths;
- provenance and license references for each resource entry; and
- manifest entrypoints and runnable test references.

`@ismail-elkorchi/textpack` does not execute rules or widen core task packages. It records
deterministic resource metadata and lookup ordering so rule-backed packages can consume packs
without inventing their own manifest shape.
