# Integrity

The integrity entrypoint scans Unicode well-formedness and text-integrity findings.

```ts
import { scanIntegrityFindings } from "@ismail-elkorchi/text-computing/unicode/integrity";

const findings = scanIntegrityFindings("a\u200Db", {
  include: ["join-control"],
});
```

Finding spans use UTF-16 code units.

