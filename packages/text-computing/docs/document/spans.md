# Spans

Spans are half-open and always declare a coordinate unit:

```ts
const span = { start: 0, end: 5, unit: "utf16-code-unit" };
```

`mapSpan` returns an array of mapped span references. Identity mapping returns the input reference. Missing mappings return an empty array.

Span maps are explicit records between source and target views; no coordinate conversion is inferred without a declared map.

Use `addViewWithSpanMap` when a derived view declares `spanMapId` for a new span map. It inserts the view and span map atomically so the document is valid before and after the operation.
