# Imports

Use the root entrypoint:

```ts
import {
  capabilities,
  composePacks,
  createFetchResourceReader,
  createPack,
  getResource,
  listResources,
  loadPack,
  validateManifest,
} from "@ismail-elkorchi/text-computing/packs";
```

Node-only package-file reading is isolated from the portable root entrypoint:

```ts
import { createNodeResourceReader } from "@ismail-elkorchi/text-computing/packs/node";
```
