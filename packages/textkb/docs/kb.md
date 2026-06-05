# Knowledge Bases

Use `createKnowledgeBase` with caller-provided entity, concept, sense, relation, alias, and metadata records.

The builder validates duplicate ids, dangling aliases, dangling relation endpoints, finite priors/scores, and plain JSON metadata. Stores and alias indexes iterate deterministically by code-point order.
