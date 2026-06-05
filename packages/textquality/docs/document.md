# Document Quality

`analyzeDocumentQuality` reads a final `TextDocument` view and returns a stable `QualityReport`.

Document dimensions include Unicode integrity, invisible/control characters, punctuation and whitespace, tokenization and segmentation diagnostics, OCR/ATR indicators, noisy-token diagnostics, spelling-variant and OOV coverage, language and script mixture, morphology coverage, duplication indicators, low-information spans, readability, lexical diversity, style findings, annotation quality, and processing readiness.

The function never mutates the input document.
