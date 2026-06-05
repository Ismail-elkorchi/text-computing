# Resources

Runtime APIs consume loaded records and rows. Resource packs such as `@ismail-elkorchi/textpack-kb-demo` can provide rows, but `textkb` does not discover packages, read package paths, or fetch external snapshots.

Node-only tests may read fixtures. Shipped runtime code stays resource-location agnostic.
