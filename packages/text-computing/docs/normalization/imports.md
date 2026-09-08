# Imports

The public entrypoints are:

```ts
import { normalizeDocument } from "@ismail-elkorchi/text-computing/normalization";
import { candidateNormalizations } from "@ismail-elkorchi/text-computing/normalization/normalize";
import { buildVariantGraph } from "@ismail-elkorchi/text-computing/normalization/variant";
import { candidateRepeatedCharacters } from "@ismail-elkorchi/text-computing/normalization/noisy";
import { buildHistoricalSpellingMap } from "@ismail-elkorchi/text-computing/normalization/historical";
import { buildConfusionTable } from "@ismail-elkorchi/text-computing/normalization/ocr";
import { buildTransliterationMap } from "@ismail-elkorchi/text-computing/normalization/transliteration";
import { buildSpellingMap } from "@ismail-elkorchi/text-computing/normalization/spell";
import { computeEditScript } from "@ismail-elkorchi/text-computing/normalization/view";
```

There are no public `/resource`, `/internal`, `/legacy`, or `/compat` subpaths.
