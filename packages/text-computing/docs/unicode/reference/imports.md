# Import Reference

The final public entrypoints are:

```text
@ismail-elkorchi/text-computing/unicode
@ismail-elkorchi/text-computing/unicode/input
@ismail-elkorchi/text-computing/unicode/unicode
@ismail-elkorchi/text-computing/unicode/normalize
@ismail-elkorchi/text-computing/unicode/casefold
@ismail-elkorchi/text-computing/unicode/segment
@ismail-elkorchi/text-computing/unicode/linebreak
@ismail-elkorchi/text-computing/unicode/bidi
@ismail-elkorchi/text-computing/unicode/security
@ismail-elkorchi/text-computing/unicode/integrity
@ismail-elkorchi/text-computing/unicode/collation
@ismail-elkorchi/text-computing/unicode/facts
@ismail-elkorchi/text-computing/unicode/hash
@ismail-elkorchi/text-computing/unicode/idna
```

Removed entrypoints are not compatibility aliases: `core`, `jcs`, and `variants`.

```ts
import { readText } from "@ismail-elkorchi/text-computing/unicode/input";
import { segmentWords } from "@ismail-elkorchi/text-computing/unicode/segment";
import { rootCollationKey } from "@ismail-elkorchi/text-computing/unicode/collation";
```
