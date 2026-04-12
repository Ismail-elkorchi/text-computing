# text-computing

`text-computing` is the public workspace for deterministic text computing packages.

The current publishable package is `textfacts`. Its implementation now lives in `packages/textfacts`.

## Packages

- `textfacts` — deterministic, Unicode-pinned text facts.
- `@ismail-elkorchi/textdoc` — document annotation container package placeholder.
- `@ismail-elkorchi/textpack` — text resource package placeholder.
- `@ismail-elkorchi/textrules` — deterministic rules package placeholder.
- `@ismail-elkorchi/textpipeline` — deterministic pipeline package placeholder.
- `@ismail-elkorchi/textcorpus` — corpus feature package placeholder.
- `@ismail-elkorchi/textprotocol` — result envelope package placeholder.
- `@ismail-elkorchi/textconformance` — conformance report package placeholder.
- `@ismail-elkorchi/textlab` — inspection command package placeholder.

## Development

Run repository checks from the workspace root:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
npm run -s test:all
```
