# Pack

`textpipeline` composes already loaded `textpack` values. It does not scan files, download resources, or inspect installed packages.

```ts
const resources = createPipelineResourceRegistry({ packs: [pack] });
const pipeline = createPipeline([processor], { resources });
```

Processors can require resource kinds and exact capabilities:

```ts
{
	resourceKind: "lexicon",
	capability: "terminology:lexicon",
}
```

Pack-provided processors are ordinary `TextProcessor` values passed by the caller.
