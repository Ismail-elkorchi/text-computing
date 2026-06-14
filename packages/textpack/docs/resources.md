# Resources

`TextPackResource.id` is the resource lookup key. `PackResourceMap` is keyed by the same ids.

`createPack` rejects missing declared resource ids and undeclared resource-map keys. Resource paths
are descriptive package-relative metadata; they are not filesystem instructions for the runtime
loader.

Generated packs may expose file-backed resource descriptors in their `resources` map. Those
descriptors are still explicit data values; callers pass a `TextPackResourceReader` when they want
to materialize them. The root API includes `createFetchResourceReader()` for fetch-capable runtimes.
It resolves `descriptor.path` under `descriptor.packageRoot`, rejects paths that escape that root,
and never uses Node-only filesystem APIs.
