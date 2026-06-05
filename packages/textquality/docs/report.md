# Reports

`QualityFinding` stores kind, severity, message, evidence, spans, and finite metrics.

`QualityReport` stores target, findings, finite metrics, and JSON-safe summaries. Reports are the package's summary reports for document, corpus, and annotation-layer targets.

`annotateQuality` converts findings into final `quality.*` annotations while preserving existing document state.
