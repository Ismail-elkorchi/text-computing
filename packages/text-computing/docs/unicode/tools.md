# Tools

Run package checks from `packages/text-computing` or through npm workspaces from the repository root.

```sh
npm -w @ismail-elkorchi/text-computing run build
npm -w @ismail-elkorchi/text-computing run check:static
npm -w @ismail-elkorchi/text-computing run test:all
```

Runtime coverage must include Node.js, Deno, Bun, browsers, and Cloudflare Workers.

Unicode data generation remains under `tools/unicode` and `tools/uca`.
