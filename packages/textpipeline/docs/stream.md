# Stream

`streamPipeline` processes an `AsyncIterable<TextDocument>`.

```ts
for await (const output of streamPipeline(pipeline, documents, {
	concurrency: 2,
	preserveOrder: true,
})) {
	yield output;
}
```

Input order is preserved by default. Set `preserveOrder: false` to yield completed documents as they finish.
