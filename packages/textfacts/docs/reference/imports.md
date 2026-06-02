# Import Reference

The final public entrypoints are:

```text
@ismail-elkorchi/textfacts
@ismail-elkorchi/textfacts/input
@ismail-elkorchi/textfacts/unicode
@ismail-elkorchi/textfacts/normalize
@ismail-elkorchi/textfacts/casefold
@ismail-elkorchi/textfacts/segment
@ismail-elkorchi/textfacts/linebreak
@ismail-elkorchi/textfacts/bidi
@ismail-elkorchi/textfacts/security
@ismail-elkorchi/textfacts/integrity
@ismail-elkorchi/textfacts/collation
@ismail-elkorchi/textfacts/facts
@ismail-elkorchi/textfacts/hash
@ismail-elkorchi/textfacts/idna
```

Removed entrypoints are not compatibility aliases: `core`, `jcs`, and `variants`.

```ts
import { readText } from "@ismail-elkorchi/textfacts/input";
import { segmentWords } from "@ismail-elkorchi/textfacts/segment";
import { rootCollationKey } from "@ismail-elkorchi/textfacts/collation";
```

