# Transfer

`shallowTransfer` creates rule-backed transfer annotations, views, or both from explicit caller resources.

```ts
import { shallowTransfer } from "@ismail-elkorchi/textparallel/transfer";

const translated = shallowTransfer(sourceDoc, {
	dictionaries: [{ source: "Hello", target: "Bonjour" }],
}, { output: "both" });
```

The workflow composes dictionaries, lexicons, FSTs, and textrules rule sets without owning those lower engines.
