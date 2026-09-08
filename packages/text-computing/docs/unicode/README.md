# @ismail-elkorchi/text-computing/unicode

Unicode-pinned, deterministic facts about one text. No language packs, no corpus logic, no neural or statistical models.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Entrypoints

```ts
import { readText } from "@ismail-elkorchi/text-computing/unicode/input";
import { normalize, normalizationDeltas } from "@ismail-elkorchi/text-computing/unicode/normalize";
import { segmentGraphemes, segmentWords, segmentSentences } from "@ismail-elkorchi/text-computing/unicode/segment";
import { lineBreakOpportunities } from "@ismail-elkorchi/text-computing/unicode/linebreak";
import { scanIntegrityFindings } from "@ismail-elkorchi/text-computing/unicode/integrity";
import { rootCollationKey, compareRootCollation } from "@ismail-elkorchi/text-computing/unicode/collation";
import { surfaceProfile, wordFrequencies, charNgrams, wordNgrams } from "@ismail-elkorchi/text-computing/unicode/facts";
import { stableHash64, stableHash128 } from "@ismail-elkorchi/text-computing/unicode/hash";
```

The root entrypoint reexports the public APIs. Required runtime targets are Node.js, Deno, Bun, browsers, and Cloudflare Workers.

## Example

```ts
import { normalize, segmentWords, surfaceProfile } from "@ismail-elkorchi/text-computing/unicode";

const text = normalize("Cafe\u0301 cafe", "NFC");
const words = [...segmentWords(text)];
const profile = surfaceProfile(text);

console.log(words.length);
console.log(profile.counts.graphemes);
```

## Boundaries

`/unicode` works only on local single-text facts and spec-pinned Unicode algorithms. It does not load resource packs, perform language-specific tokenization, run corpus analysis, or execute pipelines.
