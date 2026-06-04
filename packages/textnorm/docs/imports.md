# Imports

The public entrypoints are:

```ts
import { normalizeDocument } from "@ismail-elkorchi/textnorm";
import { candidateNormalizations } from "@ismail-elkorchi/textnorm/normalize";
import { buildVariantGraph } from "@ismail-elkorchi/textnorm/variant";
import { candidateRepeatedCharacters } from "@ismail-elkorchi/textnorm/noisy";
import { buildHistoricalSpellingMap } from "@ismail-elkorchi/textnorm/historical";
import { buildConfusionTable } from "@ismail-elkorchi/textnorm/ocr";
import { buildTransliterationMap } from "@ismail-elkorchi/textnorm/transliteration";
import { buildSpellingMap } from "@ismail-elkorchi/textnorm/spell";
import { computeEditScript } from "@ismail-elkorchi/textnorm/view";
```

There are no public `/resource`, `/internal`, `/legacy`, or `/compat` subpaths.
