import type { TextPackManifestV1 } from "@ismail-elkorchi/textpack";

export const textPackEnCoreManifest: TextPackManifestV1 = {
  "manifestVersion": "1.0.0",
  "id": "pack:en-core",
  "packageName": "@ismail-elkorchi/textpack-en-core",
  "version": "0.1.0",
  "kind": [
    "language"
  ],
  "targets": {
    "languages": [
      "en"
    ],
    "scripts": [
      "Latn"
    ]
  },
  "engines": {
    "@ismail-elkorchi/textpack": "^0.1.0"
  },
  "externalData": {
    "unicode": "17.0.0"
  },
  "capabilities": {
    "profiles": true,
    "stopwords": true,
    "rules": true,
    "lexicons": true,
    "gazetteers": true,
    "tagsets": true,
    "morphology": true,
    "transducers": true,
    "structures": true,
    "benchmarks": true
  },
  "resources": {
    "profiles": [
      "resources/profile.en.core.txt"
    ],
    "stopwords": [
      "resources/stopwords.en.basic.txt"
    ],
    "rules": [
      "resources/abbrev.en.common.txt"
    ],
    "lexicons": [
      "resources/lexicon.en.simple.tsv"
    ],
    "gazetteers": [
      "resources/gazetteer.en.core.tsv"
    ],
    "tagsets": [
      "resources/tagset.ud-lite.tsv"
    ],
    "morphology": [
      "resources/morph.en.simple.tsv"
    ],
    "transducers": [
      "resources/transducer.en.core.txt"
    ],
    "structures": [
      "resources/structure.en.core.txt"
    ],
    "benchmarks": [
      "resources/benchmark.smoke.txt"
    ]
  },
  "provides": {
    "profiles": [
      "profile-en-core"
    ],
    "stopwords": [
      "stopwords-en-core"
    ],
    "rules": [
      "abbrev-en-core"
    ],
    "lexicons": [
      "lexicon-en-core"
    ],
    "gazetteers": [
      "gazetteer-en-core"
    ],
    "tagsets": [
      "tagset-ud-lite"
    ],
    "morphology": [
      "morph-en-core"
    ],
    "transducers": [
      "transducer-en-core"
    ],
    "structures": [
      "structure-en-core"
    ],
    "benchmarks": [
      "benchmark-en-smoke"
    ]
  },
  "entrypoints": {
    "manifest": "./pack.manifest.json",
    "load": "./dist/index.js"
  },
  "licenses": {
    "code": [
      "MIT"
    ],
    "data": [
      "CC0-1.0"
    ]
  },
  "provenance": {
    "sources": [
      "repo:packages/textpack-en-core/resources"
    ],
    "generated": false,
    "createdBy": [
      "text-computing"
    ]
  },
  "tests": {
    "smoke": [
      "test/smoke.mjs"
    ],
    "negative": [
      "test/negative.mjs"
    ],
    "representative": [
      "test/representative.mjs"
    ]
  },
  "reviewState": "reference",
  "composition": {
    "overlayPrecedence": 10
  },
  "limitations": [
    "Reference English resource pack with every textpack resource family for deterministic package workflows; it is not a comprehensive English lexicon or named-entity catalog."
  ]
} as const;

export function loadTextPackEnCoreManifest(): TextPackManifestV1 {
  return textPackEnCoreManifest;
}
