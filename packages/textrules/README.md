# `@ismail-elkorchi/textrules`

Deterministic rule-based NLP over final `textdoc` documents.

## Imports

```ts
import {
	applyRules,
	compileRuleSet,
	matchRules,
	rewriteView,
	createRuleProcessor,
} from "@ismail-elkorchi/textrules";
```

Focused entrypoints are available for `pattern`, `compile`, `match`, `cascade`, `rewrite`,
`grammar`, `extract`, `constraints`, and `processor`.

## Minimal Rule

```ts
const rules = compileRuleSet({
	id: "rules:mentions",
	version: "1.0.0",
	rules: [
		{
			id: "mention:alice",
			when: { kind: "char", text: "Alice" },
			action: [
				{
					kind: "annotate",
					layerId: "mentions",
					layerType: "entity.mention",
					value: { label: "PER" },
				},
			],
		},
	],
});

const matches = matchRules(document, rules);
const annotated = applyRules(document, rules);
```

## Rewrites

`rewriteView` creates derived views and span maps. It does not mutate source views.

```ts
const normalized = rewriteView(document, compileRuleSet({
	id: "rules:rewrite",
	version: "1.0.0",
	rules: [
		{
			id: "rewrite:name",
			when: { kind: "char", text: "Alice" },
			action: [
				{
					kind: "rewrite",
					targetViewId: "normalized",
					replacements: { Alice: "Alicia" },
				},
			],
		},
	],
}));
```

## Boundaries

`textrules` does not train statistical models, store corpora, manage search indexes, perform KB
reasoning, or schedule pipelines. It can emit annotations and features for those packages to
consume.
