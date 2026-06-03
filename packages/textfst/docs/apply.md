# Apply

`applyDown` traverses from input or lexical side to output or surface side. `applyUp` traverses the
same FST in reverse relation direction. Traversal is bounded by `maxDepth` and `maxResults` so
epsilon cycles cannot run indefinitely.
