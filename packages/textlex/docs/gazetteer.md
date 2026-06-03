# Gazetteers

`GazetteerEntry` extends `LexicalEntry` with `entityType`, `kbId`, `priority`, `aliases`, and `disambiguationHints`. Gazetteer lookup preserves those fields and filters by entity type or KB id. Entity linking remains outside `textlex`.
