# Word Alignment

`alignWords` aligns token spans from token layers or deterministic word segmentation.

```ts
import { alignWords } from "@ismail-elkorchi/textparallel/word-align";

const links = alignWords(sourceDoc, targetDoc, {
	dictionaries: [{ source: "Hello", target: "Bonjour", weight: 1 }],
});
```

Dictionary entries, lexicons, FSTs, and trained word-alignment models are caller-provided resources. Null links are explicit inserted or deleted links.

Candidate scores are resolved with a global maximum-weight one-to-one assignment, so an early local
choice cannot block a higher-scoring sentence-wide alignment. `trainWordAligner` estimates lexical
probabilities with deterministic EM and a positional prior; its dictionary is consumed directly by
`alignWords` when supplied as `model`.
