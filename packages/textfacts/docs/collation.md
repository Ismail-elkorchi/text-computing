# Collation

The collation entrypoint exposes root UCA/DUCET behavior only.

```ts
import { compareRootCollation, rootCollationKey } from "@ismail-elkorchi/textfacts/collation";

const key = rootCollationKey("café");
const order = compareRootCollation("cafe", "café");
```

Locale tailoring and profile data belong in resource packs and higher packages.

