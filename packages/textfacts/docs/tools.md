# Tools

Run package checks from `packages/textfacts` or through npm workspaces from the repository root.

```sh
npm -w @ismail-elkorchi/textfacts run build
npm -w @ismail-elkorchi/textfacts run check:static
npm -w @ismail-elkorchi/textfacts run test:all
```

Runtime coverage must include Node.js, Deno, Bun, browsers, and Cloudflare Workers.

Unicode data generation remains under `tools/unicode`, `tools/uca`, and `tools/idna`.

