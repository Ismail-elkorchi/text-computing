# Apply

`applyDown` traverses from input or lexical side to output or surface side. `applyUp` traverses the
same FST in reverse relation direction. Traversal is bounded by `maxDepth` and `maxResults` so
epsilon cycles cannot run indefinitely.

When `includeSpans` is enabled, results use the shared final `textdoc` `SpanRef` shape. The default
span view id is `input`; callers can set `spanViewId` when applying an FST over a document view.
