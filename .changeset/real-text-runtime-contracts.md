---
"@ismail-elkorchi/text-computing": minor
"@ismail-elkorchi/textdata": patch
"@ismail-elkorchi/textfacts": patch
"@ismail-elkorchi/textkb": minor
"@ismail-elkorchi/textlex": patch
"@ismail-elkorchi/textpack": minor
"@ismail-elkorchi/textquality": minor
"@ismail-elkorchi/textpack-ar": patch
"@ismail-elkorchi/textpack-en": patch
"@ismail-elkorchi/textpack-fr": patch
---

Replace host-dependent segmentation and eager indexed-table loading with pinned Unicode segmentation, byte-range bucket reads, domain-scoped Arabic morphology keys, bounded lookup memory, and multilingual real-text and cold-start gates.

Remove the SDK's full, corpus, parallel, syntax-dataset, and pipeline facades; make KB linking annotation-first; expose explicit quality volume and overlap policy; and correct Unicode script diagnostics.
