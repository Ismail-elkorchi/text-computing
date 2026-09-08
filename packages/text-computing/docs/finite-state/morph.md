# Morphology

`analyzeWord` applies morphology resources upward from surface word to analysis. `generateWord`
applies downward from analysis to surface form. Results use the final `MorphFstResult` shape with
optional lemma, tags, weight, and structural span references.

When `includeSpans` is enabled, analysis spans default to view id `surface` and generation spans
default to view id `analysis`; callers can set `spanViewId` for document-specific coordinates.
