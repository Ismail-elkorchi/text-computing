# Textpack capability tiers

Capability availability and linguistic depth are independent manifest facts.
`capabilitySlots[].status` describes whether a slot is present and runnable;
`capabilitySlots[].tier` describes the strongest behavior actually executed by
the bound runtime adapter.

The tiers are:

- `none`: no executable behavior is available.
- `resource-only`: structured data can be inspected, but the slot does not
  perform the named NLP task over ordinary input.
- `baseline`: a deterministic language-neutral or surface heuristic executes.
- `lookup`: input is resolved against a finite keyed inventory without
  contextual disambiguation.
- `rule-based`: language-specific rules, grammars, or finite-state composition
  execute over the input.
- `contextual`: predictions use neighboring linguistic context and return
  token- or span-aligned alternatives or decisions.
- `model-backed`: a trained statistical model executes and its evaluation
  identifies the model, held-out dataset, and task metric.

The order is a declaration of increasing inference depth, not a claim that a
higher tier is always more accurate. Packs must declare the lowest tier that
fully describes ordinary runtime behavior. Merely shipping tables, profiles,
gold cases, or model metadata never raises a tier.

Examples:

- host `Intl.Segmenter` with no language rules is `baseline` segmentation;
- form-to-lemma table lookup is `lookup` morphology;
- a morpheme inventory that cannot analyze complete words is `resource-only`;
- alias matching is `lookup` entity linking;
- a context-sensitive tagger with a held-out token-accuracy result is
  `model-backed` tagging.

Generated evaluation reports must preserve the declared tier and separately
report their evidence class. Resource conformance, integrity, and coverage
records cannot be presented as task-accuracy evidence.
