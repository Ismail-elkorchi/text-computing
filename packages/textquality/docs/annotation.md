# Annotation Quality

`annotationQualityFindings` inspects final `textdoc` layers, spans, evidence, alternatives, scores, graph references, overlap policy, and coverage.

Token layers are non-overlapping by contract. Other layer types may contain
overlapping alternatives unless their ids are passed through
`nonOverlappingLayerIds`.

It reports sparsity and conflicts without rewriting source annotations or deciding task truth.
