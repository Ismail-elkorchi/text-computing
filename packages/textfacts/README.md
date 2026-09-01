# @ismail-elkorchi/textfacts

Unicode-pinned, deterministic facts about one text. No language packs, no corpus logic, no neural or statistical models.

This is an expert engine module. Applications should use `@ismail-elkorchi/text-computing` with generated Capability Packs.

## Entrypoints

```ts
import { readText } from "@ismail-elkorchi/textfacts/input";
import { normalize, normalizationDeltas } from "@ismail-elkorchi/textfacts/normalize";
import { segmentGraphemes, segmentWords, segmentSentences } from "@ismail-elkorchi/textfacts/segment";
import { lineBreakOpportunities } from "@ismail-elkorchi/textfacts/linebreak";
import { scanIntegrityFindings } from "@ismail-elkorchi/textfacts/integrity";
import { rootCollationKey, compareRootCollation } from "@ismail-elkorchi/textfacts/collation";
import { surfaceProfile, wordFrequencies, charNgrams, wordNgrams } from "@ismail-elkorchi/textfacts/facts";
import { stableHash64, stableHash128 } from "@ismail-elkorchi/textfacts/hash";
```

The root entrypoint reexports the public APIs. Required runtime targets are Node.js, Deno, Bun, browsers, and Cloudflare Workers.

## Example

```ts
import { normalize, segmentWords, surfaceProfile } from "@ismail-elkorchi/textfacts";

const text = normalize("Cafe\u0301 cafe", "NFC");
const words = [...segmentWords(text)];
const profile = surfaceProfile(text);

console.log(words.length);
console.log(profile.counts.graphemes);
```

## Boundaries

`textfacts` works only on local single-text facts and spec-pinned Unicode algorithms. It does not load resource packs, perform language-specific tokenization, run corpus analysis, or execute pipelines.
