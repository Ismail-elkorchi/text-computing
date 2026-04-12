# Migration Map (Entrypoints)

This document lists exported entrypoints. Import paths not listed in this map are not exported.

## Non-Exported Entrypoints
- `@ismail-elkorchi/textfacts/hash64`
- `@ismail-elkorchi/textfacts/hash128`
- `@ismail-elkorchi/textfacts/diff`
- `@ismail-elkorchi/textfacts/fingerprint`
- `@ismail-elkorchi/textfacts/corpus`
- `@ismail-elkorchi/textfacts/profile`

## Current Exported Entrypoints
- `textfacts`
- `@ismail-elkorchi/textfacts/all`
- `@ismail-elkorchi/textfacts/bidi`
- `@ismail-elkorchi/textfacts/casefold`
- `@ismail-elkorchi/textfacts/collation`
- `@ismail-elkorchi/textfacts/compare`
- `@ismail-elkorchi/textfacts/core`
- `@ismail-elkorchi/textfacts/facts`
- `@ismail-elkorchi/textfacts/hash`
- `@ismail-elkorchi/textfacts/idna`
- `@ismail-elkorchi/textfacts/integrity`
- `@ismail-elkorchi/textfacts/jcs`
- `@ismail-elkorchi/textfacts/linebreak`
- `@ismail-elkorchi/textfacts/normalize`
- `@ismail-elkorchi/textfacts/pack`
- `@ismail-elkorchi/textfacts/protocol`
- `@ismail-elkorchi/textfacts/schema`
- `@ismail-elkorchi/textfacts/security`
- `@ismail-elkorchi/textfacts/segment`
- `@ismail-elkorchi/textfacts/toolspec`
- `@ismail-elkorchi/textfacts/unicode`
- `@ismail-elkorchi/textfacts/variants`

## Root Import Note
The root entrypoint does not provide dedicated exports for diff/fingerprint/corpus/profile modules. Import from the supported subpaths listed above.
