# Resources

Runtime APIs consume loaded records and rows. Self-contained language distributions such as `@ismail-elkorchi/textpack-en` can provide those rows, but `textkb` does not discover packages, read package paths, or fetch external snapshots.

Node-only tests may read fixtures. Shipped runtime code stays resource-location agnostic.
