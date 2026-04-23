# Package readiness hardening

The workspace packages beyond `textfacts` remain private, but they must no longer model public consumption as direct `src/` imports.

Decision:

- non-`textfacts` packages export `./dist/index.js` and `./dist/index.d.ts`;
- each package owns `tsconfig.build.json` and emits declarations into `dist`;
- `prepack` runs the package build before any future package archive is created;
- `tools/validate-package-readiness.mjs` rejects source-export regression.

This does not make the packages production-candidate. It only removes one packaging falsehood before broader public release work.
