# Hashing

The hash entrypoint exposes stable text hashes for deterministic local facts.

```ts
import { stableHash64, stableHash128 } from "@ismail-elkorchi/textfacts/hash";

const short = stableHash64("Café");
const wide = stableHash128("Café");
```

These hashes are deterministic identifiers, not signatures or encryption.

